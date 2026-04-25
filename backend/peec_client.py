"""Thin async client for the Peec AI customer API."""
from __future__ import annotations

import asyncio
import os
from typing import Any

import httpx

BASE_URL = "https://api.peec.ai/customer/v1"


class PeecClient:
    def __init__(
        self,
        api_key: str | None = None,
        project_id: str | None = None,
        timeout: float = 30.0,
    ):
        key = api_key or os.environ.get("PEEC_API_KEY")
        if not key:
            raise RuntimeError("PEEC_API_KEY missing (pass api_key= or set env var)")
        self.project_id = project_id or os.environ.get("PEEC_PROJECT_ID") or None
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={"X-API-Key": key},
            timeout=timeout,
        )

    async def __aenter__(self) -> "PeecClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self._client.aclose()

    def _params(self, extra: dict[str, Any] | None = None) -> dict[str, Any]:
        params: dict[str, Any] = {}
        if self.project_id:
            params["project_id"] = self.project_id
        if extra:
            params.update({k: v for k, v in extra.items() if v is not None})
        return params

    def _require_project(self) -> None:
        if not self.project_id:
            raise RuntimeError(
                "project_id is required for this endpoint — "
                "construct PeecClient(project_id=...) or set PEEC_PROJECT_ID"
            )

    async def list_projects(self) -> list[dict]:
        r = await self._client.get("/projects")
        r.raise_for_status()
        return r.json().get("data", [])

    async def list_brands(self) -> list[dict]:
        self._require_project()
        r = await self._client.get("/brands", params=self._params())
        r.raise_for_status()
        return r.json().get("data", [])

    async def own_brands(self) -> list[dict]:
        return [b for b in await self.list_brands() if b.get("is_own")]

    async def list_chats(
        self,
        *,
        start_date: str,
        end_date: str,
        brand_id: str | None = None,
        prompt_id: str | None = None,
        limit: int = 1000,
        offset: int = 0,
    ) -> dict:
        self._require_project()
        params = self._params(
            {
                "start_date": start_date,
                "end_date": end_date,
                "limit": limit,
                "offset": offset,
                "brand_id": brand_id,
                "prompt_id": prompt_id,
            }
        )
        r = await self._client.get("/chats", params=params)
        r.raise_for_status()
        return r.json()

    async def get_chat(self, chat_id: str) -> dict:
        self._require_project()
        r = await self._client.get(
            f"/chats/{chat_id}/content", params=self._params()
        )
        r.raise_for_status()
        return r.json()

    async def create_prompt(self, text: str, country_code: str = "US") -> dict:
        self._require_project()
        r = await self._client.post(
            "/prompts",
            params=self._params(),
            json={"text": text, "country_code": country_code},
        )
        r.raise_for_status()
        return r.json()

    async def create_prompts_batch(
        self, texts: list[str], country_code: str = "US"
    ) -> list[dict]:
        async def one(t: str) -> dict:
            try:
                created = await self.create_prompt(t, country_code)
                return {"text": t, "ok": True, "id": created.get("id"), "raw": created}
            except httpx.HTTPStatusError as e:
                return {
                    "text": t,
                    "ok": False,
                    "status": e.response.status_code,
                    "error": e.response.text,
                }

        return await asyncio.gather(*(one(t) for t in texts))

    async def _report(
        self,
        path: str,
        *,
        start_date: str,
        end_date: str,
        dimensions: list[str] | None = None,
        filters: list[dict] | None = None,
        limit: int = 10000,
    ) -> list[dict]:
        self._require_project()
        body: dict[str, Any] = {
            "start_date": start_date,
            "end_date": end_date,
            "limit": limit,
        }
        if dimensions:
            body["dimensions"] = dimensions
        if filters:
            body["filters"] = filters
        r = await self._client.post(path, params=self._params(), json=body)
        r.raise_for_status()
        return r.json().get("data", [])

    async def get_brands_report(self, **kwargs: Any) -> list[dict]:
        return await self._report("/reports/brands", **kwargs)

    async def get_domains_report(self, **kwargs: Any) -> list[dict]:
        return await self._report("/reports/domains", **kwargs)

    async def get_urls_report(self, **kwargs: Any) -> list[dict]:
        return await self._report("/reports/urls", **kwargs)

    async def get_url_content(self, url: str, max_length: int = 100_000) -> dict | None:
        self._require_project()
        r = await self._client.post(
            "/sources/urls/content",
            params=self._params(),
            json={"url": url, "max_length": max_length},
        )
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json().get("data")
