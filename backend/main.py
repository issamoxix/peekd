"""
Sentinel - AI Reputation Defense System
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from config import settings
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events"""
    # Startup
    print("🚀 Sentinel starting up...")
    
    # Initialize database
    init_db()
    print("✅ Database initialized")
    
    # Start scheduler (delayed by 30 seconds to allow warmup)
    async def start_scheduler_delayed():
        await asyncio.sleep(30)
        try:
            from services.scheduler import start_scheduler
            start_scheduler()
            print("✅ Background scheduler started")
        except Exception as e:
            print(f"⚠️  Scheduler not started: {e}")
    
    # Start scheduler in background
    asyncio.create_task(start_scheduler_delayed())
    
    yield
    
    # Shutdown
    print("👋 Sentinel shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Sentinel API",
    description="AI Reputation Defense & Dominance System",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "status": "online",
        "service": "Sentinel API",
        "version": "1.0.0",
        "peec_configured": settings.has_peec_key,
        "anthropic_configured": settings.has_anthropic_key
    }


# Import and include routers
try:
    from routers import dashboard, threats, actions, competitors, crawlers, alerts, settings as settings_router, heatmap
    
    app.include_router(settings_router.router, prefix="/api", tags=["Settings"])
    app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
    app.include_router(heatmap.router, prefix="/api", tags=["Heatmap"])
    app.include_router(threats.router, prefix="/api", tags=["Threats"])
    app.include_router(actions.router, prefix="/api", tags=["Actions"])
    app.include_router(competitors.router, prefix="/api", tags=["Competitors"])
    app.include_router(crawlers.router, prefix="/api", tags=["Crawlers"])
    app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
except ImportError as e:
    print(f"⚠️  Warning: Some routers not yet available: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
