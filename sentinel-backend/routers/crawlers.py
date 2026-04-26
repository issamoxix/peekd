"""
Crawlers Router - Robots.txt and sitemap configuration
"""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional

from services.crawler_config import crawler_config_service

router = APIRouter()


class GenerateRobotsRequest(BaseModel):
    """Request for generating robots.txt"""
    strategy: str = "balanced"  # balanced, max_visibility, training_block


@router.get("/crawlers/robots", response_class=PlainTextResponse)
async def get_robots_txt(strategy: Optional[str] = "balanced"):
    """Get recommended robots.txt content"""
    return crawler_config_service.generate_robots_txt(strategy)


@router.post("/crawlers/generate")
async def generate_crawler_config(request: GenerateRobotsRequest) -> dict:
    """Generate complete crawler configuration"""
    robots_txt = crawler_config_service.generate_robots_txt(request.strategy)
    sitemap_strategy = crawler_config_service.generate_sitemap_strategy()
    cloudflare_rules = crawler_config_service.get_cloudflare_rules()
    
    return {
        "robots_txt": robots_txt,
        "sitemap_strategy": sitemap_strategy,
        "cloudflare_rules": cloudflare_rules,
        "strategy": request.strategy
    }


@router.get("/crawlers/sitemap-strategy")
async def get_sitemap_strategy():
    """Get sitemap priority recommendations"""
    return crawler_config_service.generate_sitemap_strategy()


@router.get("/crawlers/cloudflare-rules")
async def get_cloudflare_rules():
    """Get Cloudflare WAF rule recommendations"""
    return {
        "rules": crawler_config_service.get_cloudflare_rules()
    }
