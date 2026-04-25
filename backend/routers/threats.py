"""
Threats Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Threat, AppConfig
from engines.live_signals import detect_threats

router = APIRouter()


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
    """Generate auto-fix for threat"""
    threat = db.query(Threat).filter(Threat.id == threat_id).first()
    
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    
    if not threat.auto_fixable:
        raise HTTPException(status_code=400, detail="Threat is not auto-fixable")
    
    # Generate fix based on fix_type
    fix_content = ""
    
    if threat.fix_type == "CONTENT_UPDATE":
        fix_content = f"""# Content Brief to Address Threat

**Issue:** {threat.summary}

**Evidence:** {threat.evidence}

**Recommended Action:**
Create authoritative content that:
1. Addresses the concern directly with facts
2. Provides transparent information
3. Demonstrates expertise and trustworthiness

**Target Keywords:** Focus on brand name + topic variations
**Format:** Blog post, FAQ, or knowledge base article
**Tone:** Professional, transparent, helpful
"""
    
    elif threat.fix_type == "SCHEMA_MARKUP":
        fix_content = f"""# Schema Markup Update

Add structured data to your pages:

```json
{{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Brand",
  "description": "Accurate brand description",
  "url": "https://yourdomain.com"
}}
```

This helps AI models understand your brand correctly.
"""
    
    elif threat.fix_type == "ROBOTS_UPDATE":
        fix_content = """# Robots.txt Update

Review your robots.txt to ensure:
1. AI retrieval bots can access quality content
2. Training bots are blocked from sensitive pages
3. Sitemap is properly referenced

See the Crawler Config page for detailed recommendations.
"""
    
    elif threat.fix_type == "PR_OUTREACH":
        fix_content = f"""# PR Outreach Template

**Subject:** Correction Request - {threat.summary}

**Body:**
Dear Editor,

We noticed that [publication/platform] has information about our brand that requires correction.

**Current Information:** {threat.evidence}

**Accurate Information:** [Provide correct facts]

We kindly request an update to ensure accurate information is available.

Best regards,
[Your Name]
"""
    
    else:
        fix_content = "Manual review required. No automatic fix available."
    
    return {
        "status": "success",
        "fix_type": threat.fix_type,
        "fix_content": fix_content
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
    )
    return {
        "critical": sum(1 for t in threats if t["severity"] == "CRITICAL"),
        "high": sum(1 for t in threats if t["severity"] == "HIGH"),
        "medium": sum(1 for t in threats if t["severity"] == "MEDIUM"),
        "low": sum(1 for t in threats if t["severity"] == "LOW"),
    }
