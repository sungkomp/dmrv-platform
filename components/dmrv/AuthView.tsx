'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle2, XCircle, Key, Users, Lock, Loader2, Eye, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface RoleModule {
  module: string;
  permissions: string[];
}

interface RoleInfo {
  role: string;
  description: string;
  modules: RoleModule[];
}

interface ValidationResponse {
  role: string;
  module: string;
  action: string;
  granted: boolean;
  allPermissions: string[];
  reason: string;
}

// Map API role keys to display names and visual info
const roleDisplayMap: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  admin: { label: 'Admin', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: Key },
  validator: { label: 'Validator', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: Shield },
  project_developer: { label: 'Project Developer', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: Users },
  buyer: { label: 'Buyer', color: 'text-teal-700', bgColor: 'bg-teal-50 border-teal-200', icon: Users },
  auditor: { label: 'Auditor', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: Lock },
  viewer: { label: 'Viewer', color: 'text-slate-700', bgColor: 'bg-slate-50 border-slate-200', icon: Eye },
};

// All modules from the API
const ALL_MODULES = [
  'dmrv', 'ingestion', 'carbon', 'certification', 'verification',
  'marketplace', 'governance', 'audit', 'reporting', 'monitoring',
  'logistics', 'footprint', 'simulation',
];

const ALL_ACTIONS = ['read', 'write', 'delete', 'execute', 'verify', 'approve', 'reject', 'mint', 'trade', 'retire', 'export', 'configure', 'update', 'calculate'];

