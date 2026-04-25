"""
Settings and Configuration Router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from models import AppConfig
from peec.client import peec_client
from peec.schemas import Project, Brand

router = APIRouter()


class ConfigUpdate(BaseModel):
    """Configuration update request"""
    peecai_api_key: Optional[str] = None
    company_name: Optional[str] = None
    project_id: Optional[str] = None
    brand_id: Optional[str] = None
    alert_email: Optional[str] = None
    sentiment_drop_threshold: Optional[float] = None
    min_sentiment_alert: Optional[float] = None
    scan_frequency_hours: Optional[int] = None


class ConfigResponse(BaseModel):
    """Configuration response"""
    peecai_api_key: str
    company_name: str
    project_id: str
    brand_id: str
    alert_email: str
    sentiment_drop_threshold: float
    min_sentiment_alert: float
    scan_frequency_hours: int


@router.get("/settings/config")
async def get_config(db: Session = Depends(get_db)) -> ConfigResponse:
    """Get current configuration"""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    
    if not config:
        # Create default config
        config = AppConfig(
            id=1,
            peecai_api_key="",
            project_id="",
            brand_id="",
            alert_email="",
            sentiment_drop_threshold=10.0,
            min_sentiment_alert=45.0,
            scan_frequency_hours=1
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return ConfigResponse(
        peecai_api_key=config.peecai_api_key or "",
        company_name=config.company_name or "",
        project_id=config.project_id or "",
        brand_id=config.brand_id or "",
        alert_email=config.alert_email or "",
        sentiment_drop_threshold=config.sentiment_drop_threshold,
        min_sentiment_alert=config.min_sentiment_alert,
        scan_frequency_hours=config.scan_frequency_hours
    )


@router.post("/settings/configure")
async def update_config(
    config_update: ConfigUpdate,
    db: Session = Depends(get_db)
) -> dict:
    """Update configuration"""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    
    if not config:
        config = AppConfig(id=1)
        db.add(config)
    
    # Update fields
    if config_update.peecai_api_key is not None:
        config.peecai_api_key = config_update.peecai_api_key
    if config_update.company_name is not None:
        config.company_name = config_update.company_name
    project_changed = (
        config_update.project_id is not None
        and config_update.project_id != config.project_id
    )
    if config_update.project_id is not None:
        config.project_id = config_update.project_id
    if config_update.brand_id is not None:
        config.brand_id = config_update.brand_id
    if project_changed and not config_update.brand_id:
        # Project changed but no brand chosen — pick the own brand if one exists,
        # and refresh company_name to match unless the caller explicitly set one.
        try:
            brands = await peec_client.list_brands(config.project_id)
            own = next((b for b in brands if b.is_own), None) or (brands[0] if brands else None)
            if own:
                config.brand_id = own.id
                if config_update.company_name is None:
                    config.company_name = own.name
        except Exception as e:
            print(f"[settings] auto-pick brand failed: {e}")
    elif config_update.brand_id and config_update.company_name is None:
        try:
            brands = await peec_client.list_brands(config.project_id)
            chosen = next((b for b in brands if b.id == config_update.brand_id), None)
            if chosen:
                config.company_name = chosen.name
        except Exception as e:
            print(f"[settings] resolve brand name failed: {e}")
    if config_update.alert_email is not None:
        config.alert_email = config_update.alert_email
    if config_update.sentiment_drop_threshold is not None:
        config.sentiment_drop_threshold = config_update.sentiment_drop_threshold
    if config_update.min_sentiment_alert is not None:
        config.min_sentiment_alert = config_update.min_sentiment_alert
    if config_update.scan_frequency_hours is not None:
        config.scan_frequency_hours = config_update.scan_frequency_hours
    
    db.commit()
    
    return {
        "status": "success",
        "message": "Configuration updated successfully"
    }


@router.get("/settings/projects")
async def list_projects() -> List[Project]:
    """List available Peec projects"""
    try:
        projects = await peec_client.list_projects()
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")


@router.get("/settings/brands/{project_id}")
async def list_brands(project_id: str) -> List[Brand]:
    """List brands for a project"""
    try:
        brands = await peec_client.list_brands(project_id)
        return brands
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch brands: {str(e)}")


@router.post("/settings/test-connection")
async def test_peec_connection() -> dict:
    """Test Peec API connection"""
    try:
        projects = await peec_client.list_projects(limit=1)
        return {
            "status": "success",
            "message": f"Connected successfully. Found {len(projects)} project(s).",
            "projects_count": len(projects)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Connection failed: {str(e)}"
        }
