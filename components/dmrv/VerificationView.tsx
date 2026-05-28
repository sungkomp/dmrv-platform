'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Shield, Activity, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  methodology: string;
}

interface SourceBreakdown {
  sourceType: string;
  logCount: number;
  activities: string[];
}

interface VerificationResult {
  projectId: string;
  projectName: string;
  integrityScore: number;
  integrityGrade: string;
  hashCoverage: number;
  recommendation: string;
  crossValidation: {
    passed: boolean;
    requiredSourceTypes: number;
    actualSourceTypes: number;
    sourceBreakdown: SourceBreakdown[];
  };
}

export default function VerificationView() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [history, setHistory] = useState<VerificationResult[]>([]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/dmrv');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load projects', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProjects();
      setLoading(false);
    };
    init();
  }, [fetchProjects]);

  const runVerification = async () => {
    if (!projectId) {
      toast({ title: 'Validation Error', description: 'Please select a project', variant: 'destructive' });
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch('/api/dmrv/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, minimumSourceTypes: 2 }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Verification failed');
      }
      const data = await res.json();
      const verification = data.verification as VerificationResult;

      setResult(verification);
      setHistory((prev) => [verification, ...prev]);
      toast({
        title: verification.crossValidation.passed ? 'Verification Passed' : 'Verification Failed',
        description: `Integrity: ${verification.integrityScore}% | Grade: ${verification.integrityGrade} | Sources: ${verification.crossValidation.actualSourceTypes}`,
        variant: verification.crossValidation.passed ? 'default' : 'destructive',
      });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Verification failed', variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const scoreBarColor = (score: number) => {
    if (score >= 90) return '[&>div]:bg-emerald-500';
    if (score >= 80) return '[&>div]:bg-green-500';
    if (score >= 70) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-red-500';
  };

  const gradeColor = (grade: string) => {
    if (grade === 'A') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    if (grade === 'B') return 'bg-green-100 text-green-700 hover:bg-green-100';
    if (grade === 'C') return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    return 'bg-red-100 text-red-700 hover:bg-red-100';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card><CardContent className="p-6"><Skeleton className="h-48" /></CardContent></Card>
          <div className="lg:col-span-2"><Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Cross-Modal Verification</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Validate data integrity across multiple source types
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Verification Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              Run Verification
            </CardTitle>
            <CardDescription>Cross-validate project data integrity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={runVerification}
              disabled={isVerifying}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isVerifying ? 'Verifying...' : <><CheckCircle className="h-4 w-4" /> Run Verification</>}
            </Button>
          </CardContent>
        </Card>

        {/* Current Result */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Verification Result</CardTitle>
            <CardDescription>
              {result ? `Results for ${result.projectName || result.projectId}` : 'Run a verification to see results'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`rounded-lg p-4 text-center ${result.crossValidation.passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className={`text-3xl font-bold ${result.crossValidation.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                    {result.crossValidation.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                {/* Integrity Score & Grade */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Integrity Score</span>
                      <span className={`text-lg font-bold ${scoreColor(result.integrityScore)}`}>
                        {result.integrityScore}%
                      </span>
                    </div>
                    <Progress value={result.integrityScore} className={`h-3 ${scoreBarColor(result.integrityScore)}`} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Integrity Grade</span>
                      <Badge className={`text-lg px-3 py-1 ${gradeColor(result.integrityGrade)}`}>
                        {result.integrityGrade}
                      </Badge>
                    </div>
                    <Progress value={result.hashCoverage} className={`h-3 ${scoreBarColor(result.hashCoverage)}`} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Hash Coverage</span>
                      <span>{result.hashCoverage}%</span>
                    </div>
                  </div>
                </div>

                {/* Source Coverage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Source Types ({result.crossValidation.actualSourceTypes}/{result.crossValidation.requiredSourceTypes} minimum)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {result.crossValidation.sourceBreakdown.map((sb) => (
                      <Badge
                        key={sb.sourceType}
                        variant="secondary"
                        className="text-[10px] h-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      >
                        {sb.sourceType} ({sb.logCount})
                      </Badge>
                    ))}
                    {result.crossValidation.sourceBreakdown.length === 0 && (
                      <span className="text-xs text-muted-foreground">No data sources found</span>
                    )}
                  </div>
                </div>

                {/* Recommendation */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <span className="text-xs font-medium text-muted-foreground">Recommendation:</span>
                  <p className="text-sm mt-1">{result.recommendation}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mb-3 text-slate-300" />
                <p className="text-sm">No verification results yet</p>
                <p className="text-xs">Select a project and run verification</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verification History</CardTitle>
            <CardDescription>Previous verification attempts in this session</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Score</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Grade</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Sources</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Hash Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="p-3 font-medium">{h.projectName || h.projectId}</td>
                      <td className={`p-3 font-semibold ${scoreColor(h.integrityScore)}`}>{h.integrityScore}%</td>
                      <td className="p-3">
                        <Badge variant="secondary" className={`text-[10px] h-5 ${gradeColor(h.integrityGrade)}`}>
                          {h.integrityGrade}
                        </Badge>
                      </td>
                      <td className="p-3">{h.crossValidation.actualSourceTypes}</td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-5 ${
                            h.crossValidation.passed
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-100 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {h.crossValidation.passed ? 'PASSED' : 'FAILED'}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{h.hashCoverage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
