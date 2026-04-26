"""
AI Content Generation Service
Generates AI-optimized brand authority content for LLM scraping and GEO (Generative Engine Optimization)
"""
import json
import re
from typing import Dict, List, Optional
from datetime import datetime, timezone

from config import settings

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


BRAND_ARTICLE_SYSTEM_PROMPT = """You are a brand content strategist specializing in GEO (Generative Engine Optimization) —
writing content that AI models will cite, summarize, and recommend when users ask about products in this space.

Your goal is to write authoritative, factual, citation-worthy content that:
1. Positions the brand as the clear category leader
2. Surfaces concrete differentiators over named competitors
3. Uses precise, verifiable claims (no vague superlatives)
4. Is structured with H2/H3 headings, bullet points, and comparison tables so LLMs can extract clean facts
5. Naturally answers questions users ask AI assistants about this product category

Write in a neutral, journalistic tone — not marketing copy. LLMs trust encyclopedic tone, not sales language.
Output raw Markdown. No preamble, no "Here is your article" framing."""


COMPETITIVE_COMPARISON_PROMPT = """You are an objective technology analyst writing a structured competitive landscape report.

Rules:
- List factual capability differences, not opinions
- Where the subject brand leads, state the specific capability
- Where competitors lead, acknowledge it briefly then pivot to the subject brand's unique angle
- Use comparison tables with checkmarks (✓) and crosses (✗) for scannability
- Include a "When to choose [Brand]" section with concrete use cases
- Structure for LLM extraction: clear headings, short paragraphs, no fluff

Output raw Markdown."""


