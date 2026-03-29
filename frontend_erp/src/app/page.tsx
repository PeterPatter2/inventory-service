"use client";

import React from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  TruckIcon,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Wrench,
  CheckCircle2,
  DollarSign,
  TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAssets } from "@/services/api";
import { getItems, getWarehouses } from "@/services/stock_api";
import type { Asset } from "@/types/asset";
import type { Item, Warehouse } from "@/types/stock";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CombinedDashboardPage() {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [assetData, itemsData] = await Promise.all([
          getAssets().catch(() => []),
          getItems().catch(() => []),
        ]);
        setAssets(assetData || []);
        setItems(itemsData || []);
      } catch (err) {
        console.error("Dashboard data load error", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalAssets = assets.length;
  const maintenanceAssets = assets.filter(a => a.status === "In Maintenance").length;
  const stockItems = items.filter(i => i.is_stock_item === 1).length;
  const totalItems = items.length;

  // Financial Calculations
  const totalNetValue = assets.reduce((sum, a) => sum + (a.value_after_depreciation || 0), 0);
  const totalPurchase = assets.reduce((sum, a) => sum + (a.gross_purchase_amount || 0), 0);
  // Simulating "This Month Depreciation" as roughly 1/60th of total (assuming 5 year average) if not available
  const monthlyDepr = assets
    .filter(a => a.docstatus === 1) // Only submitted assets depreciate
    .reduce((sum, a) => sum + ((a.gross_purchase_amount || 0) - (a.value_after_depreciation || 0)) / 12, 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enterprise Overview</h1>
          <p className="text-muted-foreground mt-1">Combined Stock & Asset Metrics</p>
        </div>
        <div className="flex gap-4">
           <div className="h-32 flex-1 bg-muted rounded animate-pulse" />
           <div className="h-32 flex-1 bg-muted rounded animate-pulse" />
           <div className="h-32 flex-1 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Enterprise Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            At-a-glance metrics for both Inventory and Company Assets
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stock Metrics */}
        <Card className="border-t-4 border-t-sky-500 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Boxes className="h-5 w-5 text-sky-500" />
                Stock & Inventory
              </CardTitle>
              <Link href="/stock" className="text-xs text-sky-600 hover:underline flex items-center">
                View Details <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                <p className="text-sm font-medium text-sky-800">Total Items</p>
                <p className="text-3xl font-bold text-sky-900 mt-1">{totalItems}</p>
                <p className="text-xs text-sky-600 mt-1">{stockItems} trackable</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-sm font-medium text-amber-800">Alerts</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">0</p>
                <p className="text-xs text-amber-600 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Low stock items
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Metrics */}
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                Company Assets
              </CardTitle>
              <Link href="/assets/dashboard" className="text-xs text-emerald-600 hover:underline flex items-center">
                View Details <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-sm font-medium text-emerald-800">Assets</p>
                <p className="text-3xl font-bold text-emerald-900 mt-1">{totalAssets}</p>
                <p className="text-xs text-emerald-600 mt-1 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Registered
                </p>
              </div>
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                <p className="text-sm font-medium text-rose-800">Maintenance</p>
                <p className="text-3xl font-bold text-rose-900 mt-1">{maintenanceAssets}</p>
                <p className="text-xs text-rose-600 mt-1 flex items-center">
                  <Wrench className="h-3 w-3 mr-1" /> In repair queue
                </p>
              </div>
            </div>

            {/* Financial Summary Sub-grid */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-dashed">
              <div className="flex flex-col">
                <p className="text-[10px] items-center gap-1 font-semibold uppercase tracking-wider text-muted-foreground flex">
                  <TrendingDown className="h-3 w-3 text-rose-500" /> This Month Depr.
                </p>
                <p className="text-lg font-bold text-rose-600">{formatCurrency(monthlyDepr)}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] items-center gap-1 font-semibold uppercase tracking-wider text-muted-foreground flex">
                  <DollarSign className="h-3 w-3 text-emerald-500" /> Current Net Value
                </p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalNetValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/stock/movement" className="block group">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <TruckIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Record Movement</h3>
                  <p className="text-sm text-muted-foreground">Transfer, Issue, or Receive stock</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/assets" className="block group">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  <Package className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Manage Assets</h3>
                  <p className="text-sm text-muted-foreground">Register or view company assets</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
