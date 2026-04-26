"""
AI Engine — Anthropic-powered analysis and recommendation generation.
Uses a 15-minute in-memory cache keyed on brand + data fingerprint so
each Anthropic model is called at most once per cache window.
"""
import json
import re
import time
import hashlib
from typing import Optional

from config import settings

try:
    import anthropic as _anthropic_lib
except ImportError:
    _anthropic_lib = None

_CACHE: dict[str, tuple[float, object]] = {}
_TTL = 900  # 15 minutes — matches Peec cache TTL


# ── helpers ────────────────────────────────────────────────────────────────


def _fp(*parts: str) -> str:
    return hashlib.sha1("|".join(str(p) for p in parts).encode()).hexdigest()[:12]


def _get(key: str):
    entry = _CACHE.get(key)
    if entry and time.time() - entry[0] < _TTL:
        return entry[1]
    return None


def _put(key: str, val):
    _CACHE[key] = (time.time(), val)
    return val


def _client():
    if not settings.has_anthropic_key or _anthropic_lib is None:
        return None
    return _anthropic_lib.Anthropic(api_key=settings.anthropic_api_key)


def _call(client, model: str, system: str, user: str, max_tokens: int = 1000) -> str:
    resp = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return (resp.content[0].text if resp.content else "").strip()


def _parse(text: str):
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    try:
        return json.loads(text)
    except Exception:
        return None


# ── Action Queue ────────────────────────────────────────────────────────────


def _fallback_actions(brand_name: str, threats: list, competitors: list) -> list:
    """Return basic actions from template when Anthropic is unavailable."""
    actions = []
    idx = 1
    for t in threats[:4]:
        actions.append({
            "id": f"act_{idx}", "category": "OWNED_PAGES",
            "opportunity_score": 0.7 if t["severity"] in ("CRITICAL", "HIGH") else 0.5,
            "opportunity_level": "HIGH" if t["severity"] in ("CRITICAL", "HIGH") else "MEDIUM",
            "domain": f"{brand_name.lower().replace(' ', '')}.com",
            "title": f"Address: {t['summary'][:60]}",
            "rationale": t["evidence"],
            "steps": t.get("counter_strategy", {}).get("priority_actions", ["Review and respond to this threat"]),
            "timeline": "This week",
            "competitor_presence": [], "keywords": [],
            "status": "PENDING",
        })
        idx += 1
    for e in competitors[:3]:
        actions.append({
            "id": f"act_{idx}", "category": "EDITORIAL",
            "opportunity_score": e["opportunity_score"],
            "opportunity_level": "HIGH" if e["opportunity_score"] > 0.6 else "MEDIUM",
            "domain": "editorial / media",
            "title": f"Capture {e['competitor_name']} displacement opportunity",
            "rationale": e.get("gap_analysis", {}).get("competitor_weakness", ""),
            "steps": e.get("recommended_actions", []),
            "timeline": "Week 1-2",
            "competitor_presence": [e["competitor_name"]], "keywords": [],
            "status": "PENDING",
        })
        idx += 1
    return sorted(actions, key=lambda a: a["opportunity_score"], reverse=True)


