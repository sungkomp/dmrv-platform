'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2, Unlink, RefreshCw, ArrowUpRight, ArrowDownLeft, Globe,
  Database, Server, Shield, Send, Plus, ExternalLink, Copy,
  CheckCircle, Clock, AlertTriangle, Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────

type BridgeStatus = 'CONNECTED' | 'PENDING' | 'SYNCING' | 'DISCONNECTED' | 'ERROR';
type RegistryType = 'VERRA' | 'GOLD_STANDARD' | 'I_REC' | 'CDM' | 'T_VER' | 'CUSTOM';
type BridgeProtocol = 'API' | 'POLYGON_BRIDGE' | 'ETHEREUM_BRIDGE' | 'COSMOS_IBC' | 'CUSTOM';
type TxType = 'MINT' | 'TRANSFER' | 'RETIRE';
type TxDirection = 'OUTBOUND' | 'INBOUND';
type TxStatus = 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'ROLLED_BACK';

interface Bridge {
  id: string; name: string; registryType: RegistryType; status: BridgeStatus;
  bridgeProtocol: BridgeProtocol; endpoint: string; apiKeyRef: string;
  accountId: string; accountName: string; syncInterval: number;
  lastSyncAt: string | null; totalCreditsSynced: number; metadata: string; createdAt: string;
}

interface BridgeTransaction {
  id: string; bridgeId: string; bridgeName?: string; txType: string;
  direction: TxDirection; creditAmount: number; creditTokenId: string;
  externalRef: string | null; externalStatus: string; txHash: string | null;
  status: TxStatus; errorMessage: string; metadata: string;
  initiatedBy: string; createdAt: string;
}

interface BridgeSummary {
  totalBridges: number; connectedBridges: number; totalCreditsSynced: number;
  totalTransactionAmount: number;
  byBridgeStatus: Record<BridgeStatus, number>;
  byTxStatus: Record<TxStatus, number>;
  byTxType: Record<TxType, number>;
  byDirection: Record<TxDirection, number>;
}

interface BridgeData {
  bridges: Bridge[]; recentTransactions: BridgeTransaction[]; summary: BridgeSummary;
}

// ─── Config ───────────────────────────────────────────────────────────────

const registryBadge: Record<RegistryType, { bg: string; text: string }> = {
  VERRA: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  GOLD_STANDARD: { bg: 'bg-amber-100', text: 'text-amber-700' },
  I_REC: { bg: 'bg-sky-100', text: 'text-sky-700' },
  CDM: { bg: 'bg-slate-100', text: 'text-slate-700' },
  T_VER: { bg: 'bg-teal-100', text: 'text-teal-700' },
  CUSTOM: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

const statusDot: Record<BridgeStatus, string> = {
  CONNECTED: 'bg-emerald-500', PENDING: 'bg-amber-500', SYNCING: 'bg-yellow-400',
  DISCONNECTED: 'bg-gray-400', ERROR: 'bg-red-500',
};

const statusConfig: Record<BridgeStatus, { bg: string; text: string; icon: React.ElementType }> = {
  CONNECTED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  SYNCING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Activity },
  DISCONNECTED: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Unlink },
  ERROR: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
};

const txStatusConfig: Record<TxStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700' },
  SUBMITTED: { bg: 'bg-sky-100', text: 'text-sky-700' },
  CONFIRMED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700' },
  ROLLED_BACK: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const protocolIcon: Record<BridgeProtocol, React.ElementType> = {
  API: Globe, POLYGON_BRIDGE: Database, ETHEREUM_BRIDGE: Server,
  COSMOS_IBC: Shield, CUSTOM: Server,
};

function fmtTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr), now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : d.toLocaleDateString();
}

// ─── Mock Data ────────────────────────────────────────────────────────────

