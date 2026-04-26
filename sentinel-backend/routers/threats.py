"""
Threats Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json

from database import get_db
from models import Threat, AppConfig
from engines.live_signals import detect_threats, _anthropic_recommendations, _SEVERITY_ORDER
from engines.ai_engine import generate_narrative
from peec.client import peec_client

router = APIRouter()


def _security_prompt_ids(config: AppConfig) -> Optional[List[str]]:
    """Always scope to the project's configured reputation prompts when present."""
    if not config or not config.custom_prompt_ids:
        return None
    try:
        parsed = json.loads(config.custom_prompt_ids)
        return parsed if isinstance(parsed, list) and parsed else None
    except Exception:
        return None


class ThreatResponse(BaseModel):
    """Threat response model"""
    id: str
    brand_id: str
    project_id: str
    type: str
    severity: str
    model: str
    summary: str
    evidence: str
    source_url: Optional[str]
    auto_fixable: bool
    fix_type: Optional[str]
    status: str
    chat_id: Optional[str]
    detected_at: datetime
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ThreatUpdate(BaseModel):
    """Threat update request"""
    status: Optional[str] = None


@router.get("/threats")
async def list_threats(
    severity: Optional[str] = None,
    model: Optional[str] = None,
    status: Optional[str] = "OPEN",
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db)
) -> dict:
    """List live threats derived from real Peec metrics."""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not config or not config.project_id or not config.brand_id:
        return {"total": 0, "limit": limit, "offset": offset, "data": []}

    threats = await detect_threats(
        config.project_id, config.brand_id,
        config.company_name or "your brand",
        prompt_ids=_security_prompt_ids(config),
    )

    if severity:
        threats = [t for t in threats if t["severity"] == severity]
    if model:
        threats = [t for t in threats if t["model"] == model]
    if status:
        threats = [t for t in threats if t["status"] == status]

    total = len(threats)
    page = threats[offset:offset + limit]
    return {"total": total, "limit": limit, "offset": offset, "data": page}


@router.get("/threats/reputation-questions")
async def get_reputation_questions(db: Session = Depends(get_db)) -> dict:
    """Return the 10 reputation risk questions with live threat status and recommended actions."""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not config or not config.project_id or not config.brand_id:
        return {"questions": [], "configured": False, "message": "Select a project in Settings first."}

    prompt_ids = _security_prompt_ids(config)
    if not prompt_ids:
        return {
            "questions": [],
            "configured": False,
            "message": "No reputation risk questions configured. Select a project in Settings to auto-configure.",
        }

    all_prompts = await peec_client.list_prompts(config.project_id)
    prompt_map = {p.id: p.message for p in all_prompts}

    threats = await detect_threats(
        config.project_id, config.brand_id,
        config.company_name or "your brand",
        prompt_ids=prompt_ids,
    )

    # Index prompt-level threats by prompt_id (keep worst severity per prompt)
    threat_by_prompt: dict[str, dict] = {}
    for t in threats:
        pid = t.get("prompt_id")
        if pid and pid in prompt_ids:
            existing = threat_by_prompt.get(pid)
            if not existing or _SEVERITY_ORDER.get(t["severity"], 9) < _SEVERITY_ORDER.get(existing["severity"], 9):
                threat_by_prompt[pid] = t

    questions = []
    for pid in prompt_ids:
        text = prompt_map.get(pid, f"Reputation question {pid[:8]}")
        threat = threat_by_prompt.get(pid)

        if not threat:
            status = "SAFE"
            actions: list = []
        elif threat["severity"] in ("CRITICAL", "HIGH"):
            status = "CRISIS"
            actions = threat.get("counter_strategy", {}).get("priority_actions", [])
        else:
            status = "AT_RISK"
            actions = threat.get("counter_strategy", {}).get("priority_actions", [])

        # Use Anthropic to fill in missing actions
        if threat and not actions:
            actions = await _anthropic_recommendations(
                config.company_name or "your brand",
                text,
                threat.get("type", "REPUTATION_RISK"),
            )

        questions.append({
            "prompt_id": pid,
            "question": text,
            "status": status,
            "threat": threat,
            "recommended_actions": actions,
        })

    return {"questions": questions, "total": len(questions), "configured": True}


@router.get("/threats/narrative")
async def get_narrative(db: Session = Depends(get_db)) -> dict:
    """Anthropic-powered narrative analysis of the current reputation landscape."""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not config or not config.project_id or not config.brand_id:
        return {"configured": False, "message": "Select a project in Settings first."}

    prompt_ids = _security_prompt_ids(config)
    brand = config.company_name or "your brand"

    from engines.live_signals import detect_competitor_events
    threats = await detect_threats(
        config.project_id, config.brand_id, brand, prompt_ids=prompt_ids
    )
    competitors = await detect_competitor_events(
        config.project_id, config.brand_id, brand, prompt_ids=prompt_ids
    )

    # Pull sentiment/visibility from the threat data averages
    sentiment_vals = [t["counter_strategy"]["severity_context"] for t in threats if t.get("counter_strategy")]
    # Use threat count as proxy — fetch from Peec brands report for real values
    from peec.client import peec_client as _peec
    from datetime import datetime, timedelta
    end = datetime.utcnow().date()
    start = end - timedelta(days=30)
    try:
        report = await _peec.get_brands_report(
            project_id=config.project_id, dimensions=["model_id"],
            start_date=start.isoformat(), end_date=end.isoformat(),
            brand_id=config.brand_id, prompt_ids=prompt_ids,
        )
        rows = report.data or []
        visibility = sum(r.visibility or 0 for r in rows) / max(1, len(rows))
        sents = [r.sentiment for r in rows if r.sentiment]
        sentiment = sum(sents) / max(1, len(sents))
    except Exception:
        visibility, sentiment = 0.0, 50.0

    narrative = await generate_narrative(brand, threats, competitors, visibility, sentiment)
    narrative["configured"] = True
    narrative["brand_name"] = brand
    return narrative


