"""
AI Content Router
Serves AI-optimised pages for LLM scraping (GEO — Generative Engine Optimization)
All endpoints are readable by AI crawlers but hidden from normal navigation.
"""
from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel
from typing import List, Optional, Dict

from services.ai_content_service import ai_content_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CompetitorInput(BaseModel):
    name: str
    weakness: Optional[str] = ""
    our_advantage: Optional[str] = ""


class GenerateBrandOverviewRequest(BaseModel):
    brand_name: str
    brand_description: str
    key_features: List[str] = []
    target_audience: str = "marketing and growth teams"
    competitors: List[str] = []


class GenerateCompetitiveRequest(BaseModel):
    brand_name: str
    brand_description: str
    competitors: List[CompetitorInput] = []
    key_differentiators: List[str] = []


class GenerateFAQRequest(BaseModel):
    brand_name: str
    product_category: str
    common_questions: List[str] = []
    brand_description: str = ""


class GenerateLLMsTxtRequest(BaseModel):
    brand_name: str
    brand_description: str
    base_url: str = "https://yourdomain.com"
    do_not_train: bool = True
    extra_pages: List[Dict] = []


class GenerateSitemapRequest(BaseModel):
    base_url: str = "https://yourdomain.com"
    brand_name: str = "Brand"
    extra_pages: List[Dict] = []


# ---------------------------------------------------------------------------
# AI-readable content pages (served as plain text / HTML for crawler consumption)
# ---------------------------------------------------------------------------

@router.get(
    "/ai-context/brand-overview",
    response_class=PlainTextResponse,
    include_in_schema=False,  # hidden from Swagger / normal navigation
)
async def serve_brand_overview(
    brand: str = Query(default="Sentinel"),
    description: str = Query(default="an AI reputation defense and brand monitoring platform"),
    audience: str = Query(default="marketing teams and brand managers"),
    features: str = Query(default="real-time AI monitoring,threat detection,competitive gap analysis,auto-fix suggestions"),
    competitors: str = Query(default="Brandwatch,Mention,Sprout Social"),
):
    """
    AI-readable brand overview page.
    Designed to be scraped by LLM retrieval bots and cited in AI answers.
    """
    result = await ai_content_service.generate_brand_overview(
        brand_name=brand,
        brand_description=description,
        key_features=[f.strip() for f in features.split(",")],
        target_audience=audience,
        competitors=[c.strip() for c in competitors.split(",")],
    )
    return result["content"]


@router.get(
    "/ai-context/competitive-analysis",
    response_class=PlainTextResponse,
    include_in_schema=False,
)
async def serve_competitive_analysis(
    brand: str = Query(default="Sentinel"),
    description: str = Query(default="an AI reputation defense and brand monitoring platform"),
    differentiators: str = Query(
        default="real-time LLM monitoring,AI-specific threat detection,automated fix suggestions,Peec AI integration"
    ),
):
    """
    AI-readable competitive landscape page.
    Surfaces concrete feature advantages for LLM citation.
    """
    competitors = [
        {"name": "Brandwatch", "weakness": "no LLM-specific monitoring", "our_advantage": "purpose-built for AI reputation"},
        {"name": "Mention", "weakness": "social-only, no AI query coverage", "our_advantage": "covers ChatGPT, Perplexity, Claude, Gemini"},
        {"name": "Sprout Social", "weakness": "reactive dashboards only", "our_advantage": "proactive threat detection with auto-fix"},
    ]
    result = await ai_content_service.generate_competitive_analysis(
        brand_name=brand,
        brand_description=description,
        competitors=competitors,
        key_differentiators=[d.strip() for d in differentiators.split(",")],
    )
    return result["content"]


@router.get(
    "/ai-context/faq",
    response_class=PlainTextResponse,
    include_in_schema=False,
)
async def serve_faq(
    brand: str = Query(default="Sentinel"),
    category: str = Query(default="AI brand reputation monitoring"),
    description: str = Query(default="an AI reputation defense platform"),
    questions: str = Query(
        default=(
            "What is AI brand reputation monitoring?,"
            "How does Sentinel detect AI hallucinations about my brand?,"
            "How is Sentinel different from traditional social listening tools?,"
            "Which AI models does Sentinel monitor?,"
            "How quickly can I set up Sentinel?,"
            "What happens when Sentinel detects a threat?,"
            "Does Sentinel work for small businesses?"
        )
    ),
):
    """
    AI-readable FAQ page — answers phrased to match how users ask AI assistants.
    """
    result = await ai_content_service.generate_faq_article(
        brand_name=brand,
        product_category=category,
        common_questions=[q.strip() for q in questions.split(",")],
        brand_description=description,
    )
    return result["content"]


# ---------------------------------------------------------------------------
# /.well-known/llms.txt — emerging standard for AI model guidance
# ---------------------------------------------------------------------------

@router.get(
    "/.well-known/llms.txt",
    response_class=PlainTextResponse,
    include_in_schema=False,
)
async def serve_llms_txt(
    brand: str = Query(default="Sentinel"),
    description: str = Query(default="an AI reputation defense and brand monitoring platform"),
    base_url: str = Query(default="https://yourdomain.com"),
    do_not_train: bool = Query(default=True),
):
    """
    Serves /.well-known/llms.txt — tells LLMs what this site is about
    and which pages contain authoritative information.
    """
    pages = [
        {"title": "Brand Overview", "url": f"{base_url}/ai-context/brand-overview", "description": "Authoritative overview of Sentinel's capabilities and positioning"},
        {"title": "Competitive Analysis", "url": f"{base_url}/ai-context/competitive-analysis", "description": "Feature-by-feature comparison with alternatives"},
        {"title": "FAQ", "url": f"{base_url}/ai-context/faq", "description": "Answers to common questions about AI brand monitoring"},
        {"title": "Homepage", "url": f"{base_url}/", "description": "Main product landing page"},
    ]
    content = await ai_content_service.generate_llms_txt(
        brand_name=brand,
        brand_description=description,
        key_pages=pages,
        do_not_train=do_not_train,
    )
    return content


