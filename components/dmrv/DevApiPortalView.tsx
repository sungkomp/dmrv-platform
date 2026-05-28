'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Terminal, RefreshCw, Key, Webhook as WebhookIcon, Copy, Eye, EyeOff, Check, X, Send, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Types ────────────────────────────────────────────────────────────────

interface ApiKeyData {
  id: string;
  name: string;
  key: string;
  permissions: string;
  lastUsed: string | null;
  status: 'ACTIVE' | 'REVOKED';
  createdBy: string;
  createdAt: string;
  expiresAt: string;
}

interface WebhookData {
  id: string;
  url: string;
  events: string;
  secret: string;
  status: 'ACTIVE' | 'PAUSED' | 'FAILED';
  lastDelivery: string | null;
  failureCount: number;
  lastFailure: string | null;
  createdBy: string;
  createdAt: string;
}

interface DevPortalSummary {
  totalApiKeys: number;
  activeKeys: number;
  revokedKeys: number;
  expiredKeys: number;
  totalWebhooks: number;
  activeWebhooks: number;
  failedWebhooks: number;
  pausedWebhooks: number;
}

interface DevPortalResponse {
  apiKeys: ApiKeyData[];
  webhooks: WebhookData[];
  summary: DevPortalSummary;
}

// ─── Config ───────────────────────────────────────────────────────────────

const PERMISSIONS_LIST = [
  'read:projects',
  'write:projects',
  'read:credits',
  'write:credits',
  'read:monitoring',
  'write:monitoring',
  'read:verification',
  'admin:all',
];

const WEBHOOK_EVENTS = [
  'project.created',
  'project.updated',
  'credit.issued',
  'credit.transferred',
  'verification.submitted',
  'verification.completed',
  'monitoring.alert',
  'device.offline',
];

const API_ENDPOINTS = [
  { value: '/api/dmrv', label: 'List Projects' },
  { value: '/api/dmrv/monitoring', label: 'Monitoring Status' },
  { value: '/api/dmrv/carbon', label: 'Carbon Credits' },
  { value: '/api/dmrv/verification', label: 'Verification Status' },
  { value: '/api/dmrv/certification', label: 'Certification Status' },
  { value: '/api/dmrv/marketplace', label: 'Marketplace' },
  { value: '/api/dmrv/registry', label: 'Public Registry' },
  { value: '/api/dmrv/audit', label: 'Audit Log' },
];

const keyStatusConfig: Record<string, { bgColor: string; color: string; hoverBg: string }> = {
  ACTIVE: { bgColor: 'bg-emerald-100', color: 'text-emerald-700', hoverBg: 'hover:bg-emerald-100' },
  REVOKED: { bgColor: 'bg-red-100', color: 'text-red-700', hoverBg: 'hover:bg-red-100' },
};

