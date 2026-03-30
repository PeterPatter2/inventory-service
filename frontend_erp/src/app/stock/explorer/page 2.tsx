"use client";

import React from "react";
import { 
  Warehouse, 
  Search, 
  Package, 
  ChevronRight, 
  Boxes,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getWarehouses, getWarehouseInventory } from "@/services/stock_api";
import type { Warehouse as WarehouseType } from "@/types/stock";
import { cn } from "@/lib/utils";

export default function WarehouseExplorerPage() {
  const [warehouses, setWarehouses] = React.useState<WarehouseType[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Detail data
  const [stockItems, setStockItems] = React.useState<{ item_code: string; actual_qty: number; valuation_rate: number }[]>([]);
  
  // Local state
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    async function loadWarehouses() {
      try {
        const data = await getWarehouses();
        setWarehouses(data);
        if (data.length > 0) {
          setSelectedWarehouse(data[0].name);
        }
      } catch (err) {
        setError("Failed to load warehouses");
      } finally {
        setLoading(false);
      }
    }
    loadWarehouses();
  }, []);

  React.useEffect(() => {
    if (!selectedWarehouse) return;

    async function loadDetails() {
      setDetailsLoading(true);
      try {
        const stockData = await getWarehouseInventory(selectedWarehouse!);
        setStockItems(stockData);
      } catch (err) {
        console.error("Failed to load details", err);
      } finally {
        setDetailsLoading(false);
      }
    }
    loadDetails();
  }, [selectedWarehouse]);

  const filteredStock = stockItems.filter(item => 
    item.item_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-primary" />
          Warehouse Explorer
        </h1>
        <p className="text-muted-foreground mt-1">
          Explore current inventory positions across warehouses
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Left Sidebar: Warehouse List */}
        <Card className="md:col-span-4 lg:col-span-3 flex flex-col overflow-hidden">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
              <Boxes className="h-4 w-4" />
              Warehouses
            </CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {warehouses.map((wh) => (
              <button
                key={wh.name}
                onClick={() => setSelectedWarehouse(wh.name)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg transition-all group relative border",
                  selectedWarehouse === wh.name
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "hover:bg-muted border-transparent"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Warehouse className={cn("h-4 w-4", selectedWarehouse === wh.name ? "text-primary-foreground" : "text-primary")} />
                    <div>
                      <p className="text-sm font-bold truncate max-w-[140px] text-inherit">{wh.warehouse_name || wh.name}</p>
                      <p className={cn("text-[10px] truncate", selectedWarehouse === wh.name ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {wh.company}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", selectedWarehouse === wh.name ? "translate-x-1" : "opacity-0 group-hover:opacity-100")} />
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Right Content: Inventory Details */}
        <Card className="md:col-span-8 lg:col-span-9 flex flex-col overflow-hidden">
          {selectedWarehouse ? (
            <>
              <CardHeader className="border-b bg-muted/30 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{selectedWarehouse}</CardTitle>
                    <p className="text-sm text-muted-foreground italic">
                      Current material stock levels
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-48 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search items..." 
                        className="pl-9 h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <div className="flex-1 overflow-y-auto p-0">
                {detailsLoading ? (
                  <div className="p-20 flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Fetching inventory data...</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {/* Stock Table */}
                    <div className="p-0">
                      <div className="bg-muted/50 px-6 py-2">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Package className="h-3 w-3" />
                          Stock Items
                        </h3>
                      </div>
                      {filteredStock.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30">
                            <tr>
                              <th className="px-6 py-2 text-left font-medium text-muted-foreground text-[11px]">Item Code</th>
                              <th className="px-6 py-2 text-right font-medium text-muted-foreground text-[11px]">Qty</th>
                              <th className="px-6 py-2 text-right font-medium text-muted-foreground text-[11px]">Valuation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStock.map((item) => (
                              <tr key={item.item_code} className="hover:bg-muted/20 border-t border-muted/30 transition-colors">
                                <td className="px-6 py-3 font-medium">{item.item_code}</td>
                                <td className="px-6 py-3 text-right">
                                  <Badge variant="secondary" className="font-mono text-xs">{item.actual_qty}</Badge>
                                </td>
                                <td className="px-6 py-3 text-right text-muted-foreground font-mono">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.valuation_rate)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                          No stock items found in this warehouse.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
              <div className="rounded-full bg-muted p-6">
                <Warehouse className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="max-w-[280px]">
                <h3 className="text-lg font-semibold">Select a Warehouse</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a location from the left to view its current stock positions.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
