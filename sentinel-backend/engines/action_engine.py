"""
Action Queue Engine
Builds ranked action queue from Peec Actions data
"""
from typing import List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import json

from models import Action
from peec.client import peec_client


class ActionEngine:
    """Engine for building action queue from domain/URL gaps"""
    
    async def build_queue(
        self,
        project_id: str,
        brand_id: str,
        db: Session
    ) -> List[Action]:
        """
        Build ranked action queue
        
        Args:
            project_id: Peec project ID
            brand_id: Brand ID
            db: Database session
        
        Returns:
            List of action items
        """
        actions = []
        
        # Get date range (last 30 days)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        # Get domains report
        domains_report = await peec_client.get_domains_report(
            project_id=project_id,
            dimensions=["model_id"],
            start_date=start_str,
            end_date=end_str
        )
        
        # Get URLs report
        urls_report = await peec_client.get_urls_report(
            project_id=project_id,
            dimensions=["model_id"],
            start_date=start_str,
            end_date=end_str
        )
        
        # Analyze domains by classification
        domain_categories = {
            "OWN": [],
            "EDITORIAL": [],
            "REFERENCE": [],
            "UGC": [],
            "COMPETITOR": []
        }
        
        for domain_metric in domains_report.data:
            classification = domain_metric.classification
            if classification in domain_categories:
                domain_categories[classification].append(domain_metric)
        
        # Process owned pages with low usage
        for domain in domain_categories["OWN"]:
            if domain.usage_rate < 0.3:  # Low usage threshold
                opportunity_score = (0.5 - domain.usage_rate) * 0.8
                actions.append(self._create_action(
                    project_id=project_id,
                    brand_id=brand_id,
                    category="OWNED_PAGES",
                    domain=domain.domain,
                    opportunity_score=opportunity_score,
                    title=f"Improve AI visibility for {domain.domain}",
                    rationale=f"Own domain with only {domain.usage_rate:.1%} usage rate in AI responses",
                    competitor_presence=[],
                    keywords=[]
                ))
        
        # Process editorial opportunities
        for domain in domain_categories["EDITORIAL"]:
            # Check if competitors are present
            competitor_urls = [
                url for url in urls_report.data
                if url.domain == domain.domain and "COMPETITOR" in str(url)
            ]
            
            if competitor_urls:
                opportunity_score = domain.citation_avg * 0.7
                actions.append(self._create_action(
                    project_id=project_id,
                    brand_id=brand_id,
                    category="EDITORIAL",
                    domain=domain.domain,
                    opportunity_score=opportunity_score,
                    title=f"Gain coverage on {domain.domain}",
                    rationale=f"Editorial site citing competitors {len(competitor_urls)} times, avg {domain.citation_avg:.1f} citations",
                    competitor_presence=["competitor"],
                    keywords=[]
                ))
        
        # Process reference sites
        for domain in domain_categories["REFERENCE"]:
            if domain.citation_avg > 2.0:
                opportunity_score = min(domain.citation_avg / 10.0, 1.0)
                actions.append(self._create_action(
                    project_id=project_id,
                    brand_id=brand_id,
                    category="REFERENCE",
                    domain=domain.domain,
                    opportunity_score=opportunity_score,
                    title=f"Get listed on {domain.domain}",
                    rationale=f"High-value reference site with {domain.citation_avg:.1f} avg citations",
                    competitor_presence=[],
                    keywords=[]
                ))
        
        # Process UGC opportunities
        for domain in domain_categories["UGC"]:
            if domain.usage_rate > 0.2:
                opportunity_score = domain.usage_rate * 0.6
                actions.append(self._create_action(
                    project_id=project_id,
                    brand_id=brand_id,
                    category="UGC",
                    domain=domain.domain,
                    opportunity_score=opportunity_score,
                    title=f"Engage community on {domain.domain}",
                    rationale=f"Active UGC platform with {domain.usage_rate:.1%} usage rate",
                    competitor_presence=[],
                    keywords=[]
                ))
        
        # Save to database
        for action_data in actions:
            existing = db.query(Action).filter(
                Action.domain == action_data["domain"],
                Action.category == action_data["category"],
                Action.status.in_(["PENDING", "IN_PROGRESS"])
            ).first()
            
            if not existing:
                action = Action(**action_data)
                db.add(action)
        
        db.commit()
        
        # Return sorted by opportunity score
        return sorted(actions, key=lambda x: x["opportunity_score"], reverse=True)
    
    def _create_action(
        self,
        project_id: str,
        brand_id: str,
        category: str,
        domain: str,
        opportunity_score: float,
        title: str,
        rationale: str,
        competitor_presence: List[str],
        keywords: List[str]
    ) -> dict:
        """Create action item dictionary"""
        # Determine opportunity level
        if opportunity_score >= 0.7:
            opportunity_level = "HIGH"
        elif opportunity_score >= 0.4:
            opportunity_level = "MEDIUM"
        else:
            opportunity_level = "LOW"
        
        return {
            "project_id": project_id,
            "brand_id": brand_id,
            "category": category,
            "opportunity_score": opportunity_score,
            "opportunity_level": opportunity_level,
            "domain": domain,
            "title": title,
            "rationale": rationale,
            "competitor_presence": json.dumps(competitor_presence),
            "keywords": json.dumps(keywords),
            "status": "PENDING",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }


# Global engine instance
action_engine = ActionEngine()
