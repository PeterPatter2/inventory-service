"""
Asynchronous ERPNext REST API client.

Three module-level async helpers that use a shared httpx.AsyncClient
with token-based auth on every request.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException

from app.config import settings

# ── Shared async client (created lazily) ────────────────────────────

_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


def _headers() -> Dict[str, str]:
    return {
        "Authorization": settings.auth_token,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _base() -> str:
    return settings.erpnext_url.rstrip("/")


# ── Public helpers ──────────────────────────────────────────────────


async def erpnext_get(
    endpoint: str,
    params: Optional[Dict[str, Any]] = None,
) -> Any:
    """GET request to ERPNext REST API."""
    try:
        resp = await _get_client().get(
            f"{_base()}{endpoint}",
            headers=_headers(),
            params=params,
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        detail = _extract_detail(exc.response)
        raise HTTPException(status_code=exc.response.status_code, detail=detail)
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="ERPNext is unreachable")


async def erpnext_post(
    endpoint: str,
    payload: Dict[str, Any],
) -> Any:
    """POST request to ERPNext REST API."""
    try:
        resp = await _get_client().post(
            f"{_base()}{endpoint}",
            headers=_headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        detail = _extract_detail(exc.response)
        raise HTTPException(status_code=exc.response.status_code, detail=detail)
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="ERPNext is unreachable")


async def erpnext_put(
    endpoint: str,
    name: str,
    payload: Dict[str, Any],
) -> Any:
    """PUT request to ERPNext REST API."""
    try:
        resp = await _get_client().put(
            f"{_base()}{endpoint}/{name}",
            headers=_headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        detail = _extract_detail(exc.response)
        raise HTTPException(status_code=exc.response.status_code, detail=detail)
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="ERPNext is unreachable")


async def create_item(
    item_code: str,
    item_group: str,
    stock_uom: str,
    item_name: Optional[str] = None,
    description: Optional[str] = None,
    is_fixed_asset: int = 0,
    is_stock_item: int = 1,
    asset_category: Optional[str] = None,
) -> Any:
    """Create a new Item in ERPNext."""
    payload = {
        "item_code": item_code,
        "item_group": item_group,
        "stock_uom": stock_uom,
        "is_fixed_asset": is_fixed_asset,
        "is_stock_item": is_stock_item,
        "item_defaults": [{
            "company": "Group 2 Corporation",
            "default_warehouse": "Stores - G2"
        }]
    }
    if item_name:
        payload["item_name"] = item_name
    if asset_category:
        payload["asset_category"] = asset_category
    if description is not None:
        payload["description"] = description
        
    return await erpnext_post("/api/resource/Item", payload)


# ── Internal detail extractor ──────────────────────────────────────


def _extract_detail(response: httpx.Response) -> str:
    """Pull a human-readable error from an ERPNext error response."""
    import json as _json

    try:
        body = response.json()
        if "exception" in body:
            return body["exception"].split('\n')[-1]
        if "_server_messages" in body:
            msgs = _json.loads(body["_server_messages"])
            if msgs:
                msg_obj = _json.loads(msgs[0])
                return msg_obj.get("message", str(msg_obj))
        if "message" in body:
            return str(body["message"])
    except Exception:
        pass
    return response.text[:200] or "Unknown ERPNext error"
