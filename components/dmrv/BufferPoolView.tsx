'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Percent,
  BarChart3,
  List,
  Unlock,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BufferEntry {
  id: string;
  projectId: string;
  creditId: string;
  amount: number;
  uncertaintyPct: number;
  bufferPct: number;
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  reason: string;
  releasedAt: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    province: string;
  };
  credit: {
    id: string;
    tokenId: string;
    amount: number;
    status: string;
  };
}

interface ByRiskCategory {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  VERY_HIGH: number;
}

interface ByProjectEntry {
  projectName: string;
  province: string;
  amount: number;
  count: number;
}

interface BufferSummary {
  total: number;
  totalBuffered: number;
  byRiskCategory: ByRiskCategory;
  byProject: Record<string, ByProjectEntry>;
}

interface BufferResponse {
  entries: BufferEntry[];
  summary: BufferSummary;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RISK_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  VERY_HIGH: '#ef4444',
};

const RISK_THRESHOLDS = [
  { category: 'LOW', label: 'LOW', uncertaintyRange: '< 15%', bufferPct: 10, color: '#22c55e', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-400' },
  { category: 'MEDIUM', label: 'MEDIUM', uncertaintyRange: '15-30%', bufferPct: 15, color: '#f59e0b', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
  { category: 'HIGH', label: 'HIGH', uncertaintyRange: '30-45%', bufferPct: 20, color: '#f97316', bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-700 dark:text-orange-400' },
  { category: 'VERY_HIGH', label: 'VERY HIGH', uncertaintyRange: '> 45%', bufferPct: 30, color: '#ef4444', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <Card className="min-w-[160px]">
      <CardContent className="p-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-[260px]">
          <Skeleton className="h-[240px] w-[240px] rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 8 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-20" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskCategoryBadge({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
    MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    VERY_HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  };
  return (
    <Badge variant="outline" className={colorMap[category] || ''}>
      {category === 'VERY_HIGH' ? 'VERY HIGH' : category}
    </Badge>
  );
}

function StatusBadge({ releasedAt }: { releasedAt: string | null }) {
  if (releasedAt) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        Released
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      Held
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function BufferPoolView() {
  const [data, setData] = useState<BufferResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [releaseReason, setReleaseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/dmrv/buffer');
      if (!res.ok) throw new Error(`Failed to fetch buffer data: ${res.status}`);
      const json: BufferResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const entries = data?.entries ?? [];
  const summary = data?.summary;

  const totalBuffered = summary?.totalBuffered ?? 0;
  const totalCredits = entries.reduce((sum, e) => sum + e.credit.amount, 0);
  const bufferPoolPct = totalCredits > 0 ? (totalBuffered / totalCredits) * 100 : 0;
  const avgUncertainty =
    entries.length > 0
      ? entries.reduce((sum, e) => sum + e.uncertaintyPct, 0) / entries.length
      : 0;
  const entriesCount = summary?.total ?? entries.length;

  const heldEntries = entries.filter((e) => !e.releasedAt);

  // Pie chart data
  const riskCategoryData = summary
    ? Object.entries(summary.byRiskCategory).map(([key, value]) => ({
        name: key === 'VERY_HIGH' ? 'VERY HIGH' : key,
        value,
        color: RISK_COLORS[key] || '#94a3b8',
      }))
    : [];

  // Bar chart data
  const projectBarData = summary
    ? Object.entries(summary.byProject).map(([, proj]) => {
        const projectEntries = entries.filter((e) => e.project.name === proj.projectName);
        const buffered = projectEntries.reduce((s, e) => s + e.amount, 0);
        const creditTotal = projectEntries.reduce((s, e) => s + e.credit.amount, 0);
        const available = creditTotal - buffered;
        return {
          name: proj.projectName.length > 16 ? proj.projectName.substring(0, 14) + '...' : proj.projectName,
          Available: Math.round(available * 100) / 100,
          Buffered: Math.round(buffered * 100) / 100,
        };
      })
    : [];

  // -----------------------------------------------------------------------
  // Release handler
  // -----------------------------------------------------------------------

  const handleRelease = async () => {
    if (!selectedEntryId) {
      toast.error('Please select an entry to release.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/buffer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release', entryId: selectedEntryId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Release failed with status ${res.status}`);
      }
      toast.success('Buffer credits released successfully.');
      setReleaseDialogOpen(false);
      setSelectedEntryId('');
      setReleaseReason('');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to release buffer credits.');
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render: Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Error
  // -----------------------------------------------------------------------

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Landmark className="h-6 w-6 text-emerald-600" />
              Uncertainty &amp; Buffer Pool
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Risk reserve management per Verra/Gold Standard
            </p>
          </div>
        </div>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <div className="text-center">
              <p className="font-semibold text-red-700 dark:text-red-400">Failed to load buffer pool data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Main
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* 1. Header                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="h-6 w-6 text-emerald-600" />
            Uncertainty &amp; Buffer Pool
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Risk reserve management per Verra/Gold Standard
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Summary Stat Cards                                             */}
      {/* ----------------------------------------------------------------- */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-2">
          {/* Total Buffered */}
          <Card className="min-w-[170px] flex-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBuffered.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Buffered (tCO2e)</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Credits Generated */}
          <Card className="min-w-[170px] flex-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCredits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Credits Generated</p>
              </div>
            </CardContent>
          </Card>

          {/* Buffer Pool % */}
          <Card className="min-w-[170px] flex-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Percent className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bufferPoolPct.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Buffer Pool %</p>
              </div>
            </CardContent>
          </Card>

          {/* Avg Uncertainty % */}
          <Card className="min-w-[170px] flex-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgUncertainty.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Avg Uncertainty %</p>
              </div>
            </CardContent>
          </Card>

          {/* Entries Count */}
          <Card className="min-w-[170px] flex-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <List className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{entriesCount}</p>
                <p className="text-xs text-muted-foreground">Entries Count</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Uncertainty Gauge                                              */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            System Uncertainty Level
          </CardTitle>
          <CardDescription>Average uncertainty across all buffer entries</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="space-y-3">
            {/* Gradient bar */}
            <div className="relative h-6 w-full rounded-full overflow-hidden">
              <div
                className="h-full w-full rounded-full"
                style={{
                  background: 'linear-gradient(to right, #22c55e, #84cc16, #f59e0b, #f97316, #ef4444)',
                }}
              />
              {/* Pointer */}
              <div
                className="absolute top-0 h-full flex flex-col items-center"
                style={{
                  left: `${Math.min(Math.max(avgUncertainty, 0), 60) / 60 * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="w-0.5 h-full bg-white dark:bg-gray-900 shadow-sm" />
              </div>
            </div>
            {/* Scale labels */}
            <div className="flex justify-between text-xs text-muted-foreground px-0.5">
              <span>0%</span>
              <span>15%</span>
              <span>30%</span>
              <span>45%</span>
              <span>60%+</span>
            </div>
            {/* Current value label */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-medium">
                Current Average: {avgUncertainty.toFixed(1)}%
              </span>
              <Badge
                variant="outline"
                className={
                  avgUncertainty < 15
                    ? 'border-green-300 text-green-700 dark:text-green-400 dark:border-green-700'
                    : avgUncertainty < 30
                      ? 'border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-700'
                      : avgUncertainty < 45
                        ? 'border-orange-300 text-orange-700 dark:text-orange-400 dark:border-orange-700'
                        : 'border-red-300 text-red-700 dark:text-red-400 dark:border-red-700'
                }
              >
                {avgUncertainty < 15 ? 'LOW' : avgUncertainty < 30 ? 'MEDIUM' : avgUncertainty < 45 ? 'HIGH' : 'VERY HIGH'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* 4 & 5. Charts Row                                                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Risk Category Breakdown — Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Category Breakdown</CardTitle>
            <CardDescription>Buffer allocation by risk category</CardDescription>
          </CardHeader>
          <CardContent>
            {riskCategoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No data available
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={riskCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {riskCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value.toLocaleString()} tCO2e`,
                        name,
                      ]}
                    />
                    <Legend
                      formatter={(value: string, entry) => {
                        const item = riskCategoryData.find((d) => d.name === value);
                        const total = riskCategoryData.reduce((s, d) => s + d.value, 0);
                        const pct = item && total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                        return `${value}: ${item?.value.toLocaleString() ?? 0} tCO2e (${pct}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Buffer Allocation by Project — Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buffer Allocation by Project</CardTitle>
            <CardDescription>Available vs buffered credits per project</CardDescription>
          </CardHeader>
          <CardContent>
            {projectBarData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={projectBarData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${v}`}
                    label={{ value: 'tCO2e', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} tCO2e`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="Available" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Buffered" fill="#64748b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 6. Risk Threshold Reference Panel                                 */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Risk Threshold Reference
          </CardTitle>
          <CardDescription>Governance-defined buffer deduction thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RISK_THRESHOLDS.map((threshold) => {
              const categoryAmount = summary?.byRiskCategory[threshold.category as keyof ByRiskCategory] ?? 0;
              const maxBuffer = 30; // VERY_HIGH is max
              return (
                <div
                  key={threshold.category}
                  className={`rounded-lg border p-4 ${threshold.bgColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-semibold ${threshold.textColor}`}>
                      {threshold.label}
                    </div>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: threshold.color,
                        color: threshold.color,
                      }}
                    >
                      {threshold.bufferPct}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Uncertainty {threshold.uncertaintyRange}
                    <ArrowRight className="inline h-3 w-3 mx-1" />
                    {threshold.bufferPct}% buffer deduction
                  </p>
                  <Progress
                    value={(threshold.bufferPct / maxBuffer) * 100}
                    className="h-2"
                    style={
                      {
                        '--tw-progress-color': threshold.color,
                      } as React.CSSProperties
                    }
                  />
                  {categoryAmount > 0 && (
                    <p className="text-xs mt-2 text-muted-foreground">
                      Allocated: {categoryAmount.toLocaleString()} tCO2e
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* 7. Entries Table                                                  */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Buffer Entries</CardTitle>
            <CardDescription>All buffer pool allocation records</CardDescription>
          </div>
          <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Unlock className="h-3.5 w-3.5" />
                Release Buffer
              </Button>
            </DialogTrigger>
            {/* 8. Release Buffer Dialog */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Release Buffer Credits</DialogTitle>
                <DialogDescription>
                  Select a held entry to release its buffer credits back to the project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="entry-select">Select Entry</Label>
                  <Select value={selectedEntryId} onValueChange={setSelectedEntryId}>
                    <SelectTrigger className="w-full" id="entry-select">
                      <SelectValue placeholder="Choose a held entry..." />
                    </SelectTrigger>
                    <SelectContent>
                      {heldEntries.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No held entries available
                        </SelectItem>
                      ) : (
                        heldEntries.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.project.name} - {entry.amount.toLocaleString()} tCO2e ({entry.credit.tokenId})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="release-reason">Reason for Release</Label>
                  <Textarea
                    id="release-reason"
                    placeholder="Explain why this buffer is being released..."
                    value={releaseReason}
                    onChange={(e) => setReleaseReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setReleaseDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleRelease} disabled={submitting || !selectedEntryId} className="gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Release
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No buffer entries found.
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Credit Token</TableHead>
                    <TableHead className="text-right">Amount (tCO2e)</TableHead>
                    <TableHead className="text-right">Uncertainty %</TableHead>
                    <TableHead className="text-right">Buffer %</TableHead>
                    <TableHead>Risk Category</TableHead>
                    <TableHead className="max-w-[200px]">Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{entry.project.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.project.province}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {entry.credit.tokenId}
                        </code>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{entry.uncertaintyPct}%</TableCell>
                      <TableCell className="text-right">{entry.bufferPct}%</TableCell>
                      <TableCell>
                        <RiskCategoryBadge category={entry.riskCategory} />
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground truncate" title={entry.reason}>
                          {entry.reason}
                        </p>
                      </TableCell>
                      <TableCell>
                        {entry.releasedAt ? (
                          <div className="flex flex-col gap-1">
                            <StatusBadge releasedAt={entry.releasedAt} />
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.releasedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <StatusBadge releasedAt={null} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
