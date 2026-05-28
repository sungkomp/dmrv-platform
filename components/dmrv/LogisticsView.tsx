'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Package, Banknote, MapPin, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface TrackingPosition {
  assetId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: string;
}

interface InventoryItem {
  assetId: string;
  stock: number;
  unit: string;
  lastUpdated: string;
}

interface SettlementRecord {
  id: string;
  assetId: string;
  amount: number;
  status: string;
  timestamp: string;
}

interface LogisticsSummary {
  trackingPoints: number;
  inventoryItems: number;
  totalSettlements: number;
  totalSettlementAmount: number;
  processedSettlements: number;
}

const trackingStatusStyles: Record<string, string> = {
  'in_transit': 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  'delivered': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'at_warehouse': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  'pending_pickup': 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  'In Transit': 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  'Delivered': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'At Warehouse': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  'Pending Pickup': 'bg-slate-100 text-slate-700 hover:bg-slate-100',
};

const settlementStatusStyles: Record<string, string> = {
  'processed': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'pending': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  'failed': 'bg-red-100 text-red-700 hover:bg-red-100',
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LogisticsView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<TrackingPosition[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [logisticsSummary, setLogisticsSummary] = useState<LogisticsSummary | null>(null);

  // Tracking form
  const [trackAssetId, setTrackAssetId] = useState('');
  const [trackLat, setTrackLat] = useState('');
  const [trackLng, setTrackLng] = useState('');
  const [trackStatus, setTrackStatus] = useState('in_transit');
  const [submittingTracking, setSubmittingTracking] = useState(false);

  // Inventory form
  const [invAssetId, setInvAssetId] = useState('');
  const [invStock, setInvStock] = useState('');
  const [invUnit, setInvUnit] = useState('tCO2e');
  const [submittingInventory, setSubmittingInventory] = useState(false);

  // Settlement form
  const [settleAssetId, setSettleAssetId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dmrv/logistics');
      if (!res.ok) throw new Error('Failed to fetch logistics data');
      const data = await res.json();
      setTracking(data.tracking || []);
      setInventory(data.inventory || []);
      setSettlements(data.settlements || []);
      setLogisticsSummary(data.summary || null);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load logistics data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddTracking = async () => {
    if (!trackAssetId.trim() || !trackLat || !trackLng) {
      toast({ title: 'Validation Error', description: 'Asset ID, latitude, and longitude are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingTracking(true);
      const res = await fetch('/api/dmrv/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tracking',
          assetId: trackAssetId.trim(),
          latitude: parseFloat(trackLat),
          longitude: parseFloat(trackLng),
          status: trackStatus,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update tracking');
      }
      toast({ title: 'Tracking Updated', description: `Position updated for ${trackAssetId}` });
      setTrackAssetId('');
      setTrackLat('');
      setTrackLng('');
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update tracking', variant: 'destructive' });
    } finally {
      setSubmittingTracking(false);
    }
  };

  const handleAddInventory = async () => {
    if (!invAssetId.trim() || invStock === '') {
      toast({ title: 'Validation Error', description: 'Asset ID and stock quantity are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingInventory(true);
      const res = await fetch('/api/dmrv/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'inventory',
          assetId: invAssetId.trim(),
          stock: parseFloat(invStock),
          unit: invUnit,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update inventory');
      }
      toast({ title: 'Inventory Updated', description: `Stock updated for ${invAssetId}` });
      setInvAssetId('');
      setInvStock('');
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update inventory', variant: 'destructive' });
    } finally {
      setSubmittingInventory(false);
    }
  };

  const handleProcessSettlement = async () => {
    if (!settleAssetId.trim() || !settleAmount) {
      toast({ title: 'Validation Error', description: 'Asset ID and amount are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmittingSettlement(true);
      const res = await fetch('/api/dmrv/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settlement',
          assetId: settleAssetId.trim(),
          amount: parseFloat(settleAmount),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to process settlement');
      }
      toast({ title: 'Settlement Processed', description: `Settlement processed for ${settleAssetId}` });
      setSettleAssetId('');
      setSettleAmount('');
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to process settlement', variant: 'destructive' });
    } finally {
      setSubmittingSettlement(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Logistics</h2>
          <p className="text-muted-foreground text-sm mt-1">Track assets, manage inventory, and process settlements</p>
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const inTransit = tracking.filter((t) => t.status === 'in_transit' || t.status === 'In Transit').length;
  const delivered = tracking.filter((t) => t.status === 'delivered' || t.status === 'Delivered').length;
  const atWarehouse = tracking.filter((t) => t.status === 'at_warehouse' || t.status === 'At Warehouse').length;
  const pendingPickup = tracking.filter((t) => t.status === 'pending_pickup' || t.status === 'Pending Pickup').length;

  const processedSettlements = settlements.filter((s) => s.status === 'processed');
  const totalProcessedAmount = processedSettlements.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Logistics</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Track assets, manage inventory, and process settlements
        </p>
      </div>

      <Tabs defaultValue="tracking">
        <TabsList>
          <TabsTrigger value="tracking" className="gap-1.5"><Truck className="h-3.5 w-3.5" /> Tracking</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Inventory</TabsTrigger>
          <TabsTrigger value="settlement" className="gap-1.5"><Banknote className="h-3.5 w-3.5" /> Settlement</TabsTrigger>
        </TabsList>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-teal-600">{inTransit}</p>
                <p className="text-xs text-muted-foreground">In Transit</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{atWarehouse}</p>
                <p className="text-xs text-muted-foreground">At Warehouse</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{pendingPickup}</p>
                <p className="text-xs text-muted-foreground">Pending Pickup</p>
              </CardContent>
            </Card>
          </div>

          {/* Add Tracking Position */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                Update Tracking Position
              </CardTitle>
              <CardDescription>Add or update a tracking position for an asset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Asset ID</Label>
                  <Input placeholder="e.g., AST-001" value={trackAssetId} onChange={(e) => setTrackAssetId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input type="number" step="0.0001" placeholder="e.g., 13.7563" value={trackLat} onChange={(e) => setTrackLat(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input type="number" step="0.0001" placeholder="e.g., 100.5018" value={trackLng} onChange={(e) => setTrackLng(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={trackStatus} onValueChange={setTrackStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="at_warehouse">At Warehouse</SelectItem>
                      <SelectItem value="pending_pickup">Pending Pickup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddTracking} disabled={submittingTracking} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                    {submittingTracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asset Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Latitude</TableHead>
                      <TableHead>Longitude</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Last Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tracking.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No tracking records. Add a position above.</TableCell>
                      </TableRow>
                    ) : (
                      tracking.map((record, idx) => (
                        <TableRow key={`${record.assetId}-${idx}`}>
                          <TableCell className="font-mono text-xs font-semibold">{record.assetId}</TableCell>
                          <TableCell className="font-mono text-xs">{record.latitude.toFixed(4)}</TableCell>
                          <TableCell className="font-mono text-xs">{record.longitude.toFixed(4)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[10px] h-5 ${trackingStatusStyles[record.status] || 'bg-slate-100 text-slate-700'}`}>
                              {formatStatus(record.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {new Date(record.timestamp).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-4 space-y-6">
          {/* Add Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                Update Inventory
              </CardTitle>
              <CardDescription>Add or update inventory stock for an asset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Asset ID</Label>
                  <Input placeholder="e.g., CB-0456" value={invAssetId} onChange={(e) => setInvAssetId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input type="number" placeholder="e.g., 5000" value={invStock} onChange={(e) => setInvStock(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={invUnit} onValueChange={setInvUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tCO2e">tCO2e</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="tonnes">tonnes</SelectItem>
                      <SelectItem value="units">units</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddInventory} disabled={submittingInventory} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                    {submittingInventory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Levels</CardTitle>
              <CardDescription>Current inventory across all assets</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No inventory items. Add one above.</TableCell>
                      </TableRow>
                    ) : (
                      inventory.map((item, idx) => (
                        <TableRow key={`${item.assetId}-${idx}`}>
                          <TableCell className="text-xs font-medium font-mono">{item.assetId}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{item.stock.toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px] h-5">{item.unit}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {new Date(item.lastUpdated).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settlement Tab */}
        <TabsContent value="settlement" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">฿{(totalProcessedAmount).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Processed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{settlements.filter((s) => s.status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{logisticsSummary?.totalSettlements ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Settlements</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{settlements.filter((s) => s.status === 'failed').length}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
          </div>

          {/* Process Settlement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                Process Settlement
              </CardTitle>
              <CardDescription>Create a new settlement for an asset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Asset ID</Label>
                  <Input placeholder="e.g., TCO2E-xxx" value={settleAssetId} onChange={(e) => setSettleAssetId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Amount (THB)</Label>
                  <Input type="number" placeholder="e.g., 2450000" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleProcessSettlement} disabled={submittingSettlement} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                    {submittingSettlement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                    Process
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settlement Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No settlement records</TableCell>
                      </TableRow>
                    ) : (
                      settlements.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono text-xs font-semibold">{record.id}</TableCell>
                          <TableCell className="text-xs">{record.assetId}</TableCell>
                          <TableCell className="font-mono text-sm">฿{record.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[10px] h-5 ${settlementStatusStyles[record.status] || 'bg-slate-100 text-slate-700'}`}>
                              {formatStatus(record.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {new Date(record.timestamp).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
