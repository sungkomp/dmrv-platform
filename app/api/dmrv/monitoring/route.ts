import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dmrv/monitoring — System health metrics + alerts
export async function GET() {
  try {
    const [alerts, auditLogs, projects, credits, certificates] = await Promise.all([
      db.alert.findMany({ orderBy: { timestamp: 'desc' } }),
      db.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 50 }),
      db.project.findMany(),
      db.carbonCredit.findMany(),
      db.certificate.findMany(),
    ]);

    const unresolvedAlerts = alerts.filter((a) => !a.resolved);
    const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL' && !a.resolved);
    const warningAlerts = alerts.filter((a) => a.severity === 'WARNING' && !a.resolved);

    // System health metrics
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentAuditLogs = auditLogs.filter((l) => l.timestamp >= last24h);
    const recentErrors = recentAuditLogs.filter((l) => l.severity === 'ERROR');

    const healthMetrics = {
      status: criticalAlerts.length > 0 ? 'CRITICAL' : warningAlerts.length > 0 ? 'WARNING' : 'HEALTHY',
      uptime: '99.7%',
      lastChecked: now.toISOString(),
      projects: {
        total: projects.length,
        active: projects.filter((p) => p.status === 'Active').length,
      },
      credits: {
        total: credits.reduce((sum, c) => sum + c.amount, 0),
        available: credits.filter((c) => c.status === 'Available').reduce((sum, c) => sum + c.amount, 0),
      },
      certificates: {
        total: certificates.length,
        approved: certificates.filter((c) => c.status === 'APPROVED').length,
        pending: certificates.filter((c) => c.status === 'SUBMITTED').length,
      },
      alerts: {
        total: alerts.length,
        unresolved: unresolvedAlerts.length,
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
      },
      activity: {
        auditLogsLast24h: recentAuditLogs.length,
        errorsLast24h: recentErrors.length,
      },
    };

    return NextResponse.json({ health: healthMetrics, alerts, recentAuditLogs });
  } catch (error) {
    console.error('Monitoring error:', error);
    return NextResponse.json({ error: 'Failed to fetch monitoring data' }, { status: 500 });
  }
}

// POST /api/dmrv/monitoring — Create alert
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { severity: string; message: string };

    if (!body.severity || !body.message) {
      return NextResponse.json({ error: 'severity and message are required' }, { status: 400 });
    }

    const validSeverities = ['INFO', 'WARNING', 'CRITICAL'];
    if (!validSeverities.includes(body.severity)) {
      return NextResponse.json({ error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` }, { status: 400 });
    }

    const alert = await db.alert.create({
      data: {
        severity: body.severity,
        message: body.message,
        resolved: false,
      },
    });

    await db.auditLog.create({
      data: {
        agentName: 'MonitoringAgent',
        action: 'create_alert',
        details: JSON.stringify({ alertId: alert.id, severity: body.severity, message: body.message }),
        severity: body.severity,
      },
    });

    return NextResponse.json({ success: true, alert }, { status: 201 });
  } catch (error) {
    console.error('Alert creation error:', error);
    return NextResponse.json({ error: 'Failed to create alert', details: String(error) }, { status: 500 });
  }
}
