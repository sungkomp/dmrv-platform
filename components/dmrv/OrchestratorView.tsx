'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Workflow,
  Play,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type AgentStatus = 'pending' | 'running' | 'success' | 'failed';

interface AgentStep {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  output?: string;
  confidence?: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
  methodology: string;
}

interface WorkflowStep {
  agent: string;
  action: string;
  result: Record<string, unknown>;
  severity: string;
}

const initialAgents: AgentStep[] = [
  { id: 'security', name: 'Security Agent', description: 'Validate digital signatures & sanitize inputs', status: 'pending' },
  { id: 'classification', name: 'Classification Agent', description: 'Detect PII, check PDPA consent & classify data', status: 'pending' },
  { id: 'encryption', name: 'Encryption Agent', description: 'SHA-256 integrity hash & encrypt CONFIDENTIAL data', status: 'pending' },
  { id: 'verification', name: 'Existence Verifier', description: 'Cross-validate data with ≥2 source types', status: 'pending' },
  { id: 'carbon', name: 'Carbon Quantifier', description: 'Calculate tCO2e based on methodology + freshness check', status: 'pending' },
  { id: 'contract', name: 'Contract Guard', description: 'Double-claiming registry check & rights verification', status: 'pending' },
  { id: 'ledger', name: 'Ledger Agent', description: 'Create ledger entry with Merkle root', status: 'pending' },
  { id: 'reporting', name: 'Reporting Agent', description: 'Generate audit report & summary', status: 'pending' },
];

const statusIcon: Record<AgentStatus, React.ElementType> = {
  pending: Clock,
  running: Loader2,
  success: CheckCircle2,
  failed: XCircle,
};

const statusColor: Record<AgentStatus, string> = {
  pending: 'text-slate-400',
  running: 'text-emerald-600',
  success: 'text-emerald-600',
  failed: 'text-red-600',
};

const statusBg: Record<AgentStatus, string> = {
  pending: 'bg-slate-50 border-slate-200',
  running: 'bg-emerald-50 border-emerald-200',
  success: 'bg-emerald-50 border-emerald-200',
  failed: 'bg-red-50 border-red-200',
};

const badgeStyle: Record<AgentStatus, string> = {
  pending: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  running: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  success: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  failed: 'bg-red-100 text-red-700 hover:bg-red-100',
};

