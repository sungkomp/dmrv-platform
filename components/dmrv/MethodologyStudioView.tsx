'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, RefreshCw, TreePine, Flame, Droplets, Zap, Sun,
  Plus, Copy, Trash2, Eye, Save, Send, Sparkles, Wand2,
  History, ArrowRight, MessageSquare, Loader2, Lightbulb,
  CircleDot, Calculator, FileCheck, ChevronDown,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ─── Types ────────────────────────────────────────────────────────────────
interface FormulaData { expression: string; variables: Record<string, string> }
interface ParameterData { name: string; type: string; required: boolean; description: string; default: string }
interface ConditionData { field: string; operator: string; value: string; message: string }
interface MethodologyRule {
  id: string; name: string; methodology: string; trackType: string;
  version: string; description: string; formula: string; parameters: string;
  conditions: string; status: string; createdBy: string; createdAt: string; updatedAt: string;
  aiGenerated?: boolean; aiGenerationId?: string; sourceTemplate?: string; calculationNodes?: string;
}
interface MethodologySummary { total: number; byStatus: Record<string, number>; byTrackType: Record<string, number> }
interface MethodologyResponse { rules: MethodologyRule[]; summary: MethodologySummary }
interface AIGenerationSession {
  id: string; prompt: string; methodology: string; trackType: string;
  generatedFormula: string; generatedParams: string; generatedConditions: string;
  generatedNodes: string; aiModel: string;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED' | 'APPLIED';
  ruleId: string; feedback: string; createdBy: string; createdAt: string; updatedAt: string;
}
interface AISessionsResponse { sessions: AIGenerationSession[]; summary: { total: number; byStatus: Record<string, number> } }
interface GenNode { id: string; type: string; label: string; x: number; y: number }

// ─── Config ───────────────────────────────────────────────────────────────
const trackCfg: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  forest: { icon: TreePine, color: '#10b981', label: 'Forest' },
  biochar: { icon: Flame, color: '#f59e0b', label: 'Biochar' },
  awd: { icon: Droplets, color: '#3b82f6', label: 'AWD' },
  biogas: { icon: Zap, color: '#8b5cf6', label: 'Biogas' },
  solar: { icon: Sun, color: '#ef4444', label: 'Solar' },
};
const aiStCfg: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  GENERATING: { bg: 'bg-blue-100', color: 'text-blue-700', icon: Loader2 },
  COMPLETED: { bg: 'bg-emerald-100', color: 'text-emerald-700', icon: CheckCircle2 },
  FAILED: { bg: 'bg-red-100', color: 'text-red-700', icon: XCircle },
  APPLIED: { bg: 'bg-teal-100', color: 'text-teal-700', icon: FileCheck },
};
const METH_OPTIONS = [
  { value: 'T-VER', label: 'T-VER (Thailand)' }, { value: 'VCS', label: 'VCS (Verra)' },
  { value: 'GS', label: 'Gold Standard' }, { value: 'CDM', label: 'CDM (UN)' },
  { value: 'IPCC-2023', label: 'IPCC-2023' },
];
const TEMPLATES = [
  { label: 'Mangrove Restoration', methodology: 'VCS', trackType: 'forest', prompt: 'Generate carbon sequestration formula for mangrove restoration per Verra VM0033, including biomass accumulation, soil carbon, and methane emissions' },
  { label: 'Biochar Soil Amendment', methodology: 'IPCC-2023', trackType: 'biochar', prompt: 'Create a biochar carbon removal formula based on IPCC 2019 guidelines, accounting for feedstock type, pyrolysis temperature, and carbon stability factor' },
  { label: 'Rice AWD Methane', methodology: 'T-VER', trackType: 'awd', prompt: 'Design AWD methane reduction methodology for Thai rice cultivation per T-VER standard, with baseline and mitigation factors' },
  { label: 'Biogas Capture', methodology: 'CDM', trackType: 'biogas', prompt: 'Build a biogas methane capture and utilization formula per CDM methodology ACM0001, including CH4 capture efficiency and fuel displacement' },
];
const OP_OPTS = [
  { value: 'gt', label: 'Greater than (>)' }, { value: 'lt', label: 'Less than (<)' },
  { value: 'gte', label: '>= (gte)' }, { value: 'lte', label: '<= (lte)' },
  { value: 'eq', label: '= (eq)' }, { value: 'neq', label: '!= (neq)' },
];
const PT_OPTS = [{ value: 'number', label: 'Number' }, { value: 'string', label: 'String' }, { value: 'boolean', label: 'Boolean' }, { value: 'array', label: 'Array' }];
const nodeIcons: Record<string, React.ElementType> = { input: ArrowRight, process: Calculator, output: FileCheck };

function pj<T>(s: string, f: T): T { try { return JSON.parse(s) as T; } catch { return f; } }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function trunc(t: string, n: number) { return !t || t.length <= n ? t : t.slice(0, n) + '...'; }

