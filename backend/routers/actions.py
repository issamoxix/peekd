"""
Actions Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import json

from database import get_db
from models import Action

router = APIRouter()


class ActionResponse(BaseModel):
    """Action response model"""
    id: str
    project_id: str
    brand_id: str
    category: str
    opportunity_score: float
    opportunity_level: str
    domain: str
    title: str
    rationale: str
    competitor_presence: list
    keywords: list
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to parse JSON fields"""
        data = {
            "id": obj.id,
            "project_id": obj.project_id,
            "brand_id": obj.brand_id,
            "category": obj.category,
            "opportunity_score": obj.opportunity_score,
            "opportunity_level": obj.opportunity_level,
            "domain": obj.domain,
            "title": obj.title,
            "rationale": obj.rationale,
            "competitor_presence": json.loads(obj.competitor_presence) if obj.competitor_presence else [],
            "keywords": json.loads(obj.keywords) if obj.keywords else [],
            "status": obj.status,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at
        }
        return cls(**data)


class ActionUpdate(BaseModel):
    """Action update request"""
    status: Optional[str] = None


@router.get("/actions")
async def list_actions(
    category: Optional[str] = None,
    status: Optional[str] = "PENDING",
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db)
) -> dict:
    """List actions with filters"""
    query = db.query(Action)
    
    if category:
        query = query.filter(Action.category == category)
    if status:
        query = query.filter(Action.status == status)
    
    # Get total count
    total = query.count()
    
    # Get paginated results sorted by opportunity score
    actions = query.order_by(Action.opportunity_score.desc()).limit(limit).offset(offset).all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [ActionResponse.from_orm(a) for a in actions]
    }


@router.get("/actions/{action_id}")
async def get_action(
    action_id: str,
    db: Session = Depends(get_db)
) -> ActionResponse:
    """Get action detail"""
    action = db.query(Action).filter(Action.id == action_id).first()
    
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    
    return ActionResponse.from_orm(action)


@router.patch("/actions/{action_id}")
async def update_action(
    action_id: str,
    update: ActionUpdate,
    db: Session = Depends(get_db)
) -> dict:
    """Update action status"""
    action = db.query(Action).filter(Action.id == action_id).first()
    
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    
    if update.status:
        action.status = update.status
        action.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "status": "success",
        "message": "Action updated successfully"
    }
