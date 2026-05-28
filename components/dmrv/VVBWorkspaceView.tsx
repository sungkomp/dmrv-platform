'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Plus,
  Filter,
  FileText,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  Eye,
  Users,
  Building2,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

type ReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'REQUESTED_INFO';
type ReviewType = 'VALIDATION' | 'VERIFICATION' | 'PERIODIC_VERIFICATION';
type Recommendation = 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'PENDING';

interface EvidenceRef {
  id: string;
  name: string;
  type: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  submittedAt: string;
}

interface Finding {
  completeness: number;
  accuracy: number;
  consistency: number;
}

interface Review {
  id: string;
  projectId?: string;
  reviewerOrg: string;
  reviewerName: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  projectName: string;
  projectProvince: string;
  evidenceCount: number;
  evidenceRefs: EvidenceRef[];
  findings: Finding;
  recommendation: Recommendation;
  createdAt: string;
  updatedAt: string;
  comments: string;
}

interface VVBSummary {
  byStatus: Record<ReviewStatus, number>;
  byReviewType: Record<ReviewType, number>;
  total: number;
}

interface VVBData {
  reviews: Review[];
  summary: VVBSummary;
}

const statusColors: Record<ReviewStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  APPROVED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  REJECTED: 'bg-red-100 text-red-700 hover:bg-red-100',
  REQUESTED_INFO: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
};

const statusIcons: Record<ReviewStatus, React.ElementType> = {
  PENDING: Clock,
  IN_PROGRESS: Eye,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  REQUESTED_INFO: AlertCircle,
};

const reviewTypeColors: Record<ReviewType, string> = {
  VALIDATION: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  VERIFICATION: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  PERIODIC_VERIFICATION: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
};

