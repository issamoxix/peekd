"""Sentiment Flip Agent.

Scans recent AI chat responses for negative mentions of the user's own brand,
traces the negative claims back to their cited sources, and generates a
counter-content strategy (rebuttals, PR pitches, new content angles).

Inputs come from the Peec AI customer API:
  - list_chats         -> discover chats in a date range
  - get_chat           -> full assistant response, sources, brand mentions
  - get_url_content    -> scraped markdown of a cited source

LLM analysis runs against the Anthropic API (claude-sonnet-4-6 by default)
with prompt caching on the static instructions.
"""
from __future__ import annotations

import asyncio
import json
import os
from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from typing import Any

from anthropic import AsyncAnthropic

from peec_client import PeecClient

DEFAULT_MODEL = "claude-sonnet-4-6"
MAX_SOURCE_CHARS = 12_000  # cap each scraped source to keep prompts tight
TRIAGE_PROMPT = """You are an analyst checking whether an AI chatbot response \
speaks negatively about a specific brand.

Brand of interest: {brand_name}
Brand domains: {brand_domains}

Read the assistant response below. Decide:
  1. Is the brand mentioned at all (by name or domain)?
  2. If yes, is the framing negative, neutral, or positive *toward this brand*?
  3. If negative, list the concrete claims (each as one short sentence) that \
made it negative.

Return STRICT JSON:
{{
  "mentioned": bool,
  "sentiment": "negative" | "neutral" | "positive" | "not_mentioned",
  "claims": [string, ...]   // empty unless sentiment == "negative"
}}

Assistant response:
---
{response}
---"""

STRATEGY_SYSTEM = """You are a brand reputation strategist. Given a negative \
claim that an AI chatbot is repeating about a brand, plus the source content \
the chatbot likely drew from, produce a concrete counter-content plan.

Always return STRICT JSON with this shape:
{
  "claim": string,
  "source_assessment": {
    "supports_claim": "yes" | "partial" | "no",
    "key_quotes": [string, ...],   // up to 3 short quotes from the source
    "factual_errors": [string, ...] // anything the source gets wrong, if any
  },
  "rebuttal": string,                // 2-4 sentences of factual pushback
  "pr_pitch": {
    "target": string,                // who to pitch (the source's outlet, or alt)
    "angle": string,                 // the story angle
    "draft_email": string            // 4-6 sentence outreach email
  },
  "new_content": [
    {
      "format": string,              // e.g. "blog post", "case study", "FAQ"
      "title": string,
      "outline": [string, ...]       // 3-6 bullet points
    }
  ]
}

Be specific. Reference real quotes from the source. Do not invent statistics."""


@dataclass
class NegativeFinding:
    chat_id: str
    prompt_id: str
    model_channel_id: str
    brand_name: str
    claims: list[str]
    response_excerpt: str
    sources: list[dict]  # [{url, domain, citationCount, citationPosition}]


@dataclass
class CounterContentPlan:
    chat_id: str
    brand_name: str
    claim: str
    source_url: str
    plan: dict  # the structured JSON returned by the strategy model


@dataclass
class AgentReport:
    scanned_chats: int
    findings: list[NegativeFinding] = field(default_factory=list)
    plans: list[CounterContentPlan] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "scanned_chats": self.scanned_chats,
            "findings": [asdict(f) for f in self.findings],
            "plans": [asdict(p) for p in self.plans],
        }


