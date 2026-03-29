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
  Loader2,
  TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  getWarehouseSummary,
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6', '#ec4899'];

export default function StockDashboardPage() {
  const { addToast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseType[]>([]);
  const [warehouseSummary, setWarehouseSummary] = React.useState<{ name: string; qty: number }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Availability checker state
  const [checkItem, setCheckItem] = React.useState("");
  const [checkWarehouse, setCheckWarehouse] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [availability, setAvailability] = React.useState<StockAvailabilityType | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [itemData, warehouseData, summaryData] = await Promise.all([
          getItems(),
          getWarehouses(),
          getWarehouseSummary(),
        ]);
        setItems(itemData);
        setWarehouses(warehouseData);
        setWarehouseSummary(summaryData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stock data");
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
        description: err instanceof StockApiError ? err.detail : "Something went wrong",
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
          <h1 className="text-2xl font-bold tracking-tight">Stock Dashboard</h1>
          <p className="text-muted-foreground mt-1">Inventory management and analytics</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-12 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Failed to load stock data</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Analytics prep
  const groupCounts: Record<string, number> = {};
  items.forEach((item) => {
    const grp = item.item_group || "Uncategorized";
    groupCounts[grp] = (groupCounts[grp] || 0) + 1;
  });
  const groupChartData = Object.entries(groupCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Real Stock Distribution (Sorted by total qty)
  const sortedDistribution = [...warehouseSummary]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-muted-foreground mt-1">Inventory trends and distributions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/stock/movement">
            <Button size="sm">
              <TruckIcon className="h-4 w-4 mr-1.5" /> New Movement
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-t-4 border-t-indigo-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stock Items</p>
                <p className="text-2xl font-bold mt-2">{stockItems.length}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg"><Boxes className="text-indigo-600 h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-sky-500 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Warehouses</p>
                <p className="text-2xl font-bold mt-2">{warehouses.length}</p>
              </div>
              <div className="p-3 bg-sky-50 rounded-lg"><Warehouse className="text-sky-600 h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-500 shadow-sm">
           <CardContent className="p-6">
             <div className="flex justify-between items-center">
               <div>
                 <p className="text-sm font-medium text-muted-foreground">Pending Issues</p>
                 <p className="text-2xl font-bold mt-2 text-amber-600">0</p>
               </div>
               <div className="p-3 bg-amber-50 rounded-lg"><TrendingDown className="text-amber-600 h-5 w-5" /></div>
             </div>
           </CardContent>
         </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Item Group Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-gray-800">Items by Category</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[300px] flex justify-center items-center">
            <ResponsiveContainer width={400} height={300}>
              <PieChart>
                <Pie
                  data={groupChartData}
                  cx="50%" cy="50%"
                  innerRadius={70} outerRadius={110}
                  paddingAngle={5} dataKey="value"
                  label
                >
                  {groupChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dense Warehouses */}
        <Card>
          <CardHeader>
             <CardTitle className="text-base text-gray-800">Stock Distribution (Total Items Qty)</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={sortedDistribution} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={110} tick={{fontSize: 10}} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="qty" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20}>
                    {sortedDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Quick Availability Check</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Select value={checkItem} onValueChange={setCheckItem}>
              <SelectTrigger><SelectValue placeholder="Item..." /></SelectTrigger>
              <SelectContent>
                {stockItems.map((item) => (
                  <SelectItem key={item.item_code} value={item.item_code}>
                    {item.item_code} — {item.item_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={checkWarehouse} onValueChange={setCheckWarehouse}>
              <SelectTrigger><SelectValue placeholder="Warehouse..." /></SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.name} value={wh.name}>{wh.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleCheckAvailability} disabled={!checkItem || !checkWarehouse || checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Check Availability
            </Button>
          </div>

          {availability && (
            <div className="mt-4 p-4 border rounded-xl bg-muted/20">
              <div className="flex justify-between items-center mb-4">
                 <p className="font-semibold text-sm">{availability.item_code}</p>
                 <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-medium">
                   {getStockLevel(availability.available_qty)}
                 </span>
              </div>
              <div className="grid grid-cols-3 text-center gap-4">
                <div className="bg-white p-3 rounded shadow-sm">
                  <p className="text-xl font-bold">{availability.actual_qty}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Actual</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <p className="text-xl font-bold text-amber-500">{availability.reserved_qty}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Reserved</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <p className="text-xl font-bold text-emerald-600">{availability.available_qty}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Available</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
