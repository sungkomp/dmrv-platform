'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Play, Download, Loader2, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

type SimType = 'AWD' | 'Biogas' | 'Solar' | 'Biochar' | 'Footprint';

const simTypeToApi: Record<SimType, string> = {
  AWD: 'awd',
  Biogas: 'biogas',
  Solar: 'solar',
  Biochar: 'biochar',
  Footprint: 'footprint',
};

interface SimResult {
  type: SimType;
  tco2e: number;
  revenue: number;
  confidence: number;
  certEligible: boolean;
  parameters: Record<string, string>;
}

interface ApiSimulationYear {
  year: number;
  tco2e: number;
  cumulative: number;
  details: Record<string, unknown>;
}

interface ApiSimulationResult {
  results: ApiSimulationYear[] | Record<string, unknown>;
  summary: Record<string, unknown>;
}

interface Project {
  id: string;
  name: string;
}

const simFields: Record<SimType, { key: string; label: string; placeholder: string }[]> = {
  AWD: [
    { key: 'area', label: 'Area (hectares)', placeholder: 'e.g., 1000' },
    { key: 'seasons', label: 'Seasons per year', placeholder: 'e.g., 2' },
    { key: 'years', label: 'Project duration (years)', placeholder: 'e.g., 10' },
    { key: 'pricePerTco2e', label: 'Credit price (฿/tCO2e)', placeholder: 'e.g., 550' },
  ],
  Biogas: [
    { key: 'ch4Captured', label: 'CH4 captured per year (tonnes)', placeholder: 'e.g., 200' },
    { key: 'efficiency', label: 'Capture efficiency (%)', placeholder: 'e.g., 95' },
    { key: 'years', label: 'Project duration (years)', placeholder: 'e.g., 10' },
    { key: 'pricePerTco2e', label: 'Credit price (฿/tCO2e)', placeholder: 'e.g., 520' },
  ],
  Solar: [
    { key: 'capacity', label: 'Installed capacity (MW)', placeholder: 'e.g., 5' },
    { key: 'capacityFactor', label: 'Capacity factor (%)', placeholder: 'e.g., 18' },
    { key: 'years', label: 'Project duration (years)', placeholder: 'e.g., 10' },
    { key: 'pricePerTco2e', label: 'Credit price (฿/tCO2e)', placeholder: 'e.g., 480' },
  ],
  Biochar: [
    { key: 'biocharProduced', label: 'Biochar produced per year (tonnes)', placeholder: 'e.g., 500' },
    { key: 'stabilityFactor', label: 'Carbon stability factor', placeholder: 'e.g., 0.73' },
    { key: 'years', label: 'Project duration (years)', placeholder: 'e.g., 10' },
    { key: 'pricePerTco2e', label: 'Credit price (฿/tCO2e)', placeholder: 'e.g., 600' },
  ],
  Footprint: [
    { key: 'electricity', label: 'Electricity usage (MWh/year)', placeholder: 'e.g., 10000' },
    { key: 'diesel', label: 'Diesel usage (kL/year)', placeholder: 'e.g., 500' },
    { key: 'years', label: 'Project duration (years)', placeholder: 'e.g., 10' },
    { key: 'pricePerTco2e', label: 'Credit price (฿/tCO2e)', placeholder: 'e.g., 500' },
  ],
};

