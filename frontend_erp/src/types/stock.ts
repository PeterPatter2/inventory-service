// ─── Item (from GET /api/stock/items) ───────────────────────────
export interface Item {
  item_code: string;
  item_name: string;
  is_stock_item: number;   // 1 = yes, 0 = no
  is_fixed_asset: number;  // 1 = yes, 0 = no
  item_group: string;
}

export interface ItemCreateRequest {
  item_code: string;
  item_group: string;
  stock_uom: string;       // e.g. "Nos", "Kg", "Box"
  opening_stock?: number;
  is_fixed_asset?: number;
  is_stock_item?: number;
  asset_category?: string;
}

// ─── Warehouse (from GET /api/stock/warehouses) ─────────────────
export interface Warehouse {
  name: string;            // Warehouse ID (e.g. "Stores - PSE")
  warehouse_name: string;  // Display name
  company: string;
}

// ─── Stock Availability (from GET /api/stock/{item_code}) ───────
export interface StockAvailability {
  item_code: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty: number;
  available_qty: number;
}

// ─── Stock Entry / Movement ─────────────────────────────────────
export type StockEntryType =
  | "Material Receipt"
  | "Material Transfer"
  | "Material Issue";

export interface StockEntryItem {
  item_code: string;
  qty: number;
  s_warehouse?: string;   // source warehouse
  t_warehouse?: string;   // target warehouse
}

export interface StockEntryCreateRequest {
  stock_entry_type: StockEntryType;
  docstatus?: number;
  items: StockEntryItem[];
}

export interface StockEntryResponse {
  name: string;            // Stock Entry ID
  stock_entry_type: string;
  docstatus: number;
}

// ─── Stock Level Indicator ──────────────────────────────────────
export type StockLevel = "in-stock" | "low-stock" | "out-of-stock";

export function getStockLevel(available: number): StockLevel {
  if (available <= 0) return "out-of-stock";
  if (available <= 5) return "low-stock";
  return "in-stock";
}

export const STOCK_LEVEL_CONFIG: Record<
  StockLevel,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  "in-stock": {
    label: "In Stock",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    dotColor: "bg-emerald-500",
  },
  "low-stock": {
    label: "Low Stock",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    dotColor: "bg-amber-500",
  },
  "out-of-stock": {
    label: "Out of Stock",
    color: "text-red-700",
    bgColor: "bg-red-50",
    dotColor: "bg-red-500",
  },
};
