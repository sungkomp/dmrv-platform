'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Flag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  ChevronRight,
  Plus,
  Filter,
  Clock,
  ArrowRightLeft,
  AlertOctagon,
  Upload,
  FileWarning,
  Crosshair,
  BarChart3,
  MessageSquare,
  ArrowUpRight,
  Eye,
  Gavel,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

type ConflictSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type ConflictStatus = 'FLAGGED' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
type ConflictType = 'DATA_MISMATCH' | 'THRESHOLD_EXCEEDED' | 'INTEGRITY_FAIL' | 'SPATIAL_MISMATCH';

interface DataSource {
  sourceType: string;
  sourceId: string;
  value: string;
  unit: string;
  timestamp: string;
}

interface ConflictCase {
  id: string;
  projectId: string;
  title: string;
  severity: ConflictSeverity;
  status: ConflictStatus;
  conflictType: ConflictType;
  sourceA: DataSource;
  sourceB: DataSource;
  projectName: string;
  projectProvince: string;
  createdAt: string;
  updatedAt: string;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  evidenceFiles: string[];
}

interface ConflictSummary {
  bySeverity: Record<ConflictSeverity, number>;
  byStatus: Record<ConflictStatus, number>;
  byConflictType: Record<ConflictType, number>;
  total: number;
}

interface ConflictData {
  cases: ConflictCase[];
  summary: ConflictSummary;
}

const severityColors: Record<ConflictSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-700 hover:bg-red-100',
  HIGH: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  MEDIUM: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  LOW: 'bg-green-100 text-green-700 hover:bg-green-100',
};

const severityDotColors: Record<ConflictSeverity, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-green-500',
};

const severityBarColors: Record<ConflictSeverity, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

