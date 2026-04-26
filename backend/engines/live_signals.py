"""
Derive threats and competitor events from real Peec API metrics — no DB,
no seeded fixtures. Each call refetches the underlying reports (which are
cached for 15 minutes inside the Peec client).
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import json

from peec.client import peec_client
from peec.schemas import BrandMetric


_SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}


async def _anthropic_recommendations(brand_name: str, question: str, threat_type: str) -> list[str]:
    """Call Anthropic to generate reputation-risk actions when defaults are insufficient."""
    try:
        from config import settings
        if not settings.has_anthropic_key:
            return []
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": (
                f"Brand: '{brand_name}'. Reputation risk question: '{question}'. "
                f"Threat type: {threat_type}. "
                "Provide 3 specific, tactical reputation management actions. "
                "Return JSON: {\"actions\": [\"step1\", \"step2\", \"step3\"]}"
            )}],
        )
        text = (resp.content[0].text if resp.content else "").strip()
        data = json.loads(text)
        return data.get("actions", [])
    except Exception:
        return []


def _channel(model_id: Optional[str]) -> str:
    if not model_id:
        return "all"
    mid = model_id.lower()
    if "chatgpt" in mid or mid.startswith("gpt"): return "chatgpt"
    if "perplexity" in mid: return "perplexity"
    if "claude" in mid: return "claude"
    if "gemini" in mid or "google-ai" in mid: return "gemini"
    if "copilot" in mid or "bing" in mid: return "copilot"
    if "grok" in mid: return "grok"
    if "deepseek" in mid: return "deepseek"
    return mid


def _stable_id(*parts: str) -> str:
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]


def _date_window(days: int = 30) -> tuple[str, str]:
    end = datetime.utcnow().date()
    start = end - timedelta(days=days)
    return start.isoformat(), end.isoformat()


async def detect_threats(
    project_id: str,
    brand_id: str,
    brand_name: str,
    prompt_ids: Optional[list[str]] = None,
) -> list[dict]:
    """Return real threats derived from Peec metrics for the configured brand."""
    if not project_id or not brand_id:
        return []

    start_str, end_str = _date_window(30)
    threats: list[dict] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    by_model = await peec_client.get_brands_report(
        project_id=project_id, dimensions=["model_id"],
        start_date=start_str, end_date=end_str, brand_id=brand_id,
    )
    by_prompt = await peec_client.get_brands_report(
        project_id=project_id, dimensions=["prompt_id"],
        start_date=start_str, end_date=end_str, brand_id=brand_id, prompt_ids=prompt_ids,
    )
    def build_counter_strategy(summary: str, threat_type: str, severity: str) -> dict:
        threat_keywords = [
            f"{brand_name} security",
            f"{brand_name} compliance",
            f"{brand_name} trust",
        ]
        return {
            "narrative_goal": (
                "Shift conversation from security doubt to visible security leadership"
            ),
            "offensive_tactics": [
                {
                    "name": "Positive Content Flooding",
                    "description": "Publish high-authority content proving security strength.",
                    "actions": [
                        f"Blog: '{brand_name} Zero-Trust Security Architecture'",
                        f"Whitepaper: '{brand_name} Security & Compliance Framework'",
                        f"Case Study: 'How customers trust {brand_name} for secure operations'",
                        "Press release covering latest certification and controls",
                    ],
                    "target_keywords": threat_keywords,
                    "success_metric": "Top search/LLM citations are mostly owned positive assets",
                },
                {
                    "name": "Competitor Vulnerability Highlighting",
                    "description": "Reframe market context with factual competitive comparisons.",
                    "actions": [
                        f"Publish comparison page: '{brand_name} vs competitors on security controls'",
                        "Commission third-party validation and cite it in outreach",
                    ],
                    "target_keywords": ["competitor security issues", "industry security gaps"],
                    "success_metric": "Coverage broadens to industry context, not just your threat",
                },
            ],
            "defensive_tactics": [
                {
                    "name": "Authoritative Correction",
                    "description": "Issue factual corrections where misleading narratives appear.",
                    "channels": ["Editorial outreach", "Social response", "Community forums"],
                    "template": f"Correction for: {summary}. Provide evidence and authoritative references.",
                },
                {
                    "name": "Proactive Transparency",
                    "description": "Address concerns with explicit updates and response timelines.",
                    "actions": [
                        "Publish incident response and remediation progress",
                        "Share leadership commentary on security roadmap",
                    ],
                },
            ],
            "priority_actions": [
                "Within 48 hours: publish a factual security explainer landing page",
                "Within 1 week: start correction outreach to high-visibility channels",
                "Within 2 weeks: launch comparative thought-leadership assets",
            ],
            "monitoring": {
                "kpis": [
                    "SERP/LLM prominence for threat keywords",
                    "Sentiment uplift on affected prompts/models",
                    "Positive security mention growth",
                ],
                "dashboard": "Narrative Shift Tracker",
            },
            "threat_type": threat_type,
            "severity_context": severity,
        }


    # Resolve labels
    models = await peec_client.list_models(project_id)
    model_label = {m.id: m.name for m in models}
    prompts = await peec_client.list_prompts(project_id)
    prompt_label = {p.id: p.message for p in prompts}

    # Per-model signals
    for m in (by_model.data or []):
        ch = _channel(m.model_id)
        label = model_label.get(m.model_id or "", m.model_id or "AI model")

        if m.sentiment and m.sentiment > 0:
            if m.sentiment < 30:
                sev = "CRITICAL"
            elif m.sentiment < 45:
                sev = "HIGH"
            elif m.sentiment < 60:
                sev = "MEDIUM"
            else:
                sev = None
            if sev:
                threats.append({
                    "id": _stable_id("sent", brand_id, m.model_id or ""),
                    "severity": sev, "type": "SENTIMENT_DROP",
                    "model": ch,
                    "summary": f"{label} sentiment for {brand_name} is {round(m.sentiment)}/100",
                    "evidence": (
                        f"Across {m.mention_count or 0} mentions in {label} responses, "
                        f"sentiment averages {round(m.sentiment, 1)}/100 "
                        f"(visibility {round((m.visibility or 0) * 100)}%)."
                    ),
                    "source_url": None, "auto_fixable": False,
                    "fix_type": None, "status": "OPEN",
                    "chat_id": None, "detected_at": now_iso, "resolved_at": None,
                    "brand_id": brand_id, "project_id": project_id,
                    "counter_strategy": build_counter_strategy(
                        f"{label} sentiment for {brand_name} is {round(m.sentiment)}/100",
                        "SENTIMENT_DROP",
                        sev,
                    ),
                })

        if m.visibility is not None:
            if m.visibility == 0 and (m.mention_count or 0) == 0:
                sev = "HIGH"
                threats.append({
                    "id": _stable_id("vis0", brand_id, m.model_id or ""),
                    "severity": sev, "type": "COMPETITIVE_GAP",
                    "model": ch,
                    "summary": f"{brand_name} is absent from {label} responses",
                    "evidence": f"0 mentions across the last 30 days of {label} traffic.",
                    "source_url": None, "auto_fixable": False,
                    "fix_type": None, "status": "OPEN",
                    "chat_id": None, "detected_at": now_iso, "resolved_at": None,
                    "brand_id": brand_id, "project_id": project_id,
                    "counter_strategy": build_counter_strategy(
                        f"{brand_name} is absent from {label} responses",
                        "COMPETITIVE_GAP",
                        sev,
                    ),
                })
            elif 0 < m.visibility < 0.15:
                sev = "HIGH" if m.visibility < 0.05 else "MEDIUM"
                threats.append({
                    "id": _stable_id("lowvis", brand_id, m.model_id or ""),
                    "severity": sev, "type": "LOW_VISIBILITY",
                    "model": ch,
                    "summary": (
                        f"{brand_name} appears in only "
                        f"{round(m.visibility * 100)}% of {label} responses"
                    ),
                    "evidence": (
                        f"{m.mention_count or 0} mentions across {label} chats; "
                        f"visibility {round(m.visibility * 100)}%."
                    ),
                    "source_url": None, "auto_fixable": True,
                    "fix_type": "CONTENT_UPDATE", "status": "OPEN",
                    "chat_id": None, "detected_at": now_iso, "resolved_at": None,
                    "brand_id": brand_id, "project_id": project_id,
                    "counter_strategy": build_counter_strategy(
                        f"{brand_name} appears in only {round(m.visibility * 100)}% of {label} responses",
                        "LOW_VISIBILITY",
                        sev,
                    ),
                })

        if m.position is not None and m.position >= 4 and (m.mention_count or 0) > 0:
            threats.append({
                "id": _stable_id("pos", brand_id, m.model_id or ""),
                "severity": "MEDIUM" if m.position < 6 else "HIGH",
                "type": "POSITION_DROP",
                "model": ch,
                "summary": (
                    f"{brand_name} ranks #{round(m.position, 1)} on average in {label}"
                ),
                "evidence": (
                    f"Average position {round(m.position, 2)} across "
                    f"{m.mention_count or 0} mentions — competitors lead."
                ),
                "source_url": None, "auto_fixable": False,
                "fix_type": None, "status": "OPEN",
                "chat_id": None, "detected_at": now_iso, "resolved_at": None,
                "brand_id": brand_id, "project_id": project_id,
                "counter_strategy": build_counter_strategy(
                    f"{brand_name} ranks #{round(m.position, 1)} on average in {label}",
                    "POSITION_DROP",
                    "MEDIUM" if m.position < 6 else "HIGH",
                ),
            })

    # Per-prompt signals — process all reputation prompts, or worst 10 when unfiltered
    prompt_rows = sorted(
        (m for m in (by_prompt.data or []) if m.prompt_id),
        key=lambda x: (x.visibility or 0, x.sentiment or 100),
    )
    max_prompt_rows = len(prompt_ids) if prompt_ids else 10
    for m in prompt_rows[:max_prompt_rows]:
        text = prompt_label.get(m.prompt_id or "", m.prompt_id or "")
        snippet = (text[:90] + "…") if len(text) > 90 else text or "(prompt)"

        if m.visibility is not None and m.visibility == 0:
            threats.append({
                "id": _stable_id("p_gap", brand_id, m.prompt_id or ""),
                "severity": "HIGH", "type": "COMPETITIVE_GAP",
                "model": "all",
                "prompt_id": m.prompt_id,
                "summary": f"Not mentioned for prompt: \"{snippet}\"",
                "evidence": f"0 mentions of {brand_name} for this query in 30 days.",
                "source_url": None, "auto_fixable": True,
                "fix_type": "CONTENT_UPDATE", "status": "OPEN",
                "chat_id": None, "detected_at": now_iso, "resolved_at": None,
                "brand_id": brand_id, "project_id": project_id,
                "counter_strategy": build_counter_strategy(
                    f'Not mentioned for prompt: "{snippet}"',
                    "COMPETITIVE_GAP",
                    "HIGH",
                ),
            })
        if m.sentiment and 0 < m.sentiment < 40:
            threats.append({
                "id": _stable_id("p_neg", brand_id, m.prompt_id or ""),
                "severity": "HIGH" if m.sentiment < 30 else "MEDIUM",
                "type": "NEGATIVE_FRAMING",
                "model": "all",
                "prompt_id": m.prompt_id,
                "summary": (
                    f"Negative framing on \"{snippet}\" "
                    f"({round(m.sentiment)}/100)"
                ),
                "evidence": (
                    f"Sentiment for {brand_name} on this prompt averages "
                    f"{round(m.sentiment, 1)}/100."
                ),
                "source_url": None, "auto_fixable": False,
                "fix_type": "PR_OUTREACH", "status": "OPEN",
                "chat_id": None, "detected_at": now_iso, "resolved_at": None,
                "brand_id": brand_id, "project_id": project_id,
                "counter_strategy": build_counter_strategy(
                    f'Negative framing on "{snippet}"',
                    "NEGATIVE_FRAMING",
                    "HIGH" if m.sentiment < 30 else "MEDIUM",
                ),
            })

    threats.sort(key=lambda t: (_SEVERITY_ORDER.get(t["severity"], 9), t["type"]))
    return threats


async def detect_competitor_events(
    project_id: str, brand_id: str, brand_name: str, prompt_ids: Optional[list[str]] = None,
) -> list[dict]:
    """Real competitor crises pulled from the unfiltered brands report."""
    if not project_id:
        return []

    start_str, end_str = _date_window(30)
    by_brand_model = await peec_client.get_brands_report(
        project_id=project_id, dimensions=["model_id"],
        start_date=start_str, end_date=end_str, prompt_ids=prompt_ids,
    )
    by_brand_prompt = await peec_client.get_brands_report(
        project_id=project_id, dimensions=["prompt_id"],
        start_date=start_str, end_date=end_str, prompt_ids=prompt_ids,
    )
    if not by_brand_model.data:
        return []

    by_brand: dict[str, list[BrandMetric]] = {}
    for m in by_brand_model.data:
        if m.brand_id == brand_id:
            continue
        by_brand.setdefault(m.brand_id, []).append(m)

    now_iso = datetime.now(timezone.utc).isoformat()
    prompt_map = {p.id: p.message for p in await peec_client.list_prompts(project_id)}
    our_prompt_rows = [r for r in (by_brand_prompt.data or []) if r.brand_id == brand_id and r.prompt_id]
    our_prompt_visibility = {r.prompt_id: (r.visibility or 0) for r in our_prompt_rows}
    events: list[dict] = []
    for bid, rows in by_brand.items():
        if not rows:
            continue
        name = rows[0].brand_name or bid
        sentiments = [r.sentiment for r in rows if r.sentiment]
        avg_sent = (sum(sentiments) / len(sentiments)) if sentiments else None
        avg_vis = sum((r.visibility or 0) for r in rows) / len(rows)
        affected_models = sorted({_channel(r.model_id) for r in rows if r.sentiment and r.sentiment < 50})

        competitor_prompt_rows = [r for r in (by_brand_prompt.data or []) if r.brand_id == bid and r.prompt_id]
        weak_prompts = sorted(
            [r for r in competitor_prompt_rows if (r.sentiment and r.sentiment < 55) or (r.visibility or 0) < 0.2],
            key=lambda r: ((r.sentiment or 100), (r.visibility or 1)),
        )
        affected_prompt_labels = [
            prompt_map.get(r.prompt_id or "", r.prompt_id or "")
            for r in weak_prompts[:3]
        ]

        if avg_sent is not None and avg_sent < 50 and affected_models:
            severity = "HIGH" if avg_sent < 40 else "MEDIUM"
            opportunity = round(min(1.0, (50 - avg_sent) / 50 + (1 - avg_vis) * 0.3), 3)
            lead_prompt = weak_prompts[0] if weak_prompts else None
            lead_prompt_label = prompt_map.get(lead_prompt.prompt_id or "", "reputation prompts") if lead_prompt else "reputation prompts"
            our_visibility = our_prompt_visibility.get(lead_prompt.prompt_id if lead_prompt else "", 0)
            events.append({
                "id": _stable_id("comp_sent", bid),
                "project_id": project_id,
                "competitor_name": name,
                "event_type": "SENTIMENT_CRISIS",
                "severity": severity,
                "affected_models": affected_models,
                "affected_prompts": affected_prompt_labels,
                "opportunity_score": opportunity,
                "gap_analysis": {
                    "competitor_weakness": (
                        f"{name} sentiment dropped to {round(avg_sent, 1)}/100 on reputation prompts — users are questioning their trustworthiness"
                    ),
                    "your_position": (
                        f"{brand_name} visibility on overlapping prompts is {round(our_visibility * 100)}% — you have room to lead"
                    ),
                    "opportunity_potential": (
                        f"Capture approximately {max(20, int(opportunity * 65))}-{max(35, int(opportunity * 85))}% of displaced visibility"
                    ),
                    "brand_advantage": {
                        "headline": f"{brand_name} doesn't have {name}'s reputation problems",
                        "key_message": (
                            f"While {name} faces criticism on '{lead_prompt_label}', "
                            f"{brand_name} maintains a clean record — now is the time to make that contrast visible"
                        ),
                        "content_angle": (
                            f"Publish content that positions {brand_name} as the trusted alternative "
                            f"when users search for '{name} alternatives' or '{name} issues'"
                        ),
                        "social_proof": (
                            f"Surface {brand_name} customer testimonials and case studies that directly contrast "
                            f"with {name}'s reputation issues to capture undecided buyers"
                        ),
                    },
                },
                "defensive_playbook": {
                    "headline": f"Ensure {brand_name} is not affected by the same issue",
                    "steps": [
                        {
                            "priority": "Immediate",
                            "action": f"Audit {brand_name}'s own position on '{lead_prompt_label}' — verify AI models respond positively when users ask this about you",
                            "why": f"If {name} is being criticised for this, AI models may start applying the same lens to all players in the space including {brand_name}",
                        },
                        {
                            "priority": "This week",
                            "action": f"Publish proactive, factual content on {brand_name}'s official channels addressing '{lead_prompt_label}' directly",
                            "why": "Owning the narrative before being asked is far cheaper than correcting it after the fact",
                        },
                        {
                            "priority": "This week",
                            "action": f"Add {brand_name}'s response to this topic to your schema markup, FAQ, and knowledge base so AI models cite your owned assets",
                            "why": "AI models prioritise structured, authoritative content — having it indexed early locks in a positive answer",
                        },
                        {
                            "priority": "Ongoing",
                            "action": f"Monitor {brand_name} mentions on '{lead_prompt_label}' weekly to catch any sentiment drift before it compounds",
                            "why": f"What is damaging {name} today can spread to competitors through guilt-by-association if not addressed",
                        },
                    ],
                },
                "winning_strategies": [
                    {
                        "tactic": "publish_comparison_content",
                        "action": f"Create a '{brand_name} vs {name}' comparison page focused on '{lead_prompt_label}'",
                        "target_queries": [f"{name} issues", f"{name} vs {brand_name}", f"alternatives to {name}"],
                        "timeline": "Week 1-2",
                    },
                    {
                        "tactic": "amplify_credentials",
                        "action": f"Promote {brand_name}'s track record and certifications on the exact topic where {name} is struggling",
                        "timeline": "Immediate",
                    },
                    {
                        "tactic": "outreach_campaign",
                        "action": f"Pitch publications already covering {name}'s issues with {brand_name}'s contrasting story",
                        "target_outlets": ["industry blogs", "tech publications", "newsletters"],
                        "timeline": "Week 1-3",
                    },
                    {
                        "tactic": "ugc_amplification",
                        "action": f"Drive {brand_name} customer reviews on G2, Capterra, and Reddit specifically referencing the contrast with {name}",
                        "timeline": "Ongoing",
                    },
                ],
                "recommended_actions": [
                    f"Audit {brand_name}'s AI model response on '{lead_prompt_label}' today",
                    f"Publish proactive content on this topic on {brand_name}'s official channels",
                    f"Create a comparison page: {brand_name} vs {name}",
                    f"Outreach to editorial sources already covering {name}'s problems",
                ],
                "detected_at": now_iso,
            })
        elif avg_vis < 0.2 and (avg_sent or 60) < 60:
            events.append({
                "id": _stable_id("comp_vis", bid),
                "project_id": project_id,
                "competitor_name": name,
                "event_type": "VISIBILITY_DROP",
                "severity": "MEDIUM",
                "affected_models": sorted({_channel(r.model_id) for r in rows if (r.visibility or 0) < 0.2}),
                "affected_prompts": affected_prompt_labels,
                "opportunity_score": round(min(1.0, (0.3 - avg_vis) * 2), 3),
                "gap_analysis": {
                    "competitor_weakness": f"{name} visibility dropped to {round(avg_vis * 100)}% — AI models are no longer recommending them",
                    "your_position": f"{brand_name} has room to dominate these displaced conversations",
                    "opportunity_potential": "Prioritize fast-turn content + PR capture in the next 2 weeks",
                    "brand_advantage": {
                        "headline": f"{brand_name} is visible where {name} has gone dark",
                        "key_message": (
                            f"{name} has lost AI model visibility — users searching for their category "
                            f"are not finding them, making {brand_name} the natural alternative to surface"
                        ),
                        "content_angle": (
                            f"Create category-level content and comparison pages that capture users "
                            f"who would have found {name} before their visibility collapse"
                        ),
                        "social_proof": (
                            f"Highlight {brand_name}'s consistent AI model presence as a trust signal "
                            f"versus {name}'s declining visibility"
                        ),
                    },
                },
                "defensive_playbook": {
                    "headline": f"Protect {brand_name}'s visibility before the same drop hits you",
                    "steps": [
                        {
                            "priority": "Immediate",
                            "action": f"Check {brand_name}'s own AI model visibility on the same prompts where {name} has gone dark — confirm you are still present and positively framed",
                            "why": f"Visibility drops can be category-wide; if {name} dropped, AI models may be deprioritising this topic across all brands",
                        },
                        {
                            "priority": "This week",
                            "action": f"Refresh {brand_name}'s owned content on the affected topics — update pages, add FAQs, and ensure schema markup is current",
                            "why": "Stale content loses AI model citations; refreshed, structured content holds position",
                        },
                        {
                            "priority": "This week",
                            "action": f"Build links and citations to {brand_name}'s category pages from editorial sources that previously cited {name}",
                            "why": f"As {name} loses citations, those editorial slots are open — claim them now",
                        },
                    ],
                },
                "winning_strategies": [
                    {
                        "tactic": "fast_turn_content",
                        "action": f"Publish category explainers that fill the gap left by {name}'s disappearance from AI model results",
                        "target_queries": [f"alternatives to {name}", f"best {name} replacement"],
                        "timeline": "Week 1",
                    },
                    {
                        "tactic": "authority_signals",
                        "action": f"Refresh {brand_name}'s trust and category pages with certifications, proof points, and updated structured data",
                        "timeline": "Immediate",
                    },
                    {
                        "tactic": "citation_capture",
                        "action": f"Reach out to publications that previously cited {name} — offer {brand_name} as the updated authoritative source",
                        "timeline": "Week 1-2",
                    },
                ],
                "recommended_actions": [
                    f"Verify {brand_name}'s AI visibility on the prompts where {name} went dark",
                    f"Update schema markup and category pages to capture displaced traffic",
                    f"Pitch publications that cited {name} to cite {brand_name} instead",
                ],
                "detected_at": now_iso,
            })

    events.sort(key=lambda e: e["opportunity_score"], reverse=True)
    return events