const recommendationColors: Record<Recommendation, string> = {
  APPROVE: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  REJECT: 'bg-red-100 text-red-700 hover:bg-red-100',
  REQUEST_INFO: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
  PENDING: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
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

const MOCK_DATA: VVBData = {
  reviews: [
    {
      id: 'VVB-001',
      projectId: 'PRJ-001',
      reviewerOrg: 'Bureau Veritas',
      reviewerName: 'Dr. Somchai P.',
      reviewType: 'VALIDATION',
      status: 'PENDING',
      projectName: 'Rice AWD Chiang Rai',
      projectProvince: 'Chiang Rai',
      evidenceCount: 8,
      evidenceRefs: [
        { id: 'EV-001', name: 'Baseline Emission Report', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-20T10:00:00Z' },
        { id: 'EV-002', name: 'AWD Implementation Log', type: 'SPREADSHEET', status: 'PENDING', submittedAt: '2025-05-21T14:00:00Z' },
        { id: 'EV-003', name: 'Satellite Imagery Analysis', type: 'IMAGE', status: 'VERIFIED', submittedAt: '2025-05-22T09:00:00Z' },
        { id: 'EV-004', name: 'Field Measurement Data', type: 'CSV', status: 'VERIFIED', submittedAt: '2025-05-22T16:00:00Z' },
        { id: 'EV-005', name: 'Stakeholder Consultation Report', type: 'PDF', status: 'PENDING', submittedAt: '2025-05-23T11:00:00Z' },
        { id: 'EV-006', name: 'Environmental Impact Assessment', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-23T15:00:00Z' },
        { id: 'EV-007', name: 'Water Management Plan', type: 'PDF', status: 'REJECTED', submittedAt: '2025-05-24T08:00:00Z' },
        { id: 'EV-008', name: 'GPS Boundary Coordinates', type: 'GEOJSON', status: 'VERIFIED', submittedAt: '2025-05-24T12:00:00Z' },
      ],
      findings: { completeness: 82, accuracy: 75, consistency: 88 },
      recommendation: 'PENDING',
      createdAt: '2025-05-20T08:00:00Z',
      updatedAt: '2025-05-24T12:00:00Z',
      comments: '',
    },
    {
      id: 'VVB-002',
      projectId: 'PRJ-002',
      reviewerOrg: 'SGS Thailand',
      reviewerName: 'Ms. Apinya K.',
      reviewType: 'VERIFICATION',
      status: 'IN_PROGRESS',
      projectName: 'Solar Farm Ubon Ratchathani',
      projectProvince: 'Ubon Ratchathani',
      evidenceCount: 12,
      evidenceRefs: [
        { id: 'EV-010', name: 'Electricity Generation Records', type: 'CSV', status: 'VERIFIED', submittedAt: '2025-05-18T10:00:00Z' },
        { id: 'EV-011', name: 'Grid Emission Factor Data', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-18T14:00:00Z' },
        { id: 'EV-012', name: 'Meter Reading Logs', type: 'SPREADSHEET', status: 'VERIFIED', submittedAt: '2025-05-19T09:00:00Z' },
        { id: 'EV-013', name: 'Maintenance Records', type: 'PDF', status: 'PENDING', submittedAt: '2025-05-19T16:00:00Z' },
      ],
      findings: { completeness: 91, accuracy: 88, consistency: 85 },
      recommendation: 'APPROVE',
      createdAt: '2025-05-18T08:00:00Z',
      updatedAt: '2025-05-25T10:00:00Z',
      comments: 'Strong evidence package. Minor clarification needed on meter calibration records.',
    },
    {
      id: 'VVB-003',
      projectId: 'PRJ-003',
      reviewerOrg: 'TUV Nord',
      reviewerName: 'Dr. Heinrich M.',
      reviewType: 'PERIODIC_VERIFICATION',
      status: 'APPROVED',
      projectName: 'Biogas Nakhon Pathom',
      projectProvince: 'Nakhon Pathom',
      evidenceCount: 15,
      evidenceRefs: [
        { id: 'EV-020', name: 'Annual Monitoring Report', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-10T10:00:00Z' },
        { id: 'EV-021', name: 'CH4 Capture Records', type: 'CSV', status: 'VERIFIED', submittedAt: '2025-05-10T14:00:00Z' },
        { id: 'EV-022', name: 'Leakage Test Results', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-11T09:00:00Z' },
      ],
      findings: { completeness: 96, accuracy: 94, consistency: 92 },
      recommendation: 'APPROVE',
      createdAt: '2025-05-10T08:00:00Z',
      updatedAt: '2025-05-23T16:00:00Z',
      comments: 'All monitoring parameters within acceptable ranges. Approved for crediting period continuation.',
    },
    {
      id: 'VVB-004',
      projectId: 'PRJ-004',
      reviewerOrg: 'Bureau Veritas',
      reviewerName: 'Mr. Tanawat S.',
      reviewType: 'VALIDATION',
      status: 'REJECTED',
      projectName: 'Blue Carbon Phang Nga',
      projectProvince: 'Phang Nga',
      evidenceCount: 5,
      evidenceRefs: [
        { id: 'EV-030', name: 'Mangrove Area Assessment', type: 'GEOJSON', status: 'REJECTED', submittedAt: '2025-05-15T10:00:00Z' },
        { id: 'EV-031', name: 'Sequestration Rate Study', type: 'PDF', status: 'PENDING', submittedAt: '2025-05-15T14:00:00Z' },
      ],
      findings: { completeness: 45, accuracy: 52, consistency: 38 },
      recommendation: 'REJECT',
      createdAt: '2025-05-15T08:00:00Z',
      updatedAt: '2025-05-22T11:00:00Z',
      comments: 'Insufficient evidence for mangrove boundary delineation. Sequestration rates not aligned with T-VER methodology.',
    },
    {
      id: 'VVB-005',
      projectId: 'PRJ-005',
      reviewerOrg: 'SGS Thailand',
      reviewerName: 'Ms. Ploypailin R.',
      reviewType: 'VERIFICATION',
      status: 'REQUESTED_INFO',
      projectName: 'Biochar Chachoengsao',
      projectProvince: 'Chachoengsao',
      evidenceCount: 10,
      evidenceRefs: [
        { id: 'EV-040', name: 'Production Batch Records', type: 'SPREADSHEET', status: 'VERIFIED', submittedAt: '2025-05-12T10:00:00Z' },
        { id: 'EV-041', name: 'Carbon Content Lab Results', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-12T14:00:00Z' },
        { id: 'EV-042', name: 'Feedstock Source Documentation', type: 'PDF', status: 'PENDING', submittedAt: '2025-05-13T09:00:00Z' },
      ],
      findings: { completeness: 72, accuracy: 80, consistency: 68 },
      recommendation: 'REQUEST_INFO',
      createdAt: '2025-05-12T08:00:00Z',
      updatedAt: '2025-05-24T14:00:00Z',
      comments: 'Need additional information on feedstock sourcing and pyrolysis temperature records.',
    },
    {
      id: 'VVB-006',
      projectId: 'PRJ-006',
      reviewerOrg: 'TUV Nord',
      reviewerName: 'Dr. Heinrich M.',
      reviewType: 'PERIODIC_VERIFICATION',
      status: 'PENDING',
      projectName: 'Reforestation Kanchanaburi',
      projectProvince: 'Kanchanaburi',
      evidenceCount: 9,
      evidenceRefs: [
        { id: 'EV-050', name: 'Tree Growth Measurements', type: 'CSV', status: 'VERIFIED', submittedAt: '2025-05-19T10:00:00Z' },
        { id: 'EV-051', name: 'Remote Sensing Data', type: 'IMAGE', status: 'PENDING', submittedAt: '2025-05-19T14:00:00Z' },
      ],
      findings: { completeness: 78, accuracy: 70, consistency: 82 },
      recommendation: 'PENDING',
      createdAt: '2025-05-19T08:00:00Z',
      updatedAt: '2025-05-25T08:00:00Z',
      comments: '',
    },
  ],
  summary: {
    byStatus: {
      PENDING: 2,
      IN_PROGRESS: 1,
      APPROVED: 1,
      REJECTED: 1,
      REQUESTED_INFO: 1,
    },
    byReviewType: {
      VALIDATION: 2,
      VERIFICATION: 2,
      PERIODIC_VERIFICATION: 2,
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
  'Wind Farm Nakhon Si Thammarat',
  'Methane Capture Rayong',
];

const REVIEWER_ORGS = ['Bureau Veritas', 'SGS Thailand', 'TUV Nord', 'DNV GL', 'Lloyd\'s Register'];

export default function VVBWorkspaceView() {
  const { toast } = useToast();
  const [data, setData] = useState<VVBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterOrg, setFilterOrg] = useState<string>('ALL');
  const [reviewerComment, setReviewerComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [newProject, setNewProject] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newType, setNewType] = useState<ReviewType>('VALIDATION');
  const [newReviewer, setNewReviewer] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dmrv/vvb');
      if (!res.ok) throw new Error('Failed to fetch VVB data');
      const json = await res.json();
      setData(json as VVBData);
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
    toast({ title: 'Refreshed', description: 'VVB workspace data updated' });
  };

  const handleReviewClick = (review: Review) => {
    setSelectedReview(review);
    setReviewerComment(review.comments);
    setDetailOpen(true);
  };

  const handleRecommendation = async (recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_INFO') => {
    if (!selectedReview) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/vvb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          reviewId: selectedReview.id,
          projectId: selectedReview.projectId,
          status: recommendation === 'APPROVE' ? 'APPROVED' : recommendation === 'REJECT' ? 'REJECTED' : 'REQUESTED_INFO',
          recommendation: recommendation.toLowerCase(),
          comments: reviewerComment,
        }),
      });
      if (res.ok) {
        toast({ title: 'Recommendation submitted', description: `Review ${recommendation.toLowerCase()}ed successfully` });
        setReviewerComment('');
        setSelectedReview(null);
        setDetailOpen(false);
        fetchData();
      } else {
        toast({ title: 'Error', description: 'Failed to submit recommendation', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReview = async () => {
    if (!newProject || !newOrg || !newType || !newReviewer) {
      toast({ title: 'Validation Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/vvb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId: newProject,
          reviewerOrg: newOrg,
          reviewerName: newReviewer,
          reviewType: newType,
          status: 'PENDING',
        }),
      });
      if (res.ok) {
        toast({ title: 'Review created', description: 'New VVB review has been created' });
        setCreateOpen(false);
        setNewProject('');
        setNewOrg('');
        setNewReviewer('');
        setNewType('VALIDATION');
        fetchData();
      } else {
        toast({ title: 'Error', description: 'Failed to create review', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReviews = React.useMemo(() => {
    if (!data) return [];
    let reviews = data.reviews;

    if (activeTab === 'pending') {
      reviews = reviews.filter((r) => r.status === 'PENDING');
    } else if (activeTab === 'my') {
      // Show all reviews (no org-specific filter)
    }

    if (filterStatus !== 'ALL') {
      reviews = reviews.filter((r) => r.status === filterStatus);
    }
    if (filterType !== 'ALL') {
      reviews = reviews.filter((r) => r.reviewType === filterType);
    }
    if (filterOrg !== 'ALL') {
      reviews = reviews.filter((r) => r.reviewerOrg === filterOrg);
    }

    return reviews;
  }, [data, activeTab, filterStatus, filterType, filterOrg]);

  const getFindingsChartData = (findings: Finding) => [
    { subject: 'Completeness', value: findings.completeness, fullMark: 100 },
    { subject: 'Accuracy', value: findings.accuracy, fullMark: 100 },
    { subject: 'Consistency', value: findings.consistency, fullMark: 100 },
  ];

  const getFindingsBarData = (findings: Finding) => [
    { name: 'Completeness', score: findings.completeness },
    { name: 'Accuracy', score: findings.accuracy },
    { name: 'Consistency', score: findings.consistency },
  ];

  const scoreBarColor = (score: number) => {
    if (score >= 80) return '[&>div]:bg-emerald-500';
    if (score >= 60) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-red-500';
  };

  const evidenceStatusColor = (status: string) => {
    if (status === 'VERIFIED') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700 hover:bg-red-100';
    return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-40" /></CardContent></Card>
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
            Failed to load VVB data.{' '}
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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">VVB Workspace</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Validation & Verification Body review management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-3.5 w-3.5" />
            New Review
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <ClipboardCheck className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{summary.byStatus.PENDING || 0}</p>
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
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{summary.byStatus.APPROVED || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected / Info Requested</p>
                <p className="text-2xl font-bold">{(summary.byStatus.REJECTED || 0) + (summary.byStatus.REQUESTED_INFO || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="REQUESTED_INFO">Requested Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[170px] h-8 text-xs">
            <SelectValue placeholder="Review Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="VALIDATION">Validation</SelectItem>
            <SelectItem value="VERIFICATION">Verification</SelectItem>
            <SelectItem value="PERIODIC_VERIFICATION">Periodic Verification</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Reviewer Org" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Orgs</SelectItem>
            {REVIEWER_ORGS.map((org) => (
              <SelectItem key={org} value={org}>{org}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Reviews</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="my">My Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No reviews found matching your filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredReviews.map((review) => {
                const StatusIcon = statusIcons[review.status];
                return (
                  <Card
                    key={review.id}
                    className="cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all"
                    onClick={() => handleReviewClick(review)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                              {review.reviewerOrg.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{review.reviewerOrg}</p>
                            <p className="text-xs text-muted-foreground truncate">{review.reviewerName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="secondary" className={`text-[10px] h-5 ${statusColors[review.status]}`}>
                            <StatusIcon className="h-3 w-3 mr-0.5" />
                            {review.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <Badge variant="secondary" className={`text-[10px] h-5 ${reviewTypeColors[review.reviewType]}`}>
                          {review.reviewType.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] h-5 ${recommendationColors[review.recommendation]}`}>
                          {review.recommendation.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 mb-3 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{review.projectName}</span>
                        <span className="text-muted-foreground text-xs shrink-0">({review.projectProvince})</span>
                      </div>

                      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {review.evidenceCount} evidence
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(review.updatedAt)}
                        </span>
                      </div>

                      {/* Findings Progress Bars */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Completeness</span>
                          <span className="font-medium">{review.findings.completeness}%</span>
                        </div>
                        <Progress value={review.findings.completeness} className={`h-1.5 ${scoreBarColor(review.findings.completeness)}`} />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Accuracy</span>
                          <span className="font-medium">{review.findings.accuracy}%</span>
                        </div>
                        <Progress value={review.findings.accuracy} className={`h-1.5 ${scoreBarColor(review.findings.accuracy)}`} />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Consistency</span>
                          <span className="font-medium">{review.findings.consistency}%</span>
                        </div>
                        <Progress value={review.findings.consistency} className={`h-1.5 ${scoreBarColor(review.findings.consistency)}`} />
                      </div>

                      <div className="flex items-center justify-end mt-3">
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          View Details <ChevronRight className="h-3 w-3" />
                        </span>
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
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Review Details — {selectedReview?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedReview?.projectName} | {selectedReview?.reviewType.replace('_', ' ')} Review
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6 pb-4">
                {/* Status & Type Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`text-xs ${statusColors[selectedReview.status]}`}>
                    {React.createElement(statusIcons[selectedReview.status], { className: 'h-3 w-3 mr-0.5 inline' })}
                    {selectedReview.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={`text-xs ${reviewTypeColors[selectedReview.reviewType]}`}>
                    {selectedReview.reviewType.replace('_', ' ')}
                  </Badge>
                  <Badge className={`text-xs ${recommendationColors[selectedReview.recommendation]}`}>
                    Rec: {selectedReview.recommendation.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Reviewer Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Reviewer Organization</p>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
                            {selectedReview.reviewerOrg.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{selectedReview.reviewerOrg}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{selectedReview.reviewerName}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Project</p>
                      <p className="text-sm font-medium">{selectedReview.projectName}</p>
                      <p className="text-xs text-muted-foreground">{selectedReview.projectProvince}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Created: {formatRelativeTime(selectedReview.createdAt)}</span>
                        <span>Updated: {formatRelativeTime(selectedReview.updatedAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Findings Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                      Findings Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Radar Chart */}
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={getFindingsChartData(selectedReview.findings)}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                            <Radar
                              name="Score"
                              dataKey="value"
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.3}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Bar Chart */}
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getFindingsBarData(selectedReview.findings)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Evidence References */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Evidence References ({selectedReview.evidenceRefs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">ID</th>
                            <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Name</th>
                            <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Type</th>
                            <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Status</th>
                            <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReview.evidenceRefs.map((ev) => (
                            <tr key={ev.id} className="border-b last:border-0">
                              <td className="p-2.5 font-mono text-xs">{ev.id}</td>
                              <td className="p-2.5 text-xs font-medium">{ev.name}</td>
                              <td className="p-2.5 text-xs">{ev.type}</td>
                              <td className="p-2.5">
                                <Badge variant="secondary" className={`text-[9px] h-4 ${evidenceStatusColor(ev.status)}`}>
                                  {ev.status}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-xs text-muted-foreground">{formatRelativeTime(ev.submittedAt)}</td>
                            </tr>
                          ))}
                          {selectedReview.evidenceRefs.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">
                                No evidence references
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Comments & Recommendation Actions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      VVB Reviewer Comments & Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={reviewerComment}
                      onChange={(e) => setReviewerComment(e.target.value)}
                      placeholder="Enter your review comments..."
                      rows={4}
                      className="text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        disabled={isSubmitting}
                        onClick={() => handleRecommendation('APPROVE')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        disabled={isSubmitting}
                        onClick={() => handleRecommendation('REJECT')}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
                        disabled={isSubmitting}
                        onClick={() => handleRecommendation('REQUEST_INFO')}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        Request Info
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Review Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              Create New Review
            </DialogTitle>
            <DialogDescription>Assign a new VVB review for a project</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={newProject} onValueChange={setNewProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {PROJECTS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reviewer Organization</Label>
              <Select value={newOrg} onValueChange={setNewOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization..." />
                </SelectTrigger>
                <SelectContent>
                  {REVIEWER_ORGS.map((org) => (
                    <SelectItem key={org} value={org}>{org}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reviewer Name</Label>
              <Input
                value={newReviewer}
                onChange={(e) => setNewReviewer(e.target.value)}
                placeholder="e.g., Dr. Somchai P."
              />
            </div>
            <div className="space-y-2">
              <Label>Review Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as ReviewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VALIDATION">Validation</SelectItem>
                  <SelectItem value="VERIFICATION">Verification</SelectItem>
                  <SelectItem value="PERIODIC_VERIFICATION">Periodic Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                disabled={isSubmitting}
                onClick={handleCreateReview}
              >
                {isSubmitting ? 'Creating...' : <><Plus className="h-3.5 w-3.5" /> Create Review</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
