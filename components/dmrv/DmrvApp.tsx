'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Workflow,
  Upload,
  Shield,
  Leaf,
  FileCheck,
  CheckCircle,
  Activity,
  FileText,
  ShoppingCart,
  Truck,
  Scale,
  ClipboardList,
  Search,
  Footprints,
  FlaskConical,
  Map as MapIcon,
  Menu,
  Bell,
  CircleDot,
  ChevronLeft,
  AlertTriangle,
  XCircle,
  Info,
  RefreshCw,
  ShieldCheck,
  Flag,
  Radio,
  Database,
  Server,
  Landmark,
  BookOpen,
  Terminal,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// Lazy-load all view components to reduce initial bundle size and improve server stability
const DashboardView = React.lazy(() => import('./DashboardView'));
const MapDashboardView = React.lazy(() => import('./MapDashboardView'));
const OrchestratorView = React.lazy(() => import('./OrchestratorView'));
const IngestionView = React.lazy(() => import('./IngestionView'));
const AuthView = React.lazy(() => import('./AuthView'));
const CarbonView = React.lazy(() => import('./CarbonView'));
const CertificationView = React.lazy(() => import('./CertificationView'));
const VerificationView = React.lazy(() => import('./VerificationView'));
const MonitoringView = React.lazy(() => import('./MonitoringView'));
const ReportingView = React.lazy(() => import('./ReportingView'));
const MarketplaceView = React.lazy(() => import('./MarketplaceView'));
const LogisticsView = React.lazy(() => import('./LogisticsView'));
const GovernanceView = React.lazy(() => import('./GovernanceView'));
const SubmissionView = React.lazy(() => import('./SubmissionView'));
const AuditView = React.lazy(() => import('./AuditView'));
const FootprintView = React.lazy(() => import('./FootprintView'));
const SimulationView = React.lazy(() => import('./SimulationView'));
const VVBWorkspaceView = React.lazy(() => import('./VVBWorkspaceView'));
const ConflictResolverView = React.lazy(() => import('./ConflictResolverView'));
const PublicRegistryView = React.lazy(() => import('./PublicRegistryView'));
const DeviceManagementView = React.lazy(() => import('./DeviceManagementView'));
const BufferPoolView = React.lazy(() => import('./BufferPoolView'));
const ForwardContractsView = React.lazy(() => import('./ForwardContractsView'));
const DevApiPortalView = React.lazy(() => import('./DevApiPortalView'));
const MethodologyStudioView = React.lazy(() => import('./MethodologyStudioView'));
const CrossChainBridgeView = React.lazy(() => import('./CrossChainBridgeView'));
import { ErrorBoundary } from './ErrorBoundary';

type ModuleKey =
  | 'dashboard'
  | 'map'
  | 'orchestrator'
  | 'ingestion'
  | 'auth'
  | 'carbon'
  | 'certification'
  | 'verification'
  | 'monitoring'
  | 'reporting'
  | 'marketplace'
  | 'logistics'
  | 'governance'
  | 'submission'
  | 'audit'
  | 'footprint'
  | 'simulation'
  | 'vvb'
  | 'conflict'
  | 'registry'
  | 'devices'
  | 'buffer'
  | 'forward'
  | 'devportal'
  | 'methodology'
  | 'bridge';

interface MenuItem {
  key: ModuleKey;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  section?: string; // Section header for grouping
}

interface Notification {
  id: string;
  severity: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface SystemStatus {
  status: string;
  projects: { total: number; active: number };
  credits: { total: number; available: number };
  alerts: { total: number; unresolved: number; critical: number; warning: number };
}

const menuItems: MenuItem[] = [
  // Core Operations
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'CORE' },
  { key: 'map', label: 'Map Dashboard', icon: MapIcon },
  { key: 'orchestrator', label: 'Orchestrator', icon: Workflow },
  { key: 'ingestion', label: 'Ingestion', icon: Upload },
  { key: 'auth', label: 'Auth & RBAC', icon: Shield },

  // Carbon Management
  { key: 'carbon', label: 'Carbon', icon: Leaf, section: 'CARBON' },
  { key: 'certification', label: 'Certification', icon: FileCheck },
  { key: 'verification', label: 'Verification', icon: CheckCircle },
  { key: 'monitoring', label: 'Monitoring', icon: Activity },
  { key: 'reporting', label: 'Reporting', icon: FileText },