const MOCK: BridgeData = {
  bridges: [
    { id: 'BR-001', name: 'Verra VCS Registry', registryType: 'VERRA', status: 'CONNECTED', bridgeProtocol: 'API', endpoint: 'https://registry.verra.org/api/v2', apiKeyRef: 'key_vcs_***', accountId: 'ACC-VCS-001', accountName: 'T-VER Thailand Bridge', syncInterval: 3600, lastSyncAt: '2025-06-15T08:30:00Z', totalCreditsSynced: 12450.5, metadata: '{}', createdAt: '2025-01-10T00:00:00Z' },
    { id: 'BR-002', name: 'Gold Standard Bridge', registryType: 'GOLD_STANDARD', status: 'SYNCING', bridgeProtocol: 'POLYGON_BRIDGE', endpoint: 'https://bridge.goldstandard.org', apiKeyRef: 'key_gs_***', accountId: 'ACC-GS-042', accountName: 'GS Thailand Portal', syncInterval: 7200, lastSyncAt: '2025-06-14T23:00:00Z', totalCreditsSynced: 8320.0, metadata: '{}', createdAt: '2025-02-05T00:00:00Z' },
    { id: 'BR-003', name: 'I-REC Energy Registry', registryType: 'I_REC', status: 'CONNECTED', bridgeProtocol: 'ETHEREUM_BRIDGE', endpoint: 'https://api.irec.org/v1', apiKeyRef: 'key_irec_***', accountId: 'ACC-IREC-112', accountName: 'T-VER I-REC Gateway', syncInterval: 1800, lastSyncAt: '2025-06-15T10:00:00Z', totalCreditsSynced: 5670.25, metadata: '{}', createdAt: '2025-03-12T00:00:00Z' },
    { id: 'BR-004', name: 'CDM CDM-EB Link', registryType: 'CDM', status: 'DISCONNECTED', bridgeProtocol: 'API', endpoint: 'https://cdm.unfccc.int/api', apiKeyRef: 'key_cdm_***', accountId: 'ACC-CDM-008', accountName: 'CDM Legacy Bridge', syncInterval: 86400, lastSyncAt: '2025-05-20T12:00:00Z', totalCreditsSynced: 2100.0, metadata: '{}', createdAt: '2025-01-20T00:00:00Z' },
    { id: 'BR-005', name: 'T-VER Domestic', registryType: 'T_VER', status: 'CONNECTED', bridgeProtocol: 'COSMOS_IBC', endpoint: 'https://t-ver.go.th/api/bridge', apiKeyRef: 'key_tver_***', accountId: 'ACC-TVER-001', accountName: 'T-VER Internal', syncInterval: 900, lastSyncAt: '2025-06-15T11:00:00Z', totalCreditsSynced: 32000.0, metadata: '{}', createdAt: '2024-11-01T00:00:00Z' },
    { id: 'BR-006', name: 'Partner Exchange', registryType: 'CUSTOM', status: 'ERROR', bridgeProtocol: 'CUSTOM', endpoint: 'https://partner.example.com/api', apiKeyRef: 'key_cust_***', accountId: 'ACC-CUST-005', accountName: 'Custom Partner', syncInterval: 14400, lastSyncAt: '2025-06-10T06:00:00Z', totalCreditsSynced: 450.0, metadata: '{}', createdAt: '2025-04-01T00:00:00Z' },
  ],
  recentTransactions: [
    { id: 'TX-001', bridgeId: 'BR-001', bridgeName: 'Verra VCS Registry', txType: 'TRANSFER', direction: 'OUTBOUND', creditAmount: 500.0, creditTokenId: 'VCS-2025-TH-001', externalRef: 'EXT-VCS-99201', externalStatus: '', txHash: '0xabc123def456789abc123def456789abc123def4', status: 'CONFIRMED', errorMessage: '', initiatedBy: 'Admin', metadata: '{"projectId":"PRJ-001","methodology":"ACM0002"}', createdAt: '2025-06-15T08:30:00Z' },
    { id: 'TX-002', bridgeId: 'BR-002', bridgeName: 'Gold Standard Bridge', txType: 'MINT', direction: 'INBOUND', creditAmount: 1200.0, creditTokenId: 'GS-2025-TH-015', externalRef: 'EXT-GS-44521', externalStatus: '', txHash: '0x789ghijkl0123456789ghijkl0123456789ghijk', status: 'SUBMITTED', errorMessage: '', initiatedBy: 'Admin', metadata: '{"projectId":"PRJ-003","vintage":"2024"}', createdAt: '2025-06-14T23:00:00Z' },
    { id: 'TX-003', bridgeId: 'BR-005', bridgeName: 'T-VER Domestic', txType: 'RETIRE', direction: 'OUTBOUND', creditAmount: 300.0, creditTokenId: 'TVER-2025-045', externalRef: null, externalStatus: '', txHash: '0xmno345pqr678stu901vwx234yza567bcd890efg', status: 'PENDING', errorMessage: '', initiatedBy: 'Admin', metadata: '{"retirementReason":"Corporate offset 2025"}', createdAt: '2025-06-15T11:00:00Z' },
    { id: 'TX-004', bridgeId: 'BR-003', bridgeName: 'I-REC Energy Registry', txType: 'TRANSFER', direction: 'INBOUND', creditAmount: 750.0, creditTokenId: 'IREC-2025-TH-008', externalRef: 'EXT-IREC-77312', externalStatus: '', txHash: null, status: 'FAILED', errorMessage: 'Endpoint timeout', initiatedBy: 'Admin', metadata: '{"error":"Endpoint timeout","retryCount":3}', createdAt: '2025-06-15T10:00:00Z' },
    { id: 'TX-005', bridgeId: 'BR-001', bridgeName: 'Verra VCS Registry', txType: 'MINT', direction: 'INBOUND', creditAmount: 2000.0, creditTokenId: 'VCS-2025-TH-003', externalRef: 'EXT-VCS-99150', externalStatus: '', txHash: '0xstu901vwx234yza567bcd890efg123hij456klm', status: 'CONFIRMED', errorMessage: '', initiatedBy: 'Admin', metadata: '{"projectId":"PRJ-002","vintage":"2024"}', createdAt: '2025-06-13T14:00:00Z' },
    { id: 'TX-006', bridgeId: 'BR-006', bridgeName: 'Partner Exchange', txType: 'TRANSFER', direction: 'OUTBOUND', creditAmount: 150.0, creditTokenId: 'CUST-2025-012', externalRef: null, externalStatus: '', txHash: null, status: 'ROLLED_BACK', errorMessage: 'Connection lost', initiatedBy: 'Admin', metadata: '{"reason":"Connection lost during transfer"}', createdAt: '2025-06-10T06:00:00Z' },
  ],
  summary: {
    totalBridges: 6, connectedBridges: 3, totalCreditsSynced: 59990.75, totalTransactionAmount: 4900.0,
    byBridgeStatus: { CONNECTED: 3, PENDING: 0, SYNCING: 1, DISCONNECTED: 1, ERROR: 1 },
    byTxStatus: { PENDING: 1, SUBMITTED: 1, CONFIRMED: 2, FAILED: 1, ROLLED_BACK: 1 },
    byTxType: { MINT: 2, TRANSFER: 3, RETIRE: 1 },
    byDirection: { OUTBOUND: 3, INBOUND: 3 },
  },
};

