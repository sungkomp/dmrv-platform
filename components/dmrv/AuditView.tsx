'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type AuditType = 'Biogas' | 'Blue Carbon' | 'Renewable' | 'Soil GHG' | 'Overlap' | 'Footprint';

const auditTypeToDomain: Record<AuditType, string> = {
  Biogas: 'biogas',
  'Blue Carbon': 'blue_carbon',
  Renewable: 'renewable',
  'Soil GHG': 'soil_ghg',
  Overlap: 'overlap',
  Footprint: 'footprint',
};

interface AuditInput {
  [key: string]: string;
}

interface AuditCheck {
  checkId: string;
  description: string;
  severity: string;
  passed: boolean;
  details: string;
}

interface AuditResult {
  auditId: string;
  projectId: string;
  projectName: string;
  domain: string;
  domainName: string;
  timestamp: string;
  checks: AuditCheck[];
  overallPassed: boolean;
  auditScore: number;
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    mandatoryFailed: number;
  };
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

interface Project {
  id: string;
  name: string;
}

const auditFields: Record<AuditType, { key: string; label: string; placeholder: string }[]> = {
  Biogas: [
    { key: 'ch4Captured', label: 'CH4 Captured (tonnes)', placeholder: 'e.g., 200' },
    { key: 'captureEfficiency', label: 'Capture Efficiency (%)', placeholder: 'e.g., 95' },
    { key: 'leakageRate', label: 'Leakage Rate (%)', placeholder: 'e.g., 3' },
  ],
  'Blue Carbon': [
    { key: 'area', label: 'Area (hectares)', placeholder: 'e.g., 500' },
    { key: 'sequestrationRate', label: 'Sequestration Rate (tCO2e/ha/yr)', placeholder: 'e.g., 9.9' },
    { key: 'projectDuration', label: 'Project Duration (years)', placeholder: 'e.g., 20' },
  ],
  Renewable: [
    { key: 'generation', label: 'Electricity Generated (MWh)', placeholder: 'e.g., 5000' },
    { key: 'gridFactor', label: 'Grid Emission Factor', placeholder: 'e.g., 0.5086' },
    { key: 'capacityFactor', label: 'Capacity Factor (%)', placeholder: 'e.g., 18' },
  ],
  'Soil GHG': [
    { key: 'area', label: 'Area (hectares)', placeholder: 'e.g., 1000' },
    { key: 'fertilizerType', label: 'Fertilizer Type', placeholder: 'e.g., Urea' },
    { key: 'applicationRate', label: 'Application Rate (kg N/ha)', placeholder: 'e.g., 120' },
  ],
  Overlap: [
    { key: 'projectId1', label: 'Project ID 1', placeholder: 'e.g., RICE-001' },
    { key: 'projectId2', label: 'Project ID 2', placeholder: 'e.g., RICE-002' },
    { key: 'overlapArea', label: 'Overlap Area (hectares)', placeholder: 'e.g., 50' },
  ],
  Footprint: [
    { key: 'electricity', label: 'Electricity Usage (MWh)', placeholder: 'e.g., 10000' },
    { key: 'diesel', label: 'Diesel Usage (kL)', placeholder: 'e.g., 500' },
    { key: 'lpg', label: 'LPG Usage (tonnes)', placeholder: 'e.g., 100' },
  ],
};