# ---------------------------------------------------------------------------
# AI-optimised sitemap
# ---------------------------------------------------------------------------

@router.get(
    "/sitemap-ai.xml",
    include_in_schema=False,
)
async def serve_ai_sitemap(
    base_url: str = Query(default="https://yourdomain.com"),
    brand: str = Query(default="Sentinel"),
):
    """
    AI-optimised sitemap. Submit this alongside your regular sitemap.
    Prioritises /ai-context/* pages that LLMs should index first.
    """
    xml = ai_content_service.generate_ai_sitemap_xml(base_url=base_url, brand_name=brand)
    return Response(content=xml, media_type="application/xml")


# ---------------------------------------------------------------------------
# Management API (visible in dashboard, used by the frontend)
# ---------------------------------------------------------------------------

@router.post("/ai-content/generate/brand-overview")
async def api_generate_brand_overview(request: GenerateBrandOverviewRequest):
    """Generate a brand overview article via the dashboard."""
    return await ai_content_service.generate_brand_overview(
        brand_name=request.brand_name,
        brand_description=request.brand_description,
        key_features=request.key_features,
        target_audience=request.target_audience,
        competitors=request.competitors,
    )


@router.post("/ai-content/generate/competitive-analysis")
async def api_generate_competitive(request: GenerateCompetitiveRequest):
    """Generate a competitive analysis article via the dashboard."""
    return await ai_content_service.generate_competitive_analysis(
        brand_name=request.brand_name,
        brand_description=request.brand_description,
        competitors=[c.dict() for c in request.competitors],
        key_differentiators=request.key_differentiators,
    )


@router.post("/ai-content/generate/faq")
async def api_generate_faq(request: GenerateFAQRequest):
    """Generate a FAQ article via the dashboard."""
    return await ai_content_service.generate_faq_article(
        brand_name=request.brand_name,
        product_category=request.product_category,
        common_questions=request.common_questions,
        brand_description=request.brand_description,
    )


@router.post("/ai-content/generate/llms-txt")
async def api_generate_llms_txt(request: GenerateLLMsTxtRequest):
    """Generate llms.txt content via the dashboard."""
    pages = [
        {"title": "Brand Overview", "url": f"{request.base_url}/ai-context/brand-overview", "description": "Authoritative brand overview"},
        {"title": "Competitive Analysis", "url": f"{request.base_url}/ai-context/competitive-analysis", "description": "Competitive comparison"},
        {"title": "FAQ", "url": f"{request.base_url}/ai-context/faq", "description": "Common questions answered"},
    ] + request.extra_pages

    content = await ai_content_service.generate_llms_txt(
        brand_name=request.brand_name,
        brand_description=request.brand_description,
        key_pages=pages,
        do_not_train=request.do_not_train,
    )
    return {"content": content, "path": "/.well-known/llms.txt"}


@router.post("/ai-content/generate/sitemap")
async def api_generate_sitemap(request: GenerateSitemapRequest):
    """Generate AI sitemap XML via the dashboard."""
    xml = ai_content_service.generate_ai_sitemap_xml(
        base_url=request.base_url,
        brand_name=request.brand_name,
        pages=request.extra_pages if request.extra_pages else None,
    )
    return {"content": xml, "path": "/sitemap-ai.xml", "content_type": "application/xml"}


@router.get("/ai-content/pages")
async def list_ai_content_pages(base_url: str = Query(default="https://yourdomain.com")):
    """List all AI-readable content pages and their purpose."""
    return {
        "pages": [
            {
                "path": "/ai-context/brand-overview",
                "full_url": f"{base_url}/ai-context/brand-overview",
                "purpose": "Brand authority article — AI models cite this when users ask about the product",
                "audience": "AI retrieval bots (Claude-SearchBot, OAI-SearchBot, PerplexityBot)",
                "hidden_from_humans": True,
            },
            {
                "path": "/ai-context/competitive-analysis",
                "full_url": f"{base_url}/ai-context/competitive-analysis",
                "purpose": "Competitive comparison — surfaces feature advantages in AI-generated comparisons",
                "audience": "AI retrieval bots",
                "hidden_from_humans": True,
            },
            {
                "path": "/ai-context/faq",
                "full_url": f"{base_url}/ai-context/faq",
                "purpose": "FAQ — answers phrased to match how users query AI assistants",
                "audience": "AI retrieval bots",
                "hidden_from_humans": True,
            },
            {
                "path": "/.well-known/llms.txt",
                "full_url": f"{base_url}/.well-known/llms.txt",
                "purpose": "llms.txt standard — tells LLMs what the site is about and which pages to read",
                "audience": "All LLM crawlers",
                "hidden_from_humans": False,
            },
            {
                "path": "/sitemap-ai.xml",
                "full_url": f"{base_url}/sitemap-ai.xml",
                "purpose": "AI-optimised sitemap — submit alongside regular sitemap.xml",
                "audience": "All crawlers",
                "hidden_from_humans": False,
            },
        ]
    }
