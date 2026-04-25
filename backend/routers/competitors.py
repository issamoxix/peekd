"""
Competitors Router
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

from database import get_db
from models import CompetitorEvent
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
    """List competitor crisis events"""
    events = db.query(CompetitorEvent).order_by(
        CompetitorEvent.opportunity_score.desc()
    ).limit(50).all()
    
    return {
        "total": len(events),
        "data": [CompetitorEventResponse.from_orm(e) for e in events]
    }


@router.get("/competitors/{event_id}")
async def get_competitor_event(
    event_id: str,
    db: Session = Depends(get_db)
) -> CompetitorEventResponse:
    """Get competitor event detail"""
    event = db.query(CompetitorEvent).filter(CompetitorEvent.id == event_id).first()
    
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")
    
    return CompetitorEventResponse.from_orm(event)