// ─── Component ────────────────────────────────────────────────────────────

export default function CrossChainBridgeView() {
  const { toast } = useToast();
  const [data, setData] = useState<BridgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bridges');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailBridge, setDetailBridge] = useState<Bridge | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actioningBridge, setActioningBridge] = useState<string | null>(null);

  // Add bridge form
  const [fName, setFName] = useState('');
  const [fRegistry, setFRegistry] = useState<RegistryType>('VERRA');
  const [fEndpoint, setFEndpoint] = useState('');
  const [fApiKey, setFApiKey] = useState('');
  const [fAccId, setFAccId] = useState('');
  const [fAccName, setFAccName] = useState('');
  const [fProtocol, setFProtocol] = useState<BridgeProtocol>('API');
  const [fSyncInt, setFSyncInt] = useState('3600');

  // Transfer form
  const [txBridgeId, setTxBridgeId] = useState('');
  const [txType, setTxType] = useState<TxType>('TRANSFER');
  const [txDir, setTxDir] = useState<TxDirection>('OUTBOUND');
  const [txAmount, setTxAmount] = useState('');
  const [txTokenId, setTxTokenId] = useState('');
  const [txMeta, setTxMeta] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dmrv/bridge');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      const bMap = new Map((json.bridges || []).map((b: Bridge) => [b.id, b.name]));
      const bridges = (json.bridges || []).map((b: Record<string, unknown>) => ({
        ...b, bridgeProtocol: (b.bridgeProtocol || b.protocol || 'API') as BridgeProtocol,
        endpoint: (b.endpoint || b.endpointUrl || '') as string,
      }));
      const txs = (json.recentTransactions || []).map((t: Record<string, unknown>) => ({
        ...t, bridgeName: t.bridgeName || bMap.get(t.bridgeId as string) || 'Unknown',
      }));
      setData({ ...json, bridges, recentTransactions: txs } as BridgeData);
    } catch {
      setData(MOCK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const postAction = async (body: Record<string, unknown>): Promise<boolean> => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/bridge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) { toast({ title: 'Success', description: `Action "${body.action}" completed` }); await fetchData(); return true; }
      toast({ title: 'Error', description: `Failed to ${body.action}`, variant: 'destructive' });
      return false;
    } catch {
      toast({ title: 'Network Error', description: 'Could not reach server', variant: 'destructive' });
      return false;
    } finally { setSubmitting(false); }
  };

  const bridgeAction = async (action: string, bridgeId: string) => {
    setActioningBridge(bridgeId);
    try { await postAction({ action, bridgeId }); } finally { setActioningBridge(null); }
  };

  const handleCreate = async () => {
    if (!fName || !fEndpoint || !fAccId) {
      toast({ title: 'Validation Error', description: 'Name, Endpoint, and Account ID are required', variant: 'destructive' });
      return;
    }
    const ok = await postAction({
      action: 'create_bridge', name: fName, registryType: fRegistry, endpoint: fEndpoint,
      apiKeyRef: fApiKey, accountId: fAccId, accountName: fAccName,
      bridgeProtocol: fProtocol, syncInterval: parseInt(fSyncInt) || 3600,
    });
    if (ok) { setAddDialogOpen(false); resetCreateForm(); }
  };

  const handleTransfer = async () => {
    if (!txBridgeId || !txAmount || !txTokenId) {
      toast({ title: 'Validation Error', description: 'Bridge, amount, and token ID are required', variant: 'destructive' });
      return;
    }
    const ok = await postAction({
      action: 'transfer', bridgeId: txBridgeId, txType, direction: txDir,
      creditAmount: parseFloat(txAmount), creditTokenId: txTokenId, metadata: txMeta,
    });
    if (ok) resetTransferForm();
  };

  const resetCreateForm = () => {
    setFName(''); setFRegistry('VERRA'); setFEndpoint('');
    setFApiKey(''); setFAccId(''); setFAccName(''); setFProtocol('API'); setFSyncInt('3600');
  };
  const resetTransferForm = () => {
    setTxBridgeId(''); setTxType('TRANSFER'); setTxDir('OUTBOUND');
    setTxAmount(''); setTxTokenId(''); setTxMeta('');
  };

  const bridges = data?.bridges || MOCK.bridges;
  const txns = data?.recentTransactions || MOCK.recentTransactions;
  const summary = data?.summary || MOCK.summary;
  const connected = bridges.filter((b) => b.status === 'CONNECTED' || b.status === 'SYNCING');

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 mt-2" /></div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>))}
        </div>
        <Skeleton className="h-10 w-72" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Link2 className="h-6 w-6 text-emerald-600" /> Cross-Chain Bridge
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Registry connections &amp; inter-chain credit transfers
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-3.5 w-3.5" /> Add Bridge
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Link2 className="h-5 w-5 text-slate-600" />
          </div>
          <div><p className="text-xl font-bold">{summary.totalBridges}</p><p className="text-xs text-muted-foreground">Total / {summary.connectedBridges} Connected</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <Database className="h-5 w-5 text-emerald-600" />
          </div>
          <div><p className="text-xl font-bold text-emerald-600">{summary.totalCreditsSynced.toLocaleString()}</p><p className="text-xs text-muted-foreground">Credits Synced (tCO₂e)</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
            <Activity className="h-5 w-5 text-teal-600" />
          </div>
          <div><p className="text-xl font-bold text-teal-600">{summary.totalTransactionAmount.toLocaleString()}</p><p className="text-xs text-muted-foreground">Tx Volume (tCO₂e)</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div><p className="text-xl font-bold text-amber-600">{(summary.byTxStatus.PENDING || 0) + (summary.byTxStatus.SUBMITTED || 0)}</p><p className="text-xs text-muted-foreground">Pending Transactions</p></div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bridges" className="gap-1"><Globe className="h-3.5 w-3.5" /> Bridges</TabsTrigger>
          <TabsTrigger value="transfer" className="gap-1"><Send className="h-3.5 w-3.5" /> Transfer</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><Activity className="h-3.5 w-3.5" /> History</TabsTrigger>
        </TabsList>

        {/* ── Bridges Tab ─────────────────────────────────────────────── */}
        <TabsContent value="bridges" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {bridges.map((bridge) => {
              const reg = registryBadge[bridge.registryType];
              const st = statusConfig[bridge.status];
              const StIcon = st.icon;
              const PI = protocolIcon[bridge.bridgeProtocol];
              return (
                <Card key={bridge.id} className="hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setDetailBridge(bridge)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 shrink-0">
                          <PI className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{bridge.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{bridge.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`h-2 w-2 rounded-full ${statusDot[bridge.status]}`} />
                        <Badge variant="secondary" className={`text-[10px] h-5 ${st.bg} ${st.text}`}>
                          <StIcon className="h-3 w-3 mr-0.5" />{bridge.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <Badge variant="secondary" className={`text-[10px] h-5 ${reg.bg} ${reg.text}`}>
                        {bridge.registryType.replace('_', '-')}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] h-5 bg-slate-50 text-slate-600">
                        {bridge.bridgeProtocol.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                      <div><span className="text-muted-foreground">Last Sync: </span><span className="font-medium">{fmtTime(bridge.lastSyncAt)}</span></div>
                      <div><span className="text-muted-foreground">Synced: </span><span className="font-medium">{bridge.totalCreditsSynced.toLocaleString()} tCO₂e</span></div>
                      <div className="truncate"><span className="text-muted-foreground">Account: </span><span className="font-medium">{bridge.accountName || bridge.accountId || '—'}</span></div>
                      <div><span className="text-muted-foreground">Interval: </span><span className="font-medium">{bridge.syncInterval / 60}min</span></div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                      {bridge.status === 'DISCONNECTED' || bridge.status === 'ERROR' ? (
                        <Button size="sm" variant="outline" className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs h-7"
                          disabled={actioningBridge === bridge.id} onClick={() => bridgeAction('connect', bridge.id)}>
                          {actioningBridge === bridge.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}Connect
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
                            disabled={actioningBridge === bridge.id} onClick={() => bridgeAction('sync', bridge.id)}>
                            <RefreshCw className={`h-3 w-3 ${actioningBridge === bridge.id ? 'animate-spin' : ''}`} />Sync Now
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                            disabled={actioningBridge === bridge.id} onClick={() => bridgeAction('disconnect', bridge.id)}>
                            <Unlink className="h-3 w-3" />Disconnect
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 ml-auto" onClick={() => setDetailBridge(bridge)}>
                        <ExternalLink className="h-3 w-3" />Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Transfer Tab ─────────────────────────────────────────────── */}
        <TabsContent value="transfer" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Send className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">Credit Transfer</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Bridge *</Label>
                    <Select value={txBridgeId} onValueChange={setTxBridgeId}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Select connected bridge" /></SelectTrigger>
                      <SelectContent>
                        {connected.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                        {connected.length === 0 && (<SelectItem value="_none" disabled>No connected bridges</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Transfer Type</Label>
                      <Select value={txType} onValueChange={(v) => setTxType(v as TxType)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MINT">MINT</SelectItem>
                          <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                          <SelectItem value="RETIRE">RETIRE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Direction</Label>
                      <Select value={txDir} onValueChange={(v) => setTxDir(v as TxDirection)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OUTBOUND">⬆ OUTBOUND</SelectItem>
                          <SelectItem value="INBOUND">⬇ INBOUND</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Credit Amount (tCO₂e) *</Label>
                      <Input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Credit Token ID *</Label>
                      <Input value={txTokenId} onChange={(e) => setTxTokenId(e.target.value)} placeholder="VCS-2025-TH-001" className="text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Metadata (JSON, optional)</Label>
                    <Input value={txMeta} onChange={(e) => setTxMeta(e.target.value)} placeholder='{"projectId":"PRJ-001"}' className="text-sm" />
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetTransferForm}>Clear</Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" disabled={submitting} onClick={handleTransfer}>
                      {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Submit Transfer
                    </Button>
                  </div>
                </div>
                {/* Summary sidebar */}
                <div className="space-y-4">
                  <Card className="bg-slate-50 border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transfer Summary</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Bridge:</span><span className="font-medium">{connected.find((b) => b.id === txBridgeId)?.name || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Type:</span><span className="font-medium">{txType}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Direction:</span>
                          <Badge variant="secondary" className={`text-[10px] h-5 gap-0.5 ${txDir === 'OUTBOUND' ? 'bg-orange-50 text-orange-700' : 'bg-sky-50 text-sky-700'}`}>
                            {txDir === 'OUTBOUND' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}{txDir}
                          </Badge>
                        </div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-semibold text-emerald-600">{txAmount ? `${parseFloat(txAmount).toLocaleString()} tCO₂e` : '—'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Token ID:</span><span className="font-mono text-xs">{txTokenId || '—'}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">Connected Bridges: {connected.length}</p>
                    {connected.map((b) => (
                      <div key={b.id} className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{b.name}</span>
                        <span className="text-muted-foreground">({b.registryType})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History Tab ──────────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Bridge</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Direction</TableHead>
                      <TableHead className="text-xs text-right">Amount (tCO₂e)</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Tx Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txns.map((tx) => {
                      const ts = txStatusConfig[tx.status];
                      return (
                        <React.Fragment key={tx.id}>
                          <TableRow className="cursor-pointer hover:bg-slate-50"
                            onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </TableCell>
                            <TableCell className="text-xs font-medium max-w-[120px] truncate">{tx.bridgeName || '—'}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="secondary" className="text-[10px] h-5 bg-slate-50 text-slate-700">{tx.txType}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="secondary" className={`text-[10px] h-5 gap-0.5 ${tx.direction === 'OUTBOUND' ? 'bg-orange-50 text-orange-700' : 'bg-sky-50 text-sky-700'}`}>
                                {tx.direction === 'OUTBOUND' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                {tx.direction}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold">{tx.creditAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="secondary" className={`text-[10px] h-5 ${ts.bg} ${ts.text}`}>{tx.status.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono max-w-[120px]">
                              {tx.txHash ? (
                                <span className="flex items-center gap-1">
                                  <span className="truncate">{tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}</span>
                                  <button className="p-0.5 hover:bg-slate-100 rounded shrink-0" onClick={(e) => {
                                    e.stopPropagation(); navigator.clipboard.writeText(tx.txHash || '');
                                    toast({ title: 'Copied', description: 'Tx hash copied' });
                                  }}><Copy className="h-3 w-3 text-slate-400" /></button>
                                </span>
                              ) : '—'}
                            </TableCell>
                          </TableRow>
                          {expandedTx === tx.id && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-slate-50 p-3">
                                <div className="text-xs space-y-2">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div><span className="text-muted-foreground">Token ID:</span> <span className="font-mono">{tx.creditTokenId}</span></div>
                                    <div><span className="text-muted-foreground">External Ref:</span> <span className="font-mono">{tx.externalRef || '—'}</span></div>
                                    <div><span className="text-muted-foreground">Initiated By:</span> <span>{tx.initiatedBy}</span></div>
                                    <div><span className="text-muted-foreground">Ext Status:</span> <span>{tx.externalStatus || '—'}</span></div>
                                  </div>
                                  {tx.errorMessage && (
                                    <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700">{tx.errorMessage}</div>
                                  )}
                                  <div>
                                    <p className="font-semibold mb-1">Metadata:</p>
                                    <pre className="bg-white border rounded p-2 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                      {(() => { try { return JSON.stringify(JSON.parse(tx.metadata), null, 2); } catch { return tx.metadata; } })()}
                                    </pre>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {txns.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No transactions recorded yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Add Bridge Dialog ─────────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-600" />Add New Bridge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Bridge Name *</Label>
              <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="e.g. Verra VCS Bridge" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Registry Type</Label>
                <Select value={fRegistry} onValueChange={(v) => setFRegistry(v as RegistryType)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERRA">VERRA</SelectItem><SelectItem value="GOLD_STANDARD">Gold Standard</SelectItem>
                    <SelectItem value="I_REC">I-REC</SelectItem><SelectItem value="CDM">CDM</SelectItem>
                    <SelectItem value="T_VER">T-VER</SelectItem><SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bridge Protocol</Label>
                <Select value={fProtocol} onValueChange={(v) => setFProtocol(v as BridgeProtocol)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="API">API</SelectItem><SelectItem value="POLYGON_BRIDGE">Polygon Bridge</SelectItem>
                    <SelectItem value="ETHEREUM_BRIDGE">Ethereum Bridge</SelectItem><SelectItem value="COSMOS_IBC">Cosmos IBC</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Endpoint URL *</Label>
              <Input value={fEndpoint} onChange={(e) => setFEndpoint(e.target.value)} placeholder="https://registry.example.com/api" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">API Key Reference</Label>
              <Input value={fApiKey} onChange={(e) => setFApiKey(e.target.value)} placeholder="key_***" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Account ID *</Label>
                <Input value={fAccId} onChange={(e) => setFAccId(e.target.value)} placeholder="ACC-XXX-001" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Name</Label>
                <Input value={fAccName} onChange={(e) => setFAccName(e.target.value)} placeholder="My Bridge Account" className="text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sync Interval (seconds)</Label>
              <Input value={fSyncInt} onChange={(e) => setFSyncInt(e.target.value)} placeholder="3600" className="text-sm" />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setAddDialogOpen(false); resetCreateForm(); }}>Cancel</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" disabled={submitting} onClick={handleCreate}>
                {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Create Bridge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bridge Detail Dialog ──────────────────────────────────────── */}
      <Dialog open={!!detailBridge} onOpenChange={(open) => { if (!open) setDetailBridge(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailBridge && (() => { const PI = protocolIcon[detailBridge.bridgeProtocol]; return <PI className="h-5 w-5 text-emerald-600" />; })()}
              {detailBridge?.name || 'Bridge Details'}
            </DialogTitle>
          </DialogHeader>
          {detailBridge && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(() => { const st = statusConfig[detailBridge.status]; const SI = st.icon;
                  return <Badge variant="secondary" className={`text-xs gap-1 ${st.bg} ${st.text}`}><SI className="h-3 w-3" />{detailBridge.status}</Badge>; })()}
                <Badge variant="secondary" className={`text-xs ${registryBadge[detailBridge.registryType].bg} ${registryBadge[detailBridge.registryType].text}`}>
                  {detailBridge.registryType.replace('_', '-')}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-slate-50 text-slate-600">{detailBridge.bridgeProtocol.replace('_', ' ')}</Badge>
              </div>
              <Card><CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div><span className="text-muted-foreground">Bridge ID:</span></div><div className="font-mono font-medium">{detailBridge.id}</div>
                  <div><span className="text-muted-foreground">Endpoint:</span></div><div className="font-mono break-all">{detailBridge.endpoint}</div>
                  <div><span className="text-muted-foreground">API Key Ref:</span></div><div className="font-mono">{detailBridge.apiKeyRef}</div>
                  <div><span className="text-muted-foreground">Account ID:</span></div><div className="font-mono">{detailBridge.accountId}</div>
                  <div><span className="text-muted-foreground">Account Name:</span></div><div className="font-medium">{detailBridge.accountName || '—'}</div>
                  <div><span className="text-muted-foreground">Sync Interval:</span></div><div className="font-medium">{detailBridge.syncInterval / 60} min</div>
                  <div><span className="text-muted-foreground">Last Sync:</span></div><div className="font-medium">{fmtTime(detailBridge.lastSyncAt)}</div>
                  <div><span className="text-muted-foreground">Total Synced:</span></div><div className="font-semibold text-emerald-600">{detailBridge.totalCreditsSynced.toLocaleString()} tCO₂e</div>
                  <div><span className="text-muted-foreground">Created:</span></div><div className="font-medium">{new Date(detailBridge.createdAt).toLocaleDateString()}</div>
                </div>
              </CardContent></Card>
              <div className="flex gap-2">
                {detailBridge.status === 'CONNECTED' || detailBridge.status === 'SYNCING' ? (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5 flex-1" disabled={actioningBridge === detailBridge.id}
                      onClick={() => bridgeAction('sync', detailBridge.id)}>
                      <RefreshCw className={`h-3.5 w-3.5 ${actioningBridge === detailBridge.id ? 'animate-spin' : ''}`} />Sync Now
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 flex-1"
                      disabled={actioningBridge === detailBridge.id} onClick={() => bridgeAction('disconnect', detailBridge.id)}>
                      <Unlink className="h-3.5 w-3.5" />Disconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1.5 flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    disabled={actioningBridge === detailBridge.id} onClick={() => bridgeAction('connect', detailBridge.id)}>
                    <Link2 className="h-3.5 w-3.5" />Connect
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