async def generate_action_queue(
    brand_name: str,
    threats: list,
    competitor_events: list,
) -> list:
    """Generate a ranked action queue using Anthropic based on real Peec data."""
    key = f"actions:{_fp(brand_name, str(len(threats)), str(len(competitor_events)))}"
    cached = _get(key)
    if cached is not None:
        return cached

    client = _client()
    if client is None:
        return _put(key, _fallback_actions(brand_name, threats, competitor_events))

    threat_lines = "\n".join(
        f"  - [{t['severity']}] {t['type']}: {t['summary']}" for t in threats[:8]
    ) or "  None detected"
    comp_lines = "\n".join(
        f"  - {e['competitor_name']}: {e.get('gap_analysis', {}).get('competitor_weakness', e['event_type'])}"
        for e in competitor_events[:5]
    ) or "  None detected"

    system = (
        "You are a brand reputation strategist. Generate JSON only. No markdown. "
        "Each action must be specific to the data provided — no generic advice."
    )
    user = f"""Brand: '{brand_name}'

Active threats:
{threat_lines}

Competitor weaknesses:
{comp_lines}

Generate exactly 8 ranked action items. Each action must directly address one of the above threats or opportunities.

Return a JSON array:
[
  {{
    "id": "act_1",
    "category": "OWNED_PAGES | EDITORIAL | REFERENCE | UGC",
    "opportunity_score": 0.0-1.0,
    "opportunity_level": "HIGH | MEDIUM | LOW",
    "domain": "specific domain or platform (e.g. {brand_name.lower().replace(' ', '')}.com, g2.com)",
    "title": "Concise action title (max 80 chars)",
    "rationale": "1-2 sentences: why this matters, which threat/opportunity it addresses",
    "steps": ["Specific step 1", "Specific step 2", "Specific step 3"],
    "timeline": "Immediate | This week | This month",
    "competitor_presence": ["competitor name if relevant, else empty"],
    "keywords": ["keyword1", "keyword2"]
  }}
]"""

    try:
        text = _call(client, "claude-haiku-4-5-20251001", system, user, max_tokens=1800)
        data = _parse(text)
        if isinstance(data, list) and data:
            # Normalise fields so frontend doesn't break
            for i, a in enumerate(data):
                a.setdefault("id", f"act_{i+1}")
                a.setdefault("status", "PENDING")
                a.setdefault("competitor_presence", [])
                a.setdefault("keywords", [])
                a.setdefault("steps", [])
                score = float(a.get("opportunity_score", 0.5))
                a["opportunity_score"] = round(min(1.0, max(0.0, score)), 3)
                if a["opportunity_score"] >= 0.7:
                    a["opportunity_level"] = "HIGH"
                elif a["opportunity_score"] >= 0.4:
                    a["opportunity_level"] = "MEDIUM"
                else:
                    a["opportunity_level"] = "LOW"
            data.sort(key=lambda a: a["opportunity_score"], reverse=True)
            return _put(key, data)
    except Exception as exc:
        print(f"[ai_engine] generate_action_queue failed: {exc}")

    return _put(key, _fallback_actions(brand_name, threats, competitor_events))


# ── Narrative Analysis ───────────────────────────────────────────────────────


async def generate_narrative(
    brand_name: str,
    threats: list,
    competitor_events: list,
    visibility: float,
    sentiment: float,
) -> dict:
    """Generate a full narrative analysis using Anthropic Sonnet."""
    key = f"narrative:{_fp(brand_name, str(len(threats)), str(round(sentiment, 0)))}"
    cached = _get(key)
    if cached is not None:
        return cached

    client = _client()
    if client is None:
        return _put(key, _fallback_narrative(brand_name, threats, competitor_events, visibility, sentiment))

    threat_lines = "\n".join(
        f"  - [{t['severity']}] {t['summary']}" for t in threats[:8]
    ) or "  No active threats"
    comp_lines = "\n".join(
        f"  - {e['competitor_name']} ({e['event_type']}): {e.get('gap_analysis', {}).get('competitor_weakness', '')}"
        for e in competitor_events[:5]
    ) or "  No competitor events"

    system = (
        "You are a brand narrative strategist. Return JSON only. No markdown. "
        "Be specific and tactical, not generic."
    )
    user = f"""Analyse the reputation narrative for '{brand_name}':

Metrics:
  Visibility: {round(visibility * 100, 1)}%
  Sentiment: {round(sentiment, 1)}/100

Active threats:
{threat_lines}

Competitor opportunities:
{comp_lines}

Return a JSON object:
{{
  "overall_health": "STRONG | STABLE | AT_RISK | CRITICAL",
  "health_score": 0-100,
  "current_narrative": "2-3 sentence assessment of how AI models currently describe {brand_name}",
  "narrative_gap": "What the narrative should say vs what it says now",
  "key_messages": [
    "Message 1 to amplify (specific to the data above)",
    "Message 2",
    "Message 3"
  ],
  "threats_to_address": [
    {{"issue": "specific issue", "action": "specific counter-narrative action", "priority": "Immediate|This week|This month"}}
  ],
  "opportunities_to_capture": [
    {{"opportunity": "specific opportunity from competitor data", "action": "specific action", "timeline": "Week 1-2"}}
  ],
  "30_day_plan": [
    {{"week": "Week 1", "focus": "...", "actions": ["...", "..."]}},
    {{"week": "Week 2-3", "focus": "...", "actions": ["...", "..."]}},
    {{"week": "Week 4", "focus": "...", "actions": ["...", "..."]}}
  ],
  "kpis": [
    {{"metric": "Sentiment score", "current": "{round(sentiment, 1)}", "target": "{min(100, round(sentiment + 15, 1))}", "timeline": "30 days"}},
    {{"metric": "Visibility", "current": "{round(visibility * 100, 1)}%", "target": "{min(100, round((visibility + 0.1) * 100, 1))}%", "timeline": "30 days"}}
  ]
}}"""

    try:
        text = _call(client, "claude-sonnet-4-6", system, user, max_tokens=1500)
        data = _parse(text)
        if isinstance(data, dict) and "overall_health" in data:
            return _put(key, data)
    except Exception as exc:
        print(f"[ai_engine] generate_narrative failed: {exc}")

    return _put(key, _fallback_narrative(brand_name, threats, competitor_events, visibility, sentiment))


