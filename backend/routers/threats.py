"""
Threats Router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Threat

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
    """List threats with filters"""
    query = db.query(Threat)
    
    if severity:
        query = query.filter(Threat.severity == severity)
    if model:
        query = query.filter(Threat.model == model)
    if status:
        query = query.filter(Threat.status == status)
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    threats = query.order_by(Threat.detected_at.desc()).limit(limit).offset(offset).all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [ThreatResponse.from_orm(t) for t in threats]
    }


@router.get("/threats/{threat_id}")
async def get_threat(
    threat_id: str,
    db: Session = Depends(get_db)
) -> ThreatResponse:
    """Get threat detail"""
    threat = db.query(Threat).filter(Threat.id == threat_id).first()
    
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    
    return ThreatResponse.from_orm(threat)


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
    """Get threat statistics"""
    open_threats = db.query(Threat).filter(Threat.status == "OPEN").all()
    
    stats = {
        "critical": len([t for t in open_threats if t.severity == "CRITICAL"]),
        "high": len([t for t in open_threats if t.severity == "HIGH"]),
        "medium": len([t for t in open_threats if t.severity == "MEDIUM"]),
        "low": len([t for t in open_threats if t.severity == "LOW"])
    }
    
    return stats