class SentimentFlipAgent:
    def __init__(
        self,
        peec: PeecClient,
        anthropic_client: AsyncAnthropic | None = None,
        model: str = DEFAULT_MODEL,
    ):
        self.peec = peec
        self.llm = anthropic_client or AsyncAnthropic()
        self.model = model

    async def run(
        self,
        *,
        days: int = 14,
        max_chats: int = 50,
        brand_id: str | None = None,
    ) -> AgentReport:
        end = date.today()
        start = end - timedelta(days=days)

        all_brands = await self.peec.list_brands()
        if brand_id:
            target_brand = next((b for b in all_brands if b["id"] == brand_id), None)
            if not target_brand:
                raise RuntimeError(f"Brand {brand_id} not found in this project")
        else:
            own = [b for b in all_brands if b.get("is_own")]
            if not own:
                raise RuntimeError("No 'own' brand configured; pass brand_id explicitly")
            target_brand = own[0]

        listing = await self.peec.list_chats(
            start_date=start.isoformat(),
            end_date=end.isoformat(),
            brand_id=target_brand["id"],
            limit=max_chats,
        )
        chat_stubs = listing.get("data", [])
        report = AgentReport(scanned_chats=len(chat_stubs))

        chats = await asyncio.gather(
            *(self.peec.get_chat(c["id"]) for c in chat_stubs),
            return_exceptions=True,
        )

        triage_results = await asyncio.gather(
            *(
                self._triage(chat, target_brand)
                for chat in chats
                if not isinstance(chat, Exception)
            )
        )

        for chat, triage in zip(
            (c for c in chats if not isinstance(c, Exception)), triage_results
        ):
            if triage["sentiment"] != "negative" or not triage["claims"]:
                continue
            assistant_text = _last_assistant(chat)
            finding = NegativeFinding(
                chat_id=chat["id"],
                prompt_id=chat["prompt"]["id"],
                model_channel_id=chat.get("model_channel", {}).get("id", ""),
                brand_name=target_brand["name"],
                claims=triage["claims"],
                response_excerpt=assistant_text[:1200],
                sources=chat.get("sources", []),
            )
            report.findings.append(finding)

        plan_tasks = []
        for finding in report.findings:
            top_sources = sorted(
                finding.sources,
                key=lambda s: (s.get("citationCount", 0), -s.get("citationPosition", 99)),
                reverse=True,
            )[:2]
            for claim in finding.claims:
                for src in top_sources:
                    plan_tasks.append(self._counter(finding, claim, src))

        plans = await asyncio.gather(*plan_tasks, return_exceptions=True)
        report.plans = [p for p in plans if isinstance(p, CounterContentPlan)]
        return report

    async def _triage(self, chat: dict, brand: dict) -> dict:
        prompt = TRIAGE_PROMPT.format(
            brand_name=brand["name"],
            brand_domains=", ".join(brand.get("domains", [])) or "(none)",
            response=_last_assistant(chat)[:8000],
        )
        msg = await self.llm.messages.create(
            model=self.model,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return _parse_json(msg.content[0].text)

    async def _counter(
        self, finding: NegativeFinding, claim: str, source: dict
    ) -> CounterContentPlan:
        url = source["url"]
        scraped = await self.peec.get_url_content(url, max_length=MAX_SOURCE_CHARS)
        source_md = (scraped or {}).get("content") or "(source content unavailable)"

        user_msg = (
            f"Brand: {finding.brand_name}\n"
            f"Negative claim: {claim}\n"
            f"Cited source URL: {url}\n"
            f"Source domain: {source.get('domain')}\n\n"
            f"Source content (markdown):\n{source_md[:MAX_SOURCE_CHARS]}"
        )
        msg = await self.llm.messages.create(
            model=self.model,
            max_tokens=1500,
            system=[{"type": "text", "text": STRATEGY_SYSTEM,
                     "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_msg}],
        )
        return CounterContentPlan(
            chat_id=finding.chat_id,
            brand_name=finding.brand_name,
            claim=claim,
            source_url=url,
            plan=_parse_json(msg.content[0].text),
        )


def _last_assistant(chat: dict) -> str:
    for m in reversed(chat.get("messages", [])):
        if m.get("role") == "assistant":
            return m.get("content", "")
    return ""


def _parse_json(text: str) -> Any:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0]
    return json.loads(text)


async def _cli() -> None:
    import argparse

    p = argparse.ArgumentParser(description="Run the Sentiment Flip Agent")
    p.add_argument("--days", type=int, default=14)
    p.add_argument("--max-chats", type=int, default=50)
    p.add_argument("--brand-id", default=None)
    p.add_argument("--model", default=DEFAULT_MODEL)
    args = p.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("ANTHROPIC_API_KEY env var required")

    async with PeecClient() as peec:
        agent = SentimentFlipAgent(peec, model=args.model)
        report = await agent.run(
            days=args.days, max_chats=args.max_chats, brand_id=args.brand_id
        )
    print(json.dumps(report.to_dict(), indent=2))


if __name__ == "__main__":
    asyncio.run(_cli())
