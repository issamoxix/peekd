"""
Actions Router — Anthropic-powered live action queue derived from real Peec data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import json

from database import get_db
from models import AppConfig
from engines.live_signals import detect_threats, detect_competitor_events
from engines.ai_engine import generate_action_queue

router = APIRouter()


def _security_prompt_ids(config: AppConfig) -> Optional[list]:
    """Always scope to the project's configured reputation prompts when present."""
    if not config or not config.custom_prompt_ids:
        return None
    try:
        parsed = json.loads(config.custom_prompt_ids)
        return parsed if isinstance(parsed, list) and parsed else None
    except Exception:
        return None


@router.get("/actions")
async def list_actions(
    category: Optional[str] = None,
    status: Optional[str] = "PENDING",
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
) -> dict:
    """Live action queue — Anthropic-generated from real threats and competitor events."""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not config or not config.project_id or not config.brand_id:
        return {"total": 0, "limit": limit, "offset": offset, "data": []}

    prompt_ids = _security_prompt_ids(config)
    brand = config.company_name or "your brand"

    threats = await detect_threats(
        config.project_id, config.brand_id, brand, prompt_ids=prompt_ids
    )
    competitors = await detect_competitor_events(
        config.project_id, config.brand_id, brand, prompt_ids=prompt_ids
    )

    actions = await generate_action_queue(brand, threats, competitors)

    if category:
        actions = [a for a in actions if a.get("category") == category]

    total = len(actions)
    page = actions[offset : offset + limit]
    return {"total": total, "limit": limit, "offset": offset, "data": page}


@router.patch("/actions/{action_id}")
async def update_action(action_id: str, update: dict, db: Session = Depends(get_db)) -> dict:
    """Accept status updates (client-side state only — live actions are not DB-persisted)."""
    return {"status": "success", "message": "Action status noted"}