  // Market & Operations
  { key: 'marketplace', label: 'Marketplace', icon: ShoppingCart, section: 'OPERATIONS' },
  { key: 'logistics', label: 'Logistics', icon: Truck },
  { key: 'governance', label: 'Governance', icon: Scale },
  { key: 'submission', label: 'Submission', icon: ClipboardList },
  { key: 'audit', label: 'Audit', icon: Search },

  // Analysis
  { key: 'footprint', label: 'Footprint', icon: Footprints, section: 'ANALYSIS' },
  { key: 'simulation', label: 'Simulation', icon: FlaskConical },

  // Enterprise: Verification & Validation
  { key: 'vvb', label: 'VVB Workspace', icon: ShieldCheck, section: 'ENTERPRISE' },
  { key: 'conflict', label: 'Conflict Resolver', icon: Flag },

  // Enterprise: Trust & Transparency
  { key: 'registry', label: 'Public Registry', icon: Database },
  { key: 'devices', label: 'Device & Oracle', icon: Radio },

  // Enterprise: Finance & Risk
  { key: 'buffer', label: 'Buffer Pool', icon: Landmark },
  { key: 'forward', label: 'Forward Contracts', icon: Server },

  // Enterprise: AI & Intelligence
  { key: 'methodology', label: 'AI Methodology Studio', icon: BookOpen, section: 'AI & INTELLIGENCE' },

  // Enterprise: Integration & Bridge
  { key: 'bridge', label: 'Cross-Chain Bridge', icon: Layers, section: 'INTEGRATION' },
  { key: 'devportal', label: 'Developer API', icon: Terminal },
];

const moduleComponents: Record<ModuleKey, React.ComponentType> = {
  dashboard: DashboardView,
  map: MapDashboardView,
  orchestrator: OrchestratorView,
  ingestion: IngestionView,
  auth: AuthView,
  carbon: CarbonView,
  certification: CertificationView,
  verification: VerificationView,
  monitoring: MonitoringView,
  reporting: ReportingView,
  marketplace: MarketplaceView,
  logistics: LogisticsView,
  governance: GovernanceView,
  submission: SubmissionView,
  audit: AuditView,
  footprint: FootprintView,
  simulation: SimulationView,
  vvb: VVBWorkspaceView,
  conflict: ConflictResolverView,
  registry: PublicRegistryView,
  devices: DeviceManagementView,
  buffer: BufferPoolView,
  forward: ForwardContractsView,
  devportal: DevApiPortalView,
  methodology: MethodologyStudioView,
  bridge: CrossChainBridgeView,
};

interface SidebarContentProps {
  collapsed?: boolean;
  activeModule: ModuleKey;
  onModuleChange: (key: ModuleKey) => void;
  menuItemsWithBadges?: MenuItem[];
}

