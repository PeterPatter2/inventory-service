"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  Wrench,
  Trash2,
  Tag,
  Hash,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { getAssets, repairAsset, scrapAsset, ApiError } from "@/services/api";
import type { Asset } from "@/types/asset";

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [asset, setAsset] = React.useState<Asset | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  // Action states
  const [confirmAction, setConfirmAction] = React.useState<"maintenance" | "scrap" | null>(null);
  const [maintenanceDesc, setMaintenanceDesc] = React.useState("");
  const [acting, setActing] = React.useState(false);

  const assetId = decodeURIComponent(params.id as string);

  React.useEffect(() => {
    async function loadData() {
      try {
        // Backend doesn't have a GET /api/assets/{id} currently, 
        // so we fetch all and find the specific one.
        const allAssets = await getAssets();
        const found = allAssets.find((a) => a.name === assetId);
        setAsset(found || null);
      } catch (err) {
        setAsset(null);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [assetId]);

  const handleMaintenance = async () => {
    if (!asset || !maintenanceDesc) return;
    setActing(true);
    try {
      const res = await repairAsset({
        asset_id: asset.name,
        description: maintenanceDesc,
      });
      addToast({
        title: "Sent to Maintenance",
        description: res.message,
        variant: "success",
      });
      setConfirmAction(null);
      setMaintenanceDesc("");
      router.push("/assets"); // Return to list after action
    } catch (err) {
      addToast({
        title: "Maintenance Failed",
        description: err instanceof ApiError ? err.detail : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setActing(false);
    }
  };

  const handleScrap = async () => {
    if (!asset) return;
    setActing(true);
    try {
      const res = await scrapAsset(asset.name);
      addToast({
        title: "Asset Scrapped",
        description: res.message,
        variant: "success",
      });
      setConfirmAction(null);
      router.push("/assets"); // Return to list after action
    } catch (err) {
      addToast({
        title: "Scrap Failed",
        description: err instanceof ApiError ? err.detail : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-24 w-full bg-muted rounded-xl animate-pulse" />
        <div className="h-64 w-full bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Asset not found</h2>
        <p className="text-muted-foreground mt-2">
          The requested asset could not be found in ERPNext.
        </p>
        <Button className="mt-4" onClick={() => router.push("/assets")}>
          Back to Assets
        </Button>
      </div>
    );
  }

  const detailFields = [
    { icon: Hash, label: "Asset ID", value: asset.name },
    { icon: Tag, label: "Asset Name", value: asset.asset_name },
    { icon: Hash, label: "Item Code", value: asset.item_code },
    { icon: MapPin, label: "Location", value: asset.location || "Unassigned" },
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/assets")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assets
      </button>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold">{asset.asset_name}</h1>
                <StatusBadge status={asset.status} size="lg" />
              </div>
              <p className="font-mono text-sm text-muted-foreground mt-1">
                {asset.name}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {asset.status !== "Scrapped" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/transfer?assetId=${encodeURIComponent(asset.name)}`)}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                    Transfer
                  </Button>
                  {/* Assuming we only repair assets that aren't already scrapped or draft */}
                  {(asset.status === "Submitted" || asset.status === "Partially Depreciated" || asset.status === "Fully Depreciated") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmAction("maintenance")}
                    >
                      <Wrench className="h-4 w-4 mr-1.5" />
                      Maintenance
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive border-red-200 hover:bg-red-50"
                    onClick={() => setConfirmAction("scrap")}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Scrap
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Card */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
            Asset Information
          </h3>
          <div className="grid gap-6 sm:grid-cols-2">
            {detailFields.map((field) => (
              <div key={field.label} className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2 shrink-0">
                  <field.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {field.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Dialog */}
      <Dialog
        open={confirmAction === "maintenance"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Maintenance</DialogTitle>
            <DialogDescription>
              Mark "{asset.asset_name}" for maintenance. Please provide a description of the issue.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="desc">Reason for Maintenance *</Label>
            <Textarea
              id="desc"
              className="mt-2"
              placeholder="e.g. Broken screen, overheating..."
              value={maintenanceDesc}
              onChange={(e) => setMaintenanceDesc(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={acting}>
              Cancel
            </Button>
            <Button onClick={handleMaintenance} disabled={acting || !maintenanceDesc.trim()}>
              {acting ? "Submitting..." : "Confirm Maintenance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scrap Dialog */}
      <Dialog
        open={confirmAction === "scrap"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scrap Asset</DialogTitle>
            <DialogDescription>
              This will permanently decommission "{asset.asset_name}" in ERPNext. Are you absolutely sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={acting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleScrap} disabled={acting}>
              {acting ? "Scrapping..." : "Yes, Scrap Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
