"""
Database setup and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from typing import Generator
from config import settings
from models import Base


# Create database engine
# Use StaticPool for SQLite to avoid threading issues
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    poolclass=StaticPool if "sqlite" in settings.database_url else None,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
    _ensure_app_config_columns()


def _ensure_app_config_columns():
    """Best-effort additive migrations for existing SQLite databases."""
    required_columns = {
        "security_topic_enabled": "BOOLEAN DEFAULT 0",
        "security_topic_id": "VARCHAR",
        "custom_prompt_ids": "TEXT",
    }
    with engine.connect() as conn:
        result = conn.exec_driver_sql("PRAGMA table_info(app_config)")
        existing = {row[1] for row in result.fetchall()}
        for col, col_type in required_columns.items():
            if col not in existing:
                conn.exec_driver_sql(f"ALTER TABLE app_config ADD COLUMN {col} {col_type}")
        conn.commit()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function for FastAPI routes to get database session
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
