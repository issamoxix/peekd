"""
Competitor Crisis Monitor Engine
"""
from typing import List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import json

from models import CompetitorEvent
from peec.client import peec_client


class CompetitorEngine:
    """Engine for monitoring competitor crises and opportunities"""
    
    async def scan_competitors(
        self,
        project_id: str,
        competitor_brand_ids: List[str],
        db: Session
    ) -> List[CompetitorEvent]:
        """
        Scan competitors for crises and opportunities
        
        Args:
            project_id: Peec project ID
            competitor_brand_ids: List of competitor brand IDs
            db: Database session
        
        Returns:
            List of competitor events
        """
        events = []
        
        # Get date range (last 30 days)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        # Get brands report for all brands
        brands_report = await peec_client.get_brands_report(
            project_id=project_id,
            dimensions=["model_id"],
            start_date=start_str,
            end_date=end_str
        )
        
        # Get all brands to get names
        all_brands = await peec_client.list_brands(project_id)
        brand_names = {b.id: b.name for b in all_brands}
        
        # Analyze each competitor
        for comp_id in competitor_brand_ids:
            comp_name = brand_names.get(comp_id, f"Competitor {comp_id}")
            
            # Get metrics for this competitor
            comp_metrics = [m for m in brands_report.data if m.brand_id == comp_id]
            
            if not comp_metrics:
                continue
            
            # Calculate average sentiment
            avg_sentiment = sum(m.sentiment for m in comp_metrics) / len(comp_metrics)
            
            # Detect sentiment crisis
            if avg_sentiment < 40:
                severity = "HIGH" if avg_sentiment < 30 else "MEDIUM"
                
                # Get affected models
                affected_models = [m.model_id for m in comp_metrics if m.sentiment < 45]
                
                # Calculate opportunity score
                opportunity_score = (50 - avg_sentiment) / 50.0
                
                event = CompetitorEvent(
                    project_id=project_id,
                    competitor_name=comp_name,
                    event_type="SENTIMENT_CRISIS",
                    severity=severity,
                    affected_models=json.dumps(affected_models),
                    affected_prompts=json.dumps([]),  # Would need prompts data
                    opportunity_score=opportunity_score,
                    recommended_actions=json.dumps([
                        f"Create comparison content: Your Brand vs {comp_name}",
                        f"Target keywords where {comp_name} has low sentiment",
                        "Publish thought leadership on affected topics"
                    ]),
                    detected_at=datetime.utcnow()
                )
                
                # Check if event already exists
                existing = db.query(CompetitorEvent).filter(
                    CompetitorEvent.competitor_name == comp_name,
                    CompetitorEvent.event_type == "SENTIMENT_CRISIS",
                    CompetitorEvent.detected_at >= start_date
                ).first()
                
                if not existing:
                    db.add(event)
                    events.append(event)
            
            # Detect visibility drop
            avg_visibility = sum(m.visibility for m in comp_metrics) / len(comp_metrics)
            if avg_visibility < 0.3:
                opportunity_score = (0.5 - avg_visibility) * 0.8
                
                event = CompetitorEvent(
                    project_id=project_id,
                    competitor_name=comp_name,
                    event_type="VISIBILITY_DROP",
                    severity="MEDIUM",
                    affected_models=json.dumps([m.model_id for m in comp_metrics if m.visibility < 0.4]),
                    affected_prompts=json.dumps([]),
                    opportunity_score=opportunity_score,
                    recommended_actions=json.dumps([
                        f"Capture market share in queries where {comp_name} is declining",
                        "Increase content production on relevant topics"
                    ]),
                    detected_at=datetime.utcnow()
                )
                
                existing = db.query(CompetitorEvent).filter(
                    CompetitorEvent.competitor_name == comp_name,
                    CompetitorEvent.event_type == "VISIBILITY_DROP",
                    CompetitorEvent.detected_at >= start_date
                ).first()
                
                if not existing:
                    db.add(event)
                    events.append(event)
        
        db.commit()
        return events


# Global engine instance
competitor_engine = CompetitorEngine()
