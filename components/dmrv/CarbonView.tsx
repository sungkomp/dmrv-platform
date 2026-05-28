'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Leaf, Calculator, BookOpen, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type CarbonType = 'biochar' | 'awd' | 'biogas' | 'solar' | 'bluecarbon';

interface CalcResult {
  type: CarbonType;
  tco2e: number;
  methodology: string;
  formula: string;
  breakdown: Record<string, number>;
}

interface Credit {
  id: string;
  tokenId: string;
  projectId: string;
  amount: number;
  status: string;
  metadata: string;
  createdAt: string;
  project: { id: string; name: string; methodology: string };
}

interface Project {
  id: string;
  name: string;
  methodology: string;
}

interface CarbonSummary {
  totalCredits: number;
  available: number;
  traded: number;
  retired: number;
}

const emissionFactors = [
  { source: 'Grid Electricity (Thailand)', factor: 0.5086, unit: 'tCO2e/MWh', reference: 'TGO-EF 2024' },
  { source: 'Diesel Combustion', factor: 2.68, unit: 'tCO2e/kL', reference: 'IPCC 2006' },
  { source: 'N2O from Soil (Urea)', factor: 0.0117, unit: 'tCO2e/kg N', reference: 'IPCC 2019' },
  { source: 'Methane from Rice (AWD)', factor: 1.38, unit: 'tCO2e/ha/season', reference: 'IRRI 2023' },
  { source: 'Biochar Carbon Stability', factor: 0.73, unit: 'tCO2e/t biochar', reference: 'IPCC 2019' },
  { source: 'Biogas Methane Capture', factor: 25.0, unit: 'tCO2e/t CH4', reference: 'IPCC AR5' },
  { source: 'Solar PV Offset', factor: 0.5086, unit: 'tCO2e/MWh', reference: 'TGO-EF 2024' },
  { source: 'Blue Carbon Sequestration', factor: 9.9, unit: 'tCO2e/ha/yr', reference: 'Murray et al. 2011' },
];

const typeLabels: Record<CarbonType, string> = {
  biochar: 'Biochar',
  awd: 'AWD',
  biogas: 'Biogas',
  solar: 'Solar',
  bluecarbon: 'Blue Carbon',
};

const statusStyles: Record<string, string> = {
  Available: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  Traded: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  Retired: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
};

