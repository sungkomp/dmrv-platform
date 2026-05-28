'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Footprints, Calculator, Leaf, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface ApiEmissionFactor {
  id: string;
  scope: number;
  category: string;
  activityType: string;
  factor: number;
  unit: string;
  source: string;
}

interface Project {
  id: string;
  name: string;
}

interface FootprintCalcResult {
  scope: number;
  activityType: string;
  quantity: number;
  unit: string;
  emissionFactor: number;
  factorSource: string;
  emissionsKgCO2e: number;
  emissionsTco2e: number;
}

interface FootprintCalculation {
  calculationId: string;
  projectId: string;
  timestamp: string;
  calculations: FootprintCalcResult[];
  totalEmissionsKgCO2e: number;
  totalEmissionsTco2e: number;
  scopeBreakdown: {
    scope1: number;
    scope2: number;
    scope3: number;
  };
}

interface FootprintEntry {
  id: string;
  scope: string;
  activity: string;
  quantity: number;
  unit: string;
  factor: number;
  emissions: number;
}

export default function FootprintView() {
  const { toast } = useToast();
  const [emissionFactors, setEmissionFactors] = useState<ApiEmissionFactor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<FootprintEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculation, setLastCalculation] = useState<FootprintCalculation | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [customFactor, setCustomFactor] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [footprintRes, projectsRes] = await Promise.all([
        fetch('/api/dmrv/footprint'),
        fetch('/api/dmrv'),
      ]);

      if (!footprintRes.ok || !projectsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const footprintData = await footprintRes.json();
      const projectsData = await projectsRes.json();

      const factors = (footprintData.emissionFactors as ApiEmissionFactor[]) || [];
      setEmissionFactors(factors);
      setProjects((projectsData.projects as Project[]).map((p: Project) => ({ id: p.id, name: p.name })));

      if (factors.length > 0) {
        setSelectedActivity(factors[0].activityType);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emission factors');
      toast({ title: 'Error', description: 'Failed to load emission factors', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedFactor = emissionFactors.find((ef) => ef.activityType === selectedActivity);

  const handleCalculate = async () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Invalid Quantity', description: 'Please enter a positive number', variant: 'destructive' });
      return;
    }
    if (!selectedActivity) {
      toast({ title: 'No Activity', description: 'Please select an activity type', variant: 'destructive' });
      return;
    }

    try {
      setCalculating(true);
      const scope = selectedFactor?.scope || 1;
      const calcBody = {
        projectId: selectedProjectId || undefined,
        calculations: [{
          scope,
          activityType: selectedActivity,
          quantity: qty,
          ...(customFactor ? { customFactor: parseFloat(customFactor) } : {}),
        }],
      };

      const res = await fetch('/api/dmrv/footprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calcBody),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Calculation failed');
      }

      const data = await res.json();
      const footprint = data.footprint as FootprintCalculation;
      setLastCalculation(footprint);

      // Add to entries list
      footprint.calculations.forEach((calc) => {
        const entry: FootprintEntry = {
          id: `${footprint.calculationId}-${calc.activityType}`,
          scope: `Scope ${calc.scope}`,
          activity: calc.activityType,
          quantity: calc.quantity,
          unit: calc.unit.replace('kgCO2e/', ''),
          factor: calc.emissionFactor,
          emissions: parseFloat(calc.emissionsKgCO2e.toFixed(2)),
        };
        setEntries((prev) => [...prev, entry]);
      });

      setQuantity('');
      setCustomFactor('');
      toast({
        title: 'Footprint Calculated',
        description: `Total: ${footprint.totalEmissionsKgCO2e.toLocaleString()} kgCO2e (${footprint.totalEmissionsTco2e} tCO2e)`,
      });
    } catch (err) {
      toast({
        title: 'Calculation Error',
        description: err instanceof Error ? err.message : 'Calculation failed',
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
    }
  };

  const scope1 = entries.filter((e) => e.scope === 'Scope 1').reduce((s, e) => s + e.emissions, 0);
  const scope2 = entries.filter((e) => e.scope === 'Scope 2').reduce((s, e) => s + e.emissions, 0);
  const scope3 = entries.filter((e) => e.scope === 'Scope 3').reduce((s, e) => s + e.emissions, 0);
  const total = scope1 + scope2 + scope3;

  // Use API scope breakdown if available
  const displayScope1 = lastCalculation?.scopeBreakdown?.scope1 || scope1;
  const displayScope2 = lastCalculation?.scopeBreakdown?.scope2 || scope2;
  const displayScope3 = lastCalculation?.scopeBreakdown?.scope3 || scope3;
  const displayTotal = lastCalculation?.totalEmissionsKgCO2e || total;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent>
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 w-full mb-2" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Carbon Footprint</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Calculate and track organizational carbon footprint by scope
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Failed to load data. <Button variant="link" className="h-auto p-0 text-red-700 underline" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Aggregate Footprint */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{displayTotal.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-emerald-600 font-medium">Total (kgCO2e)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{displayScope1.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground">Scope 1 (Direct)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{displayScope2.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground">Scope 2 (Electricity)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{displayScope3.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground">Scope 3 (Other)</p>
          </CardContent>
        </Card>
      </div>

      {/* Last calculation scope breakdown from API */}
      {lastCalculation && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Last API Calculation: {lastCalculation.calculationId}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Total:</span>{' '}
                <span className="font-mono font-semibold">{lastCalculation.totalEmissionsKgCO2e.toLocaleString()} kgCO2e</span>
              </div>
              <div>
                <span className="text-muted-foreground">tCO2e:</span>{' '}
                <span className="font-mono font-semibold">{lastCalculation.totalEmissionsTco2e}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Scope 1:</span>{' '}
                <span className="font-mono">{lastCalculation.scopeBreakdown.scope1.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Scope 2:</span>{' '}
                <span className="font-mono">{lastCalculation.scopeBreakdown.scope2.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-600" />
              Calculate Footprint
            </CardTitle>
            <CardDescription>Calculate emissions using API emission factors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {emissionFactors.map((ef) => (
                    <SelectItem key={ef.id} value={ef.activityType}>
                      {ef.activityType} (Scope {ef.scope})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Quantity ({selectedFactor?.unit?.replace('kgCO2e/', '') || 'units'})
              </Label>
              <Input
                type="number"
                placeholder="e.g., 1000"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Custom Factor (optional)</Label>
              <Input
                type="number"
                placeholder="Override default factor"
                value={customFactor}
                onChange={(e) => setCustomFactor(e.target.value)}
              />
            </div>
            {selectedFactor && quantity && !isNaN(parseFloat(quantity)) && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Leaf className="h-4 w-4" />
                  <span className="font-semibold">
                    {(parseFloat(quantity) * (customFactor ? parseFloat(customFactor) || 0 : selectedFactor.factor)).toLocaleString('en-US', { maximumFractionDigits: 2 })} kgCO2e
                  </span>
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  Factor: {customFactor || selectedFactor.factor} {selectedFactor.unit} | Ref: {selectedFactor.source}
                </p>
              </div>
            )}
            <Button onClick={handleCalculate} disabled={calculating} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
              {calculating ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculating...</> : <><Footprints className="h-4 w-4" /> Calculate</>}
            </Button>
          </CardContent>
        </Card>

        {/* Emission Factor Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emission Factors</CardTitle>
            <CardDescription>Reference factors from API ({emissionFactors.length} factors)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Activity</TableHead>
                    <TableHead className="text-xs">Factor</TableHead>
                    <TableHead className="text-xs">Scope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emissionFactors.map((ef) => (
                    <TableRow key={ef.id}>
                      <TableCell className="text-xs font-medium">{ef.activityType}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {ef.factor} <span className="text-muted-foreground">{ef.unit}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-5 ${
                            ef.scope === 1
                              ? 'bg-red-50 text-red-700 hover:bg-red-50'
                              : ef.scope === 2
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-50'
                              : 'bg-teal-50 text-teal-700 hover:bg-teal-50'
                          }`}
                        >
                          Scope {ef.scope}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Footprint Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Footprint Entries</CardTitle>
            <CardDescription>Calculated emission entries</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              {entries.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No entries yet. Calculate a footprint to begin.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Activity</TableHead>
                      <TableHead className="text-xs">Qty</TableHead>
                      <TableHead className="text-xs">Emissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <span className="text-xs font-medium">{entry.activity}</span>
                            <Badge
                              variant="secondary"
                              className={`text-[9px] h-4 ml-1 ${
                                entry.scope === 'Scope 1'
                                  ? 'bg-red-50 text-red-600 hover:bg-red-50'
                                  : entry.scope === 'Scope 2'
                                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-50'
                                  : 'bg-teal-50 text-teal-600 hover:bg-teal-50'
                              }`}
                            >
                              {entry.scope}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {entry.quantity.toLocaleString()} {entry.unit}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold text-emerald-700">
                          {entry.emissions.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
