"""
Settings and Configuration Router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json
import re

from database import get_db
from models import AppConfig
from peec.client import peec_client
from peec.schemas import Project, Brand, Topic, Prompt
from config import settings

try:
    import anthropic
except ImportError:
    anthropic = None

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
    security_topic_enabled: Optional[bool] = None
    security_topic_id: Optional[str] = None
    custom_prompt_ids: Optional[List[str]] = None


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
    security_topic_enabled: bool
    security_topic_id: str
    custom_prompt_ids: List[str]


class TopicCreateRequest(BaseModel):
    project_id: str
    name: str


class PromptCreateRequest(BaseModel):
    project_id: str
    message: str
    topic_id: Optional[str] = None


class RiskPromptBootstrapRequest(BaseModel):
    project_id: str
    brand_name: Optional[str] = None


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
        scan_frequency_hours=config.scan_frequency_hours,
        security_topic_enabled=bool(config.security_topic_enabled),
        security_topic_id=config.security_topic_id or "",
        custom_prompt_ids=json.loads(config.custom_prompt_ids) if config.custom_prompt_ids else [],
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
    brand_changed = (
        config_update.brand_id is not None
        and config_update.brand_id != config.brand_id
    )
    if config_update.project_id is not None:
        config.project_id = config_update.project_id
    if config_update.brand_id is not None:
        config.brand_id = config_update.brand_id
    if project_changed or brand_changed:
        # Reputation prompts are baked with a literal brand name at bootstrap time.
        # Clear them when project/brand changes so the next bootstrap regenerates
        # for the new brand instead of reusing stale ones.
        config.custom_prompt_ids = None
        config.security_topic_enabled = False
        config.security_topic_id = None
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
    if config_update.security_topic_enabled is not None:
        config.security_topic_enabled = config_update.security_topic_enabled
    if config_update.security_topic_id is not None:
        config.security_topic_id = config_update.security_topic_id
    if config_update.custom_prompt_ids is not None:
        config.custom_prompt_ids = json.dumps(config_update.custom_prompt_ids)
    
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


@router.get("/settings/topics/{project_id}")
async def list_topics(project_id: str) -> List[Topic]:
    """List available topics for a project."""
    try:
        return await peec_client.list_topics(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch topics: {str(e)}")


@router.get("/settings/prompts/{project_id}")
async def list_prompts(project_id: str) -> List[Prompt]:
    """List available prompts for a project."""
    try:
        return await peec_client.list_prompts(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch prompts: {str(e)}")


@router.post("/settings/security/topic")
async def create_security_topic(payload: TopicCreateRequest) -> Topic:
    """Create a security topic in Peec."""
    try:
        return await peec_client.create_topic(payload.project_id, payload.name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create topic: {str(e)}")


@router.post("/settings/security/prompt")
async def create_security_prompt(payload: PromptCreateRequest) -> Prompt:
    """Create a security prompt in Peec."""
    try:
        return await peec_client.create_prompt(payload.project_id, payload.message, payload.topic_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create prompt: {str(e)}")


def _normalize_prompt_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


_REPUTATION_RISK_FALLBACK = [
    "Has [brand] experienced any data security breaches?",
    "Is [brand] compliant with regulations and industry standards?",
    "What are customers saying negatively about [brand]?",
    "Does [brand] have product quality or defect issues?",
    "Is [brand] financially stable and trustworthy?",
    "Are there service reliability or outage problems with [brand]?",
    "What are the privacy and data sharing concerns with [brand]?",
    "Has [brand] leadership been involved in any ethics scandals?",
    "Does [brand] use hidden fees or deceptive pricing practices?",
    "How does [brand] compare to competitors on trust and credibility?",
]


async def _generate_risk_prompts_with_anthropic(brand_name: str) -> List[str]:
    if not settings.has_anthropic_key or anthropic is None:
        brand = brand_name if brand_name and brand_name != "[brand]" else "the brand"
        return [p.replace("[brand]", brand) for p in _REPUTATION_RISK_FALLBACK]
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    system = (
        "You generate concise reputation-risk monitoring prompts as realistic user questions. "
        "Return JSON only: {\"prompts\": [\"...\"]}. "
        "Exactly 10 prompts. Include [brand] placeholder naturally in each."
    )
    user = (
        f"Generate 10 reputation risk monitoring prompts for brand '{brand_name or '[brand]'}'. "
        "Cover these 10 areas: (1) data security breach, (2) regulatory compliance violations, "
        "(3) customer complaints/dissatisfaction, (4) product quality problems, "
        "(5) financial stability/fraud, (6) service reliability failures, "
        "(7) privacy/data sharing concerns, (8) leadership/ethics scandals, "
        "(9) hidden fees or deceptive practices, (10) trust and credibility vs competitors. "
        "Write each as a realistic user question including [brand]."
    )
    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=700,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    text = (resp.content[0].text if resp.content else "").strip()
    # Strip markdown code fences that the model sometimes adds
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text.strip())
    brand = brand_name if brand_name and brand_name != "[brand]" else "the brand"
    try:
        data = json.loads(text)
        prompts = data.get("prompts") if isinstance(data, dict) else None
        if not isinstance(prompts, list):
            raise ValueError("no prompts list")
    except Exception:
        # Fall back to hardcoded prompts — Anthropic was unreachable or returned bad JSON
        return [p.replace("[brand]", brand) for p in _REPUTATION_RISK_FALLBACK]
    cleaned = []
    for p in prompts:
        if isinstance(p, str) and p.strip():
            val = p.strip()
            if "[brand]" not in val:
                val = f"{val} for [brand]"
            cleaned.append(val)
    if len(cleaned) < 10:
        fallback = [p.replace("[brand]", brand) for p in _REPUTATION_RISK_FALLBACK]
        cleaned.extend(fallback[len(cleaned):])
    return cleaned[:10]


@router.post("/settings/security/bootstrap-risk-prompts")
async def bootstrap_risk_prompts(
    payload: RiskPromptBootstrapRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Ensure a reputation-risk topic and 10 risk prompts exist in the selected project.
    Prompts are generated by Anthropic Haiku (with fallback), then created via Peec API.
    Auto-saves security config to DB so Threat Center uses them immediately.
    """
    try:
        topics = await peec_client.list_topics(payload.project_id)
        risk_topic = next(
            (
                t for t in topics
                if any(k in (t.label or "").lower() for k in ["risk", "security", "fraud", "threat", "reputation"])
            ),
            None,
        )
        if not risk_topic:
            risk_topic = await peec_client.create_topic(payload.project_id, "Reputation Risk")

        prompts = await peec_client.list_prompts(payload.project_id)

        # Resolve the real brand name — use payload > DB config > fallback
        brand_name = payload.brand_name
        if not brand_name:
            cfg = db.query(AppConfig).filter(AppConfig.id == 1).first()
            brand_name = (cfg.company_name or "") if cfg else ""
        brand_for_prompts = brand_name.strip() if brand_name and brand_name.strip() else "Your Brand"

        # Only keep prompts in the topic that actually mention the current brand —
        # otherwise prompts baked for an older brand keep displacing freshly-generated ones.
        brand_lower = brand_for_prompts.lower()
        risk_prompt_ids = [
            p.id for p in prompts
            if risk_topic.id in (p.topics or [])
            and brand_lower in (p.message or "").lower()
        ]

        created_ids: List[str] = []
        generated_messages = await _generate_risk_prompts_with_anthropic(brand_for_prompts)
        existing_normalized = {
            _normalize_prompt_text(p.message): p.id
            for p in prompts
            if p.message
        }
        prompt_id_to_message: dict = {p.id: p.message for p in prompts}

        for raw_message in generated_messages:
            # Replace any remaining [brand] placeholder with the real brand name
            message = raw_message.replace("[brand]", brand_for_prompts)
            normalized = _normalize_prompt_text(message)
            if normalized in existing_normalized:
                existing_id = existing_normalized[normalized]
                if existing_id not in risk_prompt_ids:
                    risk_prompt_ids.append(existing_id)
                continue
            created = await peec_client.create_prompt(payload.project_id, message, risk_topic.id)
            created_ids.append(created.id)
            risk_prompt_ids.append(created.id)
            prompt_id_to_message[created.id] = message
            existing_normalized[normalized] = created.id

        final_ids = risk_prompt_ids[:10]

        # Auto-save security config to DB so threats are filtered immediately
        config = db.query(AppConfig).filter(AppConfig.id == 1).first()
        if config:
            config.security_topic_enabled = True
            config.security_topic_id = risk_topic.id
            config.custom_prompt_ids = json.dumps(final_ids)
            db.commit()

        prompts_data = [
            {"id": pid, "message": prompt_id_to_message.get(pid, pid)}
            for pid in final_ids
        ]

        return {
            "status": "success",
            "topic_id": risk_topic.id,
            "created_prompt_ids": created_ids,
            "all_risk_prompt_ids": final_ids,
            "prompts": prompts_data,
            "message": f"Reputation risk bootstrap complete. {len(created_ids)} prompt(s) created.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to bootstrap risk prompts: {str(e)}")


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
