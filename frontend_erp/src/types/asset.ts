// ─── Asset Status (ERPNext uses capitalized strings) ────────────
export type AssetStatus =
  | "Draft"
  | "Submitted"
  | "Partially Depreciated"
  | "Fully Depreciated"

  | "Out of Order"
  | "Out of Order (Maintain)"
  | "Scrapped";

const MAINTENANCE_STATUS_ALIASES = new Set([
  "in maintenance",
  "under repair",
  "maintenance",
  "out of order",
  "out of order (maintain)",
  "out of order (maintenance)",
]);

function normalizeStatus(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function isMaintenanceStatus(status?: string | null): boolean {
  if (!status) return false;
  return MAINTENANCE_STATUS_ALIASES.has(normalizeStatus(status));
}

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
  "In Maintenance": {
    label: "Under Repair",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    dotColor: "bg-rose-500",  
  },
  "Out of Order": {
    label: "Under Repair",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    dotColor: "bg-rose-500",
  },
  Scrapped: {
    label: "Scrapped",
    color: "text-red-700",
    bgColor: "bg-red-50",
    dotColor: "bg-red-500",
  },
};

export interface DepreciationSchedule {
  name?: string;
  schedule_date: string;
  depreciation_amount: number;
  accumulated_depreciation_amount: number;
  journal_entry?: string; // Links to the accounting ledger if posted
  make_custom_gl_entry?: number;
}

export interface FinanceBook {
  finance_book?: string; // Can be empty string
  depreciation_method: "Straight Line" | "Double Declining Balance" | "Written Down Value";
  frequency_of_depreciation: number; // in months (e.g., 12)
  total_number_of_depreciations: number;
  expected_value_after_useful_life: number; // Salvage value
  depreciation_start_date: string; // YYYY-MM-DD
}

// ─── Asset (matches GET /api/assets response) ───────────────────
export interface Asset {
  name: string;        // Asset ID from ERPNext (e.g., "AST-00001")
  asset_name: string;  // Display name
  status: string;      // ERPNext status string
  location: string;    // Location name string
  item_code: string;   // Item code
  docstatus: number;   // 0=Draft, 1=Submitted
  gross_purchase_amount?: number;
  value_after_depreciation?: number;
  calculate_depreciation?: 1 | 0;
  opening_accumulated_depreciation?: number;
  opening_number_of_booked_depreciations?: number;
  finance_books?: FinanceBook[];
  schedules?: DepreciationSchedule[];
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
  calculate_depreciation?: 1 | 0;
  opening_accumulated_depreciation?: number;
  opening_number_of_booked_depreciations?: number;
  finance_books?: FinanceBook[];
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
