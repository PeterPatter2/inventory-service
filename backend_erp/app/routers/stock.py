"""
Stock Management API router.

Endpoints:
  GET  /api/stock/items           — list items, optional ?item_group= filter
  GET  /api/stock/warehouses      — list all warehouses
  GET  /api/stock/{item_code}     — calculate stock availability
  POST /api/stock/move            — create Stock Entry (movement)
"""

from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.erpnext_client import erpnext_get, erpnext_post, create_item
from app.models.schemas import (
    Item,
    ItemCreate,
    StockAvailabilityResponse,
    StockEntryCreate,
    StockEntryResponse,
    Warehouse,
)

router = APIRouter(prefix="/api/stock", tags=["Stock Management"])


# ═══════════════════════════════════════════════════════════════════════
#  List Items (read-only)
# ═══════════════════════════════════════════════════════════════════════


@router.get("/items", response_model=List[Item], summary="List items")
async def list_items(
    item_group: Optional[str] = Query(None, description="Filter by item_group"),
):
    filters: dict = {}
    if item_group:
        filters["item_group"] = item_group

    params: dict = {
        "fields": json.dumps(
            ["item_code", "item_name", "is_stock_item", "is_fixed_asset", "item_group"]
        ),
        "limit_page_length": 0,
    }
    if filters:
        params["filters"] = json.dumps(filters)

    data = await erpnext_get("/api/resource/Item", params)
    return data.get("data", [])


@router.post("/items", summary="Create a new item")
async def create_new_item(payload: ItemCreate):
    desc = f"Opening stock: {payload.opening_stock}" if payload.opening_stock > 0 else None
    result = await create_item(
        item_code=payload.item_code,
        item_group=payload.item_group,
        stock_uom=payload.stock_uom,
        description=desc,
    )
    return result.get("data", {})


# ═══════════════════════════════════════════════════════════════════════
#  List Warehouses (read-only)
# ═══════════════════════════════════════════════════════════════════════


@router.get("/warehouses", response_model=List[Warehouse], summary="List warehouses")
async def list_warehouses():
    params = {
        "fields": json.dumps(["name", "warehouse_name", "company"]),
        "limit_page_length": 0,
    }
    data = await erpnext_get("/api/resource/Warehouse", params)
    return data.get("data", [])


# ═══════════════════════════════════════════════════════════════════════
#  Stock Availability  (calculated from Stock Entry history)
# ═══════════════════════════════════════════════════════════════════════


async def _compute_availability(
    item_code: str, warehouse: str
) -> StockAvailabilityResponse:
    """
    actual_qty   = SUM qty (docstatus=1, t_warehouse=target)
                 − SUM qty (docstatus=1, s_warehouse=target)

    reserved_qty = SUM qty (docstatus=0, s_warehouse=target)

    available_qty = actual_qty − reserved_qty
    """

    # ── Submitted entries (docstatus=1) for actual_qty ──────────
    submitted = await erpnext_get(
        "/api/resource/Stock Entry",
        {
            "fields": json.dumps(["name"]),
            "filters": json.dumps({"docstatus": 1}),
            "limit_page_length": 0,
        },
    )

    actual_qty = 0.0
    for entry in submitted.get("data", []):
        doc = await erpnext_get(f"/api/resource/Stock Entry/{entry['name']}")
        for row in doc.get("data", {}).get("items", []):
            if row.get("item_code") != item_code:
                continue
            qty = float(row.get("qty", 0))
            if row.get("t_warehouse") == warehouse:
                actual_qty += qty
            if row.get("s_warehouse") == warehouse:
                actual_qty -= qty

    # ── Draft entries (docstatus=0) for reserved_qty ────────────
    drafts = await erpnext_get(
        "/api/resource/Stock Entry",
        {
            "fields": json.dumps(["name"]),
            "filters": json.dumps({"docstatus": 0}),
            "limit_page_length": 0,
        },
    )

    reserved_qty = 0.0
    for entry in drafts.get("data", []):
        doc = await erpnext_get(f"/api/resource/Stock Entry/{entry['name']}")
        for row in doc.get("data", {}).get("items", []):
            if row.get("item_code") != item_code:
                continue
            if row.get("s_warehouse") == warehouse:
                reserved_qty += float(row.get("qty", 0))

    return StockAvailabilityResponse(
        item_code=item_code,
        warehouse=warehouse,
        actual_qty=actual_qty,
        reserved_qty=reserved_qty,
        available_qty=actual_qty - reserved_qty,
    )


