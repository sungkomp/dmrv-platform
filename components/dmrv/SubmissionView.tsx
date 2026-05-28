'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Send, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type SubmissionStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';

interface Project {
  id: string;
  name: string;
  methodology: string;
}

interface ApiSubmission {
  id: string;
  projectId: string;
  data: Record<string, unknown> | string;
  status: string;
  createdAt: string;
  project?: { id: string; name: string; methodology: string };
}

interface Submission {
  id: string;
  projectId: string;
  projectName: string;
  formType: string;
  title: string;
  status: SubmissionStatus;
  submittedAt: string;
  submittedBy: string;
}

interface SubmissionSummary {
  total: number;
  readyForVerification: number;
  verified: number;
  submitted: number;
  rejected: number;
}

const statusStyles: Record<SubmissionStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  Submitted: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  'Under Review': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  Approved: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  Rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
};

function mapApiStatus(apiStatus: string): SubmissionStatus {
  switch (apiStatus) {
    case 'VERIFIED':
      return 'Approved';
    case 'READY_FOR_VERIFICATION':
      return 'Under Review';
    case 'SUBMITTED':
      return 'Submitted';
    case 'REJECTED':
      return 'Rejected';
    default:
      return 'Draft';
  }
}

export default function SubmissionView() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [summary, setSummary] = useState<SubmissionSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formProjectId, setFormProjectId] = useState('');
  const [formType, setFormType] = useState('Project Registration');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [submissionsRes, projectsRes] = await Promise.all([
        fetch('/api/dmrv/submission'),
        fetch('/api/dmrv'),
      ]);

      if (!submissionsRes.ok || !projectsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const submissionsData = await submissionsRes.json();
      const projectsData = await projectsRes.json();

      const mappedSubmissions: Submission[] = (submissionsData.submissions as ApiSubmission[]).map((s) => {
        // API may return data as a JSON string or an object
        const parsedData: Record<string, unknown> = typeof s.data === 'string' ? JSON.parse(s.data) : (s.data || {});
        return {
          id: s.id,
          projectId: s.projectId,
          projectName: s.project?.name || s.projectId,
          formType: (parsedData.formType as string) || 'Data Submission',
          title: (parsedData.title as string) || `Submission ${s.id.slice(-6)}`,
          status: mapApiStatus(s.status),
          submittedAt: new Date(s.createdAt).toISOString().split('T')[0],
          submittedBy: (parsedData.submittedBy as string) || (parsedData.submitter as string) || 'System',
        };
      });

      setSubmissions(mappedSubmissions);
      setSummary(submissionsData.summary as SubmissionSummary);
      setProjects((projectsData.projects as Project[]).map((p) => ({ id: p.id, name: p.name, methodology: p.methodology })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
      toast({ title: 'Error', description: 'Failed to load submissions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!formProjectId || !formTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Project and title are required', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/dmrv/submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: formProjectId,
          data: {
            formType,
            title: formTitle.trim(),
            description: formDescription,
            submittedBy: 'Admin',
          },
          status: 'READY_FOR_VERIFICATION',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create submission');
      }

      toast({ title: 'Submission Created', description: `${formType}: ${formTitle.trim()}` });
      setFormProjectId('');
      setFormTitle('');
      setFormDescription('');
      await fetchData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create submission',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statusCounts: Record<SubmissionStatus, number> = {
    Draft: submissions.filter((s) => s.status === 'Draft').length,
    Submitted: submissions.filter((s) => s.status === 'Submitted').length,
    'Under Review': submissions.filter((s) => s.status === 'Under Review').length,
    Approved: submissions.filter((s) => s.status === 'Approved').length,
    Rejected: submissions.filter((s) => s.status === 'Rejected').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-8 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full mb-2" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Submission</h2>
        <p className="text-muted-foreground text-sm mt-1">Create and manage project submissions</p>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Failed to load data. <Button variant="link" className="h-auto p-0 text-red-700 underline" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {(['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'] as SubmissionStatus[]).map((status) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{statusCounts[status]}</p>
              <p className="text-xs text-muted-foreground">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Summary Stats */}
      {summary && (
        <div className="text-xs text-muted-foreground">
          Total: {summary.total} | Ready for Verification: {summary.readyForVerification} | Verified: {summary.verified} | Submitted: {summary.submitted} | Rejected: {summary.rejected}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Submission Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              New Submission
            </CardTitle>
            <CardDescription>Create a new form submission</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Form Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Project Registration', 'Monitoring Report', 'Credit Request', 'Verification Request', 'Data Submission'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g., Q4 2024 Biochar Monitoring" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the submission..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <><Send className="h-4 w-4" /> Submit</>}
            </Button>
          </CardContent>
        </Card>

        {/* Submission List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Submission History
            </CardTitle>
            <CardDescription>All form submissions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                        No submissions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="text-sm font-medium">{sub.title}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{sub.projectName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] h-5">{sub.formType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[sub.status]}`}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{sub.submittedBy}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{sub.submittedAt}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
