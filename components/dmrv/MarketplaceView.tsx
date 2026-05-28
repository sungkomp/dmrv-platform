'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Plus, ArrowRightLeft, Ban, Briefcase, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type CreditStatus = 'Available' | 'Traded' | 'Retired';

interface MarketplaceCredit {
  id: string;
  tokenId: string;
  amount: number;
  project: string;
  methodology: string;
  location: string;
  metadata: Record<string, unknown>;
}

interface TradedCredit {
  id: string;
  tokenId: string;
  amount: number;
  buyer: string | null;
  project: string;
  tradedAt: string;
}

interface RetiredCredit {
  id: string;
  tokenId: string;
  amount: number;
  buyer: string | null;
  project: string;
  retiredAt: string;
}

interface MarketplaceSummary {
  totalCredits: number;
  availableVolume: number;
  tradedVolume: number;
  retiredVolume: number;
  availableCount: number;
  tradedCount: number;
  retiredCount: number;
}

interface Project {
  id: string;
  name: string;
}

const statusStyles: Record<CreditStatus, string> = {
  Available: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  Traded: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  Retired: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
};

export default function MarketplaceView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<MarketplaceCredit[]>([]);
  const [traded, setTraded] = useState<TradedCredit[]>([]);
  const [retired, setRetired] = useState<RetiredCredit[]>([]);
  const [summary, setSummary] = useState<MarketplaceSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Mint form
  const [mintProjectId, setMintProjectId] = useState('');
  const [mintTrackType, setMintTrackType] = useState('biochar');
  const [mintAmount, setMintAmount] = useState('');
  const [minting, setMinting] = useState(false);

  // Trade form
  const [tradeId, setTradeId] = useState('');
  const [tradeBuyer, setTradeBuyer] = useState('');
  const [trading, setTrading] = useState(false);

  // Retire form
  const [retireId, setRetireId] = useState('');
  const [retiring, setRetiring] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [marketRes, projectsRes] = await Promise.all([
        fetch('/api/dmrv/marketplace'),
        fetch('/api/dmrv'),
      ]);
      if (!marketRes.ok || !projectsRes.ok) throw new Error('Failed to fetch data');

      const marketData = await marketRes.json();
      const projectsData = await projectsRes.json();

      setAvailable(marketData.marketplace?.available || []);
      setTraded(marketData.marketplace?.traded || []);
      setRetired(marketData.marketplace?.retired || []);
      setSummary(marketData.summary || null);
      setProjects((projectsData.projects || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load marketplace data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMint = async () => {
    const amount = parseFloat(mintAmount);
    if (!mintProjectId || isNaN(amount) || amount <= 0) {
      toast({ title: 'Validation Error', description: 'Project and valid amount are required', variant: 'destructive' });
      return;
    }
    try {
      setMinting(true);
      const res = await fetch('/api/dmrv/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mint', projectId: mintProjectId, amount, trackType: mintTrackType }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Mint failed');
      }
      toast({ title: 'Credits Minted', description: `${amount.toLocaleString()} tCO2e minted successfully` });
      setMintAmount('');
      setMintProjectId('');
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to mint credits', variant: 'destructive' });
    } finally {
      setMinting(false);
    }
  };

  const handleTrade = async () => {
    if (!tradeId) {
      toast({ title: 'Validation Error', description: 'Select a credit to trade', variant: 'destructive' });
      return;
    }
    if (!tradeBuyer.trim()) {
      toast({ title: 'Validation Error', description: 'Buyer name is required', variant: 'destructive' });
      return;
    }
    const credit = available.find((c) => c.id === tradeId);
    if (!credit) {
      toast({ title: 'Cannot Trade', description: 'Only available credits can be traded', variant: 'destructive' });
      return;
    }
    try {
      setTrading(true);
      const res = await fetch('/api/dmrv/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trade', projectId: credit.methodology, creditId: tradeId, buyer: tradeBuyer.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Trade failed');
      }
      toast({ title: 'Credit Traded', description: `${credit.tokenId} has been traded to ${tradeBuyer.trim()}` });
      setTradeId('');
      setTradeBuyer('');
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to trade credit', variant: 'destructive' });
    } finally {
      setTrading(false);
    }
  };

  const handleRetire = async () => {
    if (!retireId) {
      toast({ title: 'Validation Error', description: 'Select a credit to retire', variant: 'destructive' });
      return;
    }
    try {
      setRetiring(true);
      const credit = [...available, ...traded].find((c) => c.id === retireId);
      const projectId = credit ? ('methodology' in credit ? (credit as MarketplaceCredit).methodology : (credit as TradedCredit).project) : '';
      const res = await fetch('/api/dmrv/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retire', projectId: projectId || 'unknown', creditId: retireId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Retire failed');
      }
      toast({ title: 'Credit Retired', description: `Credit has been permanently retired` });
      setRetireId('');
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to retire credit', variant: 'destructive' });
    } finally {
      setRetiring(false);
    }
  };

  const allCredits = [
    ...available.map((c) => ({ ...c, status: 'Available' as CreditStatus, certNumber: c.tokenId, batchId: c.tokenId, projectId: c.project, type: c.methodology, price: (c.metadata?.price as number) || 0, createdAt: '' })),
    ...traded.map((c) => ({ ...c, status: 'Traded' as CreditStatus, certNumber: c.tokenId, batchId: c.tokenId, projectId: c.project, type: '', price: 0, createdAt: c.tradedAt })),
    ...retired.map((c) => ({ ...c, status: 'Retired' as CreditStatus, certNumber: c.tokenId, batchId: c.tokenId, projectId: c.project, type: '', price: 0, createdAt: c.retiredAt })),
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Marketplace</h2>
          <p className="text-muted-foreground text-sm mt-1">Mint, trade, and retire carbon credits on the marketplace</p>
        </div>
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

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Marketplace</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Mint, trade, and retire carbon credits on the marketplace
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{(summary?.availableVolume ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Available tCO2e</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{(summary?.tradedVolume ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Traded tCO2e</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-500">{(summary?.retiredVolume ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Retired tCO2e</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{(summary?.totalCredits ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Credits</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="listing">
        <TabsList>
          <TabsTrigger value="listing">Credit Listing</TabsTrigger>
          <TabsTrigger value="mint">Mint Credits</TabsTrigger>
          <TabsTrigger value="actions">Trade / Retire</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        </TabsList>

        <TabsContent value="listing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credit Listing</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token ID</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Methodology</TableHead>
                      <TableHead>Amount (tCO2e)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCredits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No credits found</TableCell>
                      </TableRow>
                    ) : (
                      allCredits.map((credit) => (
                        <TableRow key={credit.id}>
                          <TableCell className="font-mono text-xs font-semibold">{credit.batchId}</TableCell>
                          <TableCell className="text-xs">{credit.projectId}</TableCell>
                          <TableCell>
                            {credit.type ? (
                              <Badge variant="secondary" className="text-[10px] h-5">{credit.type}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono">{credit.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[credit.status]}`}>
                              {credit.status}
                            </Badge>
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

        <TabsContent value="mint" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                Mint New Credits
              </CardTitle>
              <CardDescription>Create new carbon credit batches from certified projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={mintProjectId} onValueChange={setMintProjectId}>
                    <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Track Type</Label>
                  <Select value={mintTrackType} onValueChange={setMintTrackType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['biochar', 'awd', 'biogas', 'solar', 'forest'].map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (tCO2e)</Label>
                  <Input type="number" placeholder="e.g., 5000" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleMint} disabled={minting} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {minting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {minting ? 'Minting...' : 'Mint Credits'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-teal-600" />
                  Trade Credits
                </CardTitle>
                <CardDescription>Transfer available credits to a buyer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Credit</Label>
                  <Select value={tradeId} onValueChange={setTradeId}>
                    <SelectTrigger><SelectValue placeholder="Select a credit batch" /></SelectTrigger>
                    <SelectContent>
                      {available.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.tokenId} — {c.amount.toLocaleString()} tCO2e ({c.project})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Buyer Name</Label>
                  <Input placeholder="e.g., PTT Public Co." value={tradeBuyer} onChange={(e) => setTradeBuyer(e.target.value)} />
                </div>
                <Button onClick={handleTrade} disabled={trading} className="w-full bg-teal-600 hover:bg-teal-700 gap-2">
                  {trading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                  {trading ? 'Trading...' : 'Execute Trade'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="h-4 w-4 text-slate-600" />
                  Retire Credits
                </CardTitle>
                <CardDescription>Permanently retire credits from circulation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Credit</Label>
                  <Select value={retireId} onValueChange={setRetireId}>
                    <SelectTrigger><SelectValue placeholder="Select a credit batch" /></SelectTrigger>
                    <SelectContent>
                      {available.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.tokenId} — {c.amount.toLocaleString()} tCO2e (Available)
                        </SelectItem>
                      ))}
                      {traded.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.tokenId} — {c.amount.toLocaleString()} tCO2e (Traded)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleRetire} disabled={retiring} variant="destructive" className="w-full gap-2">
                  {retiring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  {retiring ? 'Retiring...' : 'Retire Credits'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                Portfolio Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="rounded-lg border p-6 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{(summary?.availableVolume ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">Available tCO2e</p>
                  <p className="text-xs text-muted-foreground">{summary?.availableCount ?? 0} batches</p>
                </div>
                <div className="rounded-lg border p-6 text-center">
                  <p className="text-3xl font-bold text-teal-600">{(summary?.tradedVolume ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">Traded tCO2e</p>
                  <p className="text-xs text-muted-foreground">{summary?.tradedCount ?? 0} batches</p>
                </div>
                <div className="rounded-lg border p-6 text-center">
                  <p className="text-3xl font-bold text-slate-500">{(summary?.retiredVolume ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">Retired tCO2e</p>
                  <p className="text-xs text-muted-foreground">{summary?.retiredCount ?? 0} batches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
