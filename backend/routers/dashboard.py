"""
Dashboard Router - Overview metrics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
import json

from database import get_db
from models import Threat, Action, CompetitorEvent, SentimentHistory, AppConfig
from peec.client import peec_client
from engines.live_signals import detect_threats, detect_competitor_events
from config import settings


def _channel_from_model_id(model_id: str | None) -> str:
    """Map Peec model IDs (e.g. 'chatgpt-scraper', 'claude-sonnet-4') to the
    canonical channel labels the frontend has color/icon mappings for."""
    if not model_id:
        return "unknown"
    mid = model_id.lower()
    if "chatgpt" in mid or mid.startswith("gpt"):
        return "chatgpt"
    if "perplexity" in mid:
        return "perplexity"
    if "claude" in mid:
        return "claude"
    if "gemini" in mid or "google-ai" in mid:
        return "gemini"
    if "copilot" in mid or "bing" in mid:
        return "copilot"
    if "grok" in mid:
        return "grok"
    if "deepseek" in mid:
        return "deepseek"
    return mid

router = APIRouter()


def _security_prompt_ids(config: AppConfig) -> list[str] | None:
    """Always use the project's configured reputation prompts when they exist,
    so the dashboard only shows threats relevant to the selected project."""
    if not config or not config.custom_prompt_ids:
        return None
    try:
        parsed = json.loads(config.custom_prompt_ids)
        return parsed if isinstance(parsed, list) and parsed else None
    except Exception:
        return None


async def ensure_configured(db: Session) -> dict:
    """Auto-configure if Peec API key exists but project/brand not set"""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    
    if not config:
        config = AppConfig(
            id=1,
            peecai_api_key=settings.peecai_api_key,
            sentiment_drop_threshold=10.0,
            min_sentiment_alert=45.0,
            scan_frequency_hours=1
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    
    # If project/brand not set but API key exists, auto-detect
    if (not config.project_id or not config.brand_id) and settings.has_peec_key:
        try:
            if not config.project_id:
                projects = await peec_client.list_projects(limit=5)
                if projects:
                    config.project_id = projects[0].id
            if config.project_id and not config.brand_id:
                brands = await peec_client.list_brands(config.project_id)
                if brands:
                    own = next((b for b in brands if b.is_own), None)
                    config.brand_id = (own or brands[0]).id
                    if not config.company_name:
                        config.company_name = (own or brands[0]).name
            db.commit()
        except Exception as e:
            print(f"Auto-configure failed: {e}")
    
    return config


@router.get("/dashboard")
async def get_dashboard(db: Session = Depends(get_db)) -> dict:
    """Get dashboard overview metrics"""
    
    config = await ensure_configured(db)

    has_config = bool(config and config.project_id)
    
    # Even without full config, show the dashboard with available data
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    
    visibility = 0.0
    sentiment = 0.0
    top_models = []
    
    if has_config:
        try:
            prompt_ids = _security_prompt_ids(config)
            brands_report = await peec_client.get_brands_report(
                project_id=config.project_id,
                dimensions=["model_id"],
                start_date=start_str,
                end_date=end_str,
                brand_id=config.brand_id,
                prompt_ids=prompt_ids,
            )
            
            if brands_report.data:
                visibility = sum(m.visibility for m in brands_report.data) / len(brands_report.data)
                # Filter sentiment averaging to non-zero to avoid dilution from
                # missing-sentiment rows
                sentiments = [m.sentiment for m in brands_report.data if m.sentiment]
                sentiment = sum(sentiments) / len(sentiments) if sentiments else 0.0

                # Aggregate per channel (multiple Peec model IDs can share one
                # channel — e.g. gemini-scraper + google-ai-overview-scraper)
                by_channel: dict[str, list] = {}
                for m in brands_report.data:
                    by_channel.setdefault(_channel_from_model_id(m.model_id), []).append(m)
                top_models = [
                    {
                        "model": ch,
                        "visibility": sum(x.visibility for x in items) / len(items),
                        "sentiment": (
                            sum(x.sentiment for x in items if x.sentiment) /
                            max(1, sum(1 for x in items if x.sentiment))
                        ),
                    }
                    for ch, items in by_channel.items()
                ]
                top_models.sort(key=lambda x: x["visibility"], reverse=True)
                top_models = top_models[:6]
        except Exception as e:
            print(f"Error fetching brand metrics: {e}")
    
    # Live threats from real Peec metrics
    live_threats: list[dict] = []
    live_competitors: list[dict] = []
    if has_config and config.brand_id:
        try:
            prompt_ids = _security_prompt_ids(config)
            live_threats = await detect_threats(
                config.project_id, config.brand_id,
                config.company_name or "your brand",
                prompt_ids=prompt_ids,
            )
        except Exception as e:
            print(f"detect_threats failed: {e}")
        try:
            live_competitors = await detect_competitor_events(
                config.project_id, config.brand_id,
                config.company_name or "your brand",
                prompt_ids=prompt_ids,
            )
        except Exception as e:
            print(f"detect_competitor_events failed: {e}")

    threat_stats = {
        "critical": sum(1 for t in live_threats if t["severity"] == "CRITICAL"),
        "high": sum(1 for t in live_threats if t["severity"] == "HIGH"),
        "medium": sum(1 for t in live_threats if t["severity"] == "MEDIUM"),
        "low": sum(1 for t in live_threats if t["severity"] == "LOW"),
    }

    recent_threats_data = [
        {
            "id": t["id"],
            "severity": t["severity"],
            "type": t["type"],
            "model": t["model"],
            "summary": t["summary"],
            "detected_at": t["detected_at"],
        }
        for t in live_threats[:5]
    ]

    competitor_events_data = [
        {
            "id": e["id"],
            "competitor_name": e["competitor_name"],
            "event_type": e["event_type"],
            "opportunity_score": e["opportunity_score"],
            "detected_at": e["detected_at"],
        }
        for e in live_competitors[:5]
    ]

    action_queue_count = db.query(Action).filter(
        Action.status.in_(["PENDING", "IN_PROGRESS"])
    ).count()
    
    active_prompt_ids = _security_prompt_ids(config) or []
    return {
        "configured": True,
        "company_name": (config.company_name or "") if config else "",
        "project_id": config.project_id if config else None,
        "brand_id": config.brand_id if config else None,
        "security_topic_enabled": bool(config.security_topic_enabled) if config else False,
        "reputation_prompts_active": len(active_prompt_ids) > 0,
        "reputation_prompts_count": len(active_prompt_ids),
        "brand_visibility": visibility,
        "sentiment_score": sentiment,
        "visibility_trend": "+3.2%",
        "sentiment_trend": "+0.0%",
        "active_threats": threat_stats,
        "top_models": top_models,
        "recent_threats": recent_threats_data,
        "competitor_events": competitor_events_data,
        "narrative_shift_tracker": {
            "tracked_keywords": len(active_prompt_ids),
            "target_sentiment_delta": 15,
            "target_positive_mentions_delta_pct": 50,
        },
        "action_queue_count": action_queue_count
    }