def _fallback_narrative(brand_name, threats, competitors, visibility, sentiment):
    critical = sum(1 for t in threats if t["severity"] == "CRITICAL")
    high = sum(1 for t in threats if t["severity"] == "HIGH")
    health = "CRITICAL" if critical > 0 else "AT_RISK" if high > 1 else "STABLE" if sentiment > 50 else "AT_RISK"
    score = max(10, min(95, int(sentiment - critical * 15 - high * 5 + visibility * 20)))
    return {
        "overall_health": health,
        "health_score": score,
        "current_narrative": f"AI models mention {brand_name} with {round(sentiment, 1)}/100 average sentiment and {round(visibility * 100, 1)}% visibility. {'Critical reputation issues require immediate attention.' if critical > 0 else 'Some reputation concerns detected.'}",
        "narrative_gap": f"The narrative should position {brand_name} as a trusted, category-leading brand. Currently sentiment is below the target of {min(100, round(sentiment + 15))} and requires proactive reputation management.",
        "key_messages": [
            f"{brand_name} maintains high standards in areas where competitors struggle",
            f"{brand_name}'s track record demonstrates reliability and trustworthiness",
            f"Independent validation confirms {brand_name}'s position as a category leader",
        ],
        "threats_to_address": [{"issue": t["summary"], "action": (t.get("counter_strategy") or {}).get("priority_actions", ["Review and respond"])[0], "priority": "Immediate" if t["severity"] in ("CRITICAL", "HIGH") else "This week"} for t in threats[:3]],
        "opportunities_to_capture": [{"opportunity": e.get("gap_analysis", {}).get("competitor_weakness", ""), "action": (e.get("recommended_actions") or ["Capture displaced visibility"])[0], "timeline": "Week 1-2"} for e in competitors[:3]],
        "30_day_plan": [
            {"week": "Week 1", "focus": "Threat response", "actions": ["Publish factual clarification content", "Begin correction outreach to key publications"]},
            {"week": "Week 2-3", "focus": "Competitive capture", "actions": ["Publish comparison content vs struggling competitors", "Drive customer reviews on key platforms"]},
            {"week": "Week 4", "focus": "Consolidation", "actions": ["Measure sentiment uplift on targeted prompts", "Refresh schema markup and owned content"]},
        ],
        "kpis": [
            {"metric": "Sentiment score", "current": str(round(sentiment, 1)), "target": str(min(100, round(sentiment + 15, 1))), "timeline": "30 days"},
            {"metric": "Visibility", "current": f"{round(visibility * 100, 1)}%", "target": f"{min(100, round((visibility + 0.1) * 100, 1))}%", "timeline": "30 days"},
        ],
    }


