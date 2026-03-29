"use client";

import React from "react";
import {
  Eye,
  Search,
  AlertTriangle,
  Loader2,
  X,
  Warehouse,
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
import { useToast } from "@/components/ui/toast";
import {
  getItems,
  getWarehouses,
  getStockAvailability,
  getStockAllWarehouses,
  StockApiError,
} from "@/services/stock_api";
import type {
  Item,
  Warehouse as WarehouseType,
  StockAvailability,
} from "@/types/stock";
import { getStockLevel, STOCK_LEVEL_CONFIG } from "@/types/stock";
import { cn } from "@/lib/utils";

export default function AvailabilityPage() {
  const { addToast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Search & filter
  const [selectedItem, setSelectedItem] = React.useState("");
  const [selectedWarehouse, setSelectedWarehouse] = React.useState("all");

  // Results
  const [checking, setChecking] = React.useState(false);
  const [results, setResults] = React.useState<StockAvailability[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);

  // Quick Preview Sheet
  const [previewItem, setPreviewItem] = React.useState<string | null>(null);
  const [previewData, setPreviewData] = React.useState<StockAvailability[]>([]);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [itemData, warehouseData] = await Promise.all([
          getItems(),
          getWarehouses(),
        ]);
        setItems(itemData.filter((i) => i.is_stock_item === 1));
        setWarehouses(warehouseData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCheck = async () => {
    if (!selectedItem) return;
    setChecking(true);
    setHasSearched(true);
    try {
      if (selectedWarehouse === "all") {
        const data = await getStockAllWarehouses(selectedItem);
        setResults(data);
      } else {
        const data = await getStockAvailability(selectedItem, selectedWarehouse);
        setResults([data]);
      }
    } catch (err) {
      addToast({
        title: "Check Failed",
        description: err instanceof StockApiError ? err.detail : "Something went wrong",
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setChecking(false);
    }
  };

  // Quick Stock Preview handler
  const openPreview = async (itemCode: string) => {
    setPreviewItem(itemCode);
    setPreviewLoading(true);
    try {
      const data = await getStockAllWarehouses(itemCode);
      setPreviewData(data);
    } catch {
      setPreviewData([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewItemData = items.find((i) => i.item_code === previewItem);
  const totalAvailable = results.reduce(
    (sum, r) => sum + r.available_qty,
    0
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Stock Availability</h1></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Eye className="h-6 w-6 text-primary" />
          Stock Availability
        </h1>
        <p className="text-muted-foreground mt-1">
          Check real-time stock levels across all warehouses
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Search Controls */}
      <Card className="border-2 border-primary/10">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an item to check..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.item_code} value={item.item_code}>
                      {item.item_code} — {item.item_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.name} value={wh.name}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCheck} disabled={!selectedItem || checking}>
              {checking ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Checking...</>
              ) : (
                <><Search className="h-4 w-4 mr-2" />Check</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <>
          {results.length === 0 && !checking ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No stock entries found for this item.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-medium">
                  Showing {results.length} warehouse{results.length !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Available: <span className="font-bold text-emerald-600">{totalAvailable}</span>
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((r) => {
                  const level = getStockLevel(r.available_qty);
                  const config = STOCK_LEVEL_CONFIG[level];
                  return (
                    <Card
                      key={r.warehouse}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openPreview(r.item_code)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium truncate max-w-[180px]">
                              {r.warehouse}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                              config.bgColor,
                              config.color
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
                            {config.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="rounded-lg bg-muted/50 p-2.5">
                            <p className="text-lg font-bold">{r.actual_qty}</p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Actual
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2.5">
                            <p className="text-lg font-bold text-amber-600">{r.reserved_qty}</p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Reserved
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2.5">
                            <p className="text-lg font-bold text-emerald-600">{r.available_qty}</p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Available
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Quick Stock Preview — Slide-over Panel */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPreviewItem(null)} />
          <div className="relative w-full max-w-md bg-background shadow-2xl border-l animate-in slide-in-from-right overflow-y-auto">
            <div className="sticky top-0 bg-background border-b z-10 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{previewItem}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {previewItemData?.item_name || "Stock Preview"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreviewItem(null)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              {previewItemData && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Item Code</span>
                      <span className="font-mono font-medium">{previewItemData.item_code}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Group</span>
                      <span>{previewItemData.item_group}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        previewItemData.is_stock_item ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                      )}>
                        {previewItemData.is_stock_item ? "Stock Item" : "Non-Stock"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                Warehouse Availability
              </h4>

              {previewLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading warehouses...
                </div>
              ) : previewData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No stock entries found
                </p>
              ) : (
                <div className="space-y-3">
                  {previewData.map((ws) => {
                    const level = getStockLevel(ws.available_qty);
                    const config = STOCK_LEVEL_CONFIG[level];
                    return (
                      <div key={ws.warehouse} className="rounded-xl border p-4">
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
                            <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
                            {config.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-base font-bold">{ws.actual_qty}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">Actual</p>
                          </div>
                          <div>
                            <p className="text-base font-bold text-amber-600">{ws.reserved_qty}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">Reserved</p>
                          </div>
                          <div>
                            <p className="text-base font-bold text-emerald-600">{ws.available_qty}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">Available</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
