"""Source Infiltration Planner.

Maps the citation graph for a brand's category using Peec's domain & URL
reports, identifies URLs that LLMs cite heavily but where the brand is
absent (top infiltration targets), and asks Claude to generate a tailored
outreach plan for each — guest post pitch, product review request,
partnership angle, or community engagement.
"""
from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from typing import Any

from anthropic import AsyncAnthropic

from peec_client import PeecClient

DEFAULT_MODEL = "claude-sonnet-4-6"
SOURCE_SCRAPE_CHARS = 8_000

# URL classifications worth pitching for inclusion.
INFILTRATABLE_CLASSES = {
    "LISTICLE",
    "COMPARISON",
    "ALTERNATIVE",
    "HOW_TO_GUIDE",
    "ARTICLE",
    "CATEGORY_PAGE",
    "DISCUSSION",
}

STRATEGY_SYSTEM = """You are a B2B PR & SEO strategist. Given a high-leverage \
URL that AI chatbots frequently cite — and where the user's brand is \
currently NOT mentioned — design a concrete outreach plan to get the \
brand included on that exact page (or in equivalent coverage from the \
same source).

Output STRICT JSON:
{
  "outreach_type": "guest_post" | "product_review" | "partnership" | "press_pitch" | "community_engagement" | "data_contribution" | "comment_or_correction",
  "why_strategic": string,                    // 1-2 sentences on why this URL matters
  "target_contact": string,                   // role/team to contact (e.g. "Editor, Reviews team")
  "angle": string,                            // the specific story or value angle, anchored in the page content
  "draft_outreach": string,                   // 5-8 sentence email or message ready to send
  "alternatives": [string, ...],              // 1-3 fallback approaches if primary fails
  "effort": "low" | "medium" | "high",
  "expected_impact": "low" | "medium" | "high"
}

Be specific. Reference what's actually on the page. Avoid generic \
templates. If the page is a listicle of N tools and the brand isn't on it, \
pitch inclusion in the next update. If it's an editorial review, pitch a \
hands-on demo. If it's UGC (Reddit/forum), recommend community-appropriate \
engagement, not corporate outreach."""


@dataclass
class InfiltrationTarget:
    url: str
    domain: str
    title: str | None
    classification: str | None
    citation_count: int
    retrieval_count: int
    citation_rate: float  # avg across rows
    competitors_present: list[str]  # brand IDs present (excluding own)
    leverage_score: float  # for ranking


@dataclass
class InfiltrationPlan:
    target: InfiltrationTarget
    plan: dict


@dataclass
class CitationGraphNode:
    domain: str
    url_count: int
    citation_count: int
    classification: str | None  # domain-level (CORPORATE/EDITORIAL/etc)


@dataclass
class InfiltrationReport:
    brand_id: str
    brand_name: str
    own_domains: list[str]
    date_range: dict
    total_urls_scanned: int
    citation_graph: list[CitationGraphNode]
    targets: list[InfiltrationTarget]
    plans: list[InfiltrationPlan] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "brand_id": self.brand_id,
            "brand_name": self.brand_name,
            "own_domains": self.own_domains,
            "date_range": self.date_range,
            "total_urls_scanned": self.total_urls_scanned,
            "citation_graph": [asdict(n) for n in self.citation_graph],
            "targets": [asdict(t) for t in self.targets],
            "plans": [
                {"target": asdict(p.target), "plan": p.plan} for p in self.plans
            ],
        }


