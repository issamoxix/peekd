"""
Peec AI REST API Client.
Base URL: https://api.peec.ai/customer/v1
Auth:     X-API-Key header

The API returns nested objects (brand, model, prompt as sub-objects); this
client flattens them into the existing Pydantic schemas so consumers
(routers, engines) can stay schema-stable.
"""
import httpx
from typing import List, Optional, Dict, Any
from config import settings
from peec.schemas import (
    Project, Brand, Prompt, Tag, Topic, Model, Chat, ChatContent, Source,
    BrandsReport, DomainsReport, UrlsReport, BrandMetric, DomainMetric, UrlMetric
)
from peec.cache import peec_cache


class PeecAPIError(Exception):
    """Custom exception for Peec API errors"""
    pass


class PeecClient:
    """Client for Peec AI Customer REST API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.peecai_api_key
        self.base_url = settings.peec_api_base_url

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
        }

    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.request(method, url, headers=self.headers, **kwargs)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                status = e.response.status_code
                detail = ""
                try:
                    detail = e.response.json()
                except Exception:
                    detail = e.response.text[:200]
                if status == 401:
                    raise PeecAPIError(f"Unauthorized — check PEECAI_API_KEY ({detail})")
                if status == 403:
                    raise PeecAPIError(f"Forbidden — key lacks access ({detail})")
                if status == 404:
                    raise PeecAPIError(f"Not found: {endpoint} ({detail})")
                raise PeecAPIError(f"HTTP {status} on {endpoint}: {detail}")
            except httpx.RequestError as e:
                raise PeecAPIError(f"Network error calling {endpoint}: {e}")

    async def list_projects(self, limit: int = 1000, offset: int = 0) -> List[Project]:
        cached = peec_cache.get("list_projects", limit=limit, offset=offset)
        if cached is not None:
            return cached
        try:
            data = await self._request("GET", "/projects", params={"limit": limit, "offset": offset})
            projects = [Project(**item) for item in data.get("data", [])]
            peec_cache.set("list_projects", projects, limit=limit, offset=offset)
            return projects
        except PeecAPIError as e:
            print(f"[peec] list_projects failed: {e}")
            raise

    async def list_brands(self, project_id: str) -> List[Brand]:
        cached = peec_cache.get("list_brands", project_id=project_id)
        if cached is not None:
            return cached
        try:
            data = await self._request("GET", "/brands", params={"project_id": project_id, "limit": 1000})
            brands = []
            for item in data.get("data", []):
                domains = item.get("domains") or []
                brands.append(Brand(
                    id=item["id"],
                    name=item.get("name", ""),
                    domain=domains[0] if domains else None,
                    domains=domains,
                    is_own=item.get("is_own", False),
                    color=item.get("color"),
                ))
            peec_cache.set("list_brands", brands, project_id=project_id)
            return brands
        except PeecAPIError as e:
            print(f"[peec] list_brands failed: {e}")
            raise

    async def list_prompts(self, project_id: str) -> List[Prompt]:
        cached = peec_cache.get("list_prompts", project_id=project_id)
        if cached is not None:
            return cached
        try:
            data = await self._request("GET", "/prompts", params={"project_id": project_id, "limit": 500})
            prompts = []
            for item in data.get("data", []):
                messages = item.get("messages") or []
                first_msg = ""
                if messages and isinstance(messages, list):
                    m0 = messages[0]
                    if isinstance(m0, dict):
                        first_msg = m0.get("content") or m0.get("text") or m0.get("message") or ""
                    else:
                        first_msg = str(m0)
                prompts.append(Prompt(
                    id=item["id"],
                    message=first_msg or item.get("id", ""),
                    tags=[t.get("id") if isinstance(t, dict) else t for t in (item.get("tags") or [])],
                    topics=[item["topic"]["id"]] if isinstance(item.get("topic"), dict) else [],
                    search_volume=item.get("volume"),
                ))
            peec_cache.set("list_prompts", prompts, project_id=project_id)
            return prompts
        except PeecAPIError as e:
            print(f"[peec] list_prompts failed: {e}")
            return []

    async def list_tags(self, project_id: str) -> List[Tag]:
        cached = peec_cache.get("list_tags", project_id=project_id)
        if cached is not None:
            return cached
        try:
            data = await self._request("GET", "/tags", params={"project_id": project_id, "limit": 500})
            tags = [Tag(id=item["id"], label=item.get("name", item["id"])) for item in data.get("data", [])]
            peec_cache.set("list_tags", tags, project_id=project_id)
            return tags
        except PeecAPIError as e:
            print(f"[peec] list_tags failed: {e}")
            return []

    async def list_topics(self, project_id: str) -> List[Topic]:
        cached = peec_cache.get("list_topics", project_id=project_id)
        if cached is not None:
            return cached
        try:
            data = await self._request("GET", "/topics", params={"project_id": project_id, "limit": 500})
            topics = [Topic(id=item["id"], label=item.get("name", item["id"])) for item in data.get("data", [])]
            peec_cache.set("list_topics", topics, project_id=project_id)
            return topics
        except PeecAPIError as e:
            print(f"[peec] list_topics failed: {e}")
            return []

    async def create_topic(self, project_id: str, name: str) -> Topic:
        data = await self._request(
            "POST",
            "/topics",
            params={"project_id": project_id},
            json={"name": name[:64]},
        )
        # Response is just {"id": "to_..."} — not a full object
        item = data.get("data") or data
        return Topic(id=item["id"], label=name)

    async def create_prompt(self, project_id: str, message: str, topic_id: Optional[str] = None,
                            country_code: str = "US") -> Prompt:
        # Peec API requires: text (str, max 200), country_code (enum), optional topic_id
        payload: Dict[str, Any] = {
            "text": message[:200],
            "country_code": country_code,
        }
        if topic_id:
            payload["topic_id"] = topic_id
        data = await self._request(
            "POST",
            "/prompts",
            params={"project_id": project_id},
            json=payload,
        )
        # Response is just {"id": "pr_...", "warning": "..."} — not a full object
        item = data.get("data") or data
        return Prompt(
            id=item["id"],
            message=message,
            tags=[],
            topics=[topic_id] if topic_id else [],
            search_volume=item.get("volume"),
        )

    async def list_models(self, project_id: str) -> List[Model]:
        cached = peec_cache.get("list_models", project_id=project_id)
        if cached is not None:
            return cached
        try:
            data = await self._request("GET", "/models", params={"project_id": project_id, "limit": 200})
            models = [Model(id=item["id"], name=item.get("name", item["id"])) for item in data.get("data", [])]
            peec_cache.set("list_models", models, project_id=project_id)
            return models
        except PeecAPIError as e:
            print(f"[peec] list_models failed: {e}")
            return []

    async def list_chats(self, project_id: str, start_date: str, end_date: str,
                         brand_id: Optional[str] = None, limit: int = 200) -> List[Chat]:
        params = {
            "project_id": project_id,
            "start_date": start_date,
            "end_date": end_date,
            "limit": limit,
        }
        if brand_id:
            params["brand_id"] = brand_id
        try:
            data = await self._request("GET", "/chats", params=params)
            chats = []
            for item in data.get("data", []):
                prompt_obj = item.get("prompt") or {}
                model_obj = item.get("model") or {}
                chats.append(Chat(
                    id=item["id"],
                    prompt_id=prompt_obj.get("id") if isinstance(prompt_obj, dict) else None,
                    model_id=model_obj.get("id") if isinstance(model_obj, dict) else None,
                    created_at=item.get("date"),
                ))
            return chats
        except PeecAPIError as e:
            print(f"[peec] list_chats failed: {e}")
            return []

    async def get_chat_content(self, chat_id: str, project_id: str) -> Optional[ChatContent]:
        cached = peec_cache.get("get_chat_content", chat_id=chat_id)
        if cached is not None:
            return cached
        try:
            data = await self._request("GET", f"/chats/{chat_id}/content", params={"project_id": project_id})
            sources_raw = data.get("sources") or []
            sources = []
            for s in sources_raw:
                if isinstance(s, dict):
                    sources.append(Source(
                        url=s.get("url", ""),
                        domain=s.get("domain"),
                        title=s.get("title"),
                        citation_count=s.get("citation_count", 0),
                    ))
            content = ChatContent(
                id=data.get("id", chat_id),
                messages=data.get("messages") or [],
                sources=sources,
                brands_mentioned=[
                    b.get("id") if isinstance(b, dict) else b
                    for b in (data.get("brands_mentioned") or [])
                ],
                queries=data.get("queries") or [],
            )
            peec_cache.set("get_chat_content", content, chat_id=chat_id)
            return content
        except PeecAPIError as e:
            print(f"[peec] get_chat_content failed: {e}")
            return None

    async def _post_report(self, endpoint: str, project_id: str, dimensions: List[str],
                           start_date: str, end_date: str,
                           filters: Optional[List[Dict[str, Any]]] = None,
                           limit: int = 1000) -> Dict[str, Any]:
        body: Dict[str, Any] = {
            "project_id": project_id,
            "start_date": start_date,
            "end_date": end_date,
            "dimensions": dimensions,
            "limit": limit,
        }
        if filters:
            body["filters"] = filters
        return await self._request("POST", endpoint, params={"project_id": project_id}, json=body)

    async def get_brands_report(
        self,
        project_id: str,
        dimensions: List[str],
        start_date: str,
        end_date: str,
        brand_id: Optional[str] = None,
        prompt_ids: Optional[List[str]] = None,
    ) -> BrandsReport:
        try:
            filters = None
            parts = []
            if brand_id:
                parts.append({"field": "brand_id", "operator": "in", "values": [brand_id]})
            if prompt_ids:
                parts.append({"field": "prompt_id", "operator": "in", "values": prompt_ids})
            if parts:
                filters = parts
            data = await self._post_report("/reports/brands", project_id, dimensions, start_date, end_date, filters)
            metrics = []
            for item in data.get("data", []):
                brand = item.get("brand") or {}
                model = item.get("model") or {}
                prompt = item.get("prompt") or {}
                sentiment = item.get("sentiment")
                metrics.append(BrandMetric(
                    brand_id=brand.get("id", ""),
                    brand_name=brand.get("name"),
                    visibility=item.get("visibility") or 0.0,
                    sentiment=float(sentiment) if sentiment is not None else 0.0,
                    position=item.get("position"),
                    model_id=model.get("id") if isinstance(model, dict) else None,
                    prompt_id=prompt.get("id") if isinstance(prompt, dict) else None,
                    mention_count=item.get("mention_count"),
                    share_of_voice=item.get("share_of_voice"),
                ))
            return BrandsReport(data=metrics, dimensions=dimensions)
        except PeecAPIError as e:
            print(f"[peec] get_brands_report failed: {e}")
            raise

    async def get_domains_report(
        self,
        project_id: str,
        dimensions: List[str],
        start_date: str,
        end_date: str,
    ) -> DomainsReport:
        try:
            data = await self._post_report("/reports/domains", project_id, dimensions, start_date, end_date)
            metrics = []
            for item in data.get("data", []):
                model = item.get("model") or {}
                metrics.append(DomainMetric(
                    domain=item.get("domain", ""),
                    usage_rate=item.get("usage_rate") or 0.0,
                    citation_avg=item.get("citation_avg") or 0.0,
                    classification=item.get("classification", "OTHER"),
                    model_id=model.get("id") if isinstance(model, dict) else None,
                ))
            return DomainsReport(data=metrics, dimensions=dimensions)
        except PeecAPIError as e:
            print(f"[peec] get_domains_report failed: {e}")
            raise

    async def get_urls_report(
        self,
        project_id: str,
        dimensions: List[str],
        start_date: str,
        end_date: str,
    ) -> UrlsReport:
        try:
            data = await self._post_report("/reports/urls", project_id, dimensions, start_date, end_date)
            metrics = []
            for item in data.get("data", []):
                metrics.append(UrlMetric(
                    url=item.get("url", ""),
                    domain=item.get("url", "").split("/")[2] if item.get("url", "").startswith("http") else "",
                    usage_count=item.get("usage_count") or 0,
                    citation_count=item.get("citation_count") or 0,
                    classification=item.get("classification", "OTHER"),
                    title=item.get("title"),
                ))
            return UrlsReport(data=metrics, dimensions=dimensions)
        except PeecAPIError as e:
            print(f"[peec] get_urls_report failed: {e}")
            raise


peec_client = PeecClient()
