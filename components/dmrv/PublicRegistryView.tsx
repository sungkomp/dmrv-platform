'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Shield,
  FileCheck,
  Clock,
  Link2,
  Download,
  Eye,
  CheckCircle2,
  Lock,
  Database,
  Hash,
  ArrowRight,
  RefreshCw,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Copy,
  Check,
  AlertCircle,
  MapPin,
  CalendarDays,
  FileBadge,
  ChevronDown,
  ChevronUp,
  XCircle,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────

interface AuditTrailNode {
  eventType: string;
  previousHash: string;
  dataHash: string;
  merkleRoot: string;
  metadata: string;
  timestamp: string;
}

interface CertificateInfo {
  id: string;
  certificateNumber: string;
  status: string;
  issuedBy: string;
  validFrom: string;
  validUntil: string;
  project: {
    id: string;
    name: string;
    methodology: string;
    province: string;
    status?: string;
  };
}

interface ChainIntegrity {
  valid: boolean;
  totalEntries: number;
  genesisHash?: string | null;
  latestRoot?: string | null;
}

interface RecentEntry {
  id: string;
  certificateNumber: string;
  status: string;
  issuedBy: string;
  validFrom: string;
  validUntil: string;
  project: {
    id: string;
    name: string;
    methodology: string;
    province: string;
  };
  latestAuditEvent: {
    eventType: string;
    timestamp: string;
    merkleRoot: string;
  } | null;
}

interface SearchResult {
  certificate: CertificateInfo;
  auditTrail: AuditTrailNode[];
  chainIntegrity: ChainIntegrity;
}

// ─── Event type config ────────────────────────────────────────────────────