@router.get(
    "/{item_code}/all-warehouses",
    response_model=List[StockAvailabilityResponse],
    summary="Stock availability for an item across ALL warehouses",
)
async def get_stock_all_warehouses(item_code: str):
    """Scan Stock Entry history and return qty per warehouse for the given item."""

    warehouse_qty: dict[str, float] = {}      # actual
    warehouse_reserved: dict[str, float] = {}  # reserved

    # ── Submitted entries (docstatus=1) → actual_qty ────────
    submitted = await erpnext_get(
        "/api/resource/Stock Entry",
        {
            "fields": json.dumps(["name"]),
            "filters": json.dumps({"docstatus": 1}),
            "limit_page_length": 0,
        },
    )
    for entry in submitted.get("data", []):
        doc = await erpnext_get(f"/api/resource/Stock Entry/{entry['name']}")
        for row in doc.get("data", {}).get("items", []):
            if row.get("item_code") != item_code:
                continue
            qty = float(row.get("qty", 0))
            t_wh = row.get("t_warehouse")
            s_wh = row.get("s_warehouse")
            if t_wh:
                warehouse_qty[t_wh] = warehouse_qty.get(t_wh, 0) + qty
            if s_wh:
                warehouse_qty[s_wh] = warehouse_qty.get(s_wh, 0) - qty

    # ── Draft entries (docstatus=0) → reserved_qty ──────────
    drafts = await erpnext_get(
        "/api/resource/Stock Entry",
        {
            "fields": json.dumps(["name"]),
            "filters": json.dumps({"docstatus": 0}),
            "limit_page_length": 0,
        },
    )
    for entry in drafts.get("data", []):
        doc = await erpnext_get(f"/api/resource/Stock Entry/{entry['name']}")
        for row in doc.get("data", {}).get("items", []):
            if row.get("item_code") != item_code:
                continue
            s_wh = row.get("s_warehouse")
            if s_wh:
                warehouse_reserved[s_wh] = warehouse_reserved.get(s_wh, 0) + float(row.get("qty", 0))

    # ── Build response list ─────────────────────────────────
    all_whs = set(warehouse_qty.keys()) | set(warehouse_reserved.keys())
    results = []
    for wh in sorted(all_whs):
        actual = warehouse_qty.get(wh, 0)
        reserved = warehouse_reserved.get(wh, 0)
        results.append(StockAvailabilityResponse(
            item_code=item_code,
            warehouse=wh,
            actual_qty=actual,
            reserved_qty=reserved,
            available_qty=actual - reserved,
        ))

    return results


@router.get(
    "/{item_code}",
    response_model=StockAvailabilityResponse,
    summary="Calculate stock availability",
)
async def get_stock_availability(
    item_code: str,
    warehouse: str = Query(..., description="Warehouse to check"),
):
    return await _compute_availability(item_code, warehouse)


# ═══════════════════════════════════════════════════════════════════════
#  Stock Movement  (create Stock Entry)
# ═══════════════════════════════════════════════════════════════════════


@router.post(
    "/move",
    response_model=StockEntryResponse,
    summary="Create a stock movement (Stock Entry)",
)
async def create_stock_movement(payload: StockEntryCreate):
    # ── Pre-move guard: Material Transfer & Material Issue ──────
    needs_source = payload.stock_entry_type in (
        "Material Transfer",
        "Material Issue",
    )

    if needs_source:
        for item in payload.items:
            source = item.s_warehouse
            if not source:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Source warehouse required for "
                        f"'{payload.stock_entry_type}' on item '{item.item_code}'"
                    ),
                )
            avail = await _compute_availability(item.item_code, source)
            if avail.available_qty < item.qty:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Insufficient stock for '{item.item_code}' in "
                        f"'{source}': available={avail.available_qty}, "
                        f"requested={item.qty}"
                    ),
                )

    # ── Assemble ERPNext payload ────────────────────────────────
    items_rows = []
    for item in payload.items:
        row: dict = {"item_code": item.item_code, "qty": item.qty}
        if item.s_warehouse:
            row["s_warehouse"] = item.s_warehouse
        if item.t_warehouse:
            row["t_warehouse"] = item.t_warehouse
        items_rows.append(row)

    doc = {
        "doctype": "Stock Entry",
        "stock_entry_type": payload.stock_entry_type,
        "docstatus": 1,  # ALWAYS force submit (docstatus=1)
        "items": items_rows,
    }

    result = await erpnext_post("/api/resource/Stock Entry", doc)
    created = result.get("data", {})
    return StockEntryResponse(
        name=created.get("name", ""),
        stock_entry_type=created.get("stock_entry_type", payload.stock_entry_type),
        docstatus=created.get("docstatus", payload.docstatus),
    )
