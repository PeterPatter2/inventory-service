"use client";

import React from "react";
import {
  Boxes,
  Warehouse,
  TruckIcon,
  AlertTriangle,
  Search,
  ArrowRight,
  Package,
  BarChart3,
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
import { useToast } from "@/components/ui/toast";
import {
  getItems,
  getWarehouses,
  getStockAvailability,
  StockApiError,
} from "@/services/stock_api";
import type {
  Item,
  Warehouse as WarehouseType,
  StockAvailability as StockAvailabilityType,
} from "@/types/stock";
import { getStockLevel, STOCK_LEVEL_CONFIG } from "@/types/stock";
import Link from "next/link";

export default function StockDashboardPage() {
  const { addToast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Availability checker state
  const [checkItem, setCheckItem] = React.useState("");
  const [checkWarehouse, setCheckWarehouse] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [availability, setAvailability] =
    React.useState<StockAvailabilityType | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [itemData, warehouseData] = await Promise.all([
          getItems(),
          getWarehouses(),
        ]);
        setItems(itemData);
        setWarehouses(warehouseData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load stock data"
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCheckAvailability = async () => {
    if (!checkItem || !checkWarehouse) return;
    setChecking(true);
    setAvailability(null);
    try {
      const result = await getStockAvailability(checkItem, checkWarehouse);
      setAvailability(result);
    } catch (err) {
      addToast({
        title: "Availability Check Failed",
        description:
          err instanceof StockApiError ? err.detail : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const stockItems = items.filter((i) => i.is_stock_item === 1);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Overview</h1>
          <p className="text-muted-foreground mt-1">
            Inventory management dashboard
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-muted rounded mb-3" />
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Overview</h1>
          <p className="text-muted-foreground mt-1">
            Inventory management dashboard
          </p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">
                Failed to load stock data
              </p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                Make sure the Stock API is running on port 8001
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metricCards = [
    {
      title: "Total Items",
      value: items.length,
      subtitle: `${stockItems.length} stock items`,
      icon: Boxes,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Warehouses",
      value: warehouses.length,
      subtitle: "Active locations",
      icon: Warehouse,
      color: "text-sky-600",
      bgColor: "bg-sky-50",
    },
    {
      title: "Stock Items",
      value: stockItems.length,
      subtitle: "Trackable inventory",
      icon: Package,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  // Group items by item_group
  const groupCounts: Record<string, number> = {};
  items.forEach((item) => {
    groupCounts[item.item_group] = (groupCounts[item.item_group] || 0) + 1;
  });
  const topGroups = Object.entries(groupCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Overview</h1>
          <p className="text-muted-foreground mt-1">
            Inventory management dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/stock/items">
            <Button variant="outline" size="sm">
              <Boxes className="h-4 w-4 mr-1.5" />
              View Inventory
            </Button>
          </Link>
          <Link href="/stock/movement">
            <Button size="sm">
              <TruckIcon className="h-4 w-4 mr-1.5" />
              New Movement
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <div className={`rounded-lg p-2 ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Availability Checker + Item Groups */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Availability Checker */}
        <Card className="border-2 border-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">
                Quick Availability Check
              </h3>
            </div>

            <div className="space-y-3">
              <Select value={checkItem} onValueChange={setCheckItem}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((item) => (
                    <SelectItem key={item.item_code} value={item.item_code}>
                      {item.item_code} — {item.item_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={checkWarehouse} onValueChange={setCheckWarehouse}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.name} value={wh.name}>
                      {wh.warehouse_name || wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleCheckAvailability}
                disabled={!checkItem || !checkWarehouse || checking}
                className="w-full"
              >
                {checking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Check Availability
                  </>
                )}
              </Button>

              {/* Result */}
              {availability && (
                <div className="mt-3 rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {availability.item_code}
                    </span>
                    {(() => {
                      const level = getStockLevel(availability.available_qty);
                      const config = STOCK_LEVEL_CONFIG[level];
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bgColor} ${config.color}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`}
                          />
                          {config.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-lg font-bold text-foreground">
                        {availability.actual_qty}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Actual
                      </p>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-lg font-bold text-amber-600">
                        {availability.reserved_qty}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Reserved
                      </p>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-lg font-bold text-emerald-600">
                        {availability.available_qty}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Available
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Item Groups Breakdown */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base font-semibold">Items by Group</h3>
            </div>
            <div className="space-y-3">
              {topGroups.map(([group, count]) => (
                <div key={group} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground truncate pr-4">
                    {group}
                  </span>
                  <span className="text-sm font-semibold shrink-0">
                    {count}
                  </span>
                </div>
              ))}
              {topGroups.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No item groups found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/stock/items" className="group">
          <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-xl bg-indigo-50 p-3 group-hover:bg-indigo-100 transition-colors">
                <Boxes className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Browse Inventory</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Search & manage all items
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/stock/movement" className="group">
          <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-xl bg-sky-50 p-3 group-hover:bg-sky-100 transition-colors">
                <TruckIcon className="h-6 w-6 text-sky-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Stock Movement</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Transfer, receive, or issue stock
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/stock/availability" className="group">
          <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-xl bg-emerald-50 p-3 group-hover:bg-emerald-100 transition-colors">
                <Package className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Check Availability</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time stock levels across warehouses
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
