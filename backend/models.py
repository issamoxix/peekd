"""
SQLAlchemy database models
"""
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Date, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


def generate_uuid():
    """Generate UUID for primary keys"""
    return str(uuid.uuid4())


class Threat(Base):
    """Threat detection records"""
    __tablename__ = "threats"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    brand_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # HALLUCINATION, NEGATIVE_FRAMING, etc.
    severity = Column(String, nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    model = Column(String, nullable=False, index=True)  # chatgpt, perplexity, etc.
    summary = Column(Text, nullable=False)
    evidence = Column(Text, nullable=False)
    source_url = Column(String, nullable=True)
    auto_fixable = Column(Boolean, default=False)
    fix_type = Column(String, nullable=True)
    status = Column(String, default="OPEN", index=True)  # OPEN, RESOLVED, DISMISSED
    chat_id = Column(String, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)


class Action(Base):
    """Action queue items from Peec Actions"""
    __tablename__ = "actions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, nullable=False, index=True)
    brand_id = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)  # OWNED_PAGES, EDITORIAL, etc.
    opportunity_score = Column(Float, nullable=False, index=True)
    opportunity_level = Column(String, nullable=False)  # LOW, MEDIUM, HIGH
    domain = Column(String, nullable=False)
    title = Column(String, nullable=False)
    rationale = Column(Text, nullable=False)
    competitor_presence = Column(Text, nullable=False)  # JSON array
    keywords = Column(Text, nullable=False)  # JSON array
    status = Column(String, default="PENDING", index=True)  # PENDING, IN_PROGRESS, DONE, DISMISSED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CompetitorEvent(Base):
    """Competitor crisis and opportunity events"""
    __tablename__ = "competitor_events"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, nullable=False, index=True)
    competitor_name = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)  # SENTIMENT_CRISIS, VISIBILITY_DROP, etc.
    severity = Column(String, nullable=False)
    affected_models = Column(Text, nullable=False)  # JSON array
    affected_prompts = Column(Text, nullable=False)  # JSON array
    opportunity_score = Column(Float, nullable=False, index=True)
    recommended_actions = Column(Text, nullable=False)  # JSON array
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)


class SentimentHistory(Base):
    """Historical sentiment and visibility tracking"""
    __tablename__ = "sentiment_history"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, nullable=False, index=True)
    brand_id = Column(String, nullable=False, index=True)
    model = Column(String, nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    visibility = Column(Float, nullable=False)
    sentiment = Column(Float, nullable=False)
    position = Column(Float, nullable=True)


class AppConfig(Base):
    """Application configuration stored in database"""
    __tablename__ = "app_config"
    
    id = Column(Integer, primary_key=True, default=1)
    peecai_api_key = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    project_id = Column(String, nullable=True)
    brand_id = Column(String, nullable=True)
    alert_email = Column(String, nullable=True)
    sentiment_drop_threshold = Column(Float, default=10.0)
    min_sentiment_alert = Column(Float, default=45.0)
    scan_frequency_hours = Column(Integer, default=1)