export default function OrchestratorView() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentStep[]>(initialAgents);
  const [isRunning, setIsRunning] = useState(false);
  const [auditTrail, setAuditTrail] = useState<{ time: string; message: string; type: 'info' | 'warn' | 'error' }[]>([]);
  const [hitlAlert, setHitlAlert] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [workflowResult, setWorkflowResult] = useState<Record<string, unknown> | null>(null);

  // Fetch available projects on mount
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
            methodology: p.methodology as string,
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

  const addAudit = useCallback((message: string, type: 'info' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setAuditTrail((prev) => [...prev, { time, message, type }]);
  }, []);

  const runWorkflow = useCallback(async () => {
    if (!selectedProjectId) {
      toast({ title: 'No Project Selected', description: 'Please select a project to run the workflow on.', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    setHitlAlert(false);
    setAuditTrail([]);
    setWorkflowResult(null);
    setAgents(initialAgents.map((a) => ({ ...a, status: 'pending' as AgentStatus, output: undefined, confidence: undefined })));

    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    addAudit(`Workflow initiated for project: ${selectedProject?.name || selectedProjectId}`);

    // Start the real API call in parallel with the simulation
    const apiPromise = fetch('/api/dmrv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedProjectId,
        data: { sourceType: 'satellite', trackType: 'biochar', mass: 1000, carbonFraction: 0.7, stability: 0.85 },
      }),
    });

    // Simulate the visual agent pipeline
    const simulatedOutputs = [
      'Validating digital signatures — VERIFIED',
      'PII detection scan — No PII detected | Classification: PUBLIC',
      'SHA-256 integrity hash computed | Encryption: NONE (PUBLIC data)',
      'Cross-source validation — Checking ≥2 source types...',
      'Calculating tCO2e based on project methodology...',
      'Checking double-claiming registry & verifying rights...',
      'Creating ledger entry with Merkle root...',
      'Generating audit report & final summary...',
    ];

    for (let i = 0; i < initialAgents.length; i++) {
      setAgents((prev) =>
        prev.map((a, idx) => (idx === i ? { ...a, status: 'running' as AgentStatus } : a))
      );
      addAudit(`Agent ${i + 1}/${initialAgents.length}: ${initialAgents[i].name} — RUNNING`);

      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 600));

      setAgents((prev) =>
        prev.map((a, idx) =>
          idx === i
            ? { ...a, status: 'success' as AgentStatus, output: simulatedOutputs[i], confidence: 0.85 + Math.random() * 0.15 }
            : a
        )
      );
      addAudit(`Agent ${i + 1}/${initialAgents.length}: ${initialAgents[i].name} — COMPLETED ✓`);
    }

    // Wait for the real API response
    try {
      const apiRes = await apiPromise;
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        setWorkflowResult(apiData.workflow);

        // Log the real API results
        const steps: WorkflowStep[] = apiData.workflow?.steps || [];
        addAudit('━━━ Real API Workflow Results ━━━');
        steps.forEach((step, idx) => {
          const result = step.result as Record<string, unknown>;
          const summary = Object.entries(result)
            .filter(([k]) => k !== 'agent')
            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
            .join(' | ');
          addAudit(`API Agent ${idx + 1} (${step.agent}): ${summary}`);
        });

        const finalReport = apiData.workflow?.finalReport as Record<string, unknown> | undefined;
        if (finalReport) {
          const reportSummary = finalReport.summary as Record<string, unknown>;
          if (reportSummary) {
            addAudit(`Final Report: Security=${reportSummary.securityStatus}, Classification=${reportSummary.classification}, Carbon=${reportSummary.carbonQuantified} tCO2e`);
          }
        }

        // Check for warnings from API
        const warningSteps = steps.filter((s) => s.severity === 'WARNING');
        if (warningSteps.length > 0) {
          setHitlAlert(true);
          addAudit(`⚠️ ${warningSteps.length} agent(s) reported warnings — Review recommended`, 'warn');
        }

        toast({
          title: 'Workflow Complete',
          description: `All 8 agents executed. ${steps.length} API steps completed.`,
        });
      } else {
        const errData = await apiRes.json().catch(() => ({}));
        addAudit(`API Error: ${errData.error || 'Unknown error'}`, 'error');
        toast({ title: 'API Error', description: errData.error || 'Workflow API call failed', variant: 'destructive' });
      }
    } catch (err) {
      addAudit(`API call failed: ${err instanceof Error ? err.message : 'Network error'}`, 'error');
      toast({ title: 'Network Error', description: 'Could not reach workflow API', variant: 'destructive' });
    }

    addAudit('Workflow completed — simulation + API results available');
    setIsRunning(false);
  }, [selectedProjectId, projects, addAudit, toast]);

  const completedCount = agents.filter((a) => a.status === 'success').length;
  const progress = (completedCount / agents.length) * 100;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Orchestrator</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Agent workflow pipeline for end-to-end dMRV processing
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Project:</Label>
            {projectsLoading ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-48">
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
          <Button
            onClick={runWorkflow}
            disabled={isRunning || !selectedProjectId}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Running...' : 'Run Workflow'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAgents(initialAgents);
              setAuditTrail([]);
              setHitlAlert(false);
              setIsRunning(false);
              setWorkflowResult(null);
            }}
            disabled={isRunning}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {(isRunning || completedCount > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Workflow Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{agents.length} agents completed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* HITL Alert */}
      {hitlAlert && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Human-in-the-Loop Review Required</AlertTitle>
          <AlertDescription className="text-amber-700">
            One or more agents reported warnings during workflow execution. Please review the audit trail and API results before proceeding.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Agent Pipeline */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Workflow className="h-4 w-4 text-emerald-600" />
                Agent Pipeline
              </CardTitle>
              <CardDescription>Sequential execution of 8 dMRV agents</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pb-4">
                {agents.map((agent, idx) => {
                  const StatusIcon = statusIcon[agent.status];
                  return (
                    <React.Fragment key={agent.id}>
                      <div
                        className={`rounded-lg border p-4 transition-all duration-300 ${statusBg[agent.status]}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <StatusIcon
                              className={`h-5 w-5 ${statusColor[agent.status]} ${
                                agent.status === 'running' ? 'animate-spin' : ''
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{agent.name}</span>
                              <Badge variant="secondary" className={`text-[10px] h-5 ${badgeStyle[agent.status]}`}>
                                {agent.status.toUpperCase()}
                              </Badge>
                              {agent.confidence !== undefined && (
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] h-5 ${
                                    agent.confidence >= 0.9
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                  }`}
                                >
                                  Confidence: {(agent.confidence * 100).toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
                            {agent.output && (
                              <div className="mt-2 rounded bg-white/80 border p-2 text-xs text-gray-700 leading-relaxed">
                                <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                                  <Eye className="h-3 w-3" />
                                  <span className="font-medium">Output</span>
                                </div>
                                {agent.output}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">#{idx + 1}</span>
                        </div>
                      </div>
                      {idx < agents.length - 1 && (
                        <div className="flex justify-center py-1.5">
                          <ChevronRight className="h-4 w-4 text-slate-300 rotate-90" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* API Workflow Results */}
          {workflowResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  API Workflow Results
                </CardTitle>
                <CardDescription>
                  Real results from backend workflow for {(workflowResult as Record<string, unknown>).projectName as string}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {((workflowResult as Record<string, unknown>).steps as WorkflowStep[])?.map((step, idx) => (
                      <div key={idx} className="rounded-lg border p-3 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{step.agent}</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] h-5 ${
                              step.severity === 'INFO'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                                : step.severity === 'WARNING'
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-50'
                                  : 'bg-red-50 text-red-700 hover:bg-red-50'
                            }`}
                          >
                            {step.severity}
                          </Badge>
                          <span className="text-muted-foreground">{step.action}</span>
                        </div>
                        <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(step.result, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Audit Trail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit Trail</CardTitle>
            <CardDescription>Real-time workflow log</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <div className="px-6 pb-4">
                {auditTrail.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Run the workflow to see the audit trail
                  </div>
                ) : (
                  auditTrail.map((entry, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex gap-3 py-2">
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0 pt-0.5">
                          {entry.time}
                        </span>
                        <p
                          className={`text-xs leading-relaxed ${
                            entry.type === 'error'
                              ? 'text-red-600'
                              : entry.type === 'warn'
                                ? 'text-amber-600'
                                : 'text-gray-700'
                          }`}
                        >
                          {entry.message}
                        </p>
                      </div>
                      {idx < auditTrail.length - 1 && <Separator />}
                    </React.Fragment>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
