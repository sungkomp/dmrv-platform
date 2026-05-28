'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, FileBarChart, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  methodology: string;
  status: string;
  areaHa: number;
  location: string;
}

interface ReportData {
  reportId: string;
  projectId: string;
  projectName: string;
  methodology: string;
  generatedAt: string;
  carbonAccounting: {
    creditsGenerated: number;
    carbonFootprint: number;
    netCarbonBalance: number;
    netStatus: string;
  };
  projectDetails: {
    area: number;
    location: string;
    status: string;
    plotCount: number;
  };
  certification: {
    totalCertificates: number;
    approved: number;
    pending: number;
    totalCertifiedTco2e: number;
  };
  dataQuality: {
    ingestionPoints: number;
    sourceTypes: string[];
    encryptedLogs: number;
    publicLogs: number;
  };
}

export default function ReportingView() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [reportType, setReportType] = useState('sustainability');
  const [projectId, setProjectId] = useState('');
  const [period, setPeriod] = useState('Q4-2024');
  const [carbonFootprint, setCarbonFootprint] = useState('0');
  const [report, setReport] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      const res = await fetch('/api/dmrv');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load projects', variant: 'destructive' });
    } finally {
      setProjectsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleGenerate = async () => {
    if (!projectId) {
      toast({ title: 'Validation Error', description: 'Please select a project', variant: 'destructive' });
      return;
    }
    try {
      setGenerating(true);
      setReport(null);
      const res = await fetch('/api/dmrv/reporting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          carbonFootprint: parseFloat(carbonFootprint) || 0,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate report');
      }
      const data = await res.json();
      setReport(data.report);
      toast({ title: 'Report Generated', description: `${reportType === 'sustainability' ? 'Sustainability' : 'Verification'} report for ${data.report.projectName}` });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to generate report', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    toast({ title: 'Export Started', description: 'Report is being exported as PDF' });
  };

  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Reporting</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Generate sustainability reports and verification documents
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Report Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Generate Report
            </CardTitle>
            <CardDescription>Create a new report for a project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sustainability">Sustainability Report</SelectItem>
                  <SelectItem value="verification">Verification Report</SelectItem>
                  <SelectItem value="carbon">Carbon Credit Statement</SelectItem>
                  <SelectItem value="audit">Audit Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              {projectsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedProject && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Methodology:</span>
                  <span className="font-medium">{selectedProject.methodology}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{selectedProject.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Area:</span>
                  <span className="font-medium">{selectedProject.areaHa} ha</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Carbon Footprint (tCO2e)</Label>
              <input
                type="number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g., 1240"
                value={carbonFootprint}
                onChange={(e) => setCarbonFootprint(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reporting Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q4-2024">Q4 2024</SelectItem>
                  <SelectItem value="Q3-2024">Q3 2024</SelectItem>
                  <SelectItem value="Q2-2024">Q2 2024</SelectItem>
                  <SelectItem value="Q1-2024">Q1 2024</SelectItem>
                  <SelectItem value="FY-2024">Full Year 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generating || !projectId} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileBarChart className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Sustainability Report</CardTitle>
                <CardDescription>Net Carbon Balance & project summary</CardDescription>
              </div>
              {report && (
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generating ? (
              <div className="space-y-6">
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <Skeleton className="h-32 w-full" />
              </div>
            ) : report ? (
              <div className="space-y-6">
                {/* Report Header */}
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-emerald-800">Sustainability Report</h3>
                      <p className="text-sm text-emerald-700">Project: {report.projectName} ({report.projectId}) | Period: {period}</p>
                      <p className="text-xs text-emerald-600 mt-1">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{report.methodology}</Badge>
                      <Badge className={report.carbonAccounting.netStatus === 'NET_POSITIVE' ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'bg-red-600 text-white hover:bg-red-600'}>
                        {report.carbonAccounting.netStatus === 'NET_POSITIVE' ? 'Net Positive' : 'Net Negative'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Net Carbon Balance */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Net Carbon Balance</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{report.carbonAccounting.creditsGenerated.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Credits Generated (tCO2e)</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-red-500">{report.carbonAccounting.carbonFootprint.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Carbon Footprint (tCO2e)</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{report.carbonAccounting.netCarbonBalance.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Net Balance (tCO2e)</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-teal-600">
                        {report.carbonAccounting.creditsGenerated > 0
                          ? ((report.carbonAccounting.netCarbonBalance / report.carbonAccounting.creditsGenerated) * 100).toFixed(1)
                          : '0.0'}%
                      </p>
                      <p className="text-xs text-muted-foreground">Reduction Ratio</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Project Details */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Project Details</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{report.projectDetails.area}</p>
                      <p className="text-xs text-muted-foreground">Area (ha)</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{report.projectDetails.plotCount}</p>
                      <p className="text-xs text-muted-foreground">Plots</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{report.dataQuality.ingestionPoints}</p>
                      <p className="text-xs text-muted-foreground">Data Points</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{report.dataQuality.sourceTypes.length}</p>
                      <p className="text-xs text-muted-foreground">Source Types</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Data Quality */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Data Quality</h4>
                  <div className="space-y-2">
                    {report.dataQuality.sourceTypes.length > 0 && (
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">Source Types</span>
                        <div className="flex gap-1.5">
                          {report.dataQuality.sourceTypes.map((s) => (
                            <Badge key={s} variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">Encrypted Logs</span>
                      <span className="font-mono font-semibold text-sm">{report.dataQuality.encryptedLogs}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">Public Logs</span>
                      <span className="font-mono font-semibold text-sm">{report.dataQuality.publicLogs}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Certification Status */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Certification Status</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{report.certification.totalCertificates}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold text-emerald-600">{report.certification.approved}</p>
                      <p className="text-xs text-muted-foreground">Approved</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold text-amber-600">{report.certification.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold text-teal-600">{report.certification.totalCertifiedTco2e.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Certified tCO2e</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileBarChart className="h-16 w-16 mb-4 text-slate-200" />
                <p className="text-sm">Generate a report to preview it here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
