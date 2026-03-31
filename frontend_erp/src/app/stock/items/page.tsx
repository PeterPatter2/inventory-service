"use client";

import React from "react";
import {
  Search,
  SlidersHorizontal,
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronUp,
  Warehouse,
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
import {
  getItems,
  createItem,
  getStockAllWarehouses,
  getItemGroups,
  StockApiError,
} from "@/services/stock_api";
import type { Item, StockAvailability } from "@/types/stock";
import { getStockLevel, STOCK_LEVEL_CONFIG } from "@/types/stock";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  const { addToast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [serverItemGroups, setServerItemGroups] = React.useState<{name: string, item_group_name: string}[]>([]);

  // Expanded row for availability
  const [expandedItem, setExpandedItem] = React.useState<string | null>(null);
  const [warehouseStock, setWarehouseStock] = React.useState<
    StockAvailability[]
  >([]);
  const [loadingStock, setLoadingStock] = React.useState(false);

  // Create form
  const [createForm, setCreateForm] = React.useState({
    item_code: "",
    item_name: "",
    item_group: "Products",
    stock_uom: "Nos",
    opening_stock: 0,
    is_fixed_asset: false,
    asset_category: "IT_TOOLS_G2",
  });

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItemGroups = React.useCallback(async () => {
    try {
      const groups = await getItemGroups();
      setServerItemGroups(groups);
    } catch (err) {
      console.error("Failed to load item groups", err);
    }
  }, []);

  React.useEffect(() => {
    loadItems();
    loadItemGroups();
  }, [loadItems, loadItemGroups]);

  // Get unique item groups for filter
  const itemGroups = React.useMemo(() => {
    const groups = new Set(items.map((i) => i.item_group));
    return Array.from(groups).sort();
  }, [items]);

  // Client-side filtering
  const filtered = React.useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.item_code.toLowerCase().includes(q) ||
          i.item_name.toLowerCase().includes(q)
      );
    }
    if (groupFilter !== "all") {
      result = result.filter((i) => i.item_group === groupFilter);
    }
    return result;
  }, [items, search, groupFilter]);

  const handleExpandRow = async (itemCode: string) => {
    if (expandedItem === itemCode) {
      setExpandedItem(null);
      return;
    }
    setExpandedItem(itemCode);
    setLoadingStock(true);
    setWarehouseStock([]);
    try {
      const data = await getStockAllWarehouses(itemCode);
      setWarehouseStock(data);
    } catch (err) {
      addToast({
        title: "Failed to check availability",
        description:
          err instanceof StockApiError ? err.detail : "Something went wrong",
        variant: "destructive",
      });
      setWarehouseStock([]);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const payload = {
        ...createForm,
        is_fixed_asset: createForm.is_fixed_asset ? 1 : 0,
        is_stock_item: createForm.is_fixed_asset ? 0 : 1,
        asset_category: createForm.is_fixed_asset ? createForm.asset_category : undefined,
      };
      
      await createItem(payload);
      addToast({
        title: "Item Created",
        description: `${createForm.item_code} registered successfully.`,
        variant: "success",
      });
      setShowCreate(false);
      setCreateForm({
        item_code: "",
        item_name: "",
        item_group: "Products",
        stock_uom: "Nos",
        opening_stock: 0,
        is_fixed_asset: false,
        asset_category: "IT_TOOLS_G2",
      });
      loadItems();
    } catch (err) {
      addToast({
        title: "Create Failed",
        description:
          err instanceof StockApiError ? err.detail : "Something went wrong.",
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
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading..." : `${items.length} items registered`}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Item
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                Failed to load inventory
              </p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadItems}>
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
                placeholder="Search by item code or name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[200px]">
                <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Item Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {itemGroups.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
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
                  Item Code
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Item Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                  Group
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                  Type
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Check Stock
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-muted rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-40 bg-muted rounded" />
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="h-4 w-24 bg-muted rounded" />
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="h-4 w-16 bg-muted rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 bg-muted rounded mx-auto" />
                      </td>
                    </tr>
                  ))
                : filtered.map((item) => (
                    <React.Fragment key={item.item_code}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono font-medium">
                            {item.item_code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium">
                            {item.item_name}
                          </p>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {item.item_group}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              item.is_stock_item
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {item.is_stock_item ? "Stock" : "Non-Stock"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExpandRow(item.item_code)}
                            className="text-xs"
                          >
                            <Warehouse className="h-3.5 w-3.5 mr-1" />
                            Availability
                            {expandedItem === item.item_code ? (
                              <ChevronUp className="h-3.5 w-3.5 ml-1" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 ml-1" />
                            )}
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded availability row */}
                      {expandedItem === item.item_code && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-muted/20">
                            {loadingStock ? (
                              <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking warehouses...
                              </div>
                            ) : warehouseStock.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No stock entries found for this item
                              </p>
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {warehouseStock.map((ws) => {
                                  const level = getStockLevel(
                                    ws.available_qty
                                  );
                                  const config = STOCK_LEVEL_CONFIG[level];
                                  return (
                                    <div
                                      key={ws.warehouse}
                                      className="rounded-xl border bg-background p-4"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-muted-foreground truncate pr-2">
                                          {ws.warehouse}
                                        </span>
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                            config.bgColor,
                                            config.color
                                          )}
                                        >
                                          <span
                                            className={cn(
                                              "h-1.5 w-1.5 rounded-full",
                                              config.dotColor
                                            )}
                                          />
                                          {config.label}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                          <p className="text-base font-bold">
                                            {ws.actual_qty}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground uppercase">
                                            Actual
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-base font-bold text-amber-600">
                                            {ws.reserved_qty}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground uppercase">
                                            Reserved
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-base font-bold text-emerald-600">
                                            {ws.available_qty}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground uppercase">
                                            Available
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No items found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Item Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Item</DialogTitle>
            <DialogDescription>
              Create a new inventory item in ERPNext.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ic">Item Code *</Label>
              <Input
                id="ic"
                placeholder="e.g. PEN-BL-001"
                value={createForm.item_code}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, item_code: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="in">Item Name</Label>
              <Input
                id="in"
                placeholder="e.g. Blue Pen"
                value={createForm.item_name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, item_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig">Item Group *</Label>
              <Select
                value={createForm.item_group}
                onValueChange={(val) =>
                  setCreateForm((p) => ({ ...p, item_group: val }))
                }
              >
                <SelectTrigger id="ig">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {serverItemGroups.map((g) => (
                    <SelectItem key={g.name} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uom">Stock UOM *</Label>
              <Input
                id="uom"
                placeholder="e.g. Nos, Kg, Box"
                value={createForm.stock_uom}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, stock_uom: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="os">Opening Stock</Label>
              <Input
                id="os"
                type="number"
                placeholder="0"
                value={createForm.opening_stock || ""}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    opening_stock: parseFloat(e.target.value) || 0,
                  }))
                }
                disabled={createForm.is_fixed_asset}
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="fixed_asset"
                className="w-4 h-4 rounded border-gray-300"
                checked={createForm.is_fixed_asset}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    is_fixed_asset: e.target.checked,
                    item_group: e.target.checked ? "Hardware G2" : "Products",
                  }))
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="fixed_asset" className="cursor-pointer">
                  Is Fixed Asset?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Check this to create an item that can be used as an Asset.
                </p>
              </div>
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
                !createForm.item_group ||
                !createForm.stock_uom
              }
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
