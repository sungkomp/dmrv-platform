import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dmrv/reporting — Get reports for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      // Return summary report for all projects
      const projects = await db.project.findMany({
        include: {
          credits: true,
          certificates: true,
          ingestionLogs: true,
          submissions: true,
        },
      });

      const reports = projects.map((project) => ({
        projectId: project.id,
        projectName: project.name,
        methodology: project.methodology,
        status: project.status,
        areaHa: project.areaHa,
        totalCredits: project.credits.reduce((sum, c) => sum + c.amount, 0),
        availableCredits: project.credits.filter((c) => c.status === 'Available').reduce((sum, c) => sum + c.amount, 0),
        tradedCredits: project.credits.filter((c) => c.status === 'Traded').reduce((sum, c) => sum + c.amount, 0),
        retiredCredits: project.credits.filter((c) => c.status === 'Retired').reduce((sum, c) => sum + c.amount, 0),
        certificates: project.certificates.length,
        approvedCertificates: project.certificates.filter((c) => c.status === 'APPROVED').length,
        dataPoints: project.ingestionLogs.length,
        submissions: project.submissions.length,
      }));

      return NextResponse.json({ reports, count: reports.length });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        credits: true,
        certificates: true,
        ingestionLogs: true,
        submissions: true,
        plots: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const auditLogs = await db.auditLog.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
    });

    const totalCredits = project.credits.reduce((sum, c) => sum + c.amount, 0);
    const totalFootprint = 0; // Placeholder — would be calculated from footprint module
    const netCarbonBalance = totalCredits - totalFootprint;

    const report = {
      projectId: project.id,
      projectName: project.name,
      methodology: project.methodology,
      status: project.status,
      areaHa: project.areaHa,
      location: project.location,
      generatedAt: new Date().toISOString(),
      credits: {
        total: totalCredits,
        available: project.credits.filter((c) => c.status === 'Available').reduce((sum, c) => sum + c.amount, 0),
        traded: project.credits.filter((c) => c.status === 'Traded').reduce((sum, c) => sum + c.amount, 0),
        retired: project.credits.filter((c) => c.status === 'Retired').reduce((sum, c) => sum + c.amount, 0),
        creditCount: project.credits.length,
      },
      certificates: project.certificates.map((c) => ({
        certId: c.certId,
        trackType: c.trackType,
        status: c.status,
        amountTco2e: c.amountTco2e,
        validator: c.validator,
      })),
      data: {
        ingestionLogs: project.ingestionLogs.length,
        sourceTypes: [...new Set(project.ingestionLogs.map((l) => l.sourceType))],
        plots: project.plots.length,
        submissions: project.submissions.length,
      },
      netCarbonBalance: Math.round(netCarbonBalance * 100) / 100,
      carbonFootprint: totalFootprint,
      auditTrail: auditLogs.length,
      recentAuditActions: auditLogs.slice(0, 10).map((l) => ({
        agent: l.agentName,
        action: l.action,
        severity: l.severity,
        timestamp: l.timestamp.toISOString(),
      })),
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Reporting error:', error);
    return NextResponse.json({ error: 'Failed to generate report', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/reporting — Generate sustainability report
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { projectId: string; carbonFootprint?: number };
    const { projectId, carbonFootprint = 0 } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        credits: true,
        certificates: true,
        ingestionLogs: true,
        plots: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const totalCredits = project.credits.reduce((sum, c) => sum + c.amount, 0);
    const netCarbonBalance = totalCredits - carbonFootprint;

    const sustainabilityReport = {
      reportId: `SUST-${Date.now()}`,
      projectId: project.id,
      projectName: project.name,
      methodology: project.methodology,
      generatedAt: new Date().toISOString(),
      carbonAccounting: {
        creditsGenerated: Math.round(totalCredits * 100) / 100,
        carbonFootprint: carbonFootprint,
        netCarbonBalance: Math.round(netCarbonBalance * 100) / 100,
        netStatus: netCarbonBalance >= 0 ? 'NET_POSITIVE' : 'NET_NEGATIVE',
      },
      projectDetails: {
        area: project.areaHa,
        location: project.location,
        status: project.status,
        plotCount: project.plots.length,
      },
      certification: {
        totalCertificates: project.certificates.length,
        approved: project.certificates.filter((c) => c.status === 'APPROVED').length,
        pending: project.certificates.filter((c) => c.status === 'SUBMITTED').length,
        totalCertifiedTco2e: project.certificates.filter((c) => c.status === 'APPROVED').reduce((sum, c) => sum + c.amountTco2e, 0),
      },
      dataQuality: {
        ingestionPoints: project.ingestionLogs.length,
        sourceTypes: [...new Set(project.ingestionLogs.map((l) => l.sourceType))],
        encryptedLogs: project.ingestionLogs.filter((l) => l.isEncrypted).length,
        publicLogs: project.ingestionLogs.filter((l) => l.classification === 'PUBLIC').length,
      },
    };

    await db.auditLog.create({
      data: {
        agentName: 'ReportingAgent',
        action: 'generate_sustainability_report',
        projectId,
        details: JSON.stringify({ reportId: sustainabilityReport.reportId, netCarbonBalance }),
        severity: 'INFO',
      },
    });

    return NextResponse.json({ success: true, report: sustainabilityReport }, { status: 201 });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Report generation failed', details: String(error) }, { status: 500 });
  }
}
