"""
Seed realistic demo data into the DB so the UI has something to show
when the Peec API is unreachable. Re-runs whenever the configured
company_name changes so the demo content always reflects the current brand.
"""
from datetime import datetime, timedelta
import json

from sqlalchemy.orm import Session

from models import Threat, Action, CompetitorEvent, AppConfig


def _build_threats(project_id: str, brand_id: str, company: str) -> list[Threat]:
    now = datetime.utcnow()
    return [
        Threat(
            project_id=project_id, brand_id=brand_id,
            type="HALLUCINATION", severity="CRITICAL", model="chatgpt",
            summary=f"ChatGPT incorrectly states {company} discontinued its main product line",
            evidence=f"\"{company} announced last quarter that they are winding down their flagship offering...\"",
            source_url="https://example.com/chatgpt-response", auto_fixable=True,
            fix_type="CONTENT_UPDATE", status="OPEN",
            chat_id="demo-chat-1", detected_at=now - timedelta(hours=2),
        ),
        Threat(
            project_id=project_id, brand_id=brand_id,
            type="NEGATIVE_FRAMING", severity="HIGH", model="perplexity",
            summary=f"Perplexity frames {company}'s pricing as 'aggressively expensive'",
            evidence=f"\"While {company} delivers a polished product, customers report aggressively expensive contracts...\"",
            source_url="https://www.perplexity.ai/search/example", auto_fixable=True,
            fix_type="PR_OUTREACH", status="OPEN",
            chat_id="demo-chat-2", detected_at=now - timedelta(hours=6),
        ),
        Threat(
            project_id=project_id, brand_id=brand_id,
            type="COMPETITIVE_GAP", severity="HIGH", model="gemini",
            summary=f"Gemini cites Competitor A as the leader; {company} not mentioned",
            evidence="\"For most teams, Competitor A is the recommended choice due to its established ecosystem...\"",
            source_url=None, auto_fixable=False, fix_type=None, status="OPEN",
            chat_id="demo-chat-3", detected_at=now - timedelta(hours=9),
        ),
        Threat(
            project_id=project_id, brand_id=brand_id,
            type="SENTIMENT_DROP", severity="MEDIUM", model="grok",
            summary=f"Sentiment for {company} dropped 12 points in 24h on Grok",
            evidence="Sentiment trended from 64 → 52 over the last 24 hours.",
            source_url=None, auto_fixable=False, fix_type=None, status="OPEN",
            chat_id="demo-chat-4", detected_at=now - timedelta(hours=14),
        ),
        Threat(
            project_id=project_id, brand_id=brand_id,
            type="RISKY_CONTENT", severity="MEDIUM", model="claude",
            summary=f"Claude surfaces an outdated lawsuit reference about {company}",
            evidence=f"\"{company} was previously involved in a 2019 dispute regarding...\"",
            source_url="https://example.com/old-news", auto_fixable=True,
            fix_type="SCHEMA_MARKUP", status="OPEN",
            chat_id="demo-chat-5", detected_at=now - timedelta(hours=20),
        ),
        Threat(
            project_id=project_id, brand_id=brand_id,
            type="NEGATIVE_FRAMING", severity="LOW", model="copilot",
            summary=f"Copilot describes {company} support as 'sometimes slow'",
            evidence="\"Support response times can be inconsistent depending on plan tier...\"",
            source_url=None, auto_fixable=False, fix_type=None, status="OPEN",
            chat_id="demo-chat-6", detected_at=now - timedelta(hours=28),
        ),
    ]