export default function CarbonView() {
  const { toast } = useToast();
  const [results, setResults] = useState<CalcResult[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [summary, setSummary] = useState<CarbonSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [createCredit, setCreateCredit] = useState(false);

  // Biochar state
  const [biocharInput, setBiocharInput] = useState({ biocharProduced: '', stabilityFactor: '0.85' });
  // AWD state
  const [awdInput, setAwdInput] = useState({ area: '', baseline: '3.5', mitigationFactor: '0.5' });
  // Biogas state
  const [biogasInput, setBiogasInput] = useState({ ch4Captured: '', fuelDisplacement: '' });
  // Solar state
  const [solarInput, setSolarInput] = useState({ generation: '', gridFactor: '0.5086' });
  // Blue Carbon state
  const [blueInput, setBlueInput] = useState({ area: '', years: '' });

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/dmrv/carbon');
      if (!res.ok) throw new Error('Failed to fetch credits');
      const data = await res.json();
      setCredits(data.credits || []);
      setSummary(data.summary || null);
    } catch {
      toast({ title: 'Error', description: 'Failed to load carbon credits', variant: 'destructive' });
    }
  }, [toast]);

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
      await Promise.all([fetchCredits(), fetchProjects()]);
      setLoading(false);
    };
    init();
  }, [fetchCredits, fetchProjects]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchCredits();
    setLoading(false);
    toast({ title: 'Refreshed', description: 'Carbon credits data updated' });
  };

  const calculateBiochar = async () => {
    const produced = parseFloat(biocharInput.biocharProduced);
    if (isNaN(produced) || produced <= 0) {
      toast({ title: 'Invalid Input', description: 'Biochar produced must be a positive number', variant: 'destructive' });
      return;
    }
    setCalculating(true);
    try {
      const res = await fetch('/api/dmrv/carbon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackType: 'biochar',
          methodology: 'IPCC-2023',
          mass: produced,
          carbonFraction: 0.7,
          stability: parseFloat(biocharInput.stabilityFactor),
          projectId: selectedProjectId || undefined,
          createCredit: createCredit && !!selectedProjectId,
        }),
      });
      if (!res.ok) throw new Error('Calculation failed');
      const data = await res.json();
      const calc = data.calculation;
      setResults((prev) => [...prev, { type: 'biochar', tco2e: calc.tco2e, methodology: 'IPCC 2019 — Biochar Carbon Stability', formula: calc.formula, breakdown: calc.breakdown }]);
      toast({ title: 'Calculation Complete', description: `Biochar: ${calc.tco2e.toFixed(2)} tCO2e${data.credit ? ' (Credit created)' : ''}` });
      if (data.credit) await fetchCredits();
    } catch {
      toast({ title: 'Error', description: 'Carbon calculation failed', variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  const calculateAWD = async () => {
    const area = parseFloat(awdInput.area);
    if (isNaN(area) || area <= 0) {
      toast({ title: 'Invalid Input', description: 'Area must be a positive number', variant: 'destructive' });
      return;
    }
    setCalculating(true);
    try {
      const res = await fetch('/api/dmrv/carbon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackType: 'awd',
          methodology: 'IPCC-2023',
          area,
          baseline: parseFloat(awdInput.baseline),
          mitigationFactor: parseFloat(awdInput.mitigationFactor),
          projectId: selectedProjectId || undefined,
          createCredit: createCredit && !!selectedProjectId,
        }),
      });
      if (!res.ok) throw new Error('Calculation failed');
      const data = await res.json();
      const calc = data.calculation;
      setResults((prev) => [...prev, { type: 'awd', tco2e: calc.tco2e, methodology: 'IRRI 2023 — AWD Methane Reduction', formula: calc.formula, breakdown: calc.breakdown }]);
      toast({ title: 'Calculation Complete', description: `AWD: ${calc.tco2e.toFixed(2)} tCO2e${data.credit ? ' (Credit created)' : ''}` });
      if (data.credit) await fetchCredits();
    } catch {
      toast({ title: 'Error', description: 'Carbon calculation failed', variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  const calculateBiogas = async () => {
    const ch4 = parseFloat(biogasInput.ch4Captured);
    if (isNaN(ch4) || ch4 <= 0) {
      toast({ title: 'Invalid Input', description: 'CH4 captured must be a positive number', variant: 'destructive' });
      return;
    }
    setCalculating(true);
    try {
      const res = await fetch('/api/dmrv/carbon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackType: 'biogas',
          methodology: 'IPCC-2023',
          ch4Capture: ch4,
          fuelDisplacement: parseFloat(biogasInput.fuelDisplacement) || 0,
          projectId: selectedProjectId || undefined,
          createCredit: createCredit && !!selectedProjectId,
        }),
      });
      if (!res.ok) throw new Error('Calculation failed');
      const data = await res.json();
      const calc = data.calculation;
      setResults((prev) => [...prev, { type: 'biogas', tco2e: calc.tco2e, methodology: 'IPCC AR5 — Biogas Methane Capture', formula: calc.formula, breakdown: calc.breakdown }]);
      toast({ title: 'Calculation Complete', description: `Biogas: ${calc.tco2e.toFixed(2)} tCO2e${data.credit ? ' (Credit created)' : ''}` });
      if (data.credit) await fetchCredits();
    } catch {
      toast({ title: 'Error', description: 'Carbon calculation failed', variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  const calculateSolar = async () => {
    const gen = parseFloat(solarInput.generation);
    if (isNaN(gen) || gen <= 0) {
      toast({ title: 'Invalid Input', description: 'Generation must be a positive number', variant: 'destructive' });
      return;
    }
    setCalculating(true);
    try {
      const res = await fetch('/api/dmrv/carbon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackType: 'solar',
          methodology: 'IPCC-2023',
          kwh: gen * 1000, // Convert MWh to kWh
          gridEF: parseFloat(solarInput.gridFactor),
          projectId: selectedProjectId || undefined,
          createCredit: createCredit && !!selectedProjectId,
        }),
      });
      if (!res.ok) throw new Error('Calculation failed');
      const data = await res.json();
      const calc = data.calculation;
      setResults((prev) => [...prev, { type: 'solar', tco2e: calc.tco2e, methodology: 'TGO-EF 2024 — Solar Grid Offset', formula: calc.formula, breakdown: calc.breakdown }]);
      toast({ title: 'Calculation Complete', description: `Solar: ${calc.tco2e.toFixed(2)} tCO2e${data.credit ? ' (Credit created)' : ''}` });
      if (data.credit) await fetchCredits();
    } catch {
      toast({ title: 'Error', description: 'Carbon calculation failed', variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  const calculateBlue = async () => {
    const area = parseFloat(blueInput.area);
    const years = parseFloat(blueInput.years);
    if (isNaN(area) || isNaN(years) || area <= 0 || years <= 0) {
      toast({ title: 'Invalid Input', description: 'Area and years must be positive numbers', variant: 'destructive' });
      return;
    }
    // Blue carbon uses area-based formula, map to AWD-like endpoint with appropriate values
    setCalculating(true);
    try {
      const res = await fetch('/api/dmrv/carbon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackType: 'awd',
          methodology: 'T-VER-FOREST',
          baseline: 9.9, // Blue carbon sequestration rate
          mitigationFactor: 1.0,
          area: area * years,
          projectId: selectedProjectId || undefined,
          createCredit: createCredit && !!selectedProjectId,
        }),
      });
      if (!res.ok) throw new Error('Calculation failed');
      const data = await res.json();
      const calc = data.calculation;
      setResults((prev) => [...prev, { type: 'bluecarbon', tco2e: calc.tco2e, methodology: 'Murray et al. 2011 — Blue Carbon Sequestration', formula: calc.formula, breakdown: calc.breakdown }]);
      toast({ title: 'Calculation Complete', description: `Blue Carbon: ${calc.tco2e.toFixed(2)} tCO2e${data.credit ? ' (Credit created)' : ''}` });
      if (data.credit) await fetchCredits();
    } catch {
      toast({ title: 'Error', description: 'Carbon calculation failed', variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card></div>
          <Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Carbon Quantification</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Calculate emission reductions (tCO2e) using approved methodologies
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{summary.totalCredits.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
              <p className="text-xs text-muted-foreground">Total tCO2e</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{summary.available.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-teal-600">{summary.traded.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
              <p className="text-xs text-muted-foreground">Traded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-600">{summary.retired.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
              <p className="text-xs text-muted-foreground">Retired</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calculator Tabs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-600" />
                Carbon Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Project Selector and Create Credit */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                <div className="flex-1 space-y-2">
                  <Label>Assign to Project</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.methodology})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="createCredit"
                    checked={createCredit}
                    onCheckedChange={(checked) => setCreateCredit(checked === true)}
                    disabled={!selectedProjectId}
                  />
                  <Label htmlFor="createCredit" className={`text-sm ${!selectedProjectId ? 'text-muted-foreground' : ''}`}>
                    Create Credit
                  </Label>
                </div>
              </div>

              <Tabs defaultValue="biochar">
                <TabsList className="flex-wrap h-auto gap-1">
                  <TabsTrigger value="biochar">Biochar</TabsTrigger>
                  <TabsTrigger value="awd">AWD</TabsTrigger>
                  <TabsTrigger value="biogas">Biogas</TabsTrigger>
                  <TabsTrigger value="solar">Solar</TabsTrigger>
                  <TabsTrigger value="bluecarbon">Blue Carbon</TabsTrigger>
                </TabsList>

                <TabsContent value="biochar" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate carbon removal via biochar production and soil application.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Biochar Produced (tonnes)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        value={biocharInput.biocharProduced}
                        onChange={(e) => setBiocharInput({ ...biocharInput, biocharProduced: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Carbon Stability Factor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={biocharInput.stabilityFactor}
                        onChange={(e) => setBiocharInput({ ...biocharInput, stabilityFactor: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateBiochar} disabled={calculating} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    {calculating ? 'Calculating...' : 'Calculate'}
                  </Button>
                </TabsContent>

                <TabsContent value="awd" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate methane reduction from Alternate Wetting and Drying (AWD) in rice cultivation.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Area (hectares)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 1000"
                        value={awdInput.area}
                        onChange={(e) => setAwdInput({ ...awdInput, area: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Baseline (tCO2e/ha)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={awdInput.baseline}
                        onChange={(e) => setAwdInput({ ...awdInput, baseline: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mitigation Factor</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={awdInput.mitigationFactor}
                        onChange={(e) => setAwdInput({ ...awdInput, mitigationFactor: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateAWD} disabled={calculating} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    {calculating ? 'Calculating...' : 'Calculate'}
                  </Button>
                </TabsContent>

                <TabsContent value="biogas" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate emission reductions from biogas methane capture and utilization.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CH4 Captured (tCO2e)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 200"
                        value={biogasInput.ch4Captured}
                        onChange={(e) => setBiogasInput({ ...biogasInput, ch4Captured: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fuel Displacement (tCO2e)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 50"
                        value={biogasInput.fuelDisplacement}
                        onChange={(e) => setBiogasInput({ ...biogasInput, fuelDisplacement: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateBiogas} disabled={calculating} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    {calculating ? 'Calculating...' : 'Calculate'}
                  </Button>
                </TabsContent>

                <TabsContent value="solar" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate grid emission offset from solar PV electricity generation.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Electricity Generated (MWh)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 5000"
                        value={solarInput.generation}
                        onChange={(e) => setSolarInput({ ...solarInput, generation: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grid Emission Factor (tCO2e/MWh)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={solarInput.gridFactor}
                        onChange={(e) => setSolarInput({ ...solarInput, gridFactor: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateSolar} disabled={calculating} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    {calculating ? 'Calculating...' : 'Calculate'}
                  </Button>
                </TabsContent>

                <TabsContent value="bluecarbon" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate carbon sequestration from blue carbon ecosystems (mangroves, seagrass).</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Area (hectares)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        value={blueInput.area}
                        onChange={(e) => setBlueInput({ ...blueInput, area: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Project Duration (years)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 10"
                        value={blueInput.years}
                        onChange={(e) => setBlueInput({ ...blueInput, years: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateBlue} disabled={calculating} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    {calculating ? 'Calculating...' : 'Calculate'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Emission Factor Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              Emission Factor Reference
            </CardTitle>
            <CardDescription>Approved emission factors for calculations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Factor</TableHead>
                    <TableHead className="text-xs">Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emissionFactors.map((ef) => (
                    <TableRow key={ef.source}>
                      <TableCell className="text-xs font-medium">{ef.source}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {ef.factor} <span className="text-muted-foreground">{ef.unit}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {ef.reference}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Calculation Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Calculation Results</CardTitle>
                <CardDescription>All calculated emission reductions</CardDescription>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Total: {results.reduce((sum, r) => sum + r.tco2e, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} tCO2e
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>tCO2e</TableHead>
                    <TableHead>Methodology</TableHead>
                    <TableHead>Formula</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...results].reverse().map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          {typeLabels[r.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-emerald-700">
                        {r.tco2e.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.methodology}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{r.formula}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Carbon Credits from Database */}
      {credits.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Carbon Credits</CardTitle>
                <CardDescription>All registered carbon credits from the database</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5">
                {credits.length} credits
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token ID</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Amount (tCO2e)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs font-semibold">{c.tokenId}</TableCell>
                      <TableCell className="text-xs">{c.project?.name || c.projectId}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-emerald-700">
                        {c.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[c.status] || ''}`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
