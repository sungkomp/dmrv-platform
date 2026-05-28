'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Scale, BookOpen, Plus, Settings, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface MethodologyParameter {
  name: string;
  type: string;
  default: number | string;
  description: string;
}

interface Methodology {
  id: string;
  name: string;
  version: string;
  trackType: string;
  description: string;
  formula: string;
  parameters: MethodologyParameter[];
  approvedBy: string;
  status: string;
  updatedAt: string;
}

interface GovernanceRule {
  ruleId: string;
  name: string;
  description: string;
  severity: string;
  category: string;
}

const severityStyles: Record<string, string> = {
  MANDATORY: 'bg-red-100 text-red-700 hover:bg-red-100',
  WARNING: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  INFO: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
};

const statusStyles: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  DRAFT: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  DEPRECATED: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
};

export default function GovernanceView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [methodologies, setMethodologies] = useState<Methodology[]>([]);
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [newName, setNewName] = useState('');
  const [newTrackType, setNewTrackType] = useState('biochar');
  const [newVersion, setNewVersion] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFormula, setNewFormula] = useState('');
  const [newApprovedBy, setNewApprovedBy] = useState('');
  const [newParams, setNewParams] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dmrv/governance');
      if (!res.ok) throw new Error('Failed to fetch governance data');
      const data = await res.json();
      setMethodologies(data.methodologies || []);
      setRules(data.rules || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load governance data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMethodology = async () => {
    if (!newName.trim() || !newTrackType) {
      toast({ title: 'Validation Error', description: 'Name and track type are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);

      // Parse parameters from text input
      const parameters: MethodologyParameter[] = newParams.trim()
        ? newParams.split('\n').map((line) => {
            const parts = line.split(',');
            return {
              name: parts[0]?.trim() || '',
              type: parts[1]?.trim() || 'number',
              default: parts[2]?.trim() || '0',
              description: parts[3]?.trim() || '',
            };
          })
        : [];

      const res = await fetch('/api/dmrv/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: newName.trim(),
          trackType: newTrackType,
          version: newVersion.trim() || '1.0',
          description: newDescription.trim(),
          formula: newFormula.trim(),
          parameters,
          approvedBy: newApprovedBy.trim() || 'Pending',
          status: 'DRAFT',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add methodology');
      }

      toast({ title: 'Methodology Added', description: `${newName.trim()} created as Draft` });
      setNewName('');
      setNewVersion('');
      setNewDescription('');
      setNewFormula('');
      setNewApprovedBy('');
      setNewParams('');
      setShowForm(false);
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to add methodology', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Governance</h2>
            <p className="text-muted-foreground text-sm mt-1">Manage methodologies, rules, and system parameters</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Governance</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage methodologies, rules, and system parameters</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Add Methodology
        </Button>
      </div>

      {/* Add Methodology Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Methodology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Methodology Name</Label>
                <Input placeholder="e.g., Biochar Carbon Removal" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Track Type</Label>
                <Select value={newTrackType} onValueChange={setNewTrackType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['biochar', 'awd', 'biogas', 'solar', 'forest', 'governance'].map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input placeholder="e.g., v1.0" value={newVersion} onChange={(e) => setNewVersion(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the methodology..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Formula</Label>
                <Textarea
                  placeholder="e.g., tCO2e = mass_kg × carbon_fraction × stability_factor"
                  value={newFormula}
                  onChange={(e) => setNewFormula(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parameters (one per line: name, type, default, description)</Label>
              <Textarea
                placeholder={"mass_kg, number, 1000, Biochar mass in kilograms\ncarbon_fraction, number, 0.7, Carbon content fraction"}
                value={newParams}
                onChange={(e) => setNewParams(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Approved By</Label>
              <Input placeholder="e.g., IPCC, TGO" value={newApprovedBy} onChange={(e) => setNewApprovedBy(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddMethodology} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Methodology List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                Methodologies
              </CardTitle>
              <CardDescription>{methodologies.length} registered methodologies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {methodologies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No methodologies found</div>
              ) : (
                methodologies.map((method) => (
                  <div key={method.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{method.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-5">{method.version}</Badge>
                        <Badge variant="secondary" className="text-[10px] h-5">{method.trackType}</Badge>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[method.status] || 'bg-slate-100 text-slate-700'}`}>
                        {method.status}
                      </Badge>
                    </div>
                    {method.description && (
                      <p className="text-xs text-muted-foreground mb-2">{method.description}</p>
                    )}
                    {method.formula && method.formula !== 'N/A' && (
                      <div className="rounded bg-emerald-50 border border-emerald-100 p-2 mb-2">
                        <p className="text-xs font-mono text-emerald-800">{method.formula}</p>
                      </div>
                    )}
                    {method.parameters.length > 0 && (
                      <div className="rounded bg-slate-50 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Parameters</p>
                        <div className="space-y-1.5">
                          {method.parameters.map((param, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs flex-wrap">
                              <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                {param.name}
                              </Badge>
                              <span className="text-muted-foreground">type: <span className="font-mono">{param.type}</span></span>
                              <span className="text-muted-foreground">default: <span className="font-mono font-semibold">{String(param.default)}</span></span>
                              {param.description && (
                                <span className="text-muted-foreground italic">— {param.description}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-muted-foreground">Approved by: {method.approvedBy}</p>
                      <p className="text-[10px] text-muted-foreground">Updated: {new Date(method.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rules Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-600" />
              Rules & Thresholds
            </CardTitle>
            <CardDescription>System governance parameters</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="px-6">
                {rules.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">No rules defined</div>
                ) : (
                  rules.map((rule, idx) => (
                    <React.Fragment key={rule.ruleId}>
                      <div className="py-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium">{rule.name}</span>
                          <Badge variant="secondary" className={`text-[10px] h-5 ${severityStyles[rule.severity] || 'bg-slate-100 text-slate-700'}`}>
                            {rule.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                        <Badge variant="secondary" className="text-[10px] h-5 mt-1">{rule.category}</Badge>
                      </div>
                      {idx < rules.length - 1 && <Separator />}
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
