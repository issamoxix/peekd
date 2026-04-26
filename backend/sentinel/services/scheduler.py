"""
Background Scheduler Service
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

from database import SessionLocal
from models import AppConfig
from engines.threat_engine import threat_engine
from engines.action_engine import action_engine
from peec.client import peec_client

# Global scheduler instance
scheduler = AsyncIOScheduler()


async def scan_brand_visibility():
    """Scan brand visibility across AI models"""
    db = SessionLocal()
    try:
        config = db.query(AppConfig).filter(AppConfig.id == 1).first()
        
        if not config or not config.project_id or not config.brand_id:
            print("⚠️  Skipping scan - configuration not complete")
            return
        
        print(f"🔍 Scanning brand visibility... [{datetime.utcnow().isoformat()}]")
        
        # Get brand details
        brands = await peec_client.list_brands(config.project_id)
        brand = next((b for b in brands if b.id == config.brand_id), None)
        
        if not brand:
            print("⚠️  Brand not found")
            return
        
        # Run threat scan
        threats = await threat_engine.scan_brand(
            project_id=config.project_id,
            brand_id=config.brand_id,
            brand_name=brand.name,
            db=db
        )
        
        print(f"✅ Scan complete - found {len(threats)} threats")
    
    except Exception as e:
        print(f"❌ Scan failed: {e}")
    
    finally:
        db.close()


async def refresh_action_queue():
    """Refresh action queue from Peec data"""
    db = SessionLocal()
    try:
        config = db.query(AppConfig).filter(AppConfig.id == 1).first()
        
        if not config or not config.project_id or not config.brand_id:
            return
        
        print(f"🔄 Refreshing action queue... [{datetime.utcnow().isoformat()}]")
        
        actions = await action_engine.build_queue(
            project_id=config.project_id,
            brand_id=config.brand_id,
            db=db
        )
        
        print(f"✅ Action queue refreshed - {len(actions)} items")
    
    except Exception as e:
        print(f"❌ Action queue refresh failed: {e}")
    
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler"""
    
    # Scan brand visibility every 2 hours
    scheduler.add_job(
        scan_brand_visibility,
        IntervalTrigger(hours=2),
        id="scan_brand_visibility",
        name="Scan brand visibility",
        replace_existing=True
    )
    
    # Refresh action queue every 6 hours
    scheduler.add_job(
        refresh_action_queue,
        IntervalTrigger(hours=6),
        id="refresh_action_queue",
        name="Refresh action queue",
        replace_existing=True
    )
    
    # Start scheduler
    scheduler.start()
    print("📅 Background scheduler started")


def stop_scheduler():
    """Stop the background scheduler"""
    scheduler.shutdown()
    print("📅 Background scheduler stopped")