const statusColors: Record<ConflictStatus, string> = {
  FLAGGED: 'border-red-300 text-red-700 bg-red-50 hover:bg-red-50',
  IN_REVIEW: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  RESOLVED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  ESCALATED: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const conflictTypeIcons: Record<ConflictType, React.ElementType> = {
  DATA_MISMATCH: ArrowRightLeft,
  THRESHOLD_EXCEEDED: AlertTriangle,
  INTEGRITY_FAIL: Shield,
  SPATIAL_MISMATCH: Crosshair,
};

const conflictTypeColors: Record<ConflictType, string> = {
  DATA_MISMATCH: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
  THRESHOLD_EXCEEDED: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  INTEGRITY_FAIL: 'bg-red-100 text-red-700 hover:bg-red-100',
  SPATIAL_MISMATCH: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

const MOCK_DATA: ConflictData = {
  cases: [
    {
      id: 'CON-001',
      projectId: 'PROJ-BIO-001',
      title: 'CH4 emission factor mismatch in biogas project',
      severity: 'CRITICAL',
      status: 'FLAGGED',
      conflictType: 'DATA_MISMATCH',
      sourceA: { sourceType: 'IoT Sensor', sourceId: 'SENSOR-BIO-042', value: '0.0234', unit: 'kg CH4/m3', timestamp: '2025-05-25T14:30:00Z' },
      sourceB: { sourceType: 'Manual Report', sourceId: 'MR-2025-089', value: '0.0312', unit: 'kg CH4/m3', timestamp: '2025-05-25T16:00:00Z' },
      projectName: 'Biogas Nakhon Pathom',
      projectProvince: 'Nakhon Pathom',
      createdAt: '2025-05-25T14:30:00Z',
      updatedAt: '2025-05-25T16:00:00Z',
      resolvedBy: null,
      resolutionNotes: null,
      evidenceFiles: [],
    },
    {
      id: 'CON-002',
      projectId: 'PROJ-SOL-002',
      title: 'Electricity generation exceeds capacity factor threshold',
      severity: 'HIGH',
      status: 'IN_REVIEW',
      conflictType: 'THRESHOLD_EXCEEDED',
      sourceA: { sourceType: 'Smart Meter', sourceId: 'SM-SOL-018', value: '5,847', unit: 'MWh/yr', timestamp: '2025-05-24T10:00:00Z' },
      sourceB: { sourceType: 'Design Spec', sourceId: 'DS-SOL-2024-003', value: '4,800', unit: 'MWh/yr (max)', timestamp: '2025-01-15T08:00:00Z' },
      projectName: 'Solar Farm Ubon Ratchathani',
      projectProvince: 'Ubon Ratchathani',
      createdAt: '2025-05-24T10:00:00Z',
      updatedAt: '2025-05-25T09:00:00Z',
      resolvedBy: null,
      resolutionNotes: null,
      evidenceFiles: [],
    },
    {
      id: 'CON-003',
      projectId: 'PROJ-RICE-003',
      title: 'Hash integrity failure in audit trail',
      severity: 'CRITICAL',
      status: 'ESCALATED',
      conflictType: 'INTEGRITY_FAIL',
      sourceA: { sourceType: 'Blockchain Record', sourceId: 'BC-AUDIT-001', value: '0x7f3a9b...', unit: 'hash', timestamp: '2025-05-20T08:00:00Z' },
      sourceB: { sourceType: 'Current Snapshot', sourceId: 'DB-SNAP-2025-05-20', value: '0x2e8c1d...', unit: 'hash', timestamp: '2025-05-20T12:00:00Z' },
      projectName: 'Rice AWD Chiang Rai',
      projectProvince: 'Chiang Rai',
      createdAt: '2025-05-20T12:00:00Z',
      updatedAt: '2025-05-23T14:00:00Z',
      resolvedBy: null,
      resolutionNotes: null,
      evidenceFiles: ['audit_trail_export.pdf'],
    },
    {
      id: 'CON-004',
      projectId: 'PROJ-REFO-004',
      title: 'GPS boundary coordinates overlap with neighboring project',
      severity: 'MEDIUM',
      status: 'FLAGGED',
      conflictType: 'SPATIAL_MISMATCH',
      sourceA: { sourceType: 'GPS Survey', sourceId: 'GPS-PROJ-005', value: '19.03N, 99.83E', unit: 'coordinates', timestamp: '2025-05-22T10:00:00Z' },
      sourceB: { sourceType: 'Satellite Analysis', sourceId: 'SAT-2025-05-22', value: '19.04N, 99.84E', unit: 'coordinates', timestamp: '2025-05-22T14:00:00Z' },
      projectName: 'Reforestation Kanchanaburi',
      projectProvince: 'Kanchanaburi',
      createdAt: '2025-05-22T10:00:00Z',
      updatedAt: '2025-05-22T14:00:00Z',
      resolvedBy: null,
      resolutionNotes: null,
      evidenceFiles: [],
    },
    {
      id: 'CON-005',
      projectId: 'PROJ-RICE-003',
      title: 'N2O emission rate below detection threshold',
      severity: 'LOW',
      status: 'RESOLVED',
      conflictType: 'THRESHOLD_EXCEEDED',
      sourceA: { sourceType: 'Lab Analysis', sourceId: 'LAB-2025-045', value: '0.0021', unit: 'kg N2O/ha', timestamp: '2025-05-18T10:00:00Z' },
      sourceB: { sourceType: 'IPCC Default', sourceId: 'IPCC-T3-CH11', value: '0.0100', unit: 'kg N2O/ha', timestamp: '2019-01-01T00:00:00Z' },
      projectName: 'Rice AWD Chiang Rai',
      projectProvince: 'Chiang Rai',
      createdAt: '2025-05-18T10:00:00Z',
      updatedAt: '2025-05-23T16:00:00Z',
      resolvedBy: 'Dr. Somchai P.',
      resolutionNotes: 'Lab measurement is more accurate than IPCC default. Verified with secondary lab test. Using project-specific measurement.',
      evidenceFiles: ['secondary_lab_results.pdf', 'ipcc_justification.docx'],
    },
    {
      id: 'CON-006',
      projectId: 'PROJ-BIOCHAR-006',
      title: 'Carbon content discrepancy in biochar production records',
      severity: 'HIGH',
      status: 'IN_REVIEW',
      conflictType: 'DATA_MISMATCH',
      sourceA: { sourceType: 'Production Log', sourceId: 'PL-BC-2025-012', value: '72.3', unit: '% carbon', timestamp: '2025-05-21T08:00:00Z' },
      sourceB: { sourceType: 'Lab Certificate', sourceId: 'LC-BIO-2025-007', value: '68.1', unit: '% carbon', timestamp: '2025-05-21T16:00:00Z' },
      projectName: 'Biochar Chachoengsao',
      projectProvince: 'Chachoengsao',
      createdAt: '2025-05-21T08:00:00Z',
      updatedAt: '2025-05-24T10:00:00Z',
      resolvedBy: null,
      resolutionNotes: null,
      evidenceFiles: ['production_batch_records.xlsx'],
    },
  ],
  summary: {
    bySeverity: {
      CRITICAL: 2,
      HIGH: 2,
      MEDIUM: 1,
      LOW: 1,
    },
    byStatus: {
      FLAGGED: 2,
      IN_REVIEW: 2,
      RESOLVED: 1,
      ESCALATED: 1,
    },
    byConflictType: {
      DATA_MISMATCH: 2,
      THRESHOLD_EXCEEDED: 2,
      INTEGRITY_FAIL: 1,
      SPATIAL_MISMATCH: 1,
    },
    total: 6,
  },
};

const PROJECTS = [
  'Rice AWD Chiang Rai',
  'Solar Farm Ubon Ratchathani',
  'Biogas Nakhon Pathom',
  'Blue Carbon Phang Nga',
  'Biochar Chachoengsao',
  'Reforestation Kanchanaburi',
];

export default function ConflictResolverView() {
  const { toast } = useToast();
  const [data, setData] = useState<ConflictData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCase, setSelectedCase] = useState<ConflictCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterConflictType, setFilterConflictType] = useState<string>('ALL');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvedByField, setResolvedByField] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newSeverity, setNewSeverity] = useState<ConflictSeverity>('HIGH');
  const [newConflictType, setNewConflictType] = useState<ConflictType>('DATA_MISMATCH');
  const [newSourceAType, setNewSourceAType] = useState('');
  const [newSourceAValue, setNewSourceAValue] = useState('');
  const [newSourceBType, setNewSourceBType] = useState('');
  const [newSourceBValue, setNewSourceBValue] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dmrv/conflict');
      if (!res.ok) throw new Error('Failed to fetch conflict data');
      const json = await res.json();
      setData(json as ConflictData);
    } catch {
      // Use mock data as fallback
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    await fetchData();
    toast({ title: 'Refreshed', description: 'Conflict resolver data updated' });
  };

  const handleCaseClick = (caseItem: ConflictCase) => {
    setSelectedCase(caseItem);
    setResolutionNotes(caseItem.resolutionNotes || '');
    setResolvedByField(caseItem.resolvedBy || '');
    setUploadedFiles(caseItem.evidenceFiles || []);
    setDetailOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedCase || !resolutionNotes.trim()) {
      toast({ title: 'Validation Error', description: 'Resolution notes are required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          caseId: selectedCase.id,
          projectId: selectedCase.projectId,
          resolution: resolutionNotes,
          resolvedBy: resolvedByField || 'เจ้าหน้าที่ตรวจสอบระบบ',
          evidenceUrl: uploadedFiles.length > 0 ? `https://evidence.dmrv-th.org/conflict/${selectedCase.id}/ground-truth` : '',
        }),
      });
      if (res.ok) {
        toast({ title: 'Case resolved', description: 'Conflict case has been resolved successfully' });
        setResolutionNotes('');
        setUploadedFiles([]);
        setSelectedCase(null);
        setDetailOpen(false);
        fetchData();
      } else {
        toast({ title: 'Error', description: 'Failed to resolve case', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedCase) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'escalate',
          caseId: selectedCase.id,
          projectId: selectedCase.projectId,
        }),
      });
      if (res.ok) {
        toast({ title: 'Case escalated', description: 'Conflict case has been escalated to CRITICAL severity', variant: 'destructive' });
        setSelectedCase(null);
        setDetailOpen(false);
        fetchData();
      } else {
        toast({ title: 'Error', description: 'Failed to escalate case', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestGroundTruth = async () => {
    if (!selectedCase) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'escalate',
          caseId: selectedCase.id,
          projectId: selectedCase.projectId,
        }),
      });
      if (res.ok) {
        toast({ title: 'Ground-truth requested', description: 'Field verification request has been sent. Case escalated for review.' });
        setSelectedCase(null);
        setDetailOpen(false);
        fetchData();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to request ground-truth', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      newFiles.push(files[i].name);
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    toast({ title: 'File(s) Uploaded', description: `${newFiles.length} file(s) attached to case` });
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateCase = async () => {
    if (!newTitle || !newProject || !newSourceAType || !newSourceAValue || !newSourceBType || !newSourceBValue) {
      toast({ title: 'Validation Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Find the projectId from the fetched data by matching project name
      const matchedCase = data?.cases.find((c) => c.projectName === newProject);
      const projectId = matchedCase?.projectId || '';
      const sourceAJson = JSON.stringify({
        sourceType: newSourceAType,
        sourceId: `SRC-A-${Date.now()}`,
        value: newSourceAValue,
        unit: 'N/A',
        timestamp: new Date().toISOString(),
      });
      const sourceBJson = JSON.stringify({
        sourceType: newSourceBType,
        sourceId: `SRC-B-${Date.now()}`,
        value: newSourceBValue,
        unit: 'N/A',
        timestamp: new Date().toISOString(),
      });
      const res = await fetch('/api/dmrv/conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId,
          title: newTitle,
          sourceA: sourceAJson,
          sourceB: sourceBJson,
          conflictType: newConflictType,
          severity: newSeverity,
        }),
      });
      if (res.ok) {
        setCreateOpen(false);
        resetCreateForm();
        fetchData();
        toast({ title: 'Case Created', description: 'New conflict case has been created' });
      } else {
        toast({ title: 'Error', description: 'Failed to create case', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewProject('');
    setNewSeverity('HIGH');
    setNewConflictType('DATA_MISMATCH');
    setNewSourceAType('');
    setNewSourceAValue('');
    setNewSourceBType('');
    setNewSourceBValue('');
  };

  const filteredCases = React.useMemo(() => {
    if (!data) return [];
    let cases = data.cases;

    if (activeTab === 'flagged') {
      cases = cases.filter((c) => c.status === 'FLAGGED');
    } else if (activeTab === 'in_review') {
      cases = cases.filter((c) => c.status === 'IN_REVIEW');
    } else if (activeTab === 'resolved') {
      cases = cases.filter((c) => c.status === 'RESOLVED');
    }

    if (filterSeverity !== 'ALL') {
      cases = cases.filter((c) => c.severity === filterSeverity);
    }
    if (filterConflictType !== 'ALL') {
      cases = cases.filter((c) => c.conflictType === filterConflictType);
    }

    return cases;
  }, [data, activeTab, filterSeverity, filterConflictType]);

  const severityTimelineData = React.useMemo(() => {
    if (!data) return [];
    return (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ConflictSeverity[]).map((sev) => ({
      name: sev,
      count: data.summary.bySeverity[sev] || 0,
      color: severityBarColors[sev],
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-48" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Failed to load conflict data.{' '}
            <Button variant="link" className="h-auto p-0 text-red-700 underline" onClick={handleRefresh}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = data?.summary || MOCK_DATA.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Conflict & Exception Resolver</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Human-in-the-Loop data conflict management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-red-600 hover:bg-red-700">
            <Plus className="h-3.5 w-3.5" />
            New Case
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <FileWarning className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cases</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <Flag className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold">{summary.byStatus.FLAGGED || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{summary.byStatus.RESOLVED || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertOctagon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold">{summary.bySeverity.CRITICAL || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Severity Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-red-600" />
            Cases by Severity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ConflictSeverity[]).map((sev) => (
              <div key={sev} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${severityDotColors[sev]}`} />
                <span className="text-xs font-medium">{sev}</span>
                <span className="text-xs text-muted-foreground">({summary.bySeverity[sev] || 0})</span>
              </div>
            ))}
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityTimelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {severityTimelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterConflictType} onValueChange={setFilterConflictType}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Conflict Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="DATA_MISMATCH">Data Mismatch</SelectItem>
            <SelectItem value="THRESHOLD_EXCEEDED">Threshold Exceeded</SelectItem>
            <SelectItem value="INTEGRITY_FAIL">Integrity Fail</SelectItem>
            <SelectItem value="SPATIAL_MISMATCH">Spatial Mismatch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Cases</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
          <TabsTrigger value="in_review">In Review</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredCases.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Flag className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No conflict cases found matching your filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCases.map((caseItem) => {
                const ConflictIcon = conflictTypeIcons[caseItem.conflictType];
                return (
                  <Card
                    key={caseItem.id}
                    className="cursor-pointer hover:border-red-300 hover:shadow-sm transition-all"
                    onClick={() => handleCaseClick(caseItem)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                        {/* Left: Case Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="secondary" className={`text-[10px] h-5 shrink-0 ${severityColors[caseItem.severity]}`}>
                                {caseItem.severity}
                              </Badge>
                              <h3 className="text-sm font-semibold truncate">{caseItem.title}</h3>
                            </div>
                            <Badge className={`text-[10px] h-5 shrink-0 ${statusColors[caseItem.status]}`}>
                              {caseItem.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mb-3">
                            <Badge variant="secondary" className={`text-[10px] h-5 ${conflictTypeColors[caseItem.conflictType]}`}>
                              <ConflictIcon className="h-3 w-3 mr-0.5" />
                              {caseItem.conflictType.replace('_', ' ')}
                            </Badge>
                          </div>

                          {/* Source Comparison */}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-semibold text-blue-700 uppercase">Source A</span>
                              </div>
                              <p className="text-xs font-medium text-slate-700">{caseItem.sourceA.sourceType}</p>
                              <p className="text-xs text-muted-foreground">ID: {caseItem.sourceA.sourceId}</p>
                              <p className="text-sm font-mono font-semibold mt-1">{caseItem.sourceA.value} <span className="text-xs text-muted-foreground font-sans">{caseItem.sourceA.unit}</span></p>
                              <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(caseItem.sourceA.timestamp)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="h-2 w-2 rounded-full bg-rose-500" />
                                <span className="text-[10px] font-semibold text-rose-700 uppercase">Source B</span>
                              </div>
                              <p className="text-xs font-medium text-slate-700">{caseItem.sourceB.sourceType}</p>
                              <p className="text-xs text-muted-foreground">ID: {caseItem.sourceB.sourceId}</p>
                              <p className="text-sm font-mono font-semibold mt-1">{caseItem.sourceB.value} <span className="text-xs text-muted-foreground font-sans">{caseItem.sourceB.unit}</span></p>
                              <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(caseItem.sourceB.timestamp)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                            <span className="font-medium">{caseItem.projectName}</span>
                            <span>({caseItem.projectProvince})</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(caseItem.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Right: Visual Indicator */}
                        <div className="flex flex-col items-center justify-center gap-1 shrink-0 lg:w-20">
                          {caseItem.conflictType === 'DATA_MISMATCH' || caseItem.conflictType === 'SPATIAL_MISMATCH' ? (
                            <>
                              <XCircle className="h-8 w-8 text-red-500" />
                              <span className="text-[10px] font-medium text-red-600">Mismatch</span>
                            </>
                          ) : caseItem.conflictType === 'THRESHOLD_EXCEEDED' ? (
                            <>
                              <AlertTriangle className="h-8 w-8 text-orange-500" />
                              <span className="text-[10px] font-medium text-orange-600">Threshold</span>
                            </>
                          ) : (
                            <>
                              <Shield className="h-8 w-8 text-red-600" />
                              <span className="text-[10px] font-medium text-red-700">Integrity</span>
                            </>
                          )}
                          <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 mt-1">
                            Details <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-600" />
              Case Details — {selectedCase?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedCase?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedCase && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6 pb-4">
                {/* Status & Severity Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`text-xs ${severityColors[selectedCase.severity]}`}>
                    {selectedCase.severity}
                  </Badge>
                  <Badge className={`text-xs ${statusColors[selectedCase.status]}`}>
                    {selectedCase.status.replace('_', ' ')}
                  </Badge>
                  {(() => {
                    const ConflictIcon = conflictTypeIcons[selectedCase.conflictType];
                    return (
                      <Badge className={`text-xs ${conflictTypeColors[selectedCase.conflictType]}`}>
                        <ConflictIcon className="h-3 w-3 mr-0.5" />
                        {selectedCase.conflictType.replace('_', ' ')}
                      </Badge>
                    );
                  })()}
                </div>

                {/* Project Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Project</p>
                      <p className="text-sm font-medium">{selectedCase.projectName}</p>
                      <p className="text-xs text-muted-foreground">{selectedCase.projectProvince}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Created: {formatRelativeTime(selectedCase.createdAt)}</span>
                        <span>Updated: {formatRelativeTime(selectedCase.updatedAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                      {selectedCase.resolvedBy ? (
                        <>
                          <p className="text-sm font-medium text-emerald-700">{selectedCase.resolvedBy}</p>
                          <p className="text-xs text-muted-foreground mt-1">{selectedCase.resolutionNotes}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Pending resolution</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Source Comparison Full */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-red-600" />
                      Source Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Source A</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-blue-500 uppercase">Type</span>
                            <p className="text-sm font-medium">{selectedCase.sourceA.sourceType}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-blue-500 uppercase">ID</span>
                            <p className="text-xs font-mono">{selectedCase.sourceA.sourceId}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-blue-500 uppercase">Value</span>
                            <p className="text-lg font-bold font-mono">{selectedCase.sourceA.value} <span className="text-xs font-sans font-normal text-muted-foreground">{selectedCase.sourceA.unit}</span></p>
                          </div>
                          <div>
                            <span className="text-[10px] text-blue-500 uppercase">Timestamp</span>
                            <p className="text-xs text-muted-foreground">{formatRelativeTime(selectedCase.sourceA.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-3 w-3 rounded-full bg-rose-500" />
                          <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">Source B</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-rose-500 uppercase">Type</span>
                            <p className="text-sm font-medium">{selectedCase.sourceB.sourceType}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-500 uppercase">ID</span>
                            <p className="text-xs font-mono">{selectedCase.sourceB.sourceId}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-500 uppercase">Value</span>
                            <p className="text-lg font-bold font-mono">{selectedCase.sourceB.value} <span className="text-xs font-sans font-normal text-muted-foreground">{selectedCase.sourceB.unit}</span></p>
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-500 uppercase">Timestamp</span>
                            <p className="text-xs text-muted-foreground">{formatRelativeTime(selectedCase.sourceB.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Evidence Files */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Upload className="h-4 w-4 text-emerald-600" />
                      Evidence Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {uploadedFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {uploadedFiles.map((file, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs h-6 gap-1 bg-slate-100">
                            <FileWarning className="h-3 w-3" />
                            {file}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No evidence files attached</p>
                    )}
                    <div className="mt-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        multiple
                        className="hidden"
                        accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Evidence
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Resolution Actions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-emerald-600" />
                      Resolution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Resolved By</Label>
                      <Input
                        value={resolvedByField}
                        onChange={(e) => setResolvedByField(e.target.value)}
                        placeholder="Enter reviewer name..."
                        disabled={selectedCase.status === 'RESOLVED'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Resolution Notes</Label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Describe how this conflict was resolved..."
                        rows={4}
                        className="text-sm"
                        disabled={selectedCase.status === 'RESOLVED'}
                      />
                    </div>
                    {selectedCase.status !== 'RESOLVED' && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                          disabled={isSubmitting}
                          onClick={handleResolve}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5"
                          disabled={isSubmitting}
                          onClick={handleEscalate}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Escalate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
                          disabled={isSubmitting}
                          onClick={handleRequestGroundTruth}
                        >
                          <Crosshair className="h-3.5 w-3.5" />
                          Request Ground-Truth
                        </Button>
                      </div>
                    )}
                    {selectedCase.status === 'RESOLVED' && (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                        This case has been resolved by {selectedCase.resolvedBy}.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Case Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-red-600" />
              Create Conflict Case
            </DialogTitle>
            <DialogDescription>Manually create a new data conflict case</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Describe the conflict..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={newProject} onValueChange={setNewProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECTS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={newSeverity} onValueChange={(v) => setNewSeverity(v as ConflictSeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conflict Type</Label>
              <Select value={newConflictType} onValueChange={(v) => setNewConflictType(v as ConflictType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DATA_MISMATCH">Data Mismatch</SelectItem>
                  <SelectItem value="THRESHOLD_EXCEEDED">Threshold Exceeded</SelectItem>
                  <SelectItem value="INTEGRITY_FAIL">Integrity Fail</SelectItem>
                  <SelectItem value="SPATIAL_MISMATCH">Spatial Mismatch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-blue-700">Source A Type</Label>
                <Input
                  value={newSourceAType}
                  onChange={(e) => setNewSourceAType(e.target.value)}
                  placeholder="e.g., IoT Sensor"
                />
                <Label className="text-blue-700">Source A Value</Label>
                <Input
                  value={newSourceAValue}
                  onChange={(e) => setNewSourceAValue(e.target.value)}
                  placeholder="e.g., 0.0234"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-rose-700">Source B Type</Label>
                <Input
                  value={newSourceBType}
                  onChange={(e) => setNewSourceBType(e.target.value)}
                  placeholder="e.g., Manual Report"
                />
                <Label className="text-rose-700">Source B Value</Label>
                <Input
                  value={newSourceBValue}
                  onChange={(e) => setNewSourceBValue(e.target.value)}
                  placeholder="e.g., 0.0312"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 gap-1.5"
                disabled={isSubmitting}
                onClick={handleCreateCase}
              >
                {isSubmitting ? 'Creating...' : <><Plus className="h-3.5 w-3.5" /> Create Case</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
