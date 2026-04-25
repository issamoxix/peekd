"""Thin async client for the Peec AI customer API."""
from __future__ import annotations

import os
from typing import Any

import httpx

BASE_URL = "https://api.peec.ai/customer/v1"


class PeecClient:
    def __init__(self, api_key: str | None = None, timeout: float = 30.0):
        key = api_key or os.environ.get("PEEC_API_KEY")
        if not key:
            raise RuntimeError("PEEC_API_KEY missing (pass api_key= or set env var)")
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={"X-API-Key": key},
            timeout=timeout,
        )

    async def __aenter__(self) -> "PeecClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self._client.aclose()

    async def list_brands(self) -> list[dict]:
        r = await self._client.get("/brands")
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
        params: dict[str, Any] = {
            "start_date": start_date,
            "end_date": end_date,
            "limit": limit,
            "offset": offset,
        }
        if brand_id:
            params["brand_id"] = brand_id
        if prompt_id:
            params["prompt_id"] = prompt_id
        r = await self._client.get("/chats", params=params)
        r.raise_for_status()
        return r.json()

    async def get_chat(self, chat_id: str) -> dict:
        r = await self._client.get(f"/chats/{chat_id}/content")
        r.raise_for_status()
        return r.json()

    async def get_url_content(self, url: str, max_length: int = 100_000) -> dict | None:
        r = await self._client.post(
            "/sources/urls/content",
            json={"url": url, "max_length": max_length},
        )
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json().get("data")
