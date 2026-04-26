"""
Heatmap Router - Model x Prompt performance grid
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import get_db
from models import AppConfig
from peec.client import peec_client
from config import settings
from routers.dashboard import _channel_from_model_id

router = APIRouter()


@router.get("/heatmap")
async def get_heatmap(db: Session = Depends(get_db)) -> dict:
    """Get model x prompt heatmap data"""
    config = db.query(AppConfig).filter(AppConfig.id == 1).first()
    
    if not config or not config.project_id:
        return {"data": [], "models": [], "prompts": [], "company_name": ""}
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    
    company_name = config.company_name or ""
    
    try:
        # Get all models
        models = await peec_client.list_models(config.project_id)
        model_names = [m.id for m in models] if models else []
        
        # Get all prompts
        prompts = await peec_client.list_prompts(config.project_id)
        prompt_list = []
        for p in (prompts or []):
            prompt_list.append({
                "id": p.id,
                "message": getattr(p, 'message', '') or getattr(p, 'name', '') or p.id,
            })
        
        # Get brands report sliced by model_id to get per-model visibility
        brands_report = await peec_client.get_brands_report(
            project_id=config.project_id,
            dimensions=["model_id"],
            start_date=start_str,
            end_date=end_str
        )
        
        # Build per-channel metrics (collapse model variants → channel)
        model_metrics = {}
        if brands_report and brands_report.data:
            buckets: dict[str, list] = {}
            for item in brands_report.data:
                buckets.setdefault(_channel_from_model_id(item.model_id), []).append(item)
            for ch, items in buckets.items():
                sentiments = [x.sentiment for x in items if x.sentiment]
                model_metrics[ch] = {
                    "visibility": sum(x.visibility for x in items) / len(items),
                    "sentiment": (sum(sentiments) / len(sentiments)) if sentiments else 0.0,
                }
        
        # Get brands report sliced by prompt_id for per-prompt data
        prompt_report = await peec_client.get_brands_report(
            project_id=config.project_id,
            dimensions=["prompt_id"],
            start_date=start_str,
            end_date=end_str
        )
        
        prompt_metrics = {}
        if prompt_report and prompt_report.data:
            for item in prompt_report.data:
                pid = getattr(item, 'prompt_id', None) or "unknown"
                prompt_metrics[pid] = {
                    "visibility": item.visibility,
                    "sentiment": item.sentiment,
                }
        
        # Build heatmap grid: for each model x prompt combination
        # Since cross-dimensional data may not be available from a single API call,
        # we construct it from model and prompt reports
        grid = []
        for model_id, m_data in model_metrics.items():
            for prompt_id, p_data in prompt_metrics.items():
                # Approximate cross-dimensional visibility
                combined_visibility = (m_data["visibility"] + p_data["visibility"]) / 2
                combined_sentiment = (m_data["sentiment"] + p_data["sentiment"]) / 2
                
                prompt_label = prompt_id
                for p in prompt_list:
                    if p["id"] == prompt_id:
                        prompt_label = p["message"]
                        break
                
                grid.append({
                    "model": model_id,
                    "prompt_id": prompt_id,
                    "prompt_label": prompt_label[:60],
                    "visibility": round(combined_visibility, 3),
                    "sentiment": round(combined_sentiment, 1),
                })
        
        return {
            "company_name": company_name,
            "models": list(model_metrics.keys()),
            "prompts": prompt_list[:20],  # Limit to 20 prompts for display
            "model_metrics": model_metrics,
            "prompt_metrics": prompt_metrics,
            "grid": grid,
        }
        
    except Exception as e:
        print(f"Heatmap error: {e}")
        return {
            "company_name": company_name,
            "models": [],
            "prompts": [],
            "model_metrics": {},
            "prompt_metrics": {},
            "grid": [],
            "error": str(e)
        }
