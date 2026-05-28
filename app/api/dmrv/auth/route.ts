import { NextRequest, NextResponse } from 'next/server';

// RBAC roles and permissions definition
const RBAC_ROLES: Record<string, { description: string; permissions: Record<string, string[]> }> = {
  admin: {
    description: 'Full system access — can manage all modules, users, and configurations',
    permissions: {
      dmrv: ['read', 'write', 'delete', 'execute'],
      ingestion: ['read', 'write', 'delete'],
      carbon: ['read', 'write', 'delete', 'verify'],
      certification: ['read', 'write', 'approve', 'reject'],
      verification: ['read', 'write', 'execute'],
      marketplace: ['read', 'write', 'mint', 'trade', 'retire'],
      governance: ['read', 'write', 'delete'],
      audit: ['read', 'write', 'execute'],
      reporting: ['read', 'write', 'export'],
      monitoring: ['read', 'write', 'configure'],
      logistics: ['read', 'write', 'update'],
      footprint: ['read', 'write', 'calculate'],
      simulation: ['read', 'execute'],
    },
  },
  validator: {
    description: 'Can verify, validate and certify carbon credit projects',
    permissions: {
      dmrv: ['read', 'execute'],
      ingestion: ['read'],
      carbon: ['read', 'verify'],
      certification: ['read', 'approve', 'reject'],
      verification: ['read', 'execute'],
      marketplace: ['read'],
      governance: ['read'],
      audit: ['read', 'execute'],
      reporting: ['read', 'export'],
      monitoring: ['read'],
      logistics: ['read'],
      footprint: ['read'],
      simulation: ['read', 'execute'],
    },
  },
  project_developer: {
    description: 'Can create and manage projects, submit data, and request certification',
    permissions: {
      dmrv: ['read'],
      ingestion: ['read', 'write'],
      carbon: ['read'],
      certification: ['read', 'write'],
      verification: ['read'],
      marketplace: ['read'],
      governance: ['read'],
      audit: ['read'],
      reporting: ['read', 'export'],
      monitoring: ['read'],
      logistics: ['read', 'write'],
      footprint: ['read', 'calculate'],
      simulation: ['read', 'execute'],
    },
  },
  buyer: {
    description: 'Can browse marketplace, purchase and retire credits',
    permissions: {
      dmrv: ['read'],
      ingestion: ['read'],
      carbon: ['read'],
      certification: ['read'],
      marketplace: ['read', 'trade', 'retire'],
      reporting: ['read'],
      monitoring: ['read'],
      footprint: ['read'],
      simulation: [],
    },
  },
  auditor: {
    description: 'Read-only access with audit trail visibility',
    permissions: {
      dmrv: ['read'],
      ingestion: ['read'],
      carbon: ['read'],
      certification: ['read'],
      verification: ['read'],
      marketplace: ['read'],
      governance: ['read'],
      audit: ['read', 'write'],
      reporting: ['read', 'export'],
      monitoring: ['read'],
      logistics: ['read'],
      footprint: ['read'],
      simulation: ['read'],
    },
  },
  viewer: {
    description: 'Read-only public access to non-confidential data',
    permissions: {
      dmrv: ['read'],
      ingestion: ['read'],
      carbon: ['read'],
      certification: ['read'],
      marketplace: ['read'],
      reporting: ['read'],
      monitoring: ['read'],
      footprint: ['read'],
    },
  },
};

// GET /api/dmrv/auth — Return RBAC roles and permissions
export async function GET() {
  try {
    const roles = Object.entries(RBAC_ROLES).map(([role, config]) => ({
      role,
      description: config.description,
      modules: Object.entries(config.permissions).map(([module, perms]) => ({
        module,
        permissions: perms,
      })),
    }));

    return NextResponse.json({ roles, totalRoles: roles.length });
  } catch (error) {
    console.error('Error fetching RBAC:', error);
    return NextResponse.json({ error: 'Failed to fetch RBAC roles' }, { status: 500 });
  }
}

// POST /api/dmrv/auth — Validate access for a role+module combination
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { role: string; module: string; action: string };
    const { role, module, action } = body;

    if (!role || !module || !action) {
      return NextResponse.json({ error: 'role, module, and action are required' }, { status: 400 });
    }

    const roleConfig = RBAC_ROLES[role];
    if (!roleConfig) {
      return NextResponse.json({ error: `Unknown role: ${role}`, validRoles: Object.keys(RBAC_ROLES) }, { status: 404 });
    }

    const modulePermissions = roleConfig.permissions[module];
    if (!modulePermissions) {
      return NextResponse.json({ error: `Unknown module: ${module}`, validModules: Object.keys(roleConfig.permissions) }, { status: 404 });
    }

    const hasAccess = modulePermissions.includes(action);

    return NextResponse.json({
      role,
      module,
      action,
      granted: hasAccess,
      allPermissions: modulePermissions,
      reason: hasAccess ? `Role '${role}' has '${action}' permission on '${module}'` : `Role '${role}' does NOT have '${action}' permission on '${module}'`,
    });
  } catch (error) {
    console.error('Auth validation error:', error);
    return NextResponse.json({ error: 'Auth validation failed', details: String(error) }, { status: 500 });
  }
}