export default function SimulationView() {
  const { toast } = useToast();
  const [simType, setSimType] = useState<SimType>('AWD');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [history, setHistory] = useState<SimResult[]>([]);
  const [apiResult, setApiResult] = useState<ApiSimulationResult | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  const fields = simFields[simType];

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/dmrv');
      if (res.ok) {
        const data = await res.json();
        setProjects((data.projects as Project[]).map((p: Project) => ({ id: p.id, name: p.name })));
      }
    } catch {
      // Silently fail — projects are optional for simulation
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const buildApiParams = (): Record<string, unknown> => {
    const simulationType = simTypeToApi[simType];
    const years = parseInt(inputs['years'] || '10');

    const base: Record<string, unknown> = { simulationType, years };

    switch (simType) {
      case 'AWD': {
        const area = parseFloat(inputs['area'] || '0');
        base.areaHa = area;
        base.baselineEmission = 3.5;
        base.mitigationFactor = 0.5;
        break;
      }
      case 'Biogas': {
        const ch4 = parseFloat(inputs['ch4Captured'] || '0');
        const eff = parseFloat(inputs['efficiency'] || '0') / 100;
        base.ch4CaptureRate = eff;
        base.animalUnits = Math.round(ch4 / 0.6);
        base.fuelDisplacementRate = 20;
        break;
      }
      case 'Solar': {
        const cap = parseFloat(inputs['capacity'] || '0');
        const cf = parseFloat(inputs['capacityFactor'] || '0') / 100;
        base.systemCapacityKw = cap * 1000;
        base.capacityFactor = cf;
        base.gridEmissionFactor = 0.5086;
        break;
      }
      case 'Biochar': {
        const biochar = parseFloat(inputs['biocharProduced'] || '0');
        const sf = parseFloat(inputs['stabilityFactor'] || '0.73');
        base.biocharMassKg = biochar * 1000;
        base.carbonFraction = 0.7;
        base.stabilityFactor = sf;
        break;
      }
      case 'Footprint': {
        const elec = parseFloat(inputs['electricity'] || '0');
        const diesel = parseFloat(inputs['diesel'] || '0');
        base.electricityKwh = elec * 1000;
        base.dieselLiters = diesel * 1000;
        break;
      }
    }

    return base;
  };

  const runSimulation = async () => {
    const hasEmpty = fields.some((f) => !inputs[f.key]?.trim());
    if (hasEmpty) {
      toast({ title: 'Validation Error', description: 'All parameters are required', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    setApiLoading(true);

    // Client-side simulation (kept as-is)
    let tco2e = 0;
    const pricePerTco2e = parseFloat(inputs['pricePerTco2e'] || '0');
    const years = parseFloat(inputs['years'] || '1');

    switch (simType) {
      case 'AWD': {
        const area = parseFloat(inputs['area'] || '0');
        const seasons = parseFloat(inputs['seasons'] || '0');
        tco2e = area * seasons * years * 1.38;
        break;
      }
      case 'Biogas': {
        const ch4 = parseFloat(inputs['ch4Captured'] || '0');
        const eff = parseFloat(inputs['efficiency'] || '0') / 100;
        tco2e = ch4 * years * 25 * eff;
        break;
      }
      case 'Solar': {
        const cap = parseFloat(inputs['capacity'] || '0');
        const cf = parseFloat(inputs['capacityFactor'] || '0') / 100;
        const mwhPerYear = cap * cf * 8760;
        tco2e = mwhPerYear * years * 0.5086;
        break;
      }
      case 'Biochar': {
        const biochar = parseFloat(inputs['biocharProduced'] || '0');
        const sf = parseFloat(inputs['stabilityFactor'] || '0.73');
        tco2e = biochar * sf * years;
        break;
      }
      case 'Footprint': {
        const elec = parseFloat(inputs['electricity'] || '0');
        const diesel = parseFloat(inputs['diesel'] || '0');
        tco2e = (elec * 0.5086 + diesel * 2.68) * years;
        break;
      }
    }

    const confidence = 0.78 + Math.random() * 0.2;
    const simResult: SimResult = {
      type: simType,
      tco2e: parseFloat(tco2e.toFixed(2)),
      revenue: parseFloat((tco2e * pricePerTco2e).toFixed(2)),
      confidence: parseFloat(confidence.toFixed(3)),
      certEligible: tco2e > 1000 && confidence > 0.85,
      parameters: { ...inputs },
    };

    setResult(simResult);
    setHistory((prev) => [simResult, ...prev]);
    setIsRunning(false);
    toast({ title: 'Simulation Complete', description: `${simType}: ${tco2e.toLocaleString('en-US', { maximumFractionDigits: 0 })} tCO2e over ${years} years` });

    // Also run API simulation
    try {
      const apiParams = buildApiParams();
      const res = await fetch('/api/dmrv/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiParams),
      });

      if (res.ok) {
        const data = await res.json();
        setApiResult(data.simulation as ApiSimulationResult);
      }
    } catch {
      // API simulation is optional, don't block
    } finally {
      setApiLoading(false);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const exportData = {
      clientResult: result,
      apiResult,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-${simType}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Snapshot Exported', description: 'Simulation results saved as JSON' });
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
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="py-20">
              <Skeleton className="h-16 w-16 mx-auto mb-4" />
              <Skeleton className="h-4 w-48 mx-auto" />
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
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Pre-Assessment Simulator</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Estimate carbon credit potential before formal project submission
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Simulator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-emerald-600" />
              Run Simulation
            </CardTitle>
            <CardDescription>Configure parameters and estimate credits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={simType} onValueChange={(v) => { setSimType(v as SimType); setInputs({}); setApiResult(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(simFields) as SimType[]).map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              onClick={runSimulation}
              disabled={isRunning}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isRunning ? <><Loader2 className="h-4 w-4 animate-spin" /> Simulating...</> : <><Play className="h-4 w-4" /> Run Simulation</>}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Simulation Results</CardTitle>
                      <CardDescription>{result.type} activity simulation</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Snapshot
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-lg border p-4 text-center bg-emerald-50/50 border-emerald-200">
                      <p className="text-2xl font-bold text-emerald-700">
                        {result.tco2e.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-emerald-600">Total tCO2e</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-teal-700">
                        ฿{result.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">Est. Revenue</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className={`text-2xl font-bold ${result.confidence >= 0.85 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {(result.confidence * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className={`text-2xl font-bold ${result.certEligible ? 'text-emerald-600' : 'text-red-600'}`}>
                        {result.certEligible ? 'YES' : 'NO'}
                      </p>
                      <p className="text-xs text-muted-foreground">Cert. Eligible</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Parameters Used */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Parameters Used</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(result.parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between rounded bg-slate-50 p-2 text-xs">
                          <span className="text-muted-foreground">{simFields[result.type].find((f) => f.key === key)?.label || key}</span>
                          <span className="font-mono font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Eligibility Details */}
                  <div className={`rounded-lg p-4 ${result.certEligible ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    <h4 className={`text-sm font-semibold ${result.certEligible ? 'text-emerald-800' : 'text-red-800'}`}>
                      Certification Eligibility
                    </h4>
                    <p className={`text-xs mt-1 ${result.certEligible ? 'text-emerald-700' : 'text-red-700'}`}>
                      {result.certEligible
                        ? 'This simulation meets the minimum requirements for T-VER certification (1,000+ tCO2e and 85%+ confidence).'
                        : `This simulation does not meet certification requirements. ${result.tco2e < 1000 ? 'Emissions below 1,000 tCO2e threshold. ' : ''}${result.confidence < 0.85 ? 'Confidence below 85% threshold.' : ''}`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* API Simulation Results Tab */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4 text-emerald-600" />
                    Compare with API
                  </CardTitle>
                  <CardDescription>Backend simulation results for comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  {apiLoading ? (
                    <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running API simulation...
                    </div>
                  ) : apiResult ? (
                    <Tabs defaultValue="yearly">
                      <TabsList>
                        <TabsTrigger value="yearly">Yearly Breakdown</TabsTrigger>
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                      </TabsList>
                      <TabsContent value="yearly">
                        {Array.isArray(apiResult.results) ? (
                          <ScrollArea className="max-h-64">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2 font-medium text-muted-foreground text-xs">Year</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground text-xs">tCO2e</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground text-xs">Cumulative</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(apiResult.results as ApiSimulationYear[]).map((yr) => (
                                  <tr key={yr.year} className="border-b last:border-0">
                                    <td className="p-2 text-xs">Year {yr.year}</td>
                                    <td className="p-2 text-xs font-mono text-right">{yr.tco2e.toLocaleString()}</td>
                                    <td className="p-2 text-xs font-mono text-right text-emerald-700 font-semibold">{yr.cumulative.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        ) : (
                          <div className="rounded-lg bg-slate-50 p-4">
                            <pre className="text-xs overflow-auto">{JSON.stringify(apiResult.results, null, 2)}</pre>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="summary">
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(apiResult.summary).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="text-emerald-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="font-mono font-semibold text-emerald-800">
                                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground text-sm">
                      API simulation will run automatically when you run a client-side simulation.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* History */}
              {history.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Simulation History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">tCO2e</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Revenue</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Confidence</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Eligible</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="p-3">
                                <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                  {h.type}
                                </Badge>
                              </td>
                              <td className="p-3 font-mono">{h.tco2e.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                              <td className="p-3 font-mono">฿{h.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                              <td className="p-3">{(h.confidence * 100).toFixed(1)}%</td>
                              <td className="p-3">
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] h-5 ${
                                    h.certEligible
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-red-100 text-red-700 hover:bg-red-100'
                                  }`}
                                >
                                  {h.certEligible ? 'YES' : 'NO'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FlaskConical className="h-16 w-16 mb-4 text-slate-200" />
                <p className="text-sm">Configure parameters and run a simulation</p>
                <p className="text-xs mt-1">Results will appear here with both client-side and API calculations</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
