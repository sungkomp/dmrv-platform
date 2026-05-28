import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Domain-specific audit configurations
interface AuditDomain {
  name: string;
  checks: Array<{ id: string; description: string; severity: string }>;
}

const AUDIT_DOMAINS: Record<string, AuditDomain> = {
  biogas: {
    name: 'Biogas System Audit',
    checks: [
      { id: 'BG-001', description: 'CH4 capture efficiency above 85%', severity: 'WARNING' },
      { id: 'BG-002', description: 'Anaerobic digester operational parameters within range', severity: 'INFO' },
      { id: 'BG-003', description: 'Fuel displacement data verified with ≥2 sources', severity: 'MANDATORY' },
      { id: 'BG-004', description: 'Leak detection and repair (LDAR) compliance', severity: 'WARNING' },
    ],
  },
  blue_carbon: {
    name: 'Blue Carbon (Mangrove) Audit',
    checks: [
      { id: 'BC-001', description: 'Mangrove area verified by satellite + ground truth', severity: 'MANDATORY' },
      { id: 'BC-002', description: 'No deforestation detected within project boundary', severity: 'MANDATORY' },
      { id: 'BC-003', description: 'Biomass carbon stock measured within last 12 months', severity: 'WARNING' },
      { id: 'BC-004', description: 'Soil organic carbon assessment completed', severity: 'WARNING' },
    ],
  },
  renewable: {
    name: 'Renewable Energy Audit',
    checks: [
      { id: 'RE-001', description: 'Electricity generation data cross-validated with grid operator', severity: 'MANDATORY' },
      { id: 'RE-002', description: 'Grid emission factor sourced from official national data', severity: 'MANDATORY' },
      { id: 'RE-003', description: 'Meter reading within acceptable variance (<5%)', severity: 'WARNING' },
      { id: 'RE-004', description: 'System operational hours verified', severity: 'INFO' },
    ],
  },
  soil_ghg: {
    name: 'Soil GHG Audit',
    checks: [
      { id: 'SG-001', description: 'Soil sampling methodology follows IPCC guidelines', severity: 'MANDATORY' },
      { id: 'SG-002', description: 'N2O emission factors calibrated for local conditions', severity: 'WARNING' },
      { id: 'SG-003', description: 'AWD practice verified with water level sensors', severity: 'MANDATORY' },
      { id: 'SG-004', description: 'Baseline emission rate established with 3+ years data', severity: 'WARNING' },
    ],
  },
  overlap: {
    name: 'Double-Claiming / Overlap Audit',
    checks: [
      { id: 'OL-001', description: 'No duplicate credit registration in external registries', severity: 'MANDATORY' },
      { id: 'OL-002', description: 'Project boundary does not overlap with other registered projects', severity: 'MANDATORY' },
      { id: 'OL-003', description: 'Credit retirement confirmed in all registries before new issuance', severity: 'MANDATORY' },
    ],
  },
  footprint: {
    name: 'Carbon Footprint Audit',
    checks: [
      { id: 'FP-001', description: 'Scope 1 emissions completely accounted', severity: 'MANDATORY' },
      { id: 'FP-002', description: 'Scope 2 emissions using market-based method', severity: 'WARNING' },
      { id: 'FP-003', description: 'Emission factors from recognized sources (IPCC, DEFRA)', severity: 'MANDATORY' },
      { id: 'FP-004', description: 'Activity data verified with invoices/meter readings', severity: 'WARNING' },
    ],
  },
};

// GET /api/dmrv/audit — List audit logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const severity = searchParams.get('severity');
    const agentName = searchParams.get('agentName');

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (severity) where.severity = severity;
    if (agentName) where.agentName = agentName;

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const summary = {
      total: logs.length,
      info: logs.filter((l) => l.severity === 'INFO').length,
      warnings: logs.filter((l) => l.severity === 'WARNING').length,
      errors: logs.filter((l) => l.severity === 'ERROR').length,
      agents: [...new Set(logs.map((l) => l.agentName))],
      domains: Object.keys(AUDIT_DOMAINS),
    };

    return NextResponse.json({ logs, summary, availableDomains: Object.keys(AUDIT_DOMAINS) });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

// POST /api/dmrv/audit — Run domain-specific audit
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId: string;
      domain: string; // biogas, blue_carbon, renewable, soil_ghg, overlap, footprint
    };

    const { projectId, domain } = body;

    if (!projectId || !domain) {
      return NextResponse.json({ error: 'projectId and domain are required' }, { status: 400 });
    }

    const auditDomain = AUDIT_DOMAINS[domain];
    if (!auditDomain) {
      return NextResponse.json(
        { error: `Unknown domain: ${domain}`, availableDomains: Object.keys(AUDIT_DOMAINS) },
        { status: 400 },
      );
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch relevant data for audit context
    const [ingestionLogs, credits, certificates] = await Promise.all([
      db.ingestionLog.findMany({ where: { projectId } }),
      db.carbonCredit.findMany({ where: { projectId } }),
      db.certificate.findMany({ where: { projectId } }),
    ]);

    // Simulate audit checks
    const auditResults = auditDomain.checks.map((check) => {
      // Simulated pass/fail logic based on available data
      let passed = true;
      let details = '';

      switch (check.severity) {
        case 'MANDATORY':
          // Pass if we have ≥2 source types and some credits
          if (check.id.includes('001') || check.id.includes('002')) {
            const sourceTypes = [...new Set(ingestionLogs.map((l) => l.sourceType))];
            passed = sourceTypes.length >= 2;
            details = passed ? `Verified with ${sourceTypes.length} source types` : `Only ${sourceTypes.length} source types found (minimum 2 required)`;
          } else if (check.id.includes('003')) {
            passed = credits.length > 0;
            details = passed ? `${credits.length} credits found in registry` : 'No credits found in registry';
          }
          break;
        case 'WARNING':
          // Pass if we have certificates or ingestion data
          if (domain === 'blue_carbon' || domain === 'biogas') {
            passed = ingestionLogs.length > 0;
            details = passed ? `${ingestionLogs.length} data points available` : 'No ingestion data found';
          } else {
            passed = certificates.length > 0;
            details = passed ? `${certificates.length} certificates found` : 'No certificates found';
          }
          break;
        default:
          details = 'Automated check passed';
          break;
      }

      return {
        checkId: check.id,
        description: check.description,
        severity: check.severity,
        passed,
        details,
      };
    });

    const overallPassed = auditResults.filter((r) => r.severity === 'MANDATORY').every((r) => r.passed);
    const auditScore = Math.round((auditResults.filter((r) => r.passed).length / auditResults.length) * 100);

    const auditResult = {
      auditId: `AUDIT-${Date.now()}`,
      projectId,
      projectName: project.name,
      domain,
      domainName: auditDomain.name,
      timestamp: new Date().toISOString(),
      checks: auditResults,
      overallPassed,
      auditScore,
      summary: {
        totalChecks: auditResults.length,
        passed: auditResults.filter((r) => r.passed).length,
        failed: auditResults.filter((r) => !r.passed).length,
        mandatoryFailed: auditResults.filter((r) => r.severity === 'MANDATORY' && !r.passed).length,
      },
    };

    await db.auditLog.create({
      data: {
        agentName: `AuditAgent-${domain}`,
        action: 'domain_audit',
        projectId,
        details: JSON.stringify(auditResult),
        severity: overallPassed ? 'INFO' : 'WARNING',
      },
    });

    return NextResponse.json({ success: true, audit: auditResult });
  } catch (error) {
    console.error('Audit error:', error);
    return NextResponse.json({ error: 'Audit failed', details: String(error) }, { status: 500 });
  }
}