export default function AuthView() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [simRole, setSimRole] = useState<string>('');
  const [simModule, setSimModule] = useState<string>('dmrv');
  const [simAction, setSimAction] = useState<string>('read');
  const [simResult, setSimResult] = useState<ValidationResponse | null>(null);
  const [validating, setValidating] = useState(false);

  // Fetch RBAC data from API
  const fetchRbac = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dmrv/auth');
      if (!res.ok) throw new Error('Failed to fetch RBAC data');
      const data = await res.json();
      const roleList: RoleInfo[] = data.roles || [];
      setRoles(roleList);
      if (roleList.length > 0) {
        setSelectedRole(roleList[0].role);
        setSimRole(roleList[0].role);
      }
    } catch (err) {
      console.error('Failed to fetch RBAC:', err);
      setError(err instanceof Error ? err.message : 'Failed to load RBAC data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRbac();
  }, []);

  // Validate access via API
  const handleValidate = async () => {
    if (!simRole || !simModule || !simAction) return;
    setValidating(true);
    try {
      const res = await fetch('/api/dmrv/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: simRole, module: simModule, action: simAction }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Validation failed');
      }

      const result: ValidationResponse = await res.json();
      setSimResult(result);
      toast({
        title: result.granted ? 'Access Granted' : 'Access Denied',
        description: result.reason,
        variant: result.granted ? 'default' : 'destructive',
      });
    } catch (err) {
      toast({
        title: 'Validation Error',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  // Build the permission matrix from API data
  const getPermissionForCell = (roleKey: string, module: string, action: string): boolean => {
    const role = roles.find((r) => r.role === roleKey);
    if (!role) return false;
    const mod = role.modules.find((m) => m.module === module);
    if (!mod) return false;
    return mod.permissions.includes(action);
  };

  // Get all unique actions that appear in any role for any module
  const getRelevantActions = (): string[] => {
    const actionSet = new Set<string>();
    roles.forEach((r) => {
      r.modules.forEach((m) => {
        m.permissions.forEach((p) => actionSet.add(p));
      });
    });
    return ALL_ACTIONS.filter((a) => actionSet.has(a));
  };

  const relevantActions = getRelevantActions();

  // Get the display info for a role
  const getRoleDisplay = (roleKey: string) => {
    return roleDisplayMap[roleKey] || { label: roleKey, color: 'text-slate-700', bgColor: 'bg-slate-50 border-slate-200', icon: Shield };
  };

  const selectedRoleDisplay = getRoleDisplay(selectedRole);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Auth & RBAC</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Role-based access control with PDPA-compliant security policies
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRbac} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}. Click Refresh to try again.</AlertDescription>
        </Alert>
      )}

      {/* Role Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center space-y-2">
                <Skeleton className="h-10 w-10 rounded-full mx-auto" />
                <Skeleton className="h-4 w-16 mx-auto" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {roles.map((roleInfo) => {
            const display = getRoleDisplay(roleInfo.role);
            const Icon = display.icon;
            const totalPerms = roleInfo.modules.reduce((sum, m) => sum + m.permissions.length, 0);
            return (
              <Card
                key={roleInfo.role}
                className={`cursor-pointer transition-all hover:shadow-md ${display.bgColor} ${
                  selectedRole === roleInfo.role ? 'ring-2 ring-emerald-500' : ''
                }`}
                onClick={() => setSelectedRole(roleInfo.role)}
              >
                <CardContent className="p-4 text-center space-y-2">
                  <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${display.bgColor}`}>
                    <Icon className={`h-5 w-5 ${display.color}`} />
                  </div>
                  <h3 className={`font-semibold text-sm ${display.color}`}>{display.label}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{roleInfo.description}</p>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {totalPerms} permissions
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Permission Matrix */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              Permission Matrix
            </CardTitle>
            <CardDescription>
              {selectedRole ? `Showing permissions for ${getRoleDisplay(selectedRole).label}` : 'Select a role to view permissions'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Skeleton key={j} className="h-4 w-4" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white z-10">Module / Action</TableHead>
                      {roles.map((r) => (
                        <TableHead key={r.role} className="text-center text-xs min-w-[80px]">
                          {getRoleDisplay(r.role).label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ALL_MODULES.map((module) =>
                      relevantActions.map((action) => {
                        // Only show row if at least one role has this permission
                        const anyHas = roles.some((r) => getPermissionForCell(r.role, module, action));
                        if (!anyHas) return null;
                        const key = `${module}.${action}`;
                        return (
                          <TableRow key={key}>
                            <TableCell className="font-mono text-xs sticky left-0 bg-white z-10">
                              <span className="text-muted-foreground">{module}.</span>
                              <span className="font-medium">{action}</span>
                            </TableCell>
                            {roles.map((r) => {
                              const allowed = getPermissionForCell(r.role, module, action);
                              return (
                                <TableCell key={r.role} className="text-center">
                                  {allowed ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-slate-300 mx-auto" />
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Access Validation Simulator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access Simulator</CardTitle>
            <CardDescription>Test role-permission combinations against the API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Role</Label>
              <Select value={simRole} onValueChange={(v) => { setSimRole(v); setSimResult(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.role} value={r.role}>
                      {getRoleDisplay(r.role).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Module</Label>
              <Select value={simModule} onValueChange={(v) => { setSimModule(v); setSimResult(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_MODULES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Action</Label>
              <Select value={simAction} onValueChange={(v) => { setSimAction(v); setSimResult(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleValidate}
              disabled={validating || !simRole}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                'Validate Access'
              )}
            </Button>

            {simResult && (
              <Alert className={simResult.granted ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
                {simResult.granted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertTitle className={simResult.granted ? 'text-emerald-800' : 'text-red-800'}>
                  {simResult.granted ? 'Access Granted' : 'Access Denied'}
                </AlertTitle>
                <AlertDescription className={simResult.granted ? 'text-emerald-700' : 'text-red-700'}>
                  {simResult.reason}
                </AlertDescription>
                {simResult.granted && simResult.allPermissions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-[10px] text-emerald-600">All perms:</span>
                    {simResult.allPermissions.map((p) => (
                      <Badge key={p} variant="secondary" className="text-[9px] h-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        {p}
                      </Badge>
                    ))}
                  </div>
                )}
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
