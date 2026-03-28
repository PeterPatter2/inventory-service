// ─── Asset Status (ERPNext uses capitalized strings) ────────────
export type AssetStatus =
  | "Draft"
  | "Submitted"
  | "Partially Depreciated"
  | "Fully Depreciated"
  | "Scrapped";

export const ASSET_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  Draft: {
    label: "Draft",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    dotColor: "bg-gray-500",
  },
  Submitted: {
    label: "Submitted",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    dotColor: "bg-blue-500",
  },
  "Partially Depreciated": {
    label: "Partially Depreciated",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    dotColor: "bg-emerald-500",
  },
  "Fully Depreciated": {
    label: "Fully Depreciated",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    dotColor: "bg-amber-500",
  },
  Scrapped: {
    label: "Scrapped",
    color: "text-red-700",
    bgColor: "bg-red-50",
    dotColor: "bg-red-500",
  },
};

// ─── Asset (matches GET /api/assets response) ───────────────────
export interface Asset {
  name: string;        // Asset ID from ERPNext (e.g., "AST-00001")
  asset_name: string;  // Display name
  status: string;      // ERPNext status string
  location: string;    // Location name string
  item_code: string;   // Item code
}

// ─── Request Models (match backend Pydantic models) ─────────────
export interface AssetCreateRequest {
  item_code: string;
  asset_name: string;
  location: string;
  company?: string;              // default: "Khon Kaen University"
  gross_purchase_amount: number;
  purchase_date?: string;        // ISO date
  available_for_use_date?: string;
}

export interface AssetMoveRequest {
  asset_id: string;
  target_location: string;
}

export interface AssetRepairRequest {
  asset_id: string;
  description: string;
}

// ─── Response Models ────────────────────────────────────────────
export interface ApiMessageResponse {
  message: string;
}

export interface AssetCreateResponse {
  message: string;
  asset_id: string;
}

export interface AssetMoveResponse {
  message: string;
  movement_id: string;
}
