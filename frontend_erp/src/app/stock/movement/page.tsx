"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  TruckIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  createStockMovement,
  StockApiError,
} from "@/services/stock_api";
import type {
  Item,
  Warehouse,
  StockEntryType,
  StockEntryItem,
  StockAvailability,
} from "@/types/stock";
import { getStockLevel, STOCK_LEVEL_CONFIG } from "@/types/stock";
import { cn } from "@/lib/utils";

interface LineItem {
  id: string;
  item_code: string;
  qty: number;
  s_warehouse: string;
  t_warehouse: string;
  availability?: StockAvailability | null;
  checkingAvailability?: boolean;
  autoFilled?: boolean;
}

const MOVEMENT_TYPES: {
  value: StockEntryType;
  label: string;
  description: string;
  color: string;
  iconBg: string;
}[] = [
  {
    value: "Material Receipt",
    label: "Material Receipt",
    description: "Receive stock into a warehouse",
    color: "border-emerald-300 bg-emerald-50/50",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    value: "Material Transfer",
    label: "Material Transfer",
    description: "Move stock between warehouses",
    color: "border-sky-300 bg-sky-50/50",
    iconBg: "bg-sky-100 text-sky-600",
  },
  {
    value: "Material Issue",
    label: "Material Issue",
    description: "Issue stock out of a warehouse",
    color: "border-amber-300 bg-amber-50/50",
    iconBg: "bg-amber-100 text-amber-600",
  },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function StockMovementPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [items, setItems] = React.useState<Item[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [entryType, setEntryType] =
    React.useState<StockEntryType>("Material Transfer");
  const [lineItems, setLineItems] = React.useState<LineItem[]>([
    { id: generateId(), item_code: "", qty: 1, s_warehouse: "", t_warehouse: "" },
  ]);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [itemsData, warehousesData] = await Promise.all([
          getItems(),
          getWarehouses(),
        ]);
        setItems(itemsData.filter((i) => i.is_stock_item === 1));
        setWarehouses(warehousesData);
      } catch {
        addToast({
          title: "Failed to load data",
          description: "Could not fetch items or warehouses from backend.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [addToast]);

  const updateLine = (id: string, updates: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      { id: generateId(), item_code: "", qty: 1, s_warehouse: "", t_warehouse: "" },
    ]);
  };

  const removeLine = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((l) => l.id !== id));
  };

  // ─── Auto-fill Source Warehouse ──────────────────────────────
  const autoFillSourceWarehouse = async (lineId: string, itemCode: string) => {
    if (!itemCode || entryType === "Material Receipt") return;

    updateLine(lineId, { checkingAvailability: true, autoFilled: false });
    try {
      const allStock = await getStockAllWarehouses(itemCode);
      // Find the warehouse with the highest available qty
      const bestWarehouse = allStock
        .filter((s) => s.available_qty > 0)
        .sort((a, b) => b.available_qty - a.available_qty)[0];

      if (bestWarehouse) {
        updateLine(lineId, {
          s_warehouse: bestWarehouse.warehouse,
          availability: bestWarehouse,
          checkingAvailability: false,
          autoFilled: true,
        });
        addToast({
          title: "Source Auto-filled",
          description: `${bestWarehouse.warehouse} has ${bestWarehouse.available_qty} available`,
          variant: "success",
        });
      } else {
        updateLine(lineId, { checkingAvailability: false });
      }
    } catch {
      updateLine(lineId, { checkingAvailability: false });
    }
  };

  // ─── Check availability for a line ──────────────────────────
  const checkLineAvailability = async (lineId: string) => {
    const line = lineItems.find((l) => l.id === lineId);
    if (!line || !line.item_code || !line.s_warehouse) return;

    updateLine(lineId, { checkingAvailability: true, availability: null });
    try {
      const avail = await getStockAvailability(line.item_code, line.s_warehouse);
      updateLine(lineId, { checkingAvailability: false, availability: avail });
    } catch {
      updateLine(lineId, { checkingAvailability: false, availability: null });
    }
  };

  const needsSource = entryType === "Material Transfer" || entryType === "Material Issue";
  const needsTarget = entryType === "Material Receipt" || entryType === "Material Transfer";

  const isValid = lineItems.every(
    (l) =>
      l.item_code &&
      l.qty > 0 &&
      (!needsSource || l.s_warehouse) &&
      (!needsTarget || l.t_warehouse)
  );

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      const res = await createStockMovement({
        stock_entry_type: entryType,
        items: lineItems.map((l) => {
          const item: StockEntryItem = { item_code: l.item_code, qty: l.qty };
          if (l.s_warehouse) item.s_warehouse = l.s_warehouse;
          if (l.t_warehouse) item.t_warehouse = l.t_warehouse;
          return item;
        }),
      });
      setSuccess(res.name);
      addToast({
        title: "Movement Created",
        description: `${entryType} ${res.name} submitted successfully.`,
        variant: "success",
      });
    } catch (err) {
      addToast({
        title: "Movement Failed",
        description: err instanceof StockApiError ? err.detail : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccess(null);
    setEntryType("Material Transfer");
    setLineItems([
      { id: generateId(), item_code: "", qty: 1, s_warehouse: "", t_warehouse: "" },
    ]);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 w-full bg-muted rounded-xl animate-pulse" />
        <div className="h-64 w-full bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto rounded-full bg-emerald-50 p-4 w-fit">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold mt-4">Movement Submitted!</h2>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              Stock Entry <strong>{success}</strong> has been created and submitted.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <Button variant="outline" onClick={handleReset}>New Movement</Button>
              <Button onClick={() => router.push("/stock")}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TruckIcon className="h-6 w-6 text-primary" />
          Stock Movement
        </h1>
        <p className="text-muted-foreground mt-1">
          Create receipt, transfer, or issue entries for inventory
        </p>
      </div>

      {/* Movement Type Selector */}
      <div className="grid gap-3 sm:grid-cols-3">
        {MOVEMENT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setEntryType(type.value)}
            className={cn(
              "relative rounded-xl border-2 p-4 text-left transition-all cursor-pointer",
              entryType === type.value
                ? `${type.color} border-primary shadow-sm`
                : "border-border hover:border-primary/30 bg-background"
            )}
          >
            {entryType === type.value && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <p className="text-sm font-semibold">{type.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
          </button>
        ))}
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-3 border-b mb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Items ({lineItems.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((line, idx) => (
            <div key={line.id} className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Item #{idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  {line.autoFilled && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                      <Zap className="h-3 w-3" />Auto-filled
                    </span>
                  )}
                  {lineItems.length > 1 && (
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => removeLine(line.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Item Code */}
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label className="text-xs">Item *</Label>
                  <Select
                    value={line.item_code}
                    onValueChange={(v) => {
                      updateLine(line.id, { item_code: v, availability: null, autoFilled: false });
                      autoFillSourceWarehouse(line.id, v);
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select item..." />
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

                {/* Qty */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Qty *</Label>
                  <Input
                    type="number" min={1} value={line.qty}
                    onChange={(e) => updateLine(line.id, { qty: parseInt(e.target.value) || 1 })}
                    className="text-xs"
                  />
                </div>

                {/* Source Warehouse */}
                {needsSource && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Source Warehouse *</Label>
                    <Select
                      value={line.s_warehouse}
                      onValueChange={(v) => {
                        updateLine(line.id, { s_warehouse: v, availability: null, autoFilled: false });
                        if (line.item_code) setTimeout(() => checkLineAvailability(line.id), 100);
                      }}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Source..." />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.name} value={wh.name}>
                            {wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Target Warehouse */}
                {needsTarget && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Target Warehouse *</Label>
                    <Select
                      value={line.t_warehouse}
                      onValueChange={(v) => updateLine(line.id, { t_warehouse: v })}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Target..." />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.name} value={wh.name}>
                            {wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Availability indicator */}
              {line.checkingAvailability && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking availability...
                </div>
              )}
              {line.availability && (
                <div className="flex items-center gap-3 text-xs">
                  {(() => {
                    const level = getStockLevel(line.availability.available_qty);
                    const config = STOCK_LEVEL_CONFIG[level];
                    const isInsufficient = line.availability.available_qty < line.qty;
                    return (
                      <>
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                          config.bgColor, config.color
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
                          {config.label}
                        </span>
                        <span className="text-muted-foreground">
                          Available: {line.availability.available_qty}
                        </span>
                        {isInsufficient && (
                          <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                            <AlertTriangle className="h-3 w-3" />Insufficient
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/stock")}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!isValid || submitting} className="min-w-[160px]">
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</>
          ) : (
            <><ArrowRight className="h-4 w-4 mr-2" />Submit {entryType}</>
          )}
        </Button>
      </div>
    </div>
  );
}