@router.get("/threats/{threat_id}")
async def get_threat(
    threat_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Get a single threat (resolved against the live set)."""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not config or not config.project_id or not config.brand_id:
        raise HTTPException(status_code=404, detail="Threat not found")

    threats = await detect_threats(
        config.project_id, config.brand_id,
        config.company_name or "your brand",
        prompt_ids=_security_prompt_ids(config),
    )
    found = next((t for t in threats if t["id"] == threat_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Threat not found")
    return found


@router.patch("/threats/{threat_id}")
async def update_threat(
    threat_id: str,
    update: ThreatUpdate,
    db: Session = Depends(get_db)
) -> dict:
    """Update threat status"""
    threat = db.query(Threat).filter(Threat.id == threat_id).first()
    
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    
    if update.status:
        threat.status = update.status
        if update.status in ["RESOLVED", "DISMISSED"]:
            threat.resolved_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "status": "success",
        "message": "Threat updated successfully"
    }


@router.post("/threats/{threat_id}/fix")
async def auto_fix_threat(
    threat_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Generate auto-fix for a live threat, with Anthropic fallback for missing templates."""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not config or not config.project_id or not config.brand_id:
        raise HTTPException(status_code=404, detail="Threat not found")

    threats = await detect_threats(
        config.project_id, config.brand_id,
        config.company_name or "your brand",
        prompt_ids=_security_prompt_ids(config),
    )
    threat = next((t for t in threats if t["id"] == threat_id), None)
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    if not threat.get("auto_fixable"):
        raise HTTPException(status_code=400, detail="Threat is not auto-fixable")

    fix_type = threat.get("fix_type", "")
    summary = threat.get("summary", "")
    evidence = threat.get("evidence", "")
    brand = config.company_name or "your brand"
    fix_content = ""

    if fix_type == "CONTENT_UPDATE":
        fix_content = f"""# Content Brief to Address Reputation Risk

**Issue:** {summary}

**Evidence:** {evidence}

**Recommended Action:**
Create authoritative content that:
1. Addresses this reputation concern directly with verified facts
2. Provides transparent, proactive information about {brand}'s position
3. Demonstrates trust, compliance, and leadership in this area

**Target Keywords:** {brand} + trust, {brand} + transparency, {brand} + [topic]
**Format:** Blog post, FAQ, or dedicated trust page
**Tone:** Professional, transparent, evidence-backed
"""
    elif fix_type == "PR_OUTREACH":
        fix_content = f"""# PR Outreach Template

**Subject:** Clarification Request — {summary}

**Body:**
Dear Editor,

We noticed coverage or AI-generated content that misrepresents {brand}'s position on this topic.

**The concern:** {evidence}

**The accurate picture:** {brand} [provide factual clarification here]

We'd appreciate an update or correction to ensure readers have accurate information.
Supporting documentation available on request.

Best regards,
[Your Name], {brand} Communications
"""
    else:
        # Anthropic fallback for unrecognized fix types
        try:
            from config import settings
            if settings.has_anthropic_key:
                import anthropic as _anthropic
                client = _anthropic.Anthropic(api_key=settings.anthropic_api_key)
                resp = client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=600,
                    messages=[{"role": "user", "content": (
                        f"Generate a reputation management action plan for brand '{brand}'. "
                        f"Issue: {summary}. Evidence: {evidence}. "
                        "Format as a short actionable markdown brief with specific next steps."
                    )}],
                )
                fix_content = (resp.content[0].text if resp.content else "").strip()
            else:
                fix_content = f"Manual review required for: {summary}\n\nEvidence: {evidence}"
        except Exception:
            fix_content = f"Manual review required for: {summary}\n\nEvidence: {evidence}"

    return {
        "status": "success",
        "fix_type": fix_type,
        "fix_content": fix_content,
    }


@router.get("/threats/stats/summary")
async def get_threat_stats(db: Session = Depends(get_db)) -> dict:
    """Live threat statistics."""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not config or not config.project_id or not config.brand_id:
        return {"critical": 0, "high": 0, "medium": 0, "low": 0}
    threats = await detect_threats(
        config.project_id, config.brand_id,
        config.company_name or "your brand",
        prompt_ids=_security_prompt_ids(config),
    )
    return {
        "critical": sum(1 for t in threats if t["severity"] == "CRITICAL"),
        "high": sum(1 for t in threats if t["severity"] == "HIGH"),
        "medium": sum(1 for t in threats if t["severity"] == "MEDIUM"),
        "low": sum(1 for t in threats if t["severity"] == "LOW"),
    }