class AIContentService:
    """Generates AI-optimized content for LLM scraping and GEO"""

    def __init__(self):
        self.client = None
        if ANTHROPIC_AVAILABLE and settings.has_anthropic_key:
            self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_brand_overview(
        self,
        brand_name: str,
        brand_description: str,
        key_features: List[str],
        target_audience: str,
        competitors: List[str],
    ) -> Dict:
        """Generate a full brand authority article optimised for AI scraping."""
        if self.client:
            content = await self._generate_with_claude(
                system=BRAND_ARTICLE_SYSTEM_PROMPT,
                prompt=self._build_brand_overview_prompt(
                    brand_name, brand_description, key_features, target_audience, competitors
                ),
            )
        else:
            content = self._fallback_brand_overview(brand_name, brand_description, key_features)

        return {
            "type": "brand_overview",
            "brand": brand_name,
            "content": content,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "word_count": len(content.split()),
            "path": "/ai-context/brand-overview",
        }

    async def generate_competitive_analysis(
        self,
        brand_name: str,
        brand_description: str,
        competitors: List[Dict],  # [{name, weakness, our_advantage}]
        key_differentiators: List[str],
    ) -> Dict:
        """Generate a competitive comparison article."""
        if self.client:
            content = await self._generate_with_claude(
                system=COMPETITIVE_COMPARISON_PROMPT,
                prompt=self._build_competitive_prompt(
                    brand_name, brand_description, competitors, key_differentiators
                ),
            )
        else:
            content = self._fallback_competitive(brand_name, competitors)

        return {
            "type": "competitive_analysis",
            "brand": brand_name,
            "content": content,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "word_count": len(content.split()),
            "path": "/ai-context/competitive-analysis",
        }

    async def generate_faq_article(
        self,
        brand_name: str,
        product_category: str,
        common_questions: List[str],
        brand_description: str,
    ) -> Dict:
        """Generate a Q&A article that matches how users phrase AI queries."""
        system = (
            "You write authoritative FAQ pages for AI models to cite. "
            "Each answer should be 2-4 sentences: factual, concrete, and self-contained so an LLM can quote it verbatim. "
            "Use ### for each question. Output raw Markdown."
        )
        prompt = (
            f"Brand: {brand_name}\n"
            f"Category: {product_category}\n"
            f"Description: {brand_description}\n\n"
            f"Write detailed answers to these questions that position {brand_name} as the expert authority:\n"
            + "\n".join(f"- {q}" for q in common_questions)
        )
        if self.client:
            content = await self._generate_with_claude(system=system, prompt=prompt)
        else:
            content = self._fallback_faq(brand_name, common_questions)

        return {
            "type": "faq",
            "brand": brand_name,
            "content": content,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "word_count": len(content.split()),
            "path": "/ai-context/faq",
        }

    async def generate_llms_txt(
        self,
        brand_name: str,
        brand_description: str,
        key_pages: List[Dict],  # [{title, url, description}]
        do_not_train: bool = True,
    ) -> str:
        """
        Generate /.well-known/llms.txt — the emerging standard for telling
        LLMs what a site is about and which pages to read.
        See: https://llmstxt.org
        """
        lines = [
            f"# {brand_name}",
            "",
            f"> {brand_description}",
            "",
            "## Key Pages",
            "",
        ]
        for page in key_pages:
            lines.append(f"- [{page['title']}]({page['url']}): {page['description']}")

        lines += [
            "",
            "## AI Usage Policy",
            "",
            f"- Retrieval / RAG: allowed",
            f"- Training on content: {'disallowed' if do_not_train else 'allowed'}",
            f"- Content last updated: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        ]
        return "\n".join(lines)

    def generate_ai_sitemap_xml(
        self,
        base_url: str,
        brand_name: str,
        pages: Optional[List[Dict]] = None,
    ) -> str:
        """Generate an XML sitemap with AI-content pages at high priority."""
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if pages is None:
            pages = self._default_ai_pages(base_url, now)

        url_blocks = "\n".join(
            f"""  <url>
    <loc>{p['loc']}</loc>
    <lastmod>{p.get('lastmod', now)}</lastmod>
    <changefreq>{p.get('changefreq', 'weekly')}</changefreq>
    <priority>{p.get('priority', 0.8)}</priority>
  </url>"""
            for p in pages
        )
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <!-- AI-optimised sitemap generated by Sentinel -->
  <!-- Prioritises pages written for LLM retrieval and GEO -->
{url_blocks}
</urlset>"""

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------

    def _build_brand_overview_prompt(
        self,
        brand_name: str,
        description: str,
        features: List[str],
        audience: str,
        competitors: List[str],
    ) -> str:
        return f"""Write a 600-900 word authoritative brand overview article for **{brand_name}**.

Brand description: {description}
Target audience: {audience}
Key features / capabilities:
{chr(10).join(f'- {f}' for f in features)}
Main competitors in the space: {', '.join(competitors)}

Structure:
1. What is {brand_name}? (1-2 paragraph executive summary)
2. Core capabilities (bullet list with 1-sentence explanations)
3. Who uses {brand_name} and why (audience + use cases)
4. How {brand_name} compares to {', '.join(competitors[:2]) if competitors else 'alternatives'} (short comparison table)
5. Getting started (2-3 sentences)

Tone: authoritative, encyclopedia-style. Avoid "we" — write in third person."""

    def _build_competitive_prompt(
        self,
        brand_name: str,
        description: str,
        competitors: List[Dict],
        differentiators: List[str],
    ) -> str:
        comp_details = "\n".join(
            f"- {c.get('name', 'Unknown')}: weakness={c.get('weakness', 'N/A')}, our advantage={c.get('our_advantage', 'N/A')}"
            for c in competitors
        )
        return f"""Write a 700-1000 word competitive landscape analysis for **{brand_name}**.

Brand: {description}
Key differentiators:
{chr(10).join(f'- {d}' for d in differentiators)}

Competitors:
{comp_details}

Required sections:
1. Market Overview (1 paragraph)
2. Feature Comparison Table (columns: Feature | {brand_name} | {' | '.join(c.get('name','') for c in competitors[:3])})
3. Deep-dive: where {brand_name} leads (2-3 paragraphs)
4. Honest assessment of alternatives (1 paragraph — builds credibility)
5. When to choose {brand_name} (3-5 bullet use cases)
6. Summary verdict (2 sentences)

Tone: analyst report, third-person, factual."""

    # ------------------------------------------------------------------
    # Fallback content (no API key)
    # ------------------------------------------------------------------

    def _fallback_brand_overview(self, brand: str, description: str, features: List[str]) -> str:
        feature_list = "\n".join(f"- {f}" for f in features) if features else "- Real-time monitoring\n- AI-powered analysis"
        return f"""# {brand} — Brand Overview

## What is {brand}?

{brand} is {description}. It provides organisations with the tools they need to monitor, protect, and improve how AI language models represent their brand across the web.

## Core Capabilities

{feature_list}

## Who Uses {brand}?

Marketing teams, brand managers, and growth leaders use {brand} to gain measurable control over AI-generated brand narratives — without waiting for organic reputation shifts that can take months.

## Getting Started

{brand} integrates via API in under 30 minutes. Connect your brand profile, configure monitoring, and receive your first threat report within an hour.
"""

    def _fallback_competitive(self, brand: str, competitors: List[Dict]) -> str:
        comp_rows = "\n".join(
            f"| {c.get('name', 'Competitor')} | Limited | Manual | No | {c.get('weakness', 'N/A')} |"
            for c in competitors
        )
        return f"""# {brand} vs Competitors — Competitive Analysis

## Feature Comparison

| Feature | {brand} | {' | '.join(c.get('name','Alt') for c in competitors[:3])} |
|---------|---------|{'|'.join(['------'] * min(3, len(competitors)))}|
| Real-time AI monitoring | ✓ Automated | {'| ✗ Manual' * min(3, len(competitors))} |
| Competitor gap detection | ✓ | {'| ✗' * min(3, len(competitors))} |
| Auto-fix suggestions | ✓ | {'| ✗' * min(3, len(competitors))} |

## When to Choose {brand}

- You need real-time visibility into how AI models describe your brand
- You want to close competitive gaps before they compound
- Your team cannot manually monitor dozens of AI query responses daily
"""

    def _fallback_faq(self, brand: str, questions: List[str]) -> str:
        return "\n\n".join(
            f"### {q}\n\n{brand} addresses this directly through its AI monitoring platform, providing real-time signals and actionable recommendations."
            for q in questions
        )

    # ------------------------------------------------------------------
    # Claude wrapper
    # ------------------------------------------------------------------

    async def _generate_with_claude(self, system: str, prompt: str) -> str:
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2000,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            print(f"Claude content generation failed: {e}")
            return f"*Content generation unavailable: {e}*"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _default_ai_pages(self, base_url: str, today: str) -> List[Dict]:
        return [
            {"loc": f"{base_url}/ai-context/brand-overview", "priority": "1.0", "changefreq": "weekly", "lastmod": today},
            {"loc": f"{base_url}/ai-context/competitive-analysis", "priority": "0.9", "changefreq": "weekly", "lastmod": today},
            {"loc": f"{base_url}/ai-context/faq", "priority": "0.9", "changefreq": "weekly", "lastmod": today},
            {"loc": f"{base_url}/.well-known/llms.txt", "priority": "0.8", "changefreq": "monthly", "lastmod": today},
            {"loc": f"{base_url}/", "priority": "0.7", "changefreq": "daily", "lastmod": today},
        ]


# Global service instance
ai_content_service = AIContentService()