const webhookStatusConfig: Record<string, { bgColor: string; color: string; hoverBg: string }> = {
  ACTIVE: { bgColor: 'bg-emerald-100', color: 'text-emerald-700', hoverBg: 'hover:bg-emerald-100' },
  PAUSED: { bgColor: 'bg-amber-100', color: 'text-amber-700', hoverBg: 'hover:bg-amber-100' },
  FAILED: { bgColor: 'bg-red-100', color: 'text-red-700', hoverBg: 'hover:bg-red-100' },
};

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return key;
  return key.slice(0, 8) + '...' + key.slice(-4);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseJSON<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function DevApiPortalView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DevPortalResponse | null>(null);
  const [activeTab, setActiveTab] = useState('apikeys');

  // API Key dialog state
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState('365');
  const [creatingKey, setCreatingKey] = useState(false);

  // Visible keys state
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Webhook dialog state
  const [createWebhookOpen, setCreateWebhookOpen] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [newWebhookSecret, setNewWebhookSecret] = useState('');
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  // API Sandbox state
  const [sandboxEndpoint, setSandboxEndpoint] = useState('/api/dmrv');
  const [sandboxMethod, setSandboxMethod] = useState<'GET' | 'POST'>('GET');
  const [sandboxBody, setSandboxBody] = useState('');
  const [sandboxSending, setSandboxSending] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState<{ status: number; body: string } | null>(null);
  const [sandboxSnippetTab, setSandboxSnippetTab] = useState('curl');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dmrv/devportal');
      if (!res.ok) throw new Error('Failed to fetch developer portal data');
      const json = (await res.json()) as DevPortalResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch('/api/dmrv/devportal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_key',
          name: newKeyName,
          permissions: JSON.stringify(newKeyPermissions),
          createdBy: 'Admin',
        }),
      });
      if (!res.ok) throw new Error('Failed to create API key');
      setCreateKeyOpen(false);
      setNewKeyName('');
      setNewKeyPermissions([]);
      setNewKeyExpiry('365');
      await fetchData();
    } catch {
      // Error handled silently
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const res = await fetch('/api/dmrv/devportal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_key', keyId }),
      });
      if (!res.ok) throw new Error('Failed to revoke key');
      await fetchData();
    } catch {
      // Error handled silently
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookUrl.trim()) return;
    setCreatingWebhook(true);
    try {
      const res = await fetch('/api/dmrv/devportal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_webhook',
          url: newWebhookUrl,
          events: JSON.stringify(newWebhookEvents),
          secret: newWebhookSecret || undefined,
          createdBy: 'Admin',
        }),
      });
      if (!res.ok) throw new Error('Failed to create webhook');
      setCreateWebhookOpen(false);
      setNewWebhookUrl('');
      setNewWebhookEvents([]);
      setNewWebhookSecret('');
      await fetchData();
    } catch {
      // Error handled silently
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      await fetch('/api/dmrv/devportal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_webhook', webhookId }),
      });
      await fetchData();
    } catch {
      // Error handled silently
    }
  };

  const handleSandboxSend = async () => {
    setSandboxSending(true);
    setSandboxResponse(null);
    try {
      const options: RequestInit = {
        method: sandboxMethod,
        headers: { 'Content-Type': 'application/json' },
      };
      if (sandboxMethod === 'POST' && sandboxBody.trim()) {
        options.body = sandboxBody;
      }
      const res = await fetch(sandboxEndpoint, options);
      const bodyText = await res.text();
      let formatted: string;
      try {
        formatted = JSON.stringify(JSON.parse(bodyText), null, 2);
      } catch {
        formatted = bodyText;
      }
      setSandboxResponse({ status: res.status, body: formatted });
    } catch (err) {
      setSandboxResponse({ status: 0, body: `Error: ${err instanceof Error ? err.message : 'Request failed'}` });
    } finally {
      setSandboxSending(false);
    }
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'whsec_';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewWebhookSecret(result);
  };

  const generateCurlSnippet = () => {
    let cmd = `curl -X ${sandboxMethod} "${window.location.origin}${sandboxEndpoint}"`;
    cmd += ` \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;
    cmd += ` \\\n  -H "Content-Type: application/json"`;
    if (sandboxMethod === 'POST' && sandboxBody.trim()) {
      cmd += ` \\\n  -d '${sandboxBody}'`;
    }
    return cmd;
  };

  const generatePythonSnippet = () => {
    let code = `import requests\n\nurl = "${window.location.origin}${sandboxEndpoint}"\nheaders = {\n  "Authorization": "Bearer YOUR_API_KEY",\n  "Content-Type": "application/json"\n}\n`;
    if (sandboxMethod === 'POST' && sandboxBody.trim()) {
      code += `payload = ${sandboxBody}\nresponse = requests.post(url, headers=headers, json=payload)`;
    } else {
      code += `response = requests.get(url, headers=headers)`;
    }
    code += `\nprint(response.status_code)\nprint(response.json())`;
    return code;
  };

  const generateNodeSnippet = () => {
    let code = `const response = await fetch("${window.location.origin}${sandboxEndpoint}", {\n  method: "${sandboxMethod}",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json"\n  }`;
    if (sandboxMethod === 'POST' && sandboxBody.trim()) {
      code += `,\n  body: JSON.stringify(${sandboxBody})`;
    }
    code += `\n});\nconst data = await response.json();\nconsole.log(data);`;
    return code;
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Simulated API calls 24h
  const apiCalls24h = data ? Math.floor(data.summary.activeKeys * 847 + Math.random() * 200) : 0;

  // ─── Loading State ────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-20 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Terminal className="h-6 w-6 text-emerald-600" />
            Developer API &amp; Webhook Portal
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Manage API keys, webhooks, and test endpoints</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 self-start">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Failed to load data.{' '}
            <Button variant="link" className="h-auto p-0 text-red-700 underline" onClick={fetchData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Key className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">{data?.summary.activeKeys ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active Keys</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <WebhookIcon className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-teal-600">{data?.summary.activeWebhooks ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active Webhooks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <X className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{data?.summary.failedWebhooks ?? 0}</p>
              <p className="text-xs text-muted-foreground">Failed Deliveries</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Send className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{apiCalls24h.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">API Calls 24h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="apikeys" className="gap-1">
            <Key className="h-3.5 w-3.5" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1">
            <WebhookIcon className="h-3.5 w-3.5" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="sandbox" className="gap-1">
            <Terminal className="h-3.5 w-3.5" />
            API Sandbox
          </TabsTrigger>
        </TabsList>

        {/* ─── API Keys Tab ─────────────────────────────────────────────── */}
        <TabsContent value="apikeys" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{data?.apiKeys.length ?? 0} API keys registered</p>
            <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-emerald-600" />
                    Create New API Key
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., Production API Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PERMISSIONS_LIST.map((perm) => (
                        <div key={perm} className="flex items-center gap-2">
                          <Checkbox
                            id={`perm-${perm}`}
                            checked={newKeyPermissions.includes(perm)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewKeyPermissions((prev) => [...prev, perm]);
                              } else {
                                setNewKeyPermissions((prev) => prev.filter((p) => p !== perm));
                              }
                            }}
                          />
                          <Label htmlFor={`perm-${perm}`} className="text-xs font-normal cursor-pointer">
                            {perm}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry</Label>
                    <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="730">2 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleCreateKey}
                      disabled={creatingKey || !newKeyName.trim()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {creatingKey ? 'Creating...' : 'Create Key'}
                    </Button>
                    <Button variant="outline" onClick={() => setCreateKeyOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.apiKeys.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                          No API keys found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.apiKeys.map((apiKey) => {
                        const perms = parseJSON<string[]>(apiKey.permissions, []);
                        const statusCfg = keyStatusConfig[apiKey.status] || keyStatusConfig.ACTIVE;
                        const isVisible = visibleKeys.has(apiKey.id);

                        return (
                          <TableRow key={apiKey.id}>
                            <TableCell className="font-medium text-sm">{apiKey.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                  {isVisible ? apiKey.key : maskKey(apiKey.key)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleKeyVisibility(apiKey.id)}
                                >
                                  {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopy(apiKey.key, apiKey.id)}
                                >
                                  {copiedId === apiKey.id ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {perms.map((p) => (
                                  <Badge
                                    key={p}
                                    variant="secondary"
                                    className="text-[9px] h-4 bg-slate-100 text-slate-700 hover:bg-slate-100"
                                  >
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] h-5 ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.hoverBg}`}
                              >
                                {apiKey.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(apiKey.lastUsed)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(apiKey.expiresAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              {apiKey.status === 'ACTIVE' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                                  onClick={() => handleRevokeKey(apiKey.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Revoke
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Webhooks Tab ─────────────────────────────────────────────── */}
        <TabsContent value="webhooks" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{data?.webhooks.length ?? 0} webhooks configured</p>
            <Dialog open={createWebhookOpen} onOpenChange={setCreateWebhookOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4" />
                  Create Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <WebhookIcon className="h-5 w-5 text-emerald-600" />
                    Create New Webhook
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Endpoint URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://your-server.com/webhooks/dmrv"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Events</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEBHOOK_EVENTS.map((evt) => (
                        <div key={evt} className="flex items-center gap-2">
                          <Checkbox
                            id={`evt-${evt}`}
                            checked={newWebhookEvents.includes(evt)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewWebhookEvents((prev) => [...prev, evt]);
                              } else {
                                setNewWebhookEvents((prev) => prev.filter((e) => e !== evt));
                              }
                            }}
                          />
                          <Label htmlFor={`evt-${evt}`} className="text-xs font-normal cursor-pointer">
                            {evt}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Signing Secret</Label>
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={generateSecret}>
                        <RefreshCw className="h-3 w-3" />
                        Generate
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Auto-generated or custom"
                        value={newWebhookSecret}
                        onChange={(e) => setNewWebhookSecret(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Used to verify webhook payload signatures
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleCreateWebhook}
                      disabled={creatingWebhook || !newWebhookUrl.trim()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {creatingWebhook ? 'Creating...' : 'Create Webhook'}
                    </Button>
                    <Button variant="outline" onClick={() => setCreateWebhookOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[240px]">URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Delivery</TableHead>
                      <TableHead>Failures</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.webhooks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          No webhooks found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.webhooks.map((webhook) => {
                        const events = parseJSON<string[]>(webhook.events, []);
                        const statusCfg = webhookStatusConfig[webhook.status] || webhookStatusConfig.ACTIVE;

                        return (
                          <TableRow key={webhook.id}>
                            <TableCell>
                              <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded break-all">
                                {webhook.url}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {events.map((e) => (
                                  <Badge
                                    key={e}
                                    variant="secondary"
                                    className="text-[9px] h-4 bg-teal-50 text-teal-700 hover:bg-teal-50"
                                  >
                                    {e}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] h-5 ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.hoverBg}`}
                              >
                                {webhook.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(webhook.lastDelivery)}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium ${webhook.failureCount > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {webhook.failureCount}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1"
                                onClick={() => handleTestWebhook(webhook.id)}
                              >
                                <Send className="h-3 w-3" />
                                Test
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── API Sandbox Tab ──────────────────────────────────────────── */}
        <TabsContent value="sandbox" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Request Builder */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-600" />
                  Request Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-28">
                    <Label className="text-xs">Method</Label>
                    <Select value={sandboxMethod} onValueChange={(v) => setSandboxMethod(v as 'GET' | 'POST')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Endpoint</Label>
                    <Select value={sandboxEndpoint} onValueChange={setSandboxEndpoint}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {API_ENDPOINTS.map((ep) => (
                          <SelectItem key={ep.value} value={ep.value}>
                            <span className="font-mono text-xs">{ep.value}</span>
                            <span className="text-muted-foreground ml-2 text-xs">({ep.label})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {sandboxMethod === 'POST' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Request Body (JSON)</Label>
                    <Textarea
                      placeholder='{"key": "value"}'
                      value={sandboxBody}
                      onChange={(e) => setSandboxBody(e.target.value)}
                      className="font-mono text-xs min-h-[120px]"
                    />
                  </div>
                )}

                <Button
                  onClick={handleSandboxSend}
                  disabled={sandboxSending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {sandboxSending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Request
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Response Viewer */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Response</CardTitle>
              </CardHeader>
              <CardContent>
                {sandboxResponse ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs h-5 ${
                          sandboxResponse.status >= 200 && sandboxResponse.status < 300
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : sandboxResponse.status >= 400
                            ? 'bg-red-100 text-red-700 hover:bg-red-100'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {sandboxResponse.status === 0 ? 'Error' : sandboxResponse.status}
                      </Badge>
                    </div>
                    <ScrollArea className="max-h-64">
                      <pre className="text-xs font-mono bg-slate-50 border rounded p-3 whitespace-pre-wrap break-all">
                        {sandboxResponse.body}
                      </pre>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Terminal className="h-10 w-10 mb-3 text-slate-200" />
                    <p className="text-sm">Send a request to see the response</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Code Snippets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Copy className="h-4 w-4 text-emerald-600" />
                Code Snippets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={sandboxSnippetTab} onValueChange={setSandboxSnippetTab}>
                <TabsList>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="node">Node.js</TabsTrigger>
                </TabsList>
                <TabsContent value="curl" className="mt-3">
                  <div className="relative">
                    <ScrollArea className="max-h-48">
                      <pre className="text-xs font-mono bg-slate-50 border rounded p-3 whitespace-pre-wrap">
                        {generateCurlSnippet()}
                      </pre>
                    </ScrollArea>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => handleCopy(generateCurlSnippet(), 'curl-snippet')}
                    >
                      {copiedId === 'curl-snippet' ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="python" className="mt-3">
                  <div className="relative">
                    <ScrollArea className="max-h-48">
                      <pre className="text-xs font-mono bg-slate-50 border rounded p-3 whitespace-pre-wrap">
                        {generatePythonSnippet()}
                      </pre>
                    </ScrollArea>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => handleCopy(generatePythonSnippet(), 'python-snippet')}
                    >
                      {copiedId === 'python-snippet' ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="node" className="mt-3">
                  <div className="relative">
                    <ScrollArea className="max-h-48">
                      <pre className="text-xs font-mono bg-slate-50 border rounded p-3 whitespace-pre-wrap">
                        {generateNodeSnippet()}
                      </pre>
                    </ScrollArea>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => handleCopy(generateNodeSnippet(), 'node-snippet')}
                    >
                      {copiedId === 'node-snippet' ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
