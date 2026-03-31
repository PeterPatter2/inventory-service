/**
 * Stock API Service Layer
 * -----------------------
 * Calls the Stock FastAPI backend at http://127.0.0.1:8000.
 * Completely separate from the Asset API service.
 */

import type {
  Item,
  ItemCreateRequest,
  Warehouse,
  StockAvailability,
  StockEntryCreateRequest,
  StockEntryResponse,
} from "@/types/stock";

// ─── Config ─────────────────────────────────────────────────────

const STOCK_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ─── Helpers ────────────────────────────────────────────────────

export class StockApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "StockApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function stockFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${STOCK_API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      detail =
        typeof errBody.detail === "string"
          ? errBody.detail
          : JSON.stringify(errBody.detail);
    } catch {
      detail = res.statusText || detail;
    }
    throw new StockApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

// ─── Items ──────────────────────────────────────────────────────

/** List all items, optionally filtered by item_group */
export async function getItems(itemGroup?: string): Promise<Item[]> {
  const params = itemGroup
    ? `?item_group=${encodeURIComponent(itemGroup)}`
    : "";
  return stockFetch<Item[]>(`/api/stock/items${params}`);
}

/** Create a new item in ERPNext */
export async function createItem(payload: ItemCreateRequest): Promise<Item> {
  return stockFetch<Item>("/api/stock/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Item Groups ────────────────────────────────────────────────

export async function getItemGroups(): Promise<{ name: string; item_group_name: string }[]> {
  return stockFetch<{ name: string; item_group_name: string }[]>("/api/stock/item-groups");
}

// ─── Warehouses ─────────────────────────────────────────────────

/** List all warehouses */
export async function getWarehouses(): Promise<Warehouse[]> {
  return stockFetch<Warehouse[]>("/api/stock/warehouses");
}

/** Get total stock qty per warehouse for distribution chart */
export async function getWarehouseSummary(): Promise<{ name: string; qty: number }[]> {
  return stockFetch<{ name: string; qty: number }[]>("/api/stock/warehouse-summary");
}

/** Get detailed inventory items for a specific warehouse */
export async function getWarehouseInventory(warehouse: string): Promise<{ item_code: string; actual_qty: number; valuation_rate: number }[]> {
  return stockFetch<{ item_code: string; actual_qty: number; valuation_rate: number }[]>(`/api/stock/warehouses/${encodeURIComponent(warehouse)}/inventory`);
}

// ─── Stock Availability ─────────────────────────────────────────

/** Check stock availability for an item in a specific warehouse */
export async function getStockAvailability(
  itemCode: string,
  warehouse: string
): Promise<StockAvailability> {
  return stockFetch<StockAvailability>(
    `/api/stock/${encodeURIComponent(itemCode)}?warehouse=${encodeURIComponent(
      warehouse
    )}`
  );
}

/** Check stock availability for an item across ALL warehouses */
export async function getStockAllWarehouses(
  itemCode: string
): Promise<StockAvailability[]> {
  return stockFetch<StockAvailability[]>(
    `/api/stock/${encodeURIComponent(itemCode)}/all-warehouses`
  );
}

// ─── Stock Movement ─────────────────────────────────────────────

/** Create a stock movement (Material Receipt / Transfer / Issue) */
export async function createStockMovement(
  payload: StockEntryCreateRequest
): Promise<StockEntryResponse> {
  return stockFetch<StockEntryResponse>("/api/stock/move", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
