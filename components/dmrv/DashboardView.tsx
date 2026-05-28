'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Leaf,
  FolderKanban,
  Award,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Workflow,
  PlusCircle,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  AlertCircle,
  Layers,
  TreePine,
  Sun,
  Flame,
  Droplets,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectMap, { MapProject, MapPlot } from './ProjectMap';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalAreaHa: number;
  totalCredits: number;
  totalCertificates: number;
  totalPlots: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
  methodology: string;
  areaHa: number;
  location: string;
  plots: Array<{
    id: string;
    plotId: string;
    coordinates: string;
    ownerInfo: string;
    trackType: string;
    status: string;
  }>;
  credits: Array<{ amount: number; status: string }>;
  certificates: Array<{ id: string }>;
}

interface HealthMetrics {
  status: string;
  uptime: string;
  lastChecked: string;
  projects: { total: number; active: number };
  credits: { total: number; available: number };
  certificates: { total: number; approved: number; pending: number };
  alerts: { total: number; unresolved: number; critical: number; warning: number };
  activity: { auditLogsLast24h: number; errorsLast24h: number };
}

interface AuditLogEntry {
  id: string;
  agentName: string;
  action: string;
  projectId: string | null;
  details: string;
  severity: string;
  timestamp: string;
}

interface ActivityItem {
  id: string;
  action: string;
  module: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info' | 'error';
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function StatCard({ title, value, change, trend, icon: Icon, iconBg, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <div className="flex items-center gap-1 text-xs">
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={trend === 'up' ? 'text-emerald-600' : 'text-red-500'}>{change}</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

const statusIcon = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: AlertTriangle,
};

const statusColor = {
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  info: 'text-slate-500',
  error: 'text-red-600',
};

const badgeVariant = {
  success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
  warning: 'bg-amber-50 text-amber-700 hover:bg-amber-50',
  info: 'bg-slate-50 text-slate-700 hover:bg-slate-50',
  error: 'bg-red-50 text-red-700 hover:bg-red-50',
};

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHrs < 24) return `${diffHrs} hr ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function severityToStatus(severity: string): 'success' | 'warning' | 'info' | 'error' {
  switch (severity) {
    case 'INFO': return 'info';
    case 'WARNING': return 'warning';
    case 'ERROR': return 'error';
    case 'CRITICAL': return 'error';
    default: return 'success';
  }
}

// Convert raw project data to MapProject format
function toMapProjects(projects: Project[]): MapProject[] {
  return projects.map((project) => {
    // Collect all plot coordinates to find center
    const allCoords: [number, number][] = [];
    const mapPlots: MapPlot[] = project.plots.map((plot) => {
      let coords: [number, number][] = [];
      try {
        const parsed = JSON.parse(plot.coordinates);
        if (Array.isArray(parsed)) {
          coords = parsed.map((c: number[]) => [c[0], c[1]] as [number, number]);
          allCoords.push(...coords);
        }
      } catch {
        // ignore parse errors
      }
      return {
        id: plot.id,
        plotId: plot.plotId,
        coordinates: coords,
        trackType: plot.trackType,
        status: plot.status,
        ownerInfo: plot.ownerInfo,
        projectId: project.id,
        projectName: project.name,
        credits: project.credits.reduce((s, c) => s + c.amount, 0),
        certificates: project.certificates.length,
      };
    });

    // Calculate center from coordinates or use location-based defaults
    let center: [number, number] = [13.75, 100.5]; // Default: Bangkok
    if (allCoords.length > 0) {
      const avgLat = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length;
      const avgLon = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length;
      center = [avgLat, avgLon];
    } else if (project.location.includes('สมุทรสาคร')) {
      center = [13.55, 100.27];
    } else if (project.location.includes('ลพบุรี')) {
      center = [14.80, 100.65];
    } else if (project.location.includes('นครราชสีมา')) {
      center = [14.97, 102.08];
    }

    return {
      id: project.id,
      name: project.name,
      methodology: project.methodology,
      status: project.status,
      areaHa: project.areaHa,
      location: project.location,
      center,
      plots: mapPlots,
      totalCredits: project.credits.reduce((s, c) => s + c.amount, 0),
      totalCertificates: project.certificates.length,
    };
  });
}

const trackTypeIcons: Record<string, React.ElementType> = {
  forest: TreePine,
  biochar: Flame,
  awd: Droplets,
  biogas: Zap,
  solar: Sun,
};

const trackTypeColors2: Record<string, string> = {
  forest: 'bg-emerald-50 text-emerald-700',
  biochar: 'bg-amber-50 text-amber-700',
  awd: 'bg-blue-50 text-blue-700',
  biogas: 'bg-purple-50 text-purple-700',
  solar: 'bg-red-50 text-red-700',
};

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [mapProjects, setMapProjects] = useState<MapProject[]>([]);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, monitoringRes] = await Promise.all([
        fetch('/api/dmrv'),
        fetch('/api/dmrv/monitoring'),
      ]);

      if (!statsRes.ok) throw new Error('Failed to fetch project data');
      const statsData = await statsRes.json();
      setStats(statsData.stats);
      const rawProjects: Project[] = statsData.projects || [];
      setProjects(rawProjects);
      setMapProjects(toMapProjects(rawProjects));

      if (monitoringRes.ok) {
        const monitoringData = await monitoringRes.json();
        setHealth(monitoringData.health);

        const auditLogs: AuditLogEntry[] = monitoringData.recentAuditLogs || [];
        const activityItems: ActivityItem[] = auditLogs.slice(0, 10).map((log) => ({
          id: log.id,
          action: `${log.agentName}: ${log.action.replace(/_/g, ' ')}`,
          module: log.agentName.replace(/Agent$/, ''),
          timestamp: formatTimestamp(log.timestamp),
          status: severityToStatus(log.severity),
        }));
        setActivity(activityItems);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statCards: StatCardProps[] = stats
    ? [
        {
          title: 'Total Projects',
          value: String(stats.totalProjects),
          change: `+${stats.activeProjects} active`,
          trend: 'up',
          icon: FolderKanban,
          iconBg: 'bg-emerald-50',
          iconColor: 'text-emerald-600',
        },
        {
          title: 'Total Credits (tCO2e)',
          value: stats.totalCredits.toLocaleString(),
          change: health ? `${health.credits.available.toLocaleString()} available` : 'Loading...',
          trend: 'up',
          icon: Leaf,
          iconBg: 'bg-green-50',
          iconColor: 'text-green-600',
        },
        {
          title: 'Active Plots',
          value: stats.totalPlots.toLocaleString(),
          change: `${stats.totalAreaHa.toLocaleString()} ha total`,
          trend: 'up',
          icon: MapPin,
          iconBg: 'bg-teal-50',
          iconColor: 'text-teal-600',
        },
        {
          title: 'Certificates',
          value: String(stats.totalCertificates),
          change: health ? `${health.certificates.pending} pending` : 'Loading...',
          trend: health && health.certificates.pending > 0 ? 'down' : 'up',
          icon: Award,
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-600',
        },
      ]
    : [];

  // Compute track type summary from all projects
  const trackTypeSummary: Record<string, { count: number; area: number; credits: number }> = {};
  projects.forEach((p) => {
    p.plots.forEach((plot) => {
      const t = plot.trackType || 'unknown';
      if (!trackTypeSummary[t]) {
        trackTypeSummary[t] = { count: 0, area: 0, credits: 0 };
      }
      trackTypeSummary[t].count++;
      trackTypeSummary[t].area += p.areaHa / p.plots.length;
      trackTypeSummary[t].credits += p.credits.reduce((s, c) => s + c.amount, 0) / p.plots.length;
    });
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor your dMRV carbon credit platform at a glance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}. Click Refresh to try again.</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          statCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))
        )}
      </div>

      {/* Interactive Map */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                Project & Plot Map
              </CardTitle>
              <CardDescription>Geographic overview of all dMRV projects and registered plots in Thailand</CardDescription>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {Object.entries(trackTypeSummary).map(([type, data]) => {
                const Icon = trackTypeIcons[type] || MapPin;
                const colorClass = trackTypeColors2[type] || 'bg-slate-50 text-slate-700';
                return (
                  <Badge key={type} variant="secondary" className={`text-[10px] h-6 gap-1 ${colorClass}`}>
                    <Icon className="h-3 w-3" />
                    {type} ({data.count})
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[450px] lg:h-[500px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ProjectMap projects={mapProjects} loading={loading} />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Audit log from across all modules</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="px-6">
                {loading ? (
                  <div className="space-y-4 py-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activity.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No recent activity found
                  </div>
                ) : (
                  activity.map((item, idx) => {
                    const StatusIcon = statusIcon[item.status];
                    return (
                      <React.Fragment key={item.id}>
                        <div className="flex items-start gap-3 py-3">
                          <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${statusColor[item.status]}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug">{item.action}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={`text-[10px] h-5 ${badgeVariant[item.status]}`}>
                                {item.module}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.timestamp}
                              </span>
                            </div>
                          </div>
                        </div>
                        {idx < activity.length - 1 && <Separator />}
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Actions + System Status + Project Summary */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700" size="sm">
                <Workflow className="h-4 w-4" />
                Run Workflow
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <PlusCircle className="h-4 w-4" />
                New Project
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <FileCheck className="h-4 w-4" />
                Submit for Certification
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <Leaf className="h-4 w-4" />
                Calculate Carbon
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Platform Status</span>
                    <Badge
                      variant="secondary"
                      className={
                        health?.status === 'HEALTHY'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                          : health?.status === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-50'
                            : 'bg-red-50 text-red-700 hover:bg-red-50'
                      }
                    >
                      {health?.status || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Platform Uptime</span>
                    <span className="font-medium text-emerald-600">{health?.uptime || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Projects</span>
                    <span className="font-medium">{health?.projects.active ?? '—'} / {health?.projects.total ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Audit Logs (24h)</span>
                    <span className="font-medium">{health?.activity.auditLogsLast24h ?? '—'}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending Certificates</span>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                      {health?.certificates.pending ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Open Alerts</span>
                    <Badge
                      variant="secondary"
                      className={
                        (health?.alerts.unresolved ?? 0) > 0
                          ? 'bg-red-50 text-red-700 hover:bg-red-50'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                      }
                    >
                      {health?.alerts.unresolved ?? 0}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Project Summary by Track Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projects by Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  ))}
                </div>
              ) : Object.entries(trackTypeSummary).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No plots registered</p>
              ) : (
                Object.entries(trackTypeSummary).map(([type, data]) => {
                  const Icon = trackTypeIcons[type] || MapPin;
                  const colorClass = trackTypeColors2[type] || 'bg-slate-50 text-slate-700';
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${colorClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{type}</p>
                          <p className="text-[10px] text-muted-foreground">{Math.round(data.area).toLocaleString()} ha</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{data.count}</p>
                        <p className="text-[10px] text-muted-foreground">plots</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