def _build_actions(project_id: str, brand_id: str, company: str) -> list[Action]:
    now = datetime.utcnow()
    return [
        Action(
            project_id=project_id, brand_id=brand_id,
            category="EDITORIAL", opportunity_score=0.91, opportunity_level="HIGH",
            domain="g2.com",
            title=f"Place {company} on G2 'Top Alternatives' listicles",
            rationale=f"Competitors are cited 3.2x more than {company} on G2 listicles surfaced by ChatGPT and Perplexity.",
            competitor_presence=json.dumps(["Competitor A", "Competitor B"]),
            keywords=json.dumps(["best alternatives", "top vendors", f"{company.lower()} alternatives"]),
            status="PENDING", created_at=now, updated_at=now,
        ),
        Action(
            project_id=project_id, brand_id=brand_id,
            category="UGC", opportunity_score=0.84, opportunity_level="HIGH",
            domain="reddit.com",
            title=f"Engage Reddit threads where {company} is missing",
            rationale="Reddit discussions about the category drive 21% of citations across AI models, but the brand is mentioned in only 6%.",
            competitor_presence=json.dumps(["Competitor A"]),
            keywords=json.dumps(["reddit reviews", "honest experience", "user feedback"]),
            status="PENDING", created_at=now, updated_at=now,
        ),
        Action(
            project_id=project_id, brand_id=brand_id,
            category="OWNED_PAGES", opportunity_score=0.72, opportunity_level="MEDIUM",
            domain="yourbrand.com",
            title=f"Publish a {company} vs Competitor A comparison page",
            rationale="ChatGPT and Claude both pull comparison pages first; you currently rank for 0 of the 14 comparison queries we tracked.",
            competitor_presence=json.dumps(["Competitor A"]),
            keywords=json.dumps([f"{company.lower()} vs competitor a", "feature comparison", "pricing comparison"]),
            status="PENDING", created_at=now, updated_at=now,
        ),
        Action(
            project_id=project_id, brand_id=brand_id,
            category="REFERENCE", opportunity_score=0.66, opportunity_level="MEDIUM",
            domain="wikipedia.org",
            title=f"Improve Wikipedia article quality for {company}",
            rationale="Wikipedia is cited by Gemini and Claude in 38% of category responses; your entry is sparse with stale facts.",
            competitor_presence=json.dumps(["Competitor A", "Competitor C"]),
            keywords=json.dumps(["company overview", "history", "leadership"]),
            status="PENDING", created_at=now, updated_at=now,
        ),
        Action(
            project_id=project_id, brand_id=brand_id,
            category="EDITORIAL", opportunity_score=0.58, opportunity_level="MEDIUM",
            domain="techcrunch.com",
            title=f"Pitch a thought-leadership piece featuring {company}",
            rationale="TechCrunch is cited heavily by ChatGPT and Perplexity; landing one feature lifts visibility ~9%.",
            competitor_presence=json.dumps(["Competitor B"]),
            keywords=json.dumps(["industry trends", "innovation", "category leadership"]),
            status="PENDING", created_at=now, updated_at=now,
        ),
    ]


def _build_competitor_events(project_id: str, company: str) -> list[CompetitorEvent]:
    now = datetime.utcnow()
    return [
        CompetitorEvent(
            project_id=project_id, competitor_name="Competitor A",
            event_type="SENTIMENT_CRISIS", severity="HIGH",
            affected_models=json.dumps(["chatgpt", "perplexity", "claude"]),
            affected_prompts=json.dumps(["customer support quality", "is the brand reliable"]),
            opportunity_score=0.78,
            recommended_actions=json.dumps([
                f"Publish a {company} reliability case-study landing page",
                "Run a paid PR push targeting the affected keywords",
                "Encourage existing customers to leave reviews on G2 and Reddit",
            ]),
            detected_at=now - timedelta(hours=4),
        ),
        CompetitorEvent(
            project_id=project_id, competitor_name="Competitor B",
            event_type="VISIBILITY_DROP", severity="MEDIUM",
            affected_models=json.dumps(["gemini", "copilot"]),
            affected_prompts=json.dumps(["pricing breakdown", "best alternatives"]),
            opportunity_score=0.61,
            recommended_actions=json.dumps([
                f"Build pricing comparison content featuring {company}",
                "Update schema markup on pricing pages",
            ]),
            detected_at=now - timedelta(hours=11),
        ),
    ]


def seed_demo_data_if_needed(db: Session, config: AppConfig) -> None:
    """Seed demo data for the dashboard. Reseeds when company_name changes."""
    if not config or not config.project_id or not config.brand_id:
        return

    company = (config.company_name or "Your Brand").strip() or "Your Brand"

    latest = db.query(Threat).order_by(Threat.detected_at.desc()).first()
    if latest and company in (latest.summary or ""):
        return

    db.query(Threat).delete()
    db.query(Action).delete()
    db.query(CompetitorEvent).delete()
    db.commit()

    for t in _build_threats(config.project_id, config.brand_id, company):
        db.add(t)
    for a in _build_actions(config.project_id, config.brand_id, company):
        db.add(a)
    for e in _build_competitor_events(config.project_id, company):
        db.add(e)
    db.commit()
