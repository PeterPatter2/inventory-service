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
        item_name=payload.item_name,
        stock_uom=payload.stock_uom,
        description=desc,
        is_fixed_asset=payload.is_fixed_asset,
        is_stock_item=payload.is_stock_item,
        asset_category=payload.asset_category
    )
    return result.get("data", {})


# ═══════════════════════════════════════════════════════════════════════
#  List Item Groups (read-only)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/item-groups", summary="List all Item Groups")
async def list_item_groups():
    params = {
        "fields": json.dumps(["name", "item_group_name"]),
        "limit_page_length": 0,
    }
    data = await erpnext_get("/api/resource/Item Group", params)
    return data.get("data", [])


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


@router.get("/warehouse-summary", summary="Get total actual quantity per warehouse")
async def get_warehouse_summary():
    """Fetches all Bins (>0) and aggregates actual_qty by warehouse."""
    params = {
        "fields": json.dumps(["warehouse", "actual_qty"]),
        "filters": json.dumps([["actual_qty", ">", 0]]), # สำคัญ: กรองเอาเฉพาะสินค้าที่มีอยู่จริง ไม่เอาค่าติดลบ
        "limit_page_length": 0,
    }
    data = await erpnext_get("/api/resource/Bin", params)
    bins = data.get("data", [])
    
    summary: dict[str, float] = {}
    for b in bins:
        wh = b.get("warehouse")
        qty = float(b.get("actual_qty", 0))
        if wh:
            summary[wh] = summary.get(wh, 0) + qty
            
    # แปลงเป็น List และเรียงลำดับจากมากไปน้อย (เพื่อให้ได้ Top 5 ที่ถูกต้อง)
    results = [{"name": wh, "qty": qty} for wh, qty in summary.items()]
    results.sort(key=lambda x: x["qty"], reverse=True)
    
    return results


@router.get("/warehouses/{warehouse}/inventory", summary="Get inventory items in a specific warehouse")
async def get_warehouse_inventory(warehouse: str):
    """Fetches all Bins for a specific warehouse."""
    params = {
        "fields": json.dumps(["item_code", "actual_qty", "valuation_rate"]),
        "filters": json.dumps([["warehouse", "=", warehouse], ["actual_qty", ">", 0]]),
        "limit_page_length": 0,
    }
    data = await erpnext_get("/api/resource/Bin", params)
    return data.get("data", [])


@router.get("/low-stock", summary="Get items below reorder level")
async def get_low_stock_items():
    """Fetches all items where available quantity is below reorder level."""
    # ── Get all items (stock items only) ──────────────────────
    items_params = {
        "fields": json.dumps(["item_code", "item_name", "stock_uom"]),
        "filters": json.dumps([["is_stock_item", "=", 1]]),
        "limit_page_length": 0,
    }
    items_data = await erpnext_get("/api/resource/Item", items_params)
    items = items_data.get("data", [])
    
    # ── Get all bins (stock) ──────────────────────────────────
    bins_params = {
        "fields": json.dumps(["item_code", "warehouse", "actual_qty"]),
        "limit_page_length": 0,
    }
    bins_data = await erpnext_get("/api/resource/Bin", bins_params)
    bins = bins_data.get("data", [])
    
    # ── Aggregate stock per item ──────────────────────────────
    item_stock: dict[str, float] = {}
    for bin_row in bins:
        code = bin_row.get("item_code")
        qty = float(bin_row.get("actual_qty", 0))
        if code:
            item_stock[code] = item_stock.get(code, 0) + qty
    
    # ── Find items below reorder level ────────────────────────
    low_stock = []
    for item in items:
        code = item.get("item_code")
        # Fetch full item details to get reorder_level
        try:
            item_detail = await erpnext_get(f"/api/resource/Item/{code}", {})
            item_data = item_detail.get("data", {})
            reorder = float(item_data.get("reorder_level", 0))
        except:
            reorder = 0
        
        actual = item_stock.get(code, 0)
        
        if reorder > 0 and actual < reorder:
            low_stock.append({
                "item_code": code,
                "item_name": item.get("item_name", ""),
                "reorder_level": reorder,
                "actual_qty": actual,
                "shortage": reorder - actual,
                "stock_uom": item.get("stock_uom", ""),
            })
    
    # Sort by shortage (biggest shortage first)
    low_stock.sort(key=lambda x: x["shortage"], reverse=True)
    return low_stock


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


# ═══════════════════════════════════════════════════════════════════════
#  Recent Activity  (recent stock movements) - MUST BE BEFORE /{item_code}
# ═══════════════════════════════════════════════════════════════════════


@router.get("/recent-activity", summary="Get 5 most recent stock movements")
async def get_recent_activity() -> List[dict]:
    """Fetches the 5 most recent submitted Stock Entry records with item details."""
    # ── Fetch submitted Stock Entry records (recent first) ──────────
    params = {
        "fields": json.dumps(["name", "posting_date", "creation", "stock_entry_type"]),
        "filters": json.dumps([["docstatus", "=", 1]]),
        "order_by": "creation desc",
        "limit_page_length": 5,
    }
    data = await erpnext_get("/api/resource/Stock Entry", params)
    entries = data.get("data", [])
    
    result = []
    for entry in entries:
        entry_name = entry.get("name")
        try:
            # ── Fetch full entry with items ──────────────────────────
            entry_detail = await erpnext_get(f"/api/resource/Stock Entry/{entry_name}")
            entry_doc = entry_detail.get("data", {})
            
            # ── Extract items from this entry ────────────────────────
            items = entry_doc.get("items", [])
            posting_date = entry_doc.get("posting_date", "")
            entry_type = entry_doc.get("stock_entry_type", "")
            
            for item_row in items:
                item_code = item_row.get("item_code", "")
                if not item_code:
                    continue
                
                # ── Get item details ─────────────────────────────────
                try:
                    item_detail = await erpnext_get(f"/api/resource/Item/{item_code}")
                    item_data = item_detail.get("data", {})
                    item_name = item_data.get("item_name", "")
                except:
                    item_name = ""
                
                result.append({
                    "entry_name": entry_name,
                    "posting_date": posting_date,
                    "stock_entry_type": entry_type,
                    "item_code": item_code,
                    "item_name": item_name,
                    "qty": float(item_row.get("qty", 0)),
                    "stock_uom": item_row.get("stock_uom", ""),
                    "source_warehouse": item_row.get("s_warehouse", ""),
                    "target_warehouse": item_row.get("t_warehouse", ""),
                })
        except Exception as e:
            print(f"Error fetching {entry_name}: {e}")
            continue
    
    return result


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
        "company": "Group 2 Corporation",
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
