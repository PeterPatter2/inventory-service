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
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { getAssets } from "@/services/api";
import type { Asset } from "@/types/asset";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const data = await getAssets();
        setAssets(data);
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
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Enterprise asset overview</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Enterprise asset overview</p>
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
  const safeAssets = assets || [];
  const totalAssets = safeAssets.length;
  const submitted = safeAssets.filter((a) => a.status === "Submitted").length;
  const scrapped = safeAssets.filter((a) => a.status === "Scrapped").length;
  const draft = safeAssets.filter((a) => a.status === "Draft").length;

  const metricCards = [
    {
      title: "Total Assets",
      value: totalAssets,
      icon: Package,
      trend: `${submitted} submitted`,
      trendUp: true,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Submitted",
      value: submitted,
      icon: CheckCircle2,
      trend: "Active assets",
      trendUp: true,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Draft",
      value: draft,
      icon: FileText,
      trend: "Pending registration",
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

  // Status breakdown for the summary card
  const statusCounts: Record<string, number> = {};
  safeAssets.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  // Location breakdown
  const locationCounts: Record<string, number> = {};
  safeAssets.forEach((a) => {
    if (a.location) {
      locationCounts[a.location] = (locationCounts[a.location] || 0) + 1;
    }
  });
  const topLocations = Object.entries(locationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Enterprise asset overview</p>
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

      {/* Status Breakdown + Locations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asset by Status */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-4">Assets by Status</h3>
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} size="md" />
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-4">Top Locations</h3>
            <div className="space-y-3">
              {topLocations.map(([location, count]) => (
                <div key={location} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground truncate">{location}</span>
                  <span className="text-sm font-semibold shrink-0">{count} assets</span>
                </div>
              ))}
              {topLocations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No location data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
