"""
Pydantic schemas matching Peec AI API responses
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class Project(BaseModel):
    """Project from Peec API"""
    id: str
    name: str
    status: Optional[str] = None


class Brand(BaseModel):
    """Brand from Peec API"""
    id: str
    name: str
    domain: Optional[str] = None
    domains: Optional[List[str]] = []
    is_own: Optional[bool] = False
    color: Optional[str] = None


class Prompt(BaseModel):
    """Prompt/query from Peec API"""
    id: str
    message: str
    tags: Optional[List[str]] = []
    topics: Optional[List[str]] = []
    search_volume: Optional[int] = None


class Tag(BaseModel):
    """Category tag from Peec API"""
    id: str
    label: str


class Topic(BaseModel):
    """Topic group from Peec API"""
    id: str
    label: str


class Model(BaseModel):
    """AI Model from Peec API"""
    id: str
    name: str


class Chat(BaseModel):
    """Chat conversation from Peec API"""
    id: str
    prompt_id: Optional[str] = None
    model_id: Optional[str] = None
    created_at: Optional[str] = None


class Source(BaseModel):
    """Source citation in chat response"""
    url: str
    domain: Optional[str] = None
    title: Optional[str] = None
    citation_count: Optional[int] = 0


class ChatContent(BaseModel):
    """Full chat content with sources and messages"""
    id: str
    messages: List[Dict[str, Any]]
    sources: List[Source]
    brands_mentioned: Optional[List[str]] = []
    queries: Optional[List[str]] = []


class BrandMetric(BaseModel):
    """Brand metrics from reports"""
    brand_id: str
    brand_name: Optional[str] = None
    visibility: float = 0.0  # 0.0 - 1.0
    sentiment: float = 0.0  # 0 - 100
    position: Optional[float] = None
    model_id: Optional[str] = None
    prompt_id: Optional[str] = None
    mention_count: Optional[int] = None
    share_of_voice: Optional[float] = None


class BrandsReport(BaseModel):
    """Brands report response"""
    data: List[BrandMetric]
    dimensions: Optional[List[str]] = []


class DomainMetric(BaseModel):
    """Domain metrics from reports"""
    domain: str
    usage_rate: float
    citation_avg: float
    classification: str  # OWN, EDITORIAL, COMPETITOR, etc.
    model_id: Optional[str] = None


class DomainsReport(BaseModel):
    """Domains report response"""
    data: List[DomainMetric]
    dimensions: Optional[List[str]] = []


class UrlMetric(BaseModel):
    """URL metrics from reports"""
    url: str
    domain: str
    usage_count: int
    citation_count: int
    classification: str  # ARTICLE, PRODUCT_PAGE, LISTICLE, etc.
    title: Optional[str] = None


class UrlsReport(BaseModel):
    """URLs report response"""
    data: List[UrlMetric]
    dimensions: Optional[List[str]] = []