# ── Competitor Strategies ────────────────────────────────────────────────────


async def generate_competitor_strategies(
    brand_name: str,
    competitor_name: str,
    event_type: str,
    weakness: str,
    affected_prompts: list[str],
    opportunity_score: float,
) -> dict:
    """Generate tailored offensive + defensive strategies for a specific competitor event."""
    key = f"comp_strat:{_fp(brand_name, competitor_name, weakness[:40])}"
    cached = _get(key)
    if cached is not None:
        return cached

    client = _client()
    if client is None:
        return _put(key, _fallback_competitor_strategies(brand_name, competitor_name, weakness))

    prompts_str = "\n".join(f"  - {p}" for p in affected_prompts[:5]) or "  (general)"

    system = "You are a brand strategist. Return JSON only. No markdown. Be specific and tactical."
    user = f"""Brand: '{brand_name}'
Competitor: '{competitor_name}'
Situation: {competitor_name} has a reputation crisis — {weakness}
Affected questions/prompts:
{prompts_str}
Opportunity score: {round(opportunity_score * 100)}%

Generate specific strategies. Return JSON:
{{
  "offensive_plays": [
    {{
      "play": "play name",
      "action": "specific action tied to {competitor_name}'s specific weakness",
      "content_example": "exact headline or message to use",
      "channel": "where to publish/post",
      "timeline": "Immediate|Week 1|Week 2"
    }}
  ],
  "defensive_checks": [
    {{
      "check": "what to verify about {brand_name}",
      "action": "specific action to take",
      "why": "why this matters given {competitor_name}'s situation",
      "priority": "Immediate|This week|Ongoing"
    }}
  ],
  "content_brief": {{
    "headline": "Suggested page/article headline",
    "angle": "The specific narrative angle",
    "proof_points": ["proof point 1", "proof point 2", "proof point 3"],
    "target_queries": ["query 1", "query 2", "query 3"]
  }}
}}"""

    try:
        text = _call(client, "claude-haiku-4-5-20251001", system, user, max_tokens=1200)
        data = _parse(text)
        if isinstance(data, dict) and "offensive_plays" in data:
            return _put(key, data)
    except Exception as exc:
        print(f"[ai_engine] generate_competitor_strategies failed: {exc}")

    return _put(key, _fallback_competitor_strategies(brand_name, competitor_name, weakness))


def _fallback_competitor_strategies(brand_name, competitor_name, weakness):
    return {
        "offensive_plays": [
            {"play": "Comparison content", "action": f"Publish '{brand_name} vs {competitor_name}' comparison addressing {weakness}", "content_example": f"Why {brand_name} is the trusted alternative to {competitor_name}", "channel": "Blog + landing page", "timeline": "Week 1"},
            {"play": "Review amplification", "action": f"Drive {brand_name} customer reviews on G2 and Capterra contrasting with {competitor_name}", "content_example": f"Customers switch from {competitor_name} to {brand_name}", "channel": "Review platforms", "timeline": "Week 1-2"},
        ],
        "defensive_checks": [
            {"check": f"Verify {brand_name} AI model response on the same topics", "action": "Run the affected prompts and check how AI models describe your brand", "why": f"Guilt-by-association risk — {competitor_name}'s issues can spread to category peers", "priority": "Immediate"},
            {"check": "Confirm own content addresses these topics", "action": "Audit FAQ, trust pages, and schema markup for coverage", "why": "AI models cite structured owned content — gaps leave you vulnerable", "priority": "This week"},
        ],
        "content_brief": {
            "headline": f"Why {brand_name} is the Trusted Alternative to {competitor_name}",
            "angle": f"Factual comparison highlighting where {brand_name} excels in areas where {competitor_name} is struggling",
            "proof_points": ["Customer testimonials", "Third-party certifications", "Track record vs competitors"],
            "target_queries": [f"{competitor_name} alternatives", f"{competitor_name} vs {brand_name}", f"best {competitor_name} replacement"],
        },
    }
