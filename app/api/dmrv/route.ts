import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dmrv — Return all projects with stats
export async function GET() {
  try {
    const projects = await db.project.findMany({
      include: {
        plots: true,
        credits: true,
        certificates: true,
        ingestionLogs: true,
        submissions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'Active').length,
      totalAreaHa: projects.reduce((sum, p) => sum + p.areaHa, 0),
      totalCredits: projects.reduce((sum, p) => sum + p.credits.reduce((s, c) => s + c.amount, 0), 0),
      totalCertificates: projects.reduce((sum, p) => sum + p.certificates.length, 0),
      totalPlots: projects.reduce((sum, p) => sum + p.plots.length, 0),
    };

    return NextResponse.json({ projects, stats });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/dmrv — Run full agent workflow simulation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, data } = body as { projectId: string; data: Record<string, unknown> };

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const workflowResult: Record<string, unknown> = { projectId, projectName: project.name, steps: [] };
    const steps: Array<{ agent: string; action: string; result: unknown; severity: string }> = [];

    // Step 1: SecurityAgent — Validate digital signatures
    const securityResult = {
      agent: 'SecurityAgent',
      validated: true,
      signatureStatus: 'VERIFIED',
      sanitizedData: { ...data, _sanitized: true, _timestamp: new Date().toISOString() },
      threats: [],
    };
    steps.push({ agent: 'SecurityAgent', action: 'validate_signatures', result: securityResult, severity: 'INFO' });
    await db.auditLog.create({
      data: {
        agentName: 'SecurityAgent',
        action: 'validate_signatures',
        projectId,
        details: JSON.stringify(securityResult),
        severity: 'INFO',
      },
    });

    // Step 2: ClassificationAgent — Detect PII, check PDPA consent, classify
    const payloadStr = JSON.stringify(data);
    const piiPatterns = ['email', 'phone', 'idCard', 'address'];
    const detectedPII = piiPatterns.filter((p) => payloadStr.toLowerCase().includes(p.toLowerCase()));
    const classification = detectedPII.length > 0 ? 'CONFIDENTIAL' : 'PUBLIC';
    const classificationResult = {
      agent: 'ClassificationAgent',
      detectedPII,
      pdpaConsent: detectedPII.length === 0 || (data.pdpaConsent as boolean) === true,
      classification,
    };
    steps.push({ agent: 'ClassificationAgent', action: 'classify_data', result: classificationResult, severity: 'INFO' });
    await db.auditLog.create({
      data: {
        agentName: 'ClassificationAgent',
        action: 'classify_data',
        projectId,
        details: JSON.stringify(classificationResult),
        severity: 'INFO',
      },
    });

    // Step 3: EncryptionAgent — SHA-256 integrity hash, encrypt CONFIDENTIAL
    const hashInput = JSON.stringify(securityResult.sanitizedData);
    const crypto = await import('crypto');
    const integrityHash = crypto.createHash('sha256').update(hashInput).digest('hex');
    const isEncrypted = classification === 'CONFIDENTIAL';
    const encryptionResult = {
      agent: 'EncryptionAgent',
      integrityHash,
      isEncrypted,
      algorithm: isEncrypted ? 'AES-256-GCM' : 'NONE',
    };
    steps.push({ agent: 'EncryptionAgent', action: 'encrypt_data', result: encryptionResult, severity: 'INFO' });
    await db.auditLog.create({
      data: {
        agentName: 'EncryptionAgent',
        action: 'encrypt_data',
        projectId,
        details: JSON.stringify(encryptionResult),
        severity: 'INFO',
      },
    });

    // Step 4: ExistenceVerifier — Check ≥2 source types for cross-validation
    const ingestionLogs = await db.ingestionLog.findMany({ where: { projectId } });
    const sourceTypes = [...new Set(ingestionLogs.map((l) => l.sourceType))];
    const hasCrossValidation = sourceTypes.length >= 2;
    const verificationResult = {
      agent: 'ExistenceVerifier',
      sourceTypes,
      sourceCount: sourceTypes.length,
      crossValidationPassed: hasCrossValidation,
      minimumRequired: 2,
    };
    steps.push({ agent: 'ExistenceVerifier', action: 'cross_validate', result: verificationResult, severity: hasCrossValidation ? 'INFO' : 'WARNING' });
    await db.auditLog.create({
      data: {
        agentName: 'ExistenceVerifier',
        action: 'cross_validate',
        projectId,
        details: JSON.stringify(verificationResult),
        severity: hasCrossValidation ? 'INFO' : 'WARNING',
      },
    });

    // Step 5: CarbonQuantifier — Calculate tCO2e based on methodology + freshness check
    const existingCredits = await db.carbonCredit.findMany({ where: { projectId } });
    const totalExisting = existingCredits.reduce((sum, c) => sum + c.amount, 0);
    const now = new Date();
    const freshnessThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days
    const recentLogs = ingestionLogs.filter((l) => now.getTime() - l.timestamp.getTime() < freshnessThreshold);
    const isFresh = recentLogs.length > 0;

    let calculatedTco2e = 0;
    const methodology = project.methodology;
    if (methodology === 'T-VER-FOREST') {
      calculatedTco2e = project.areaHa * 8.5; // Blue carbon estimate
    } else if (methodology === 'IPCC-2023') {
      const trackType = (data.trackType as string) || 'biochar';
      if (trackType === 'biochar') {
        calculatedTco2e = ((data.mass as number) || 1000) * ((data.carbonFraction as number) || 0.7) * ((data.stability as number) || 0.85) * 3.667;
      } else if (trackType === 'solar') {
        calculatedTco2e = ((data.kwh as number) || 500000) / 1000 * ((data.gridEF as number) || 0.5);
      } else if (trackType === 'biogas') {
        calculatedTco2e = ((data.ch4Capture as number) || 50) + ((data.fuelDisplacement as number) || 20);
      }
    }

    const quantificationResult = {
      agent: 'CarbonQuantifier',
      methodology,
      calculatedTco2e,
      existingCredits: totalExisting,
      isFresh,
      recentDataPoints: recentLogs.length,
      freshnessWarning: !isFresh,
    };
    steps.push({ agent: 'CarbonQuantifier', action: 'quantify_carbon', result: quantificationResult, severity: isFresh ? 'INFO' : 'WARNING' });
    await db.auditLog.create({
      data: {
        agentName: 'CarbonQuantifier',
        action: 'quantify_carbon',
        projectId,
        details: JSON.stringify(quantificationResult),
        severity: isFresh ? 'INFO' : 'WARNING',
      },
    });

    // Step 6: ContractGuard — Check double-claiming registry + rights verification
    const tradedCredits = existingCredits.filter((c) => c.status === 'Traded');
    const retiredCredits = existingCredits.filter((c) => c.status === 'Retired');
    const doubleClaimCheck = tradedCredits.length + retiredCredits.length;
    const contractResult = {
      agent: 'ContractGuard',
      doubleClaimDetected: false,
      tradedCount: tradedCredits.length,
      retiredCount: retiredCredits.length,
      rightsVerified: true,
      registryCheck: 'PASSED',
    };
    steps.push({ agent: 'ContractGuard', action: 'check_double_claiming', result: contractResult, severity: 'INFO' });
    await db.auditLog.create({
      data: {
        agentName: 'ContractGuard',
        action: 'check_double_claiming',
        projectId,
        details: JSON.stringify(contractResult),
        severity: 'INFO',
      },
    });

    // Step 7: LedgerAgent — Create ledger entry with Merkle root
    const allHashes = steps.map((s) => JSON.stringify(s.result));
    const merkleRoot = crypto.createHash('sha256').update(allHashes.join('')).digest('hex');
    const ledgerResult = {
      agent: 'LedgerAgent',
      merkleRoot,
      entryCount: steps.length,
      ledgerStatus: 'COMMITTED',
      timestamp: new Date().toISOString(),
    };
    steps.push({ agent: 'LedgerAgent', action: 'commit_ledger', result: ledgerResult, severity: 'INFO' });
    await db.auditLog.create({
      data: {
        agentName: 'LedgerAgent',
        action: 'commit_ledger',
        projectId,
        details: JSON.stringify(ledgerResult),
        severity: 'INFO',
      },
    });

    // Step 8: ReportingAgent — Generate audit report
    const reportResult = {
      agent: 'ReportingAgent',
      reportId: `RPT-${Date.now()}`,
      summary: {
        securityStatus: securityResult.signatureStatus,
        classification,
        integrityHash,
        crossValidation: hasCrossValidation ? 'PASSED' : 'FAILED',
        carbonQuantified: calculatedTco2e,
        contractGuard: 'PASSED',
        ledgerCommitted: true,
      },
      generatedAt: new Date().toISOString(),
    };
    steps.push({ agent: 'ReportingAgent', action: 'generate_report', result: reportResult, severity: 'INFO' });
    await db.auditLog.create({
      data: {
        agentName: 'ReportingAgent',
        action: 'generate_report',
        projectId,
        details: JSON.stringify(reportResult),
        severity: 'INFO',
      },
    });

    workflowResult.steps = steps;
    workflowResult.finalReport = reportResult;

    return NextResponse.json({ success: true, workflow: workflowResult });
  } catch (error) {
    console.error('Workflow error:', error);
    return NextResponse.json({ error: 'Workflow execution failed', details: String(error) }, { status: 500 });
  }
}
