"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRightLeft, MapPin, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getAssets, moveAsset, ApiError, fetchLocations } from "@/services/api";
import type { Asset } from "@/types/asset";
import type { LocationItem } from "@/services/api";

function TransferForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  const preselectedAssetId = searchParams.get("assetId") || "";

  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [locations, setLocations] = React.useState<LocationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Form state
  const [selectedAssetId, setSelectedAssetId] = React.useState(preselectedAssetId);
  const [targetLocation, setTargetLocation] = React.useState("");

  React.useEffect(() => {
    async function loadData() {
      try {
        const [assetData, locationData] = await Promise.all([
          getAssets(),
          fetchLocations().catch(() => [] as LocationItem[]),
        ]);
        const movable = assetData.filter(
          (a) => a.status !== "Scrapped" && a.status !== "Draft"
        );
        setAssets(movable);
        setLocations(locationData);
      } catch {
        addToast({
          title: "Failed to Load Data",
          description: "Could not fetch assets from backend.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [addToast]);

  const selectedAsset = assets.find((a) => a.name === selectedAssetId);
  const isValid = selectedAssetId && targetLocation.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      const res = await moveAsset({
        asset_id: selectedAssetId.split(" — ")[0].trim(),
        target_location: targetLocation.split(" — ")[0].trim(),
      });
      setSuccess(true);
      addToast({
        title: "Transfer Complete",
        description: res.message,
        variant: "success",
      });
    } catch (err) {
      addToast({
        title: "Transfer Failed",
        description: err instanceof ApiError ? err.detail : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedAssetId("");
    setTargetLocation("");
    setSuccess(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 w-full bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 text-primary" />
          Asset Transfer
        </h1>
        <p className="text-muted-foreground mt-1">
          Move an assigned asset to a new location via Asset Movement.
        </p>
      </div>

      {success ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto rounded-full bg-emerald-50 p-4 w-fit">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold mt-4">Transfer Successful!</h2>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              <strong>{selectedAsset?.asset_name}</strong> has been successfully moved.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <Button variant="outline" onClick={handleReset}>
                New Transfer
              </Button>
              <Button onClick={() => router.push(`/assets/${encodeURIComponent(selectedAssetId)}`)}>
                View Asset
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b mb-4">
              <CardTitle className="text-base">Movement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Asset Selection */}
              <div className="space-y-2">
                <Label htmlFor="asset">Select Asset *</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger id="asset" className="w-full">
                    <SelectValue placeholder="Choose an active asset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.name} value={a.name}>
                        {a.name} – {a.asset_name}
                      </SelectItem>
                    ))}
                    {assets.length === 0 && (
                      <SelectItem value="none" disabled>
                        No movable assets found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Location (auto-filled) */}
              <div className="space-y-2">
                <Label>Current Location</Label>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={selectedAsset ? "text-foreground" : "text-muted-foreground"}>
                    {selectedAsset ? (selectedAsset.location || "Unassigned") : "Select an asset first"}
                  </span>
                </div>
              </div>

              {/* Target Location — Smart Select */}
              <div className="space-y-2">
                <Label>Target Location *</Label>
                {locations.length > 0 ? (
                  <Select
                    value={targetLocation}
                    onValueChange={setTargetLocation}
                    disabled={!selectedAssetId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select target location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.name} value={loc.name}>
                          {loc.location_name || loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    type="text"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="e.g. Server Room B"
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    disabled={!selectedAssetId}
                  />
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4 border-t mt-4">
                <Button type="submit" disabled={!isValid || submitting} className="min-w-[140px]">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Moving...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Transfer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}

export default function TransferPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          <div className="h-64 w-full bg-muted rounded-xl animate-pulse" />
        </div>
      }
    >
      <TransferForm />
    </Suspense>
  );
}