// ─── Node Flowchart ───────────────────────────────────────────────────────
function NodeFlowchart({ nodesJson }: { nodesJson: string }) {
  const nodes = pj<GenNode[]>(nodesJson, []);
  if (!nodes.length) return null;
  const inputs = nodes.filter((n) => n.type === 'input');
  const processes = nodes.filter((n) => n.type === 'process');
  const outputs = nodes.filter((n) => n.type === 'output');
  const render = (n: GenNode, v: 'input' | 'process' | 'output') => {
    const Icon = nodeIcons[v] || CircleDot;
    const c = { input: 'bg-sky-50 border-sky-300 text-sky-600', process: 'bg-emerald-50 border-emerald-300 text-emerald-600', output: 'bg-amber-50 border-amber-300 text-amber-600' }[v];
    const ic = { input: 'bg-sky-100', process: 'bg-emerald-100', output: 'bg-amber-100' }[v];
    return (
      <div key={n.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border min-w-[130px] shadow-sm ${c}`}>
        <div className={`flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${ic}`}><Icon className="h-3 w-3" /></div>
        <span className="text-xs font-medium truncate">{n.label}</span>
      </div>
    );
  };
  const fallback = inputs.length === 0 && processes.length === 0 && outputs.length === 0;
  return (
    <div className="space-y-2 overflow-x-auto">
      {inputs.length > 0 && <div><p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider mb-1">Inputs</p><div className="flex flex-wrap gap-2">{inputs.map((n) => render(n, 'input'))}</div></div>}
      {inputs.length > 0 && processes.length > 0 && <div className="flex justify-center"><ArrowRight className="h-4 w-4 rotate-90 text-slate-300" /></div>}
      {processes.length > 0 && <div><p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Processing</p><div className="flex flex-wrap gap-2">{processes.map((n) => render(n, 'process'))}</div></div>}
      {processes.length > 0 && outputs.length > 0 && <div className="flex justify-center"><ArrowRight className="h-4 w-4 rotate-90 text-slate-300" /></div>}
      {outputs.length > 0 && <div><p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Outputs</p><div className="flex flex-wrap gap-2">{outputs.map((n) => render(n, 'output'))}</div></div>}
      {fallback && <div className="flex flex-wrap gap-2">{nodes.map((n) => (<div key={n.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-emerald-50 border-emerald-300 min-w-[130px] shadow-sm"><div className="flex h-6 w-6 items-center justify-center rounded-md shrink-0 bg-emerald-100"><Calculator className="h-3 w-3 text-emerald-600" /></div><span className="text-xs font-medium truncate">{n.label}</span></div>))}</div>}
    </div>
  );
}

// ─── Session Preview Card ─────────────────────────────────────────────────
function SessionPreview({ session, onApply, applying, feedbackText, feedbackSessionId, onFeedbackChange, onFeedbackSend, onFeedbackToggle }: {
  session: AIGenerationSession; onApply: (id: string) => void; applying: string | null;
  feedbackText: string; feedbackSessionId: string | null; onFeedbackChange: (v: string) => void;
  onFeedbackSend: (id: string) => void; onFeedbackToggle: (id: string) => void;
}) {
  const formula = pj<FormulaData>(session.generatedFormula, { expression: '', variables: {} });
  const params = pj<ParameterData[]>(session.generatedParams, []);
  const conditions = pj<ConditionData[]>(session.generatedConditions, []);
  const tc = trackCfg[session.trackType] || trackCfg.forest;
  const TIcon = tc.icon;
  return (
    <>
      <Card className="border-emerald-200">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Generated Preview</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: `${tc.color}15` }}><TIcon className="h-3 w-3" style={{ color: tc.color }} /></div>
            <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 hover:bg-slate-100">{session.methodology}</Badge>
            <Badge variant="secondary" className="text-[9px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-0.5"><Sparkles className="h-2 w-2" />AI</Badge>
          </div>
          {formula.expression && <div className="rounded bg-slate-50 border border-slate-200 px-2 py-1.5"><p className="text-[9px] text-muted-foreground mb-0.5">Formula</p><code className="text-[11px] font-mono text-slate-700 break-all">{formula.expression}</code></div>}
          {Object.keys(formula.variables).length > 0 && <div className="flex flex-wrap gap-1">{Object.entries(formula.variables).slice(0, 5).map(([k, v]) => (<Badge key={k} variant="secondary" className="text-[8px] h-4 bg-slate-100 text-slate-700 hover:bg-slate-100">{k}: {trunc(v, 16)}</Badge>))}{Object.keys(formula.variables).length > 5 && <Badge variant="secondary" className="text-[8px] h-4 bg-slate-100 text-slate-500 hover:bg-slate-100">+{Object.keys(formula.variables).length - 5}</Badge>}</div>}
          {params.length > 0 && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Parameters ({params.length})</p><div className="space-y-0.5">{params.slice(0, 4).map((p, i) => (<div key={i} className="flex items-center gap-1.5 text-[10px] bg-white border rounded px-1.5 py-0.5"><code className="font-mono font-medium text-emerald-700">{p.name}</code><span className="text-muted-foreground">{p.type}</span>{p.required && <Badge className="text-[7px] h-3 bg-red-50 text-red-600 hover:bg-red-50 px-1">req</Badge>}</div>))}</div></div>}
          {conditions.length > 0 && <div><p className="text-[10px] font-medium text-muted-foreground mb-1">Conditions ({conditions.length})</p><div className="space-y-0.5">{conditions.slice(0, 3).map((c, i) => (<div key={i} className="text-[10px] bg-white border rounded px-1.5 py-0.5"><code className="font-mono">{c.field}</code> <span className="text-muted-foreground">{c.operator} {c.value}</span></div>))}</div></div>}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground"><span>{params.length} param(s)</span><span>{conditions.length} condition(s)</span></div>
        </CardContent>
      </Card>
      {session.generatedNodes && <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-3.5 w-3.5 text-slate-600" /> Calculation Flow</CardTitle></CardHeader><CardContent><NodeFlowchart nodesJson={session.generatedNodes} /></CardContent></Card>}
      <Card><CardContent className="p-4 space-y-3">
        {session.status === 'COMPLETED' && <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => onApply(session.id)} disabled={applying === session.id}>{applying === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Apply to Methodology</Button>}
        {session.status === 'APPLIED' && <Badge className="w-full justify-center bg-teal-100 text-teal-700 hover:bg-teal-100 py-1.5"><FileCheck className="h-3 w-3 mr-1" />Applied as Rule</Badge>}
        {(session.status === 'COMPLETED' || session.status === 'APPLIED') && (
          <div className="space-y-2"><Label className="text-xs">Feedback</Label>
            {feedbackSessionId === session.id ? (
              <div className="flex gap-2"><Input value={feedbackText} onChange={(e) => onFeedbackChange(e.target.value)} placeholder="Your feedback..." className="text-xs h-8" /><Button size="sm" className="h-8 text-xs gap-1" onClick={() => onFeedbackSend(session.id)}><MessageSquare className="h-3 w-3" />Send</Button></div>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full" onClick={() => onFeedbackToggle(session.id)}><MessageSquare className="h-3 w-3" />{session.feedback ? 'Update Feedback' : 'Leave Feedback'}</Button>
            )}
            {session.feedback && <p className="text-[10px] text-muted-foreground italic">&quot;{session.feedback}&quot;</p>}
          </div>
        )}
      </CardContent></Card>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function MethodologyStudioView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MethodologyResponse | null>(null);
  const [activeTab, setActiveTab] = useState('ai-generate');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<MethodologyRule | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMethodology, setAiMethodology] = useState('T-VER');
  const [aiTrackType, setAiTrackType] = useState('forest');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSessions, setAiSessions] = useState<AIGenerationSession[]>([]);
  const [aiSessionsLoading, setAiSessionsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AIGenerationSession | null>(null);
  const [sessionDetailOpen, setSessionDetailOpen] = useState(false);
  const [aiApplying, setAiApplying] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSessionId, setFeedbackSessionId] = useState<string | null>(null);
  // Builder state
  const [bName, setBName] = useState('');
  const [bMeth, setBMeth] = useState('T-VER');
  const [bTrack, setBTrack] = useState('forest');
  const [bVer, setBVer] = useState('1.0');
  const [bDesc, setBDesc] = useState('');
  const [bExpr, setBExpr] = useState('');
  const [bVars, setBVars] = useState<{ name: string; description: string }[]>([{ name: '', description: '' }]);
  const [bParams, setBParams] = useState<ParameterData[]>([{ name: '', type: 'number', required: false, description: '', default: '' }]);
  const [bConds, setBConds] = useState<ConditionData[]>([{ field: '', operator: 'gt', value: '', message: '' }]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try { setLoading(true); setError(null); const r = await fetch('/api/dmrv/methodology'); if (!r.ok) throw new Error('Failed'); setData((await r.json()) as MethodologyResponse); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); } finally { setLoading(false); }
  }, []);
  const fetchSessions = useCallback(async () => {
    try { setAiSessionsLoading(true); const r = await fetch('/api/dmrv/ai-methodology'); if (!r.ok) throw new Error(); const j = (await r.json()) as AISessionsResponse; setAiSessions(j.sessions); }
    catch { /* */ } finally { setAiSessionsLoading(false); }
  }, []);
  useEffect(() => { fetchData(); fetchSessions(); }, [fetchData, fetchSessions]);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return; setAiGenerating(true);
    try { const r = await fetch('/api/dmrv/ai-methodology', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', prompt: aiPrompt, methodology: aiMethodology, trackType: aiTrackType }) }); if (!r.ok) throw new Error(); await fetchSessions(); } catch { /* */ } finally { setAiGenerating(false); }
  };
  const handleApply = async (sid: string) => {
    setAiApplying(sid);
    try { const r = await fetch('/api/dmrv/ai-methodology', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'apply', sessionId: sid }) }); if (!r.ok) throw new Error(); await fetchSessions(); await fetchData(); } catch { /* */ } finally { setAiApplying(null); }
  };
  const handleFeedback = async (sid: string) => {
    if (!feedbackText.trim()) return;
    try { await fetch('/api/dmrv/ai-methodology', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'feedback', sessionId: sid, feedback: feedbackText }) }); setFeedbackText(''); setFeedbackSessionId(null); await fetchSessions(); } catch { /* */ }
  };
  const handleLoadTmpl = (t: typeof TEMPLATES[number]) => { setAiPrompt(t.prompt); setAiMethodology(t.methodology); setAiTrackType(t.trackType); };
  const handleViewRule = (r: MethodologyRule) => { setSelectedRule(r); setDetailOpen(true); };
  const handleDuplicate = async (r: MethodologyRule) => {
    try { const f = pj<FormulaData>(r.formula, { expression: '', variables: {} }); const p = pj<ParameterData[]>(r.parameters, []); const c = pj<ConditionData[]>(r.conditions, []); await fetch('/api/dmrv/methodology', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', name: `${r.name} (Copy)`, methodology: r.methodology, trackType: r.trackType, version: r.version, description: r.description, formula: JSON.stringify(f), parameters: JSON.stringify(p), conditions: JSON.stringify(c), status: 'DRAFT' }) }); await fetchData(); } catch { /* */ }
  };
  const handleDeprecate = async (id: string) => { try { await fetch('/api/dmrv/methodology', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deprecate', ruleId: id }) }); await fetchData(); } catch { /* */ } };

  const buildFormula = (): FormulaData => ({ expression: bExpr, variables: bVars.reduce<Record<string, string>>((a, v) => { if (v.name) a[v.name] = v.description; return a; }, {}) });
  const resetBuilder = () => { setBName(''); setBMeth('T-VER'); setBTrack('forest'); setBVer('1.0'); setBDesc(''); setBExpr(''); setBVars([{ name: '', description: '' }]); setBParams([{ name: '', type: 'number', required: false, description: '', default: '' }]); setBConds([{ field: '', operator: 'gt', value: '', message: '' }]); };
  const saveRule = async (status: string) => {
    setSaving(true);
    try { await fetch('/api/dmrv/methodology', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', name: bName, methodology: bMeth, trackType: bTrack, version: bVer, description: bDesc, formula: JSON.stringify(buildFormula()), parameters: JSON.stringify(bParams), conditions: JSON.stringify(bConds), status }) }); resetBuilder(); await fetchData(); } catch { /* */ } finally { setSaving(false); }
  };

  const previewSession = selectedSession || aiSessions.find((s) => s.status === 'COMPLETED' || s.status === 'APPLIED') || null;

  if (loading && !data) {
    return (<div className="space-y-6"><div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 mt-2" /></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => (<Card key={i}><CardContent className="p-4 flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><div><Skeleton className="h-6 w-12" /><Skeleton className="h-3 w-20 mt-1" /></div></CardContent></Card>))}</div><Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card></div>);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />Methodology Studio
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] h-5 gap-0.5 ml-1"><Sparkles className="h-2.5 w-2.5" />AI Powered</Badge>
          </h2>
          <p className="text-muted-foreground text-sm mt-1">AI-powered carbon formula generation for T-VER &amp; international standards</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchData(); fetchSessions(); }} className="gap-2 self-start"><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />Failed to load data. <Button variant="link" className="h-auto p-0 text-red-700 underline" onClick={fetchData}>Retry</Button></CardContent></Card>}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50"><BookOpen className="h-5 w-5 text-emerald-600" /></div><div><p className="text-xl font-bold text-emerald-600">{data?.summary.byStatus?.ACTIVE ?? 0}</p><p className="text-xs text-muted-foreground">Active</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50"><BookOpen className="h-5 w-5 text-amber-600" /></div><div><p className="text-xl font-bold text-amber-600">{data?.summary.byStatus?.DRAFT ?? 0}</p><p className="text-xs text-muted-foreground">Drafts</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50"><Sparkles className="h-5 w-5 text-purple-600" /></div><div><p className="text-xl font-bold text-purple-600">{aiSessions.length}</p><p className="text-xs text-muted-foreground">AI Sessions</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50"><FileCheck className="h-5 w-5 text-teal-600" /></div><div><p className="text-xl font-bold text-teal-600">{aiSessions.filter((s) => s.status === 'APPLIED').length}</p><p className="text-xs text-muted-foreground">Applied</p></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="ai-generate" className="gap-1"><Sparkles className="h-3.5 w-3.5" />AI Generate</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1"><History className="h-3.5 w-3.5" />Sessions</TabsTrigger>
          <TabsTrigger value="active-rules">Active Rules</TabsTrigger>
          <TabsTrigger value="builder" className="gap-1"><Plus className="h-3.5 w-3.5" />Builder</TabsTrigger>
        </TabsList>

        {/* AI Generate Tab */}
        <TabsContent value="ai-generate" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wand2 className="h-4 w-4 text-emerald-600" />AI Methodology Generator</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Describe the methodology you want</Label><Textarea placeholder="e.g., Generate carbon sequestration formula for mangrove restoration per Verra VM0033" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} className="min-h-[100px]" /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Methodology Standard</Label><Select value={aiMethodology} onValueChange={setAiMethodology}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METH_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Track Type</Label><Select value={aiTrackType} onValueChange={setAiTrackType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(trackCfg).map(([k, c]) => { const I = c.icon; return (<SelectItem key={k} value={k}><span className="flex items-center gap-2"><I className="h-3.5 w-3.5" style={{ color: c.color }} />{c.label}</span></SelectItem>); })}</SelectContent></Select></div>
                  </div>
                  <Button onClick={handleGenerate} disabled={aiGenerating || !aiPrompt.trim()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                    {aiGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating<span className="animate-pulse">...</span></> : <><Sparkles className="h-4 w-4" />Generate with AI</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Prompt Templates */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" />Prompt Templates</CardTitle></CardHeader>
                <CardContent><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => { const tc = trackCfg[t.trackType] || trackCfg.forest; const TI = tc.icon; return (
                    <button key={t.label} type="button" onClick={() => handleLoadTmpl(t)} className="flex items-start gap-2.5 p-3 rounded-lg border bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors text-left">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 mt-0.5" style={{ backgroundColor: `${tc.color}15` }}><TI className="h-3.5 w-3.5" style={{ color: tc.color }} /></div>
                      <div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{t.label}</p><p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.prompt}</p><div className="flex items-center gap-1.5 mt-1"><Badge variant="secondary" className="text-[8px] h-3.5 bg-slate-100 text-slate-600 hover:bg-slate-100">{t.methodology}</Badge><Badge variant="secondary" className="text-[8px] h-3.5 hover:bg-slate-100" style={{ backgroundColor: `${tc.color}15`, color: tc.color }}>{tc.label}</Badge></div></div>
                    </button>
                  ); })}
                </div></CardContent>
              </Card>
            </div>

            {/* Right: Preview */}
            <div className="space-y-4">
              {aiGenerating ? (
                <Card className="border-emerald-200"><CardContent className="p-6 space-y-4"><div className="flex flex-col items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50"><Loader2 className="h-6 w-6 text-emerald-600 animate-spin" /></div><p className="text-sm font-medium text-emerald-700">AI is generating...</p><p className="text-xs text-muted-foreground text-center">Creating formula, parameters, and validation rules</p></div><div className="space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-10 w-full" /><Skeleton className="h-5 w-1/2" /></div></CardContent></Card>
              ) : previewSession ? (
                <SessionPreview session={previewSession} onApply={handleApply} applying={aiApplying} feedbackText={feedbackText} feedbackSessionId={feedbackSessionId} onFeedbackChange={setFeedbackText} onFeedbackSend={handleFeedback} onFeedbackToggle={setFeedbackSessionId} />
              ) : (
                <Card><CardContent className="p-6 text-center space-y-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 mx-auto"><Wand2 className="h-6 w-6 text-emerald-600" /></div><p className="text-sm font-medium text-slate-700">Start with AI</p><p className="text-xs text-muted-foreground">Describe your methodology and let AI generate the formula, parameters, and validation rules.</p></CardContent></Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-slate-600" />AI Generation Sessions <Badge variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-600 hover:bg-slate-100">{aiSessions.length}</Badge></CardTitle></CardHeader>
            <CardContent>
              {aiSessionsLoading && !aiSessions.length ? (<div className="space-y-2">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-20 w-full" />))}</div>
              ) : !aiSessions.length ? (
                <div className="text-center py-12"><Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No AI sessions yet.</p><Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setActiveTab('ai-generate')}><Wand2 className="h-3 w-3" />Start Generating</Button></div>
              ) : (
                <ScrollArea className="max-h-[600px]"><div className="space-y-3">
                  {aiSessions.map((s) => { const sc = aiStCfg[s.status] || aiStCfg.COMPLETED; const SI = sc.icon; const tc = trackCfg[s.trackType] || trackCfg.forest; const TI = tc.icon; const f = pj<FormulaData>(s.generatedFormula, { expression: '', variables: {} }); const p = pj<ParameterData[]>(s.generatedParams, []); const c = pj<ConditionData[]>(s.generatedConditions, []); return (
                    <Collapsible key={s.id}><div className="rounded-lg border hover:border-emerald-200 transition-colors">
                      <CollapsibleTrigger asChild><button type="button" className="flex items-center gap-3 p-3 w-full text-left">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${tc.color}15` }}><TI className="h-4 w-4" style={{ color: tc.color }} /></div>
                        <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{trunc(s.prompt, 80)}</p><div className="flex items-center gap-2 mt-0.5"><Badge variant="secondary" className="text-[8px] h-3.5 bg-slate-100 text-slate-600 hover:bg-slate-100">{s.methodology}</Badge><Badge variant="secondary" className="text-[8px] h-3.5 hover:bg-slate-100" style={{ backgroundColor: `${tc.color}15`, color: tc.color }}>{tc.label}</Badge><span className="text-[9px] text-muted-foreground">{fmtDate(s.createdAt)}</span></div></div>
                        <Badge variant="secondary" className={`text-[9px] h-5 shrink-0 ${sc.bg} ${sc.color}`}>{s.status === 'GENERATING' ? <SI className="h-2.5 w-2.5 animate-spin mr-0.5" /> : <SI className="h-2.5 w-2.5 mr-0.5" />}{s.status}</Badge>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button></CollapsibleTrigger>
                      <CollapsibleContent><div className="px-3 pb-3 pt-1 border-t space-y-3">
                        {f.expression && <div className="rounded bg-slate-50 border border-slate-200 px-2 py-1.5"><code className="text-[11px] font-mono text-slate-700 break-all">{f.expression}</code></div>}
                        {Object.keys(f.variables).length > 0 && <div className="flex flex-wrap gap-1">{Object.entries(f.variables).map(([k, v]) => (<Badge key={k} variant="secondary" className="text-[8px] h-4 bg-slate-100 text-slate-700 hover:bg-slate-100">{k}: {trunc(v, 14)}</Badge>))}</div>}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground"><span>{p.length} param(s)</span><span>{c.length} condition(s)</span><span>Model: {s.aiModel}</span></div>
                        {s.generatedNodes && <NodeFlowchart nodesJson={s.generatedNodes} />}
                        <div className="flex items-center gap-2">
                          {s.status === 'COMPLETED' && <Button size="sm" className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApply(s.id)} disabled={aiApplying === s.id}>{aiApplying === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}Apply</Button>}
                          {s.status === 'APPLIED' && <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 text-[9px] gap-0.5"><FileCheck className="h-2.5 w-2.5" />Applied</Badge>}
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => { setSelectedSession(s); setSessionDetailOpen(true); }}><Eye className="h-3 w-3" />Full Details</Button>
                        </div>
                        {s.feedback && <p className="text-[10px] text-amber-700 italic bg-amber-50 border border-amber-200 rounded px-2 py-1">&quot;{s.feedback}&quot;</p>}
                      </div></CollapsibleContent>
                    </div></Collapsible>
                  ); })}
                </div></ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Rules Tab */}
        <TabsContent value="active-rules" className="mt-4 space-y-4">
          {(() => { const rules = data?.rules || []; if (!rules.length) return (<Card><CardContent className="py-12 text-center"><BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No methodology rules found.</p><Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setActiveTab('ai-generate')}><Sparkles className="h-3 w-3" />Generate with AI</Button></CardContent></Card>); return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((r) => { const tc = trackCfg[r.trackType] || trackCfg.forest; const TI = tc.icon; const fd = pj<FormulaData>(r.formula, { expression: '', variables: {} }); const pd = pj<ParameterData[]>(r.parameters, []); const cd = pj<ConditionData[]>(r.conditions, []); return (
                <Card key={r.id} className="hover:shadow-md transition-shadow"><CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2 min-w-0"><div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${tc.color}15` }}><TI className="h-4 w-4" style={{ color: tc.color }} /></div><div className="min-w-0"><p className="text-sm font-semibold truncate flex items-center gap-1">{r.name}{r.aiGenerated && <Badge className="text-[7px] h-3.5 bg-purple-100 text-purple-700 hover:bg-purple-100 gap-0.5 ml-0.5"><Sparkles className="h-2 w-2" />AI</Badge>}</p><div className="flex items-center gap-1.5 mt-0.5"><Badge variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-600 hover:bg-slate-100">{r.methodology}</Badge><span className="text-[10px] text-muted-foreground">v{r.version}</span></div></div></div><Badge variant="secondary" className={`text-[9px] h-4 shrink-0 ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : r.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{r.status}</Badge></div>
                  <Badge variant="secondary" className="text-[10px] h-5 gap-1" style={{ backgroundColor: `${tc.color}15`, color: tc.color }}><TI className="h-2.5 w-2.5" />{tc.label}</Badge>
                  {r.description && <p className="text-xs text-muted-foreground leading-relaxed">{trunc(r.description, 100)}</p>}
                  {fd.expression && <div className="rounded bg-slate-50 border border-slate-200 px-2 py-1.5"><code className="text-[11px] font-mono text-slate-700 break-all">{fd.expression}</code></div>}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground"><span>{pd.length} param(s)</span><span>{cd.length} condition(s)</span></div>
                  <p className="text-[10px] text-muted-foreground">By {r.createdBy} · {fmtDate(r.createdAt)}</p>
                  <Separator />
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => handleViewRule(r)}><Eye className="h-3 w-3" />View</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => handleDuplicate(r)}><Copy className="h-3 w-3" />Copy</Button>
                    {r.status === 'ACTIVE' && <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 flex-1" onClick={() => handleDeprecate(r.id)}><Trash2 className="h-3 w-3" />Deprecate</Button>}
                  </div>
                </CardContent></Card>
              ); })}
            </div>
          ); })()}
        </TabsContent>

        {/* Builder Tab */}
        <TabsContent value="builder" className="mt-4 space-y-6">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Basic Information</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input placeholder="e.g., Forest Carbon Stock Change" value={bName} onChange={(e) => setBName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Methodology</Label><Select value={bMeth} onValueChange={setBMeth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METH_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Track Type</Label><Select value={bTrack} onValueChange={setBTrack}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(trackCfg).map(([k, c]) => { const I = c.icon; return (<SelectItem key={k} value={k}><span className="flex items-center gap-2"><I className="h-3.5 w-3.5" style={{ color: c.color }} />{c.label}</span></SelectItem>); })}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Version</Label><Input placeholder="e.g., 1.0" value={bVer} onChange={(e) => setBVer(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe the methodology rule..." value={bDesc} onChange={(e) => setBDesc(e.target.value)} className="min-h-[80px]" /></div>
          </CardContent></Card>

          <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-emerald-600" />Formula Builder</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="space-y-2"><Label>Expression</Label><Input placeholder="e.g., ΔC = Σ(A_i × ΔC_i × UF)" value={bExpr} onChange={(e) => setBExpr(e.target.value)} className="font-mono" /><p className="text-[10px] text-muted-foreground">Use mathematical notation. Define each variable below.</p></div>
            <div className="space-y-2"><div className="flex items-center justify-between"><Label className="text-sm">Variables</Label><Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setBVars((p) => [...p, { name: '', description: '' }])}><Plus className="h-3 w-3" />Add</Button></div>
              {bVars.map((v, i) => (<div key={i} className="flex items-center gap-2"><Input placeholder="Name" value={v.name} onChange={(e) => setBVars((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1 font-mono text-xs" /><Input placeholder="Description" value={v.description} onChange={(e) => setBVars((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="flex-[2] text-xs" />{bVars.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setBVars((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>}</div>))}
            </div>
          </CardContent></Card>

          <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">Parameters</CardTitle><Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setBParams((p) => [...p, { name: '', type: 'number', required: false, description: '', default: '' }])}><Plus className="h-3 w-3" />Add</Button></div></CardHeader><CardContent><div className="space-y-3">{bParams.map((p, i) => (<div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-slate-50/50"><div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2"><Input placeholder="Name" value={p.name} onChange={(e) => setBParams((ps) => ps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="text-xs" /><Select value={p.type} onValueChange={(v) => setBParams((ps) => ps.map((x, j) => j === i ? { ...x, type: v } : x))}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent>{PT_OPTS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select><Input placeholder="Default" value={p.default} onChange={(e) => setBParams((ps) => ps.map((x, j) => j === i ? { ...x, default: e.target.value } : x))} className="text-xs" /><div className="flex items-center gap-2"><Switch checked={p.required} onCheckedChange={(c) => setBParams((ps) => ps.map((x, j) => j === i ? { ...x, required: c } : x))} /><Label className="text-xs">Required</Label></div></div><div className="flex flex-col gap-1"><Input placeholder="Description" value={p.description} onChange={(e) => setBParams((ps) => ps.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="text-xs min-w-[140px]" />{bParams.length > 1 && <Button variant="ghost" size="sm" className="h-6 text-xs text-red-500 hover:text-red-600 gap-1" onClick={() => setBParams((ps) => ps.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" />Remove</Button>}</div></div>))}</div></CardContent></Card>

          <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">Conditions</CardTitle><Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setBConds((p) => [...p, { field: '', operator: 'gt', value: '', message: '' }])}><Plus className="h-3 w-3" />Add</Button></div></CardHeader><CardContent><div className="space-y-3">{bConds.map((c, i) => (<div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-slate-50/50"><div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2"><Input placeholder="Field" value={c.field} onChange={(e) => setBConds((ps) => ps.map((x, j) => j === i ? { ...x, field: e.target.value } : x))} className="text-xs" /><Select value={c.operator} onValueChange={(v) => setBConds((ps) => ps.map((x, j) => j === i ? { ...x, operator: v } : x))}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent>{OP_OPTS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select><Input placeholder="Value" value={c.value} onChange={(e) => setBConds((ps) => ps.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className="text-xs" /><div className="flex gap-1"><Input placeholder="Error msg" value={c.message} onChange={(e) => setBConds((ps) => ps.map((x, j) => j === i ? { ...x, message: e.target.value } : x))} className="text-xs flex-1" />{bConds.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setBConds((ps) => ps.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>}</div></div></div>))}</div></CardContent></Card>

          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Preview</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"><div><span className="text-muted-foreground">Name:</span><p className="font-medium mt-0.5">{bName || '--'}</p></div><div><span className="text-muted-foreground">Methodology:</span><p className="font-medium mt-0.5">{bMeth}</p></div><div><span className="text-muted-foreground">Track:</span><div className="mt-0.5">{(() => { const c = trackCfg[bTrack]; const I = c.icon; return (<Badge variant="secondary" className="text-[10px] h-5 gap-1" style={{ backgroundColor: `${c.color}15`, color: c.color }}><I className="h-2.5 w-2.5" />{c.label}</Badge>); })()}</div></div><div><span className="text-muted-foreground">Version:</span><p className="font-medium mt-0.5">{bVer || '--'}</p></div></div>
            {bExpr && <div className="rounded bg-slate-50 border border-slate-200 px-3 py-2"><span className="text-[10px] text-muted-foreground block mb-1">Formula</span><code className="text-sm font-mono text-slate-700">{bExpr}</code></div>}
            {bVars.some((v) => v.name) && <div><span className="text-[10px] text-muted-foreground">Variables:</span><div className="flex flex-wrap gap-1 mt-1">{bVars.filter((v) => v.name).map((v, i) => (<Badge key={i} variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-700 hover:bg-slate-100">{v.name}: {v.description || '?'}</Badge>))}</div></div>}
          </CardContent></Card>

          <div className="flex items-center gap-3">
            <Button onClick={() => saveRule('DRAFT')} disabled={saving || !bName.trim()} variant="outline" className="gap-2"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save as Draft'}</Button>
            <Button onClick={() => saveRule('ACTIVE')} disabled={saving || !bName.trim()} className="gap-2 bg-emerald-600 hover:bg-emerald-700"><Send className="h-4 w-4" />{saving ? 'Publishing...' : 'Publish'}</Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rule Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">{selectedRule && (() => { const c = trackCfg[selectedRule.trackType] || trackCfg.forest; const I = c.icon; return <I className="h-5 w-5" style={{ color: c.color }} />; })()}{selectedRule?.name || 'Details'}{selectedRule?.aiGenerated && <Badge className="text-[9px] h-5 bg-purple-100 text-purple-700 hover:bg-purple-100 gap-0.5"><Sparkles className="h-2.5 w-2.5" />AI</Badge>}</DialogTitle></DialogHeader>
          {selectedRule && (() => { const r = selectedRule; const fd = pj<FormulaData>(r.formula, { expression: '', variables: {} }); const pd = pj<ParameterData[]>(r.parameters, []); const cd = pj<ConditionData[]>(r.conditions, []); return (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2"><Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100">{r.methodology}</Badge><Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-100">v{r.version}</Badge><Badge variant="secondary" className={`text-xs ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : r.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{r.status}</Badge></div>
              {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
              {fd.expression && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Formula</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded bg-slate-50 border border-slate-200 px-3 py-2"><code className="text-sm font-mono text-slate-800 break-all">{fd.expression}</code></div>{Object.keys(fd.variables).length > 0 && <div><h5 className="text-xs font-medium text-muted-foreground mb-2">Variables</h5><div className="space-y-1">{Object.entries(fd.variables).map(([n, d]) => (<div key={n} className="flex items-center gap-3 text-xs bg-white rounded px-2 py-1.5 border"><code className="font-mono font-semibold text-emerald-700 min-w-[60px]">{n}</code><span className="text-muted-foreground">{d}</span></div>))}</div></div>}</CardContent></Card>}
              {pd.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Parameters</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Type</TableHead><TableHead className="text-xs">Required</TableHead><TableHead className="text-xs">Default</TableHead></TableRow></TableHeader><TableBody>{pd.map((p, i) => (<TableRow key={i}><TableCell className="font-mono text-xs font-medium">{p.name}</TableCell><TableCell className="text-xs">{p.type}</TableCell><TableCell className="text-xs">{p.required ? 'Yes' : 'No'}</TableCell><TableCell className="font-mono text-xs">{p.default || '--'}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>}
              {cd.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Conditions</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="text-xs">Field</TableHead><TableHead className="text-xs">Op</TableHead><TableHead className="text-xs">Value</TableHead><TableHead className="text-xs">Message</TableHead></TableRow></TableHeader><TableBody>{cd.map((c, i) => (<TableRow key={i}><TableCell className="font-mono text-xs">{c.field}</TableCell><TableCell className="text-xs">{c.operator}</TableCell><TableCell className="font-mono text-xs">{c.value}</TableCell><TableCell className="text-xs text-muted-foreground">{c.message}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>}
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground"><div>Created by: <span className="font-medium text-slate-700">{r.createdBy}</span></div><div>Created: <span className="font-medium text-slate-700">{fmtDate(r.createdAt)}</span></div></div>
            </div>
          ); })()}
        </DialogContent>
      </Dialog>

      {/* AI Session Detail Dialog */}
      <Dialog open={sessionDetailOpen} onOpenChange={setSessionDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-600" />AI Session Details</DialogTitle></DialogHeader>
          {selectedSession && (() => { const s = selectedSession; const f = pj<FormulaData>(s.generatedFormula, { expression: '', variables: {} }); const p = pj<ParameterData[]>(s.generatedParams, []); const c = pj<ConditionData[]>(s.generatedConditions, []); const sc = aiStCfg[s.status] || aiStCfg.COMPLETED; return (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-slate-50 border"><p className="text-sm font-medium mb-1">Prompt</p><p className="text-xs text-muted-foreground">{s.prompt}</p></div>
              <div className="flex flex-wrap gap-2"><Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100">{s.methodology}</Badge><Badge variant="secondary" className={`text-xs ${sc.bg} ${sc.color}`}>{s.status}</Badge><Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-100 gap-0.5"><Sparkles className="h-2.5 w-2.5" />{s.aiModel}</Badge></div>
              {f.expression && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Generated Formula</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded bg-slate-50 border border-slate-200 px-3 py-2"><code className="text-sm font-mono text-slate-800 break-all">{f.expression}</code></div>{Object.keys(f.variables).length > 0 && <div><h5 className="text-xs font-medium text-muted-foreground mb-2">Variables</h5><div className="space-y-1">{Object.entries(f.variables).map(([n, d]) => (<div key={n} className="flex items-center gap-3 text-xs bg-white rounded px-2 py-1.5 border"><code className="font-mono font-semibold text-emerald-700 min-w-[80px]">{n}</code><span className="text-muted-foreground">{d}</span></div>))}</div></div>}</CardContent></Card>}
              {s.generatedNodes && <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-3.5 w-3.5" />Calculation Flow</CardTitle></CardHeader><CardContent><NodeFlowchart nodesJson={s.generatedNodes} /></CardContent></Card>}
              {p.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Parameters ({p.length})</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Type</TableHead><TableHead className="text-xs">Required</TableHead></TableRow></TableHeader><TableBody>{p.map((x, i) => (<TableRow key={i}><TableCell className="font-mono text-xs">{x.name}</TableCell><TableCell className="text-xs">{x.type}</TableCell><TableCell className="text-xs">{x.required ? 'Yes' : 'No'}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>}
              {c.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Conditions ({c.length})</CardTitle></CardHeader><CardContent><div className="space-y-1">{c.map((x, i) => (<div key={i} className="text-[10px] bg-white border rounded px-2 py-1"><span className="font-mono font-medium">{x.field}</span> <span className="text-muted-foreground">{x.operator} {x.value}</span> — <span className="text-amber-700">{x.message}</span></div>))}</div></CardContent></Card>}
              <Separator />
              <div className="flex items-center gap-3">{s.status === 'COMPLETED' && <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleApply(s.id); setSessionDetailOpen(false); }} disabled={aiApplying === s.id}>{aiApplying === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Apply to Methodology</Button>}{s.status === 'APPLIED' && <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100"><FileCheck className="h-3 w-3 mr-1" />Applied</Badge>}</div>
              <div className="text-xs text-muted-foreground">Created: <span className="font-medium text-slate-700">{fmtDate(s.createdAt)}</span></div>
              {s.feedback && <div className="p-2 rounded bg-amber-50 border border-amber-200"><p className="text-[10px] text-amber-700 font-medium">Feedback:</p><p className="text-xs text-amber-800">{s.feedback}</p></div>}
            </div>
          ); })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