class SourceInfiltrationAgent:
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
        days: int = 90,
        brand_id: str | None = None,
        max_targets: int = 6,
        report_limit: int = 5000,
        exclude_domains: list[str] | None = None,
    ) -> InfiltrationReport:
        end = date.today()
        start = end - timedelta(days=days)

        all_brands = await self.peec.list_brands()
        if brand_id:
            brand = next((b for b in all_brands if b["id"] == brand_id), None)
            if not brand:
                raise RuntimeError(f"Brand {brand_id} not found")
        else:
            own = [b for b in all_brands if b.get("is_own")]
            if not own:
                raise RuntimeError("No 'own' brand configured; pass brand_id")
            brand = own[0]

        own_domains = [d.lower() for d in (brand.get("domains") or [])]
        competitor_domains = sorted(
            {
                d.lower()
                for b in all_brands
                if b["id"] != brand["id"]
                for d in (b.get("domains") or [])
            }
        )
        manual_excludes = [d.strip().lower() for d in (exclude_domains or []) if d.strip()]
        blocked_domains = sorted(set(own_domains) | set(competitor_domains) | set(manual_excludes))

        url_rows, domain_rows = await asyncio.gather(
            self.peec.get_urls_report(
                start_date=start.isoformat(),
                end_date=end.isoformat(),
                limit=report_limit,
            ),
            self.peec.get_domains_report(
                start_date=start.isoformat(),
                end_date=end.isoformat(),
                limit=report_limit,
            ),
        )

        targets = self._rank_targets(
            url_rows,
            own_brand_id=brand["id"],
            blocked_domains=blocked_domains,
            max_targets=max_targets,
        )
        graph = self._build_graph(domain_rows, blocked_domains)

        report = InfiltrationReport(
            brand_id=brand["id"],
            brand_name=brand["name"],
            own_domains=own_domains,
            date_range={"start": start.isoformat(), "end": end.isoformat()},
            total_urls_scanned=len({r["url"] for r in url_rows}),
            citation_graph=graph,
            targets=targets,
        )

        plans = await asyncio.gather(
            *(self._plan(t, brand) for t in targets),
            return_exceptions=True,
        )
        report.plans = [
            InfiltrationPlan(target=t, plan=p)
            for t, p in zip(targets, plans)
            if not isinstance(p, Exception)
        ]
        return report

    def _rank_targets(
        self,
        rows: list[dict],
        *,
        own_brand_id: str,
        blocked_domains: list[str],
        max_targets: int,
    ) -> list[InfiltrationTarget]:
        agg: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "citation_count": 0,
                "retrieval_count": 0,
                "citation_rates": [],
                "title": None,
                "classification": None,
                "domain": "",
                "brands": set(),
            }
        )
        for r in rows:
            url = r["url"]
            domain = _domain_of(url)
            if any(domain == d or domain.endswith("." + d) for d in blocked_domains):
                continue  # skip own + competitor + manually-excluded
            a = agg[url]
            a["citation_count"] += r.get("citation_count", 0)
            a["retrieval_count"] += r.get("retrieval_count", 0)
            if r.get("citation_rate") is not None:
                a["citation_rates"].append(r["citation_rate"])
            a["title"] = a["title"] or r.get("title")
            a["classification"] = a["classification"] or r.get("classification")
            a["domain"] = domain
            for b in r.get("mentioned_brands", []) or []:
                a["brands"].add(b["id"])

        candidates: list[InfiltrationTarget] = []
        for url, a in agg.items():
            if own_brand_id in a["brands"]:
                continue  # already mentioned, no need to infiltrate
            cls = a["classification"]
            class_boost = 1.5 if cls in INFILTRATABLE_CLASSES else 1.0
            citation_rate = (
                sum(a["citation_rates"]) / len(a["citation_rates"])
                if a["citation_rates"]
                else 0.0
            )
            score = a["citation_count"] * class_boost
            candidates.append(
                InfiltrationTarget(
                    url=url,
                    domain=a["domain"],
                    title=a["title"],
                    classification=cls,
                    citation_count=a["citation_count"],
                    retrieval_count=a["retrieval_count"],
                    citation_rate=round(citation_rate, 3),
                    competitors_present=sorted(b for b in a["brands"]),
                    leverage_score=round(score, 2),
                )
            )

        candidates.sort(key=lambda t: t.leverage_score, reverse=True)
        return candidates[:max_targets]

    def _build_graph(
        self, rows: list[dict], blocked_domains: list[str]
    ) -> list[CitationGraphNode]:
        agg: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"urls": set(), "citation_count": 0, "classification": None}
        )
        for r in rows:
            d = (r.get("domain") or "").lower()
            if not d:
                continue
            a = agg[d]
            a["citation_count"] += r.get("citation_count", 0)
            a["classification"] = a["classification"] or r.get("classification")
        nodes = [
            CitationGraphNode(
                domain=d,
                url_count=0,  # domains report is per (domain, ...) row; URL count not directly here
                citation_count=v["citation_count"],
                classification=v["classification"],
            )
            for d, v in agg.items()
            if not any(d == bd or d.endswith("." + bd) for bd in blocked_domains)
        ]
        nodes.sort(key=lambda n: n.citation_count, reverse=True)
        return nodes[:20]

    async def _plan(self, target: InfiltrationTarget, brand: dict) -> dict:
        scraped = await self.peec.get_url_content(
            target.url, max_length=SOURCE_SCRAPE_CHARS
        )
        page_md = (scraped or {}).get("content") or "(page content unavailable)"

        user_msg = (
            f"Brand: {brand['name']}\n"
            f"Brand domains: {', '.join(brand.get('domains') or [])}\n"
            f"Target URL: {target.url}\n"
            f"Page title: {target.title or '(unknown)'}\n"
            f"Page classification: {target.classification or '(unknown)'}\n"
            f"Citation count (period): {target.citation_count}\n"
            f"Citation rate: {target.citation_rate}\n"
            f"Competitor brands currently mentioned on this page: "
            f"{', '.join(target.competitors_present) or '(none)'}\n\n"
            f"Page content (markdown, may be truncated):\n---\n"
            f"{page_md[:SOURCE_SCRAPE_CHARS]}\n---"
        )
        msg = await self.llm.messages.create(
            model=self.model,
            max_tokens=1500,
            system=[
                {
                    "type": "text",
                    "text": STRATEGY_SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_msg}],
        )
        return _parse_json(msg.content[0].text)


def _domain_of(url: str) -> str:
    s = url.lower()
    for prefix in ("https://", "http://"):
        if s.startswith(prefix):
            s = s[len(prefix) :]
            break
    return s.split("/", 1)[0].split("?", 1)[0].lstrip("www.")


def _parse_json(text: str) -> Any:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0]
    return json.loads(text)
