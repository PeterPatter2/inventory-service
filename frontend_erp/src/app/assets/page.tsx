"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  AlertTriangle,
  Plus,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { getAssets, createAsset, ApiError, fetchLocations } from "@/services/api";
import type { Asset } from "@/types/asset";
import type { LocationItem } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { getItems } from "@/services/stock_api";
import type { Item } from "@/types/stock";

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "Draft", label: "Draft" },
  { value: "Submitted", label: "Submitted" },
  { value: "Partially Depreciated", label: "Partially Depreciated" },
  { value: "Fully Depreciated", label: "Fully Depreciated" },
  { value: "Scrapped", label: "Scrapped" },
];

export default function AssetsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // Dynamic dropdown data
  const [itemOptions, setItemOptions] = React.useState<Item[]>([]);
  const [locationOptions, setLocationOptions] = React.useState<LocationItem[]>([]);

  // Create form state
  const getToday = () => new Date().toISOString().split("T")[0];
  const getNextMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  };

  const [createForm, setCreateForm] = React.useState({
    item_code: "",
    asset_name: "",
    location: "",
    purchase_date: getToday(),
    available_for_use_date: getToday(),
    gross_purchase_amount: 0,
    calculate_depreciation: false,
    depreciation_method: "Straight Line" as "Straight Line" | "Double Declining Balance" | "Written Down Value",
    frequency_of_depreciation: 12,
    total_number_of_depreciations: 60,
    expected_value_after_useful_life: 0,
    depreciation_start_date: getNextMonth(),
  });

  const loadAssets = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAssets();
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Load dropdown options when dialog opens
  React.useEffect(() => {
    if (!showCreate) return;
    async function loadOptions() {
      try {
        const [items, locations] = await Promise.all([
          getItems(),
          fetchLocations(),
        ]);
        // For assets, we want items where is_fixed_asset = 1
        const fixedAssetItems = items.filter((i) => i.is_fixed_asset === 1);
        setItemOptions(fixedAssetItems.length > 0 ? fixedAssetItems : items);
        setLocationOptions(locations);
      } catch {
        // Silently fail — user can still type manually
      }
    }
    loadOptions();
  }, [showCreate]);

  // Client-side filtering
  const filtered = React.useMemo(() => {
    let result = [...assets];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.asset_name.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.item_code.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }

    return result;
  }, [assets, search, statusFilter]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const submitPayload: any = {
        item_code: createForm.item_code.split(" — ")[0].trim(),
        asset_name: createForm.asset_name,
        location: createForm.location,
        purchase_date: createForm.purchase_date,
        available_for_use_date: createForm.available_for_use_date,
        gross_purchase_amount: createForm.gross_purchase_amount,
        calculate_depreciation: createForm.calculate_depreciation ? 1 : 0,
      };

      if (createForm.calculate_depreciation) {
        submitPayload.finance_books = [
          {
            finance_book: "",
            depreciation_method: createForm.depreciation_method,
            frequency_of_depreciation: createForm.frequency_of_depreciation,
            total_number_of_depreciations: createForm.total_number_of_depreciations,
            expected_value_after_useful_life: createForm.expected_value_after_useful_life,
            depreciation_start_date: createForm.depreciation_start_date,
          }
        ];
      }

      const res = await createAsset(submitPayload);
      addToast({
        title: "Asset Created",
        description: `${res.asset_id} created and submitted successfully.`,
        variant: "success",
      });
      setShowCreate(false);
      setCreateForm({
        item_code: "",
        asset_name: "",
        location: "",
        purchase_date: getToday(),
        available_for_use_date: getToday(),
        gross_purchase_amount: 0,
        calculate_depreciation: false,
        depreciation_method: "Straight Line",
        frequency_of_depreciation: 12,
        total_number_of_depreciations: 60,
        expected_value_after_useful_life: 0,
        depreciation_start_date: getNextMonth(),
      });
      loadAssets();
    } catch (err) {
      addToast({
        title: "Create Failed",
        description: err instanceof ApiError ? err.detail : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Directory</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading..." : `${assets.length} assets registered`}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Asset
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Failed to load assets</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadAssets}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or item code..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Asset ID
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  Item Code
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                  Location
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading
                ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-muted rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-40 bg-muted rounded" /></td>
                    <td className="px-6 py-4 hidden md:table-cell"><div className="h-4 w-24 bg-muted rounded" /></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 w-32 bg-muted rounded" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-muted rounded-full" /></td>
                  </tr>
                ))
                : filtered.map((asset) => (
                  <tr
                    key={asset.name}
                    onClick={() => router.push(`/assets/${encodeURIComponent(asset.name)}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-muted-foreground">{asset.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">{asset.asset_name}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{asset.item_code}</span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">{asset.location || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={asset.status} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={asset.status} size="sm" />
                    </td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No assets found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Asset Dialog — with Smart Dropdowns */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Asset</DialogTitle>
            <DialogDescription>
              Create a new asset in ERPNext. It will be automatically submitted after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Item Code — Smart Select */}
            <div className="space-y-2">
              <Label>Item Code *</Label>
              {itemOptions.length > 0 ? (
                <Select
                  value={createForm.item_code}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, item_code: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an item code..." />
                  </SelectTrigger>
                  <SelectContent>
                    {itemOptions.map((item) => (
                      <SelectItem key={item.item_code} value={item.item_code}>
                        {item.item_code} — {item.item_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="e.g. IT-LAPTOP-001"
                  value={createForm.item_code}
                  onChange={(e) => setCreateForm((p) => ({ ...p, item_code: e.target.value }))}
                />
              )}
            </div>

            {/* Asset Name — Text input (user-defined) */}
            <div className="space-y-2">
              <Label htmlFor="asset_name">Asset Name *</Label>
              <Input
                id="asset_name"
                placeholder="e.g. MacBook Pro 16-inch"
                value={createForm.asset_name}
                onChange={(e) => setCreateForm((p) => ({ ...p, asset_name: e.target.value }))}
              />
            </div>

            {/* Location — Smart Select from Locations */}
            <div className="space-y-2">
              <Label>Location *</Label>
              {locationOptions.length > 0 ? (
                <Select
                  value={createForm.location}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, location: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc.name} value={loc.name}>
                        {loc.location_name || loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="e.g. Office Building 1"
                  value={createForm.location}
                  onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
                />
              )}
            </div>

            {/* Purchase Date & Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date *</Label>
                <Input
                  type="date"
                  value={createForm.purchase_date}
                  onChange={(e) => setCreateForm(p => ({ ...p, purchase_date: e.target.value, available_for_use_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (THB) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={createForm.gross_purchase_amount || ""}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      gross_purchase_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            {/* Depreciation Section */}
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="calc_depr"
                  checked={createForm.calculate_depreciation}
                  onChange={(e) => setCreateForm(p => ({ ...p, calculate_depreciation: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="calc_depr" className="cursor-pointer font-semibold">Enable Financial Depreciation</Label>
              </div>

              {createForm.calculate_depreciation && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
                  <div className="space-y-2 col-span-1 sm:col-span-2">
                    <Label>Depreciation Method *</Label>
                    <Select
                      value={createForm.depreciation_method}
                      onValueChange={(v: "Straight Line" | "Double Declining Balance" | "Written Down Value") => setCreateForm(p => ({ ...p, depreciation_method: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Straight Line">Straight Line</SelectItem>
                        <SelectItem value="Double Declining Balance">Double Declining Balance</SelectItem>
                        <SelectItem value="Written Down Value">Written Down Value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency (Months) *</Label>
                    <Input
                      type="number"
                      placeholder="12"
                      value={createForm.frequency_of_depreciation || ""}
                      onChange={(e) => setCreateForm(p => ({ ...p, frequency_of_depreciation: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Depreciations *</Label>
                    <Input
                      type="number"
                      placeholder="60"
                      value={createForm.total_number_of_depreciations || ""}
                      onChange={(e) => setCreateForm(p => ({ ...p, total_number_of_depreciations: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salvage Value (THB)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={createForm.expected_value_after_useful_life || ""}
                      onChange={(e) => setCreateForm(p => ({ ...p, expected_value_after_useful_life: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={createForm.depreciation_start_date}
                      onChange={(e) => setCreateForm(p => ({ ...p, depreciation_start_date: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                !createForm.item_code ||
                !createForm.asset_name ||
                !createForm.location ||
                !createForm.gross_purchase_amount
              }
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create & Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