export default function AuditView() {
  const { toast } = useToast();
  const [auditType, setAuditType] = useState<AuditType>('Biogas');
  const [projectId, setProjectId] = useState('');
  const [inputs, setInputs] = useState<AuditInput>({});
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fields = auditFields[auditType];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [auditRes, projectsRes] = await Promise.all([
        fetch('/api/dmrv/audit'),
        fetch('/api/dmrv'),
      ]);

      if (!auditRes.ok || !projectsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const auditData = await auditRes.json();
      const projectsData = await projectsRes.json();

      setAuditLogs((auditData.logs as AuditLogEntry[]) || []);
      setProjects((projectsData.projects as Project[]).map((p: Project) => ({ id: p.id, name: p.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
      toast({ title: 'Error', description: 'Failed to load audit data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunAudit = async () => {
    if (!projectId) {
      toast({ title: 'Validation Error', description: 'Please select a project', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    try {
      const domain = auditTypeToDomain[auditType];
      const res = await fetch('/api/dmrv/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, domain }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Audit failed');
      }

      const data = await res.json();
      const auditResult = data.audit as AuditResult;
      setAuditResults((prev) => [auditResult, ...prev]);

      toast({
        title: auditResult.overallPassed ? 'Audit Passed' : 'Audit Failed',
        description: `${auditType} audit for ${auditResult.projectName}: Score ${auditResult.auditScore}%`,
        variant: auditResult.overallPassed ? 'default' : 'destructive',
      });

      // Refresh audit logs
      await fetchData();
    } catch (err) {
      toast({
        title: 'Audit Error',
        description: err instanceof Error ? err.message : 'Audit execution failed',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
      setInputs({});
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full mb-3" />
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
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Domain-Specific Audit</h2>
        <p className="text-muted-foreground text-sm mt-1">Run specialized audits for different carbon credit domains</p>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Failed to load data. <Button variant="link" className="h-auto p-0 text-red-700 underline" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Audit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-600" />
              Run Audit
            </CardTitle>
            <CardDescription>Select audit type and provide inputs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Audit Domain</Label>
              <Select value={auditType} onValueChange={(v) => { setAuditType(v as AuditType); setInputs({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(auditFields) as AuditType[]).map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  placeholder={field.placeholder}
                  value={inputs[field.key] || ''}
                  onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                />
              </div>
            ))}
            <Button
              onClick={handleRunAudit}
              disabled={isRunning}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isRunning ? <><Loader2 className="h-4 w-4 animate-spin" /> Running Audit...</> : <><Search className="h-4 w-4" /> Run Audit</>}
            </Button>
          </CardContent>
        </Card>

        {/* Audit Results Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Audit Results Timeline</CardTitle>
            <CardDescription>History of all domain-specific audits</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <div className="px-6">
                {auditResults.length === 0 && auditLogs.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    No audit results yet. Run an audit to see results.
                  </div>
                )}

                {/* Show audit results from API */}
                {auditResults.map((result, idx) => (
                  <React.Fragment key={`result-${idx}`}>
                    <div className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {result.overallPassed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{result.domainName}</span>
                            <Badge variant="secondary" className={`text-[10px] h-5 ${
                              result.overallPassed
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-100 text-red-700 hover:bg-red-100'
                            }`}>
                              {result.overallPassed ? 'PASSED' : 'FAILED'}
                            </Badge>
                            <Badge variant="secondary" className={`text-[10px] h-5 ${
                              result.auditScore >= 80
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                                : result.auditScore >= 60
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-50'
                                : 'bg-red-50 text-red-700 hover:bg-red-50'
                            }`}>
                              Score: {result.auditScore}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Project: {result.projectName} | {new Date(result.timestamp).toLocaleString()}
                          </p>
                          <div className="rounded-lg bg-slate-50 p-2.5 space-y-1">
                            {result.checks.map((check) => (
                              <div key={check.checkId} className="flex items-start gap-2 text-xs">
                                {check.passed ? (
                                  <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />
                                )}
                                <span>
                                  <span className="font-medium">{check.description}</span>
                                  {check.details && <span className="text-muted-foreground"> — {check.details}</span>}
                                </span>
                                <Badge variant="secondary" className={`text-[8px] h-4 shrink-0 ${
                                  check.severity === 'MANDATORY' ? 'bg-red-50 text-red-600 hover:bg-red-50'
                                    : check.severity === 'WARNING' ? 'bg-amber-50 text-amber-600 hover:bg-amber-50'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                }`}>
                                  {check.severity}
                                </Badge>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Total: {result.summary.totalChecks}</span>
                            <span className="text-emerald-600">Passed: {result.summary.passed}</span>
                            <span className="text-red-600">Failed: {result.summary.failed}</span>
                            {result.summary.mandatoryFailed > 0 && (
                              <span className="text-red-600 font-semibold">Mandatory Failed: {result.summary.mandatoryFailed}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {idx < auditResults.length - 1 && <Separator />}
                  </React.Fragment>
                ))}

                {/* Show audit log entries from database */}
                {auditLogs.length > 0 && auditResults.length > 0 && (
                  <Separator />
                )}
                {auditLogs.length > 0 && (
                  <div className="py-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      Audit Log History
                    </h4>
                    <div className="space-y-2">
                      {auditLogs.slice(0, 10).map((log) => (
                        <div key={log.id} className="flex items-start gap-2 text-xs rounded-lg bg-slate-50 p-2.5">
                          {log.severity === 'INFO' ? (
                            <Info className="h-3 w-3 mt-0.5 text-blue-500 shrink-0" />
                          ) : log.severity === 'WARNING' ? (
                            <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{log.agentName}</span>
                              <Badge variant="secondary" className={`text-[8px] h-4 ${
                                log.severity === 'INFO' ? 'bg-blue-50 text-blue-600 hover:bg-blue-50'
                                  : log.severity === 'WARNING' ? 'bg-amber-50 text-amber-600 hover:bg-amber-50'
                                  : 'bg-red-50 text-red-600 hover:bg-red-50'
                              }`}>
                                {log.severity}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground">{log.action}</span>
                            {log.projectId && <span className="text-muted-foreground ml-1">| {log.projectId}</span>}
                            <span className="text-muted-foreground ml-1">| {new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
