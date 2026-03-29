/**
 * API Service Layer
 * -----------------
 * All data fetching goes through this module.
 * Calls the FastAPI backend at http://127.0.0.1:8000.
 */

import type {
  Asset,
  AssetCreateRequest,
  AssetCreateResponse,
  AssetMoveRequest,
  AssetMoveResponse,
  AssetRepairRequest,
  ApiMessageResponse,
} from "@/types/asset";

export interface LocationItem {
  name: string;
  location_name?: string;
}

// ─── Config ─────────────────────────────────────────────────────

const API_BASE = "http://127.0.0.1:8001";

// ─── Helpers ────────────────────────────────────────────────────

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

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
      detail = typeof errBody.detail === "string"
        ? errBody.detail
        : JSON.stringify(errBody.detail);
    } catch {
      // fallback to status text
      detail = res.statusText || detail;
    }
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

// ─── Assets ─────────────────────────────────────────────────────

/** Fetch all assets from ERPNext */
export async function getAssets(): Promise<Asset[]> {
  return apiFetch<Asset[]>("/api/assets");
}

/** Fetch a single asset with full details (including schedules) */
export async function getAsset(assetId: string): Promise<Asset> {
  return apiFetch<Asset>(`/api/assets/${encodeURIComponent(assetId)}`);
}

/** Fetch all Location records from ERPNext */
export async function fetchLocations(): Promise<LocationItem[]> {
  return apiFetch<LocationItem[]>("/api/locations");
}

/** Create a new asset as Draft */
export async function createAsset(
  payload: AssetCreateRequest
): Promise<AssetCreateResponse> {
  return apiFetch<AssetCreateResponse>("/api/assets/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Submit an asset (change status to Submitted) */
export async function submitAsset(
  assetId: string
): Promise<ApiMessageResponse> {
  return apiFetch<ApiMessageResponse>(
    `/api/assets/${encodeURIComponent(assetId)}/submit`,
    { method: "POST" }
  );
}

/** Move an asset to a new location */
export async function moveAsset(
  payload: AssetMoveRequest
): Promise<AssetMoveResponse> {
  return apiFetch<AssetMoveResponse>("/api/assets/move", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Send an asset to maintenance/repair */
export async function repairAsset(
  payload: AssetRepairRequest
): Promise<ApiMessageResponse> {
  return apiFetch<ApiMessageResponse>("/api/assets/repair", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Scrap / decommission an asset */
export async function scrapAsset(
  assetId: string
): Promise<ApiMessageResponse> {
  return apiFetch<ApiMessageResponse>(
    `/api/assets/${encodeURIComponent(assetId)}/scrap`,
    { method: "PUT" }
  );
}

export { ApiError };
