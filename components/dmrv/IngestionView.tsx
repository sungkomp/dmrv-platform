'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Lock, Unlock, FileUp, Clock, CheckCircle2, AlertCircle, RefreshCw, AlertCircle as ErrorIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const SOURCE_TYPES = [
  'Satellite',
  'Photo',
  'Drone',
  'LiDAR',
  'IoT',
  'Weather',
  'Soil',
  'Biochar',
  'AWD',
  'Fertilizer',
  'Biogas',
  'Solar',
  'Agri-Activity',
] as const;

type SourceType = (typeof SOURCE_TYPES)[number];

interface Project {
  id: string;
  name: string;
  status: string;
}

interface IngestionLog {
  id: string;
  sourceType: string;
  activityType: string;
  classification: string;
  isEncrypted: boolean;
  integrityHash: string;
  timestamp: string;
  projectId: string;
  project?: { id: string; name: string };
}

const statusIcons: Record<string, React.ElementType> = {
  ingested: CheckCircle2,
  processing: Clock,
  failed: AlertCircle,
};

const statusColors: Record<string, string> = {
  ingested: 'text-emerald-600',
  processing: 'text-amber-600',
  failed: 'text-red-600',
};

export default function IngestionView() {
  const { toast } = useToast();
  const [sourceType, setSourceType] = useState<SourceType>('Satellite');
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState<'PUBLIC' | 'CONFIDENTIAL'>('PUBLIC');
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Fetch available projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/dmrv');
        if (res.ok) {
          const data = await res.json();
          const projectList: Project[] = (data.projects || []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            status: p.status as string,
          }));
          setProjects(projectList);
          if (projectList.length > 0) {
            setSelectedProjectId(projectList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setProjectsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch real ingestion logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dmrv/ingestion');
      if (!res.ok) throw new Error('Failed to fetch ingestion logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ingestion logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleIngest = async () => {
    if (!fileName.trim()) {
      toast({ title: 'Validation Error', description: 'File name is required', variant: 'destructive' });
      return;
    }
    if (!selectedProjectId) {
      toast({ title: 'Validation Error', description: 'Please select a project', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/ingestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: sourceType.toLowerCase(),
          activityType: 'data_upload',
          payload: {
            fileName: fileName.trim(),
            description: description.trim(),
            classification,
          },
          evidenceUrl: '',
          projectId: selectedProjectId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Ingestion failed');
      }

      const result = await res.json();
      const newLog: IngestionLog = result.log;

      setLogs((prev) => [newLog, ...prev]);
      setFileName('');
      setDescription('');

      toast({
        title: 'Data Ingested',
        description: `${sourceType} data "${fileName}" ingested successfully as ${newLog.classification}`,
      });
    } catch (err) {
      toast({
        title: 'Ingestion Failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const publicCount = logs.filter((l) => l.classification === 'PUBLIC').length;
  const confidentialCount = logs.filter((l) => l.classification === 'CONFIDENTIAL').length;
  const encryptedCount = logs.filter((l) => l.isEncrypted).length;

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Data Ingestion</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Collect and normalize data from 13 source types with automatic classification & encryption
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <ErrorIcon className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}. Click Refresh to try again.</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-center">
                  <Skeleton className="h-8 w-12 mx-auto mb-2" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-xs text-muted-foreground">Total Ingested</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{publicCount}</p>
                <p className="text-xs text-muted-foreground">PUBLIC</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{confidentialCount}</p>
                <p className="text-xs text-muted-foreground">CONFIDENTIAL</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-teal-600">{encryptedCount}</p>
                <p className="text-xs text-muted-foreground">Encrypted</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ingestion Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-600" />
              Ingest New Data
            </CardTitle>
            <CardDescription>Submit data from any of the 13 supported source types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              {projectsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File / Data Name</Label>
              <Input
                placeholder="e.g., sentinel2_2024_bangkok.tif"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the data being ingested..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Classification</Label>
              <Select value={classification} onValueChange={(v) => setClassification(v as 'PUBLIC' | 'CONFIDENTIAL')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                  <SelectItem value="CONFIDENTIAL">CONFIDENTIAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {classification === 'CONFIDENTIAL' && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Confidential data will be encrypted with AES-256 before storage</span>
              </div>
            )}

            <Button
              onClick={handleIngest}
              disabled={isSubmitting || !selectedProjectId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  Ingest Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Source Type Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supported Source Types</CardTitle>
            <CardDescription>13 data sources for comprehensive carbon monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_TYPES.map((type) => {
                const count = logs.filter((l) => l.sourceType.toLowerCase() === type.toLowerCase()).length;
                return (
                  <button
                    key={type}
                    onClick={() => setSourceType(type)}
                    className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                      sourceType === type
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{type}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ingestion Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Ingestion Logs</CardTitle>
          <CardDescription>All ingested data records with classification and encryption status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No ingestion logs found. Submit data to create your first log.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Encrypted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const StatusIcon = statusIcons['ingested'] || CheckCircle2;
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] h-5 capitalize">
                            {log.sourceType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {log.activityType}
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.project?.name || log.projectId?.slice(0, 8) || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] h-5 ${
                              log.classification === 'PUBLIC'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            {log.classification}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.isEncrypted ? (
                            <Lock className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Unlock className="h-4 w-4 text-slate-400" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-3.5 w-3.5 ${statusColors['ingested']}`} />
                            <span className="text-xs capitalize">Ingested</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
