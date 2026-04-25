"""
Competitors Router
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

from database import get_db
from models import CompetitorEvent, AppConfig
from engines.live_signals import detect_competitor_events
from pydantic import BaseModel

router = APIRouter()


class CompetitorEventResponse(BaseModel):
    """Competitor event response"""
    id: str
    project_id: str
    competitor_name: str
    event_type: str
    severity: str
    affected_models: List[str]
    affected_prompts: List[str]
    opportunity_score: float
    recommended_actions: List[str]
    detected_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to parse JSON fields"""
        data = {
            "id": obj.id,
            "project_id": obj.project_id,
            "competitor_name": obj.competitor_name,
            "event_type": obj.event_type,
            "severity": obj.severity,
            "affected_models": json.loads(obj.affected_models) if obj.affected_models else [],
            "affected_prompts": json.loads(obj.affected_prompts) if obj.affected_prompts else [],
            "opportunity_score": obj.opportunity_score,
            "recommended_actions": json.loads(obj.recommended_actions) if obj.recommended_actions else [],
            "detected_at": obj.detected_at
        }
        return cls(**data)


@router.get("/competitors")
async def list_competitor_events(
    db: Session = Depends(get_db)
) -> dict:
    """Live competitor crises derived from real Peec brand metrics."""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not config or not config.project_id or not config.brand_id:
        return {"total": 0, "data": []}
    events = await detect_competitor_events(
        config.project_id, config.brand_id,
        config.company_name or "your brand",
    )
    return {"total": len(events), "data": events}


@router.get("/competitors/{event_id}")
async def get_competitor_event(
    event_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Get a competitor event by its derived id."""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    if not config or not config.project_id or not config.brand_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")
    events = await detect_competitor_events(
        config.project_id, config.brand_id,
        config.company_name or "your brand",
    )
    found = next((e for e in events if e["id"] == event_id), None)
    if not found:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")
    return found