function SidebarContent({ collapsed = false, activeModule, onModuleChange, menuItemsWithBadges }: SidebarContentProps) {
  const items = menuItemsWithBadges || menuItems;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  // Pre-compute which items should show section headers
  const itemsWithSections = items.map((item, idx) => {
    const prevItem = idx > 0 ? items[idx - 1] : null;
    const showSection = item.section && (!prevItem || prevItem.section !== item.section);
    return { ...item, showSection };
  });

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      setCanScrollUp(el.scrollTop > 4);
      setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, collapsed]);

  // Auto-scroll to active item when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const activeBtn = el.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      checkScroll();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeModule, checkScroll]);

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
          dM
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold tracking-tight">dMRV Platform</span>
            <span className="text-[11px] text-slate-400">Enterprise v4.0</span>
          </div>
        )}
      </div>

      {/* Scroll indicator top */}
      {canScrollUp && (
        <div className="relative h-0 z-10">
          <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-slate-900 to-transparent pointer-events-none" />
        </div>
      )}

      {/* Navigation */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex-1 px-2 py-3 overflow-y-auto sidebar-scroll"
      >
        <nav className="flex flex-col gap-0.5">
          {itemsWithSections.map((item) => {
            const isActive = activeModule === item.key;
            const Icon = item.icon;

            return (
              <React.Fragment key={item.key}>
                {item.showSection && !collapsed && (
                  <div className="pt-3 pb-1 px-3">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.section}</span>
                  </div>
                )}
                {item.showSection && collapsed && (
                  <div className="pt-2 pb-1 mx-2">
                    <div className="border-t border-slate-700/50" />
                  </div>
                )}
                <button
                  data-active={isActive}
                  onClick={() => onModuleChange(item.key)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <Badge className={`ml-auto h-5 min-w-[20px] justify-center text-[10px] text-white ${item.badgeColor || 'bg-emerald-600 hover:bg-emerald-600'}`}>
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {isActive && !collapsed && !item.badge && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Scroll indicator bottom */}
      {canScrollDown && !collapsed && (
        <div className="relative h-0 z-10 -mt-6">
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent pointer-events-none flex items-end justify-center pb-1">
            <span className="text-[9px] text-slate-500 flex items-center gap-1">
              <ChevronLeft className="h-3 w-3 rotate-90" />
              Scroll for more
              <ChevronLeft className="h-3 w-3 -rotate-90" />
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-slate-700/50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CircleDot className="h-3 w-3 text-emerald-500" />
            <span>System Online</span>
            <span className="ml-auto">v4.0.0</span>
          </div>
        </div>
      )}
    </div>
  );
}

const severityIcons: Record<string, React.ElementType> = {
  CRITICAL: XCircle,
  WARNING: AlertTriangle,
  INFO: Info,
};

const severityColors: Record<string, string> = {
  CRITICAL: 'text-red-500',
  WARNING: 'text-amber-500',
  INFO: 'text-slate-400',
};

export default function DmrvApp() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [itemsWithBadges, setItemsWithBadges] = useState<MenuItem[]>(menuItems);

  const ActiveComponent = moduleComponents[activeModule];

  const activeItem = menuItems.find((item) => item.key === activeModule);
  const unresolvedCount = notifications.filter((n) => !n.resolved).length;

  const fetchSystemData = useCallback(async () => {
    try {
      const [monitoringRes, submissionRes, certificationRes, conflictRes] = await Promise.all([
        fetch('/api/dmrv/monitoring'),
        fetch('/api/dmrv/submission'),
        fetch('/api/dmrv/certification'),
        fetch('/api/dmrv/conflict'),
      ]);

      if (monitoringRes.ok) {
        const monitoringData = await monitoringRes.json();
        const health = monitoringData.health as SystemStatus;
        setSystemStatus(health);
        setNotifications(
          (monitoringData.alerts || []).map((a: { id: string; severity: string; message: string; timestamp: string; resolved: boolean }) => ({
            id: a.id,
            severity: a.severity,
            message: a.message,
            timestamp: a.timestamp,
            resolved: a.resolved,
          }))
        );

        const badges: Partial<Record<ModuleKey, { badge: string; badgeColor: string }>> = {};

        if (health?.alerts?.unresolved > 0) {
          badges.monitoring = { badge: String(health.alerts.unresolved), badgeColor: health.alerts.critical > 0 ? 'bg-red-600 hover:bg-red-600' : 'bg-amber-600 hover:bg-amber-600' };
        }

        setItemsWithBadges(
          menuItems.map((item) => ({
            ...item,
            badge: badges[item.key]?.badge,
            badgeColor: badges[item.key]?.badgeColor,
          }))
        );
      }

      if (submissionRes.ok) {
        const subData = await submissionRes.json();
        const pendingSubs = subData.summary?.readyForVerification || 0;
        if (pendingSubs > 0) {
          setItemsWithBadges((prev) =>
            prev.map((item) =>
              item.key === 'submission'
                ? { ...item, badge: String(pendingSubs), badgeColor: 'bg-amber-600 hover:bg-amber-600' }
                : item
            )
          );
        }
      }

      if (certificationRes.ok) {
        const certData = await certificationRes.json();
        const pendingCerts = certData.summary?.submitted || 0;
        if (pendingCerts > 0) {
          setItemsWithBadges((prev) =>
            prev.map((item) =>
              item.key === 'certification'
                ? { ...item, badge: String(pendingCerts), badgeColor: 'bg-teal-600 hover:bg-teal-600' }
                : item
            )
          );
        }
      }

      if (conflictRes.ok) {
        const conflictData = await conflictRes.json();
        const flaggedCases = conflictData.summary?.byStatus?.FLAGGED || 0;
        const criticalCases = conflictData.summary?.bySeverity?.CRITICAL || 0;
        const totalOpen = flaggedCases + (conflictData.summary?.byStatus?.IN_REVIEW || 0);
        if (totalOpen > 0) {
          setItemsWithBadges((prev) =>
            prev.map((item) =>
              item.key === 'conflict'
                ? { ...item, badge: String(totalOpen), badgeColor: criticalCases > 0 ? 'bg-red-600 hover:bg-red-600' : 'bg-amber-600 hover:bg-amber-600' }
                : item
            )
          );
        }
      }
    } catch {
      // Silently fail - the shell should still work
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) await fetchSystemData();
    };
    load();
    const interval = setInterval(() => {
      if (!cancelled) fetchSystemData();
    }, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [fetchSystemData]);

  const handleModuleChange = (key: ModuleKey) => {
    setActiveModule(key);
    setMobileOpen(false);
  };

  const systemStatusLabel = systemStatus?.status === 'HEALTHY'
    ? 'System Healthy'
    : systemStatus?.status === 'WARNING'
    ? 'Warnings Active'
    : systemStatus?.status === 'CRITICAL'
    ? 'Critical Alert'
    : 'Loading...';

  const statusDotColor = systemStatus?.status === 'HEALTHY'
    ? 'bg-emerald-500'
    : systemStatus?.status === 'WARNING'
    ? 'bg-amber-500'
    : systemStatus?.status === 'CRITICAL'
    ? 'bg-red-500'
    : 'bg-slate-400';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white px-4 shadow-sm lg:px-6">
        {/* Mobile menu trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent activeModule={activeModule} onModuleChange={handleModuleChange} menuItemsWithBadges={itemsWithBadges} />
          </SheetContent>
        </Sheet>

        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-2">
          {activeItem && (
            <>
              <activeItem.icon className="h-5 w-5 text-emerald-600" />
              <h1 className="text-base font-semibold text-gray-900">{activeItem.label}</h1>
              {activeItem.section === 'ENTERPRISE' && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] h-4 ml-1">ENT</Badge>
              )}
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Status Indicators */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              systemStatus?.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700' :
              systemStatus?.status === 'WARNING' ? 'bg-amber-50 text-amber-700' :
              systemStatus?.status === 'CRITICAL' ? 'bg-red-50 text-red-700' :
              'bg-slate-50 text-slate-500'
            }`}>
              <div className={`h-1.5 w-1.5 rounded-full ${statusDotColor} animate-pulse`} />
              <span>{systemStatusLabel}</span>
              {systemStatus && (
                <span className="text-[10px] opacity-70">
                  ({systemStatus.projects.active} proj)
                </span>
              )}
            </div>
          </div>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Notification Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unresolvedCount > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full text-[9px] text-white flex items-center justify-center font-bold ${
                    notifications.some((n) => n.severity === 'CRITICAL' && !n.resolved) ? 'bg-red-500' : 'bg-amber-500'
                  }`}>
                    {unresolvedCount > 9 ? '9+' : unresolvedCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h4 className="text-sm font-semibold">Notifications</h4>
                <Button variant="ghost" size="sm" onClick={fetchSystemData} className="h-7 gap-1 text-xs">
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
              </div>
              <ScrollArea className="max-h-80">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  <div className="px-4">
                    {notifications.slice(0, 10).map((notif, idx) => {
                      const Icon = severityIcons[notif.severity] || Info;
                      return (
                        <React.Fragment key={notif.id}>
                          <div className={`flex items-start gap-3 py-3 ${notif.resolved ? 'opacity-50' : ''}`}>
                            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${severityColors[notif.severity] || 'text-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs leading-relaxed">{notif.message}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className={`text-[9px] h-4 ${
                                  notif.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                                  notif.severity === 'WARNING' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                                  'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                }`}>
                                  {notif.severity}
                                </Badge>
                                {notif.resolved && (
                                  <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-50">
                                    RESOLVED
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {idx < Math.min(notifications.length, 10) - 1 && <Separator />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              {unresolvedCount > 0 && (
                <div className="border-t px-4 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs gap-1"
                    onClick={() => handleModuleChange('monitoring')}
                  >
                    <Activity className="h-3 w-3" />
                    View All Alerts in Monitoring
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            AD
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200 transition-all duration-200 ${
            sidebarCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          <SidebarContent collapsed={sidebarCollapsed} activeModule={activeModule} onModuleChange={handleModuleChange} menuItemsWithBadges={itemsWithBadges} />
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center py-2 text-slate-400 hover:text-white bg-slate-900 border-t border-slate-700/50 transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 ${activeModule === 'map' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`${activeModule === 'map' ? 'h-full p-0' : 'p-4 lg:p-6 max-w-7xl mx-auto'}`}>
            <ErrorBoundary key={activeModule}>
              <React.Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading module...</span>
                  </div>
                </div>
              }>
                <ActiveComponent />
              </React.Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
