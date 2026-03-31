"""
Pydantic schemas for the Stock Management API.
"""

from pydantic import BaseModel
from typing import List, Optional


# ── Item ──────────────────────────────────────────────────────────

class Item(BaseModel):
    item_code: str
    item_name: str = ""
    is_stock_item: int = 1
    is_fixed_asset: int = 0
    item_group: str = ""


class ItemCreate(BaseModel):
    item_code: str
    item_name: Optional[str] = None
    item_group: str = "Products"
    stock_uom: str = "Nos"
    opening_stock: float = 0
    is_fixed_asset: int = 0
    is_stock_item: int = 1
    asset_category: Optional[str] = None


# ── Warehouse ─────────────────────────────────────────────────────

class Warehouse(BaseModel):
    name: str
    warehouse_name: str = ""
    company: str = ""


# ── Stock Availability ────────────────────────────────────────────

class StockAvailabilityResponse(BaseModel):
    item_code: str
    warehouse: str
    actual_qty: float = 0
    reserved_qty: float = 0
    available_qty: float = 0


# ── Stock Entry ───────────────────────────────────────────────────

class StockEntryItem(BaseModel):
    item_code: str
    qty: float
    s_warehouse: Optional[str] = None
    t_warehouse: Optional[str] = None


class StockEntryCreate(BaseModel):
    stock_entry_type: str = "Material Transfer"
    docstatus: int = 1
    items: List[StockEntryItem]


class StockEntryResponse(BaseModel):
    name: str
    stock_entry_type: str
    docstatus: int
