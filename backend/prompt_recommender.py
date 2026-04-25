"""Prompt Recommender.

Given a brand tracked in Peec, suggest prompts to seed for AI-search
visibility tracking. Pulls the brand's homepage via Peec's URL scraper for
context, then asks Claude for categorized suggestions with rationales.
"""
from __future__ import annotations

import json
from typing import Any

from anthropic import AsyncAnthropic

from peec_client import PeecClient

DEFAULT_MODEL = "claude-sonnet-4-6"
HOMEPAGE_MAX_CHARS = 8_000

SYSTEM = """You design prompts for AI-search visibility tracking. The user \
tracks how often their brand appears when people query AI chatbots \
(ChatGPT, Claude, Gemini, Perplexity, etc.).

Good tracking prompts:
  - Sound like real questions a buyer or researcher would type into an AI.
  - Span the buyer journey: discovery (unbranded category queries), \
comparison (vs competitors), buyer_intent (pricing/worth-it), use_case \
(specific scenarios), defense (branded queries that trigger reviews/FAQs).
  - Are concrete, not generic. "Best AI screenshot tool for macOS in 2026" \
beats "screenshot software".
  - Are <= 200 characters.

Avoid:
  - Prompts that name the brand in unbranded categories (defeats the purpose \
of measuring discovery visibility).
  - Vague trend prompts ("AI in 2026").
  - Prompts that are essentially identical reworded.

Return STRICT JSON with this shape:
{
  "recommendations": [
    {
      "text": string,                                  // <= 200 chars
      "category": "discovery" | "comparison" | "buyer_intent" | "use_case" | "defense",
      "rationale": string                              // 1 sentence: why this prompt matters
    }
  ]
}

Categorize evenly across the 5 categories where possible."""


class PromptRecommender:
    def __init__(
        self,
        peec: PeecClient,
        anthropic_client: AsyncAnthropic | None = None,
        model: str = DEFAULT_MODEL,
    ):
        self.peec = peec
        self.llm = anthropic_client or AsyncAnthropic()
        self.model = model

    async def recommend(self, brand_id: str, count: int = 12) -> dict:
        brands = await self.peec.list_brands()
        brand = next((b for b in brands if b["id"] == brand_id), None)
        if not brand:
            raise RuntimeError(f"Brand {brand_id} not found")

        homepage_md = await self._scrape_homepage(brand)

        user = (
            f"Brand name: {brand['name']}\n"
            f"Domains: {', '.join(brand.get('domains') or []) or '(none)'}\n"
            f"Generate {count} prompt suggestions.\n\n"
            f"Homepage content (markdown, may be truncated):\n"
            f"---\n{homepage_md or '(homepage unavailable)'}\n---"
        )

        msg = await self.llm.messages.create(
            model=self.model,
            max_tokens=2500,
            system=[
                {"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}
            ],
            messages=[{"role": "user", "content": user}],
        )
        return _parse_json(msg.content[0].text)

    async def _scrape_homepage(self, brand: dict) -> str:
        domain = (brand.get("domains") or [None])[0]
        if not domain:
            return ""
        for url in (f"https://{domain}", f"https://www.{domain}"):
            try:
                scraped = await self.peec.get_url_content(
                    url, max_length=HOMEPAGE_MAX_CHARS
                )
            except Exception:
                continue
            if scraped and scraped.get("content"):
                return scraped["content"][:HOMEPAGE_MAX_CHARS]
        return ""


def _parse_json(text: str) -> Any:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = min(
        (i for i in (text.find("{"), text.find("[")) if i != -1), default=-1
    )
    if start == -1:
        raise ValueError(f"no JSON object found in model output: {text[:200]!r}")
    open_ch = text[start]
    close_ch = "}" if open_ch == "{" else "]"
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        c = text[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
        elif c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError(f"unterminated JSON in model output: {text[:200]!r}")