const eventConfig: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ElementType; label: string }> = {
  ORIGIN: { color: 'text-emerald-700', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-400', icon: Database, label: 'ORIGIN' },
  QUANTIFY: { color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', icon: Hash, label: 'QUANTIFY' },
  VERIFY: { color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-400', icon: Shield, label: 'VERIFY' },
  CERTIFY: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-500', icon: FileCheck, label: 'CERTIFY' },
  MINT: { color: 'text-purple-700', bgColor: 'bg-purple-100', borderColor: 'border-purple-400', icon: Lock, label: 'MINT' },
  TRADE: { color: 'text-teal-700', bgColor: 'bg-teal-100', borderColor: 'border-teal-400', icon: ArrowRight, label: 'TRADE' },
  RETIRE: { color: 'text-rose-700', bgColor: 'bg-rose-100', borderColor: 'border-rose-400', icon: CheckCircle2, label: 'RETIRE' },
  BUFFER: { color: 'text-orange-700', bgColor: 'bg-orange-100', borderColor: 'border-orange-400', icon: Shield, label: 'BUFFER' },
};

const statusConfig: Record<string, { color: string; bgColor: string; hoverBg: string }> = {
  APPROVED: { color: 'text-emerald-700', bgColor: 'bg-emerald-100', hoverBg: 'hover:bg-emerald-100' },
  SUBMITTED: { color: 'text-amber-700', bgColor: 'bg-amber-100', hoverBg: 'hover:bg-amber-100' },
  REJECTED: { color: 'text-red-700', bgColor: 'bg-red-100', hoverBg: 'hover:bg-red-100' },
  REVOKED: { color: 'text-red-700', bgColor: 'bg-red-100', hoverBg: 'hover:bg-red-100' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function truncateHash(hash: string, chars = 8): string {
  if (!hash || hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

function truncateHashShort(hash: string): string {
  if (!hash || hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getActorFromMetadata(metadataStr: string): string {
  try {
    const meta = JSON.parse(metadataStr) as { source?: string };
    return meta.source || 'System';
  } catch {
    return 'System';
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function PublicRegistryView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [summary, setSummary] = useState<{ totalCertificates: number; totalTrailEntries: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [expandHashes, setExpandHashes] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/dmrv/registry');
      if (!res.ok) throw new Error('Failed to fetch registry data');
      const data = (await res.json()) as {
        recentEntries: RecentEntry[];
        summary: { totalCertificates: number; totalTrailEntries: number };
      };

      setRecentEntries(data.recentEntries || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load registry data');
      toast({ title: 'Error', description: 'Failed to load registry data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResult(null);
      setNoResults(false);
      return;
    }
    setSearching(true);
    setNoResults(false);
    setShowSearchHistory(false);
    try {
      const q = searchQuery.trim();
      // Determine if it looks like a certId (cuid) or certNumber
      const isCertId = q.startsWith('cmpo') || q.startsWith('cert-') || q.length > 25;
      const url = isCertId
        ? `/api/dmrv/registry?certId=${encodeURIComponent(q)}`
        : `/api/dmrv/registry?certNumber=${encodeURIComponent(q)}`;

      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          setNoResults(true);
          setSearchResult(null);
          // Add to search history
          setSearchHistory((prev) => [q, ...prev.filter((s) => s !== q)].slice(0, 5));
          return;
        }
        throw new Error('Search failed');
      }
      const data = (await res.json()) as SearchResult | { results: SearchResult[]; total: number };

      if ('results' in data) {
        // certNumber search returns { results, total }
        const results = data.results as SearchResult[];
        if (results.length > 0) {
          setSearchResult(results[0]);
          setSearchHistory((prev) => [q, ...prev.filter((s) => s !== q)].slice(0, 5));
        } else {
          setNoResults(true);
          setSearchResult(null);
          setSearchHistory((prev) => [q, ...prev.filter((s) => s !== q)].slice(0, 5));
        }
      } else {
        // certId search returns single result
        setSearchResult(data as SearchResult);
        setSearchHistory((prev) => [q, ...prev.filter((s) => s !== q)].slice(0, 5));
      }
    } catch (err) {
      toast({ title: 'Search Error', description: err instanceof Error ? err.message : 'Search failed', variant: 'destructive' });
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  const handleViewTrail = async (entry: RecentEntry) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/dmrv/registry?certId=${encodeURIComponent(entry.id)}`);
      if (!res.ok) throw new Error('Failed to load audit trail');
      const data = (await res.json()) as SearchResult;
      setSearchResult(data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load audit trail', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const handleCopyHash = async (hash: string, label: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(label);
      toast({ title: 'Copied', description: `${label} copied to clipboard` });
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      toast({ title: 'Copy Failed', description: 'Could not copy to clipboard', variant: 'destructive' });
    }
  };

  const handleExportTrail = () => {
    if (!searchResult) return;
    const exportData = {
      certificateId: searchResult.certificate.id,
      certificateNumber: searchResult.certificate.certificateNumber,
      status: searchResult.certificate.status,
      chainIntegrity: searchResult.chainIntegrity,
      auditTrail: searchResult.auditTrail.map((node) => ({
        eventType: node.eventType,
        dataHash: node.dataHash,
        merkleRoot: node.merkleRoot,
        previousHash: node.previousHash,
        actor: getActorFromMetadata(node.metadata),
        timestamp: node.timestamp,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${searchResult.certificate.certificateNumber || searchResult.certificate.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Audit trail exported as JSON' });
  };

  // ─── Loading State ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvedCount = recentEntries.filter((e) => e.status === 'APPROVED').length;
  const pendingCount = recentEntries.filter((e) => e.status === 'SUBMITTED').length;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Search className="h-6 w-6 text-emerald-600" />
            Public Registry & Explorer
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Transparent carbon credit traceability</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 self-start">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Failed to load data.{' '}
            <Button variant="link" className="h-auto p-0 text-red-700 underline" onClick={fetchData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Certificate ID or Certificate Number..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchHistory(false); setNoResults(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => searchHistory.length > 0 && setShowSearchHistory(true)}
                className="pl-10"
              />
              {/* Search History Dropdown */}
              {showSearchHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  <div className="p-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Recent Searches</div>
                  {searchHistory.map((term) => (
                    <button
                      key={term}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                      onClick={() => { setSearchQuery(term); setShowSearchHistory(false); }}
                    >
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{term}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
          {/* No Results Message */}
          {noResults && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium">No certificates found for &quot;{searchQuery}&quot;</span>
              </div>
              <div className="text-xs text-amber-600 ml-6">
                Tips: Try searching by certificate number (e.g., TGO-CERT-001) or certificate ID. Make sure the ID format is correct.
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-6 w-fit text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => { setSearchResult(null); setNoResults(false); setSearchQuery(''); }}
              >
                <Layers className="h-3 w-3" />
                Browse All Certificates
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Database className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{summary?.totalCertificates ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Certificates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending / Submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Link2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">{summary?.totalTrailEntries ?? 0}</p>
              <p className="text-xs text-muted-foreground">Audit Trail Entries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Result: Certificate Detail + Audit Trail Timeline */}
      {searchResult && (
        <div className="space-y-4">
          {/* Certificate Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                    Certificate Details
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {searchResult.certificate.certificateNumber || searchResult.certificate.id}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusConfig[searchResult.certificate.status] && (
                    <Badge
                      variant="secondary"
                      className={`${statusConfig[searchResult.certificate.status].bgColor} ${statusConfig[searchResult.certificate.status].color} ${statusConfig[searchResult.certificate.status].hoverBg}`}
                    >
                      {searchResult.certificate.status}
                    </Badge>
                  )}
                  {searchResult.chainIntegrity.valid && (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      No Double Counting
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 gap-1 cursor-help">
                        <Lock className="h-3 w-3" />
                        PDPA Compliant
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Personal data has been de-identified in compliance with PDPA.</p>
                      <p className="text-[10px] mt-0.5 opacity-80">No personally identifiable information is stored on-chain.</p>
                    </TooltipContent>
                  </Tooltip>
                  {searchResult.certificate.project?.methodology && (
                    <Badge variant="secondary" className="bg-violet-50 text-violet-700 hover:bg-violet-50 gap-1">
                      <FileBadge className="h-3 w-3" />
                      {searchResult.certificate.project.methodology}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Certificate Number</p>
                  <p className="text-sm font-medium">{searchResult.certificate.certificateNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="text-sm font-medium">{searchResult.certificate.project?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Methodology</p>
                  <p className="text-sm font-medium">{searchResult.certificate.project?.methodology || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Issued By</p>
                  <p className="text-sm font-medium">{searchResult.certificate.issuedBy || 'TGO'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Project Location</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {searchResult.certificate.project?.province || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valid Period</p>
                  <div className="mt-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <CalendarDays className="h-3 w-3" />
                      <span>{searchResult.certificate.validFrom ? new Date(searchResult.certificate.validFrom).toLocaleDateString() : 'N/A'}</span>
                      <span>-</span>
                      <span>{searchResult.certificate.validUntil ? new Date(searchResult.certificate.validUntil).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    {searchResult.certificate.validFrom && searchResult.certificate.validUntil && (() => {
                      const start = new Date(searchResult.certificate.validFrom).getTime();
                      const end = new Date(searchResult.certificate.validUntil).getTime();
                      const now = Date.now();
                      const total = end - start;
                      const elapsed = now - start;
                      const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
                      const isExpired = now > end;
                      return (
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isExpired ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chain Integrity Summary Card */}
          {searchResult.chainIntegrity && (() => {
            const trail = searchResult.auditTrail;
            const hasDuplicates = (() => {
              const tokenIds = trail.map((n) => n.dataHash);
              return new Set(tokenIds).size !== tokenIds.length;
            })();
            return (
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5">
                      {searchResult.chainIntegrity.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`font-medium ${searchResult.chainIntegrity.valid ? 'text-emerald-700' : 'text-red-700'}`}>
                        Chain: {searchResult.chainIntegrity.valid ? 'Valid' : 'Broken'}
                      </span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-muted-foreground">Entries: <span className="font-semibold text-slate-700">{searchResult.chainIntegrity.totalEntries}</span></span>
                    {searchResult.chainIntegrity.genesisHash && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-muted-foreground">Genesis: <code className="font-mono text-[10px]">{truncateHash(searchResult.chainIntegrity.genesisHash, 6)}</code></span>
                      </>
                    )}
                    {searchResult.chainIntegrity.latestRoot && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-muted-foreground">Root: <code className="font-mono text-[10px]">{truncateHash(searchResult.chainIntegrity.latestRoot, 6)}</code></span>
                      </>
                    )}
                    {!hasDuplicates && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px] h-5 gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          No Double Counting
                        </Badge>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Merkle Tree / Audit Trail Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-blue-600" />
                    Merkle Tree / Audit Trail
                  </CardTitle>
                  <CardDescription>{searchResult.auditTrail.length} entries in the chain</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandHashes(!expandHashes)}
                    className="gap-1 text-xs"
                  >
                    {expandHashes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {expandHashes ? 'Collapse Hashes' : 'Expand Hashes'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportTrail} className="gap-2">
                    <Download className="h-3.5 w-3.5" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {searchResult.auditTrail.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No audit trail entries found for this certificate.
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-0">
                    {searchResult.auditTrail.map((node, idx) => {
                      const config = eventConfig[node.eventType] || eventConfig.ORIGIN;
                      const Icon = config.icon;
                      const actor = getActorFromMetadata(node.metadata);
                      // Chain verification: check if previousHash matches prior entry's dataHash
                      const prevNode = idx > 0 ? searchResult.auditTrail[idx - 1] : null;
                      const chainLinkValid = idx === 0
                        ? node.previousHash === '0'.repeat(64) || node.previousHash === '' || node.previousHash === 'GENESIS'
                        : prevNode !== null && node.previousHash === prevNode.dataHash;

                      return (
                        <React.Fragment key={`${node.eventType}-${idx}`}>
                          <div className="flex gap-4">
                            {/* Timeline connector */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${config.bgColor} ${config.borderColor}`}
                              >
                                <Icon className={`h-4 w-4 ${config.color}`} />
                              </div>
                              {idx < searchResult.auditTrail.length - 1 && (
                                <div className="w-0.5 flex-1 my-1 min-h-[24px] relative">
                                  <div className={`absolute inset-0 ${chainLinkValid ? 'bg-emerald-300' : 'bg-red-300'}`} style={{ width: '2px', left: '50%', transform: 'translateX(-50%)' }} />
                                  {chainLinkValid ? (
                                    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white rounded-full p-0.5">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    </div>
                                  ) : (
                                    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-white rounded-full p-0.5">
                                      <XCircle className="h-3 w-3 text-red-500" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Node content */}
                            <div className="flex-1 pb-6 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant="secondary" className={`${config.bgColor} ${config.color} hover:bg-opacity-80 text-xs font-bold`}>
                                  {config.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{formatRelativeTime(node.timestamp)}</span>
                                {idx > 0 && (
                                  chainLinkValid ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent>Hash chain verified: previousHash matches prior dataHash</TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle className="h-3 w-3 text-red-500 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent>Chain link broken: previousHash does not match prior dataHash</TooltipContent>
                                    </Tooltip>
                                  )
                                )}
                              </div>

                              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                  <Hash className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="text-muted-foreground">dataHash:</span>
                                  <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 break-all">
                                    {expandHashes ? node.dataHash : truncateHashShort(node.dataHash)}
                                  </code>
                                  <button
                                    className="shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors"
                                    onClick={() => handleCopyHash(node.dataHash, `dataHash-${idx}`)}
                                    title="Copy hash"
                                  >
                                    {copiedHash === `dataHash-${idx}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-400" />}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Link2 className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="text-muted-foreground">prevHash:</span>
                                  <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 break-all">
                                    {expandHashes ? node.previousHash : truncateHashShort(node.previousHash)}
                                  </code>
                                  <button
                                    className="shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors"
                                    onClick={() => handleCopyHash(node.previousHash, `prevHash-${idx}`)}
                                    title="Copy hash"
                                  >
                                    {copiedHash === `prevHash-${idx}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-400" />}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Shield className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="text-muted-foreground">merkleRoot:</span>
                                  <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 break-all">
                                    {expandHashes ? node.merkleRoot : truncateHashShort(node.merkleRoot)}
                                  </code>
                                  <button
                                    className="shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors"
                                    onClick={() => handleCopyHash(node.merkleRoot, `merkleRoot-${idx}`)}
                                    title="Copy hash"
                                  >
                                    {copiedHash === `merkleRoot-${idx}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-400" />}
                                  </button>
                                </div>
                                <Separator className="my-1" />
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Actor: <span className="font-medium text-slate-700">{actor}</span></span>
                                  <span>{new Date(node.timestamp).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Back to list */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchResult(null);
              setSearchQuery('');
            }}
            className="gap-1"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Registry
          </Button>
        </div>
      )}

      {/* Recent Certificates Table (when no search result) */}
      {!searchResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Certificates</CardTitle>
            <CardDescription>Browse all certificates in the public registry</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate #</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead className="hidden md:table-cell">Valid Until</TableHead>
                    <TableHead className="hidden lg:table-cell">Latest Event</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                        No certificates found in the registry.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentEntries.map((entry) => {
                      const sc = statusConfig[entry.status] || statusConfig.SUBMITTED;
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs">
                            {entry.certificateNumber || truncateHash(entry.id, 6)}
                          </TableCell>
                          <TableCell className="text-sm">{entry.project?.name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${sc.bgColor} ${sc.color} ${sc.hoverBg} text-[10px] h-5`}>
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{entry.issuedBy || 'TGO'}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {entry.validUntil ? new Date(entry.validUntil).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {entry.latestAuditEvent ? (
                              <div className="flex items-center gap-1.5">
                                {(() => {
                                  const ec = eventConfig[entry.latestAuditEvent.eventType];
                                  const EIcon = ec?.icon || Hash;
                                  return <EIcon className={`h-3 w-3 ${ec?.color || 'text-slate-400'}`} />;
                                })()}
                                <span className="text-xs text-muted-foreground">{entry.latestAuditEvent.eventType}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewTrail(entry)} className="gap-1 text-xs" disabled={searching}>
                              {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                              View Trail
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
