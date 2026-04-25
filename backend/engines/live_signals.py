"""
Derive threats and competitor events from real Peec API metrics — no DB,
no seeded fixtures. Each call refetches the underlying reports (which are
cached for 15 minutes inside the Peec client).
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib

from peec.client import peec_client
from peec.schemas import BrandMetric


_SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}


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
        start_date=start_str, end_date=end_str, brand_id=brand_id,
    )

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
            })

    # Per-prompt signals — find the worst-performing prompts
    prompt_rows = sorted(
        (m for m in (by_prompt.data or []) if m.prompt_id),
        key=lambda x: (x.visibility or 0, x.sentiment or 100),
    )
    for m in prompt_rows[:8]:
        text = prompt_label.get(m.prompt_id or "", m.prompt_id or "")
        snippet = (text[:90] + "…") if len(text) > 90 else text or "(prompt)"

        if m.visibility is not None and m.visibility == 0:
            threats.append({
                "id": _stable_id("p_gap", brand_id, m.prompt_id or ""),
                "severity": "HIGH", "type": "COMPETITIVE_GAP",
                "model": "all",
                "summary": f"Not mentioned for prompt: \"{snippet}\"",
                "evidence": f"0 mentions of {brand_name} for this query in 30 days.",
                "source_url": None, "auto_fixable": True,
                "fix_type": "CONTENT_UPDATE", "status": "OPEN",
                "chat_id": None, "detected_at": now_iso, "resolved_at": None,
                "brand_id": brand_id, "project_id": project_id,
            })
        if m.sentiment and 0 < m.sentiment < 40:
            threats.append({
                "id": _stable_id("p_neg", brand_id, m.prompt_id or ""),
                "severity": "HIGH" if m.sentiment < 30 else "MEDIUM",
                "type": "NEGATIVE_FRAMING",
                "model": "all",
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
            })

    threats.sort(key=lambda t: (_SEVERITY_ORDER.get(t["severity"], 9), t["type"]))
    return threats


async def detect_competitor_events(
    project_id: str, brand_id: str, brand_name: str,
) -> list[dict]:
    """Real competitor crises pulled from the unfiltered brands report."""
    if not project_id:
        return []

    start_str, end_str = _date_window(30)
    by_brand_model = await peec_client.get_brands_report(
        project_id=project_id, dimensions=["model_id"],
        start_date=start_str, end_date=end_str,
    )
    if not by_brand_model.data:
        return []

    by_brand: dict[str, list[BrandMetric]] = {}
    for m in by_brand_model.data:
        if m.brand_id == brand_id:
            continue
        by_brand.setdefault(m.brand_id, []).append(m)

    now_iso = datetime.now(timezone.utc).isoformat()
    events: list[dict] = []
    for bid, rows in by_brand.items():
        if not rows:
            continue
        name = rows[0].brand_name or bid
        sentiments = [r.sentiment for r in rows if r.sentiment]
        avg_sent = (sum(sentiments) / len(sentiments)) if sentiments else None
        avg_vis = sum((r.visibility or 0) for r in rows) / len(rows)
        affected_models = sorted({_channel(r.model_id) for r in rows if r.sentiment and r.sentiment < 50})

        if avg_sent is not None and avg_sent < 50 and affected_models:
            severity = "HIGH" if avg_sent < 40 else "MEDIUM"
            opportunity = round(min(1.0, (50 - avg_sent) / 50 + (1 - avg_vis) * 0.3), 3)
            events.append({
                "id": _stable_id("comp_sent", bid),
                "project_id": project_id,
                "competitor_name": name,
                "event_type": "SENTIMENT_CRISIS",
                "severity": severity,
                "affected_models": affected_models,
                "affected_prompts": [],
                "opportunity_score": opportunity,
                "recommended_actions": [
                    f"Publish a comparison page: {brand_name} vs {name}",
                    f"Outreach to editorial sources covering {name}'s issues",
                    "Encourage customer reviews on G2 / Reddit",
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
                "affected_prompts": [],
                "opportunity_score": round(min(1.0, (0.3 - avg_vis) * 2), 3),
                "recommended_actions": [
                    f"Target keywords where {name} has lost visibility",
                    "Update schema markup on category pages",
                ],
                "detected_at": now_iso,
            })

    events.sort(key=lambda e: e["opportunity_score"], reverse=True)
    return events
