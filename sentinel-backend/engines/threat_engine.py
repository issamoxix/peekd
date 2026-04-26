"""
Threat Detection Engine
Analyzes brand mentions in AI responses and detects reputation threats
"""
from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models import Threat, SentimentHistory
from peec.client import peec_client
from services.claude_service import claude_service
from services.alert_service import alert_manager


class ThreatEngine:
    """Engine for detecting brand reputation threats"""
    
    async def scan_brand(
        self,
        project_id: str,
        brand_id: str,
        brand_name: str,
        db: Session
    ) -> List[Threat]:
        """
        Scan brand for threats across all AI models
        
        Args:
            project_id: Peec project ID
            brand_id: Brand ID
            brand_name: Brand name
            db: Database session
        
        Returns:
            List of detected threats
        """
        threats_found = []
        
        # Get date range (last 24 hours)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=1)
        
        # Format dates
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        # Get brand metrics by model
        brands_report = await peec_client.get_brands_report(
            project_id=project_id,
            dimensions=["model_id"],
            start_date=start_str,
            end_date=end_str
        )
        
        # Get recent chats
        chats = await peec_client.list_chats(
            project_id=project_id,
            start_date=start_str,
            end_date=end_str
        )
        
        # Analyze each chat
        for chat in chats[:50]:  # Limit to 50 most recent
            try:
                chat_content = await peec_client.get_chat_content(chat.id, project_id)
                
                if not chat_content:
                    continue
                
                # Check if brand is mentioned
                brands_mentioned = chat_content.brands_mentioned or []
                if brand_id not in brands_mentioned and brand_name.lower() not in str(chat_content.messages).lower():
                    continue
                
                # Find brand metric for this model
                model_metric = next(
                    (m for m in brands_report.data if m.model_id == chat.model_id and m.brand_id == brand_id),
                    {"visibility": 0.5, "sentiment": 50.0, "position": None}
                )
                
                # Analyze for threats
                detected = await claude_service.analyze_threats(
                    brand_name=brand_name,
                    chat_content=chat_content.dict() if hasattr(chat_content, 'dict') else chat_content,
                    brands_report={
                        "visibility": getattr(model_metric, 'visibility', 0.5),
                        "sentiment": getattr(model_metric, 'sentiment', 50.0),
                        "position": getattr(model_metric, 'position', None)
                    },
                    model=chat.model_id or "unknown"
                )
                
                # Save threats to database
                for threat_data in detected:
                    threat = Threat(
                        brand_id=brand_id,
                        project_id=project_id,
                        type=threat_data.get("type", "UNKNOWN"),
                        severity=threat_data.get("severity", "MEDIUM"),
                        model=threat_data.get("model", chat.model_id or "unknown"),
                        summary=threat_data.get("summary", "")[:500],
                        evidence=threat_data.get("evidence", "")[:2000],
                        source_url=threat_data.get("source_url"),
                        auto_fixable=threat_data.get("auto_fixable", False),
                        fix_type=threat_data.get("fix_type"),
                        status="OPEN",
                        chat_id=chat.id,
                        detected_at=datetime.utcnow()
                    )
                    db.add(threat)
                    threats_found.append(threat)
                    
                    # Send alert for HIGH and CRITICAL threats
                    if threat.severity in ["HIGH", "CRITICAL"]:
                        await alert_manager.broadcast({
                            "type": "threat_detected",
                            "data": {
                                "id": threat.id,
                                "severity": threat.severity,
                                "type": threat.type,
                                "summary": threat.summary,
                                "model": threat.model
                            }
                        })
            
            except Exception as e:
                print(f"Error analyzing chat {chat.id}: {e}")
                continue
        
        db.commit()
        return threats_found
    
    def detect_sentiment_drop(
        self,
        db: Session,
        project_id: str,
        brand_id: str,
        threshold: float = 10.0
    ) -> bool:
        """
        Detect if sentiment has dropped significantly
        
        Args:
            db: Database session
            project_id: Project ID
            brand_id: Brand ID
            threshold: Minimum drop to consider significant
        
        Returns:
            True if significant drop detected
        """
        # Get last 8 days of sentiment history
        cutoff_date = datetime.utcnow().date() - timedelta(days=8)
        
        history = db.query(SentimentHistory).filter(
            SentimentHistory.project_id == project_id,
            SentimentHistory.brand_id == brand_id,
            SentimentHistory.date >= cutoff_date
        ).order_by(SentimentHistory.date.desc()).limit(8).all()
        
        if len(history) < 2:
            return False
        
        # Most recent sentiment
        recent = history[0].sentiment
        
        # Average of previous 7 days
        previous_avg = sum(h.sentiment for h in history[1:]) / len(history[1:])
        
        # Check if drop exceeds threshold
        return (previous_avg - recent) >= threshold


# Global engine instance
threat_engine = ThreatEngine()
