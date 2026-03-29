"use client";

import React from "react";
import {
  Package,
  Wrench,
  FileText,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { getAssets } from "@/services/api";
import { isMaintenanceStatus, type Asset } from "@/types/asset";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export default function AssetDashboardPage() {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const data = await getAssets();
        setAssets(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Dashboard</h1>
          <p className="text-muted-foreground mt-1">Enterprise asset lifecycle analytics</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-2xl font-bold tracking-tight">Asset Dashboard</h1>
          <p className="text-muted-foreground mt-1">Enterprise asset lifecycle analytics</p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Failed to load dashboard</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compute metrics from asset list
  const safeAssets = Array.isArray(assets) ? assets : [];
  const totalAssets = safeAssets.length;
  const submitted = safeAssets.filter((a) => a.status === "Submitted").length;
  const scrapped = safeAssets.filter((a) => a.status === "Scrapped").length;
  const draft = safeAssets.filter((a) => a.status === "Draft").length;
  const maintenanceAssets = safeAssets.filter((a) => isMaintenanceStatus(a.status));
  const inMaintenance = maintenanceAssets.length;

  const metricCards = [
    {
      title: "Total Assets",
      value: totalAssets,
      icon: Package,
      trend: `${submitted} Active`,
      trendUp: true,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Under Repair",
      value: inMaintenance,
      icon: Wrench,
      trend: "Maintenance queue",
      trendUp: false,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    {
      title: "Draft / Pending",
      value: draft,
      icon: FileText,
      trend: "Pending approval",
      trendUp: false,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Scrapped",
      value: scrapped,
      icon: Trash2,
      trend: "Decommissioned",
      trendUp: false,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  // Lifecycle Chart Data
  const lifecycleData = [
    { name: "Draft", count: draft, fill: "#f59e0b" },
    { name: "Active", count: submitted, fill: "#10b981" },
    { name: "Maintenance", count: inMaintenance, fill: "#f43f5e" },
    { name: "Scrapped", count: scrapped, fill: "#64748b" },
  ];

  // Location breakdown
  const locationCounts: Record<string, number> = {};
  safeAssets.forEach((a) => {
    if (a.location) {
      locationCounts[a.location] = (locationCounts[a.location] || 0) + 1;
    }
  });

  const topLocations = Object.entries(locationCounts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asset Dashboard</h1>
        <p className="text-muted-foreground mt-1">Deep dive into asset lifecycle and tracking</p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {card.trendUp ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className="text-muted-foreground">{card.trend}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deep Dive Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lifecycle Chart */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base text-gray-800">Asset Lifecycle Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  dataKey="count"
                  data={lifecycleData.filter(d => d.count > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  label
                />
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Locations Table / Distribution */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base text-gray-800">Assets by Top Locations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topLocations} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="location" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Schedule Table Placeholder */}
      <Card>
        <CardHeader>
           <CardTitle className="text-base text-gray-800 flex items-center gap-2">
             <Wrench className="h-5 w-5 text-rose-500" />
             Upcoming Maintenance / Repair Queue
           </CardTitle>
        </CardHeader>
        <CardContent>
           <div className="rounded-lg border">
             {maintenanceAssets.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground">
                 No assets are currently in maintenance.
               </div>
             ) : (
               <div className="divide-y max-h-[300px] overflow-y-auto">
                 {maintenanceAssets.map(asset => (
                   <div key={asset.name} className="flex justify-between items-center p-4 hover:bg-muted/50 transition">
                     <div className="flex flex-col gap-1">
                       <span className="font-semibold text-sm">{asset.asset_name || asset.name}</span>
                       <span className="text-xs text-muted-foreground font-mono">{asset.name}</span>
                     </div>
                     <StatusBadge status={asset.status} size="sm" />
                   </div>
                 ))}
               </div>
             )}
           </div>
        </CardContent>
      </Card>

    </div>
  );
}
