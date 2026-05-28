import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/dmrv/verification — Cross-modal validation
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId: string;
      minimumSourceTypes?: number;
    };

    const { projectId, minimumSourceTypes = 2 } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all ingestion logs for the project
    const ingestionLogs = await db.ingestionLog.findMany({ where: { projectId } });

    // Group by source type
    const sourceTypeMap: Record<string, Array<{ id: string; activityType: string; timestamp: string; integrityHash: string }>> = {};
    for (const log of ingestionLogs) {
      if (!sourceTypeMap[log.sourceType]) {
        sourceTypeMap[log.sourceType] = [];
      }
      sourceTypeMap[log.sourceType].push({
        id: log.id,
        activityType: log.activityType,
        timestamp: log.timestamp.toISOString(),
        integrityHash: log.integrityHash,
      });
    }

    const sourceTypes = Object.keys(sourceTypeMap);
    const uniqueSourceCount = sourceTypes.length;

    // Check cross-validation: need ≥ minimumSourceTypes source types
    const crossValidationPassed = uniqueSourceCount >= minimumSourceTypes;

    // Compute integrity score (0-100)
    let integrityScore = 0;
    if (uniqueSourceCount >= minimumSourceTypes) {
      integrityScore += 40; // Base score for cross-validation
    }
    if (uniqueSourceCount >= 3) {
      integrityScore += 20; // Bonus for 3+ sources
    }
    if (uniqueSourceCount >= 4) {
      integrityScore += 10; // Bonus for 4+ sources
    }

    // Check integrity hashes — all logs should have non-empty hashes
    const logsWithHash = ingestionLogs.filter((l) => l.integrityHash && l.integrityHash.length > 0);
    const hashIntegrity = ingestionLogs.length > 0 ? (logsWithHash.length / ingestionLogs.length) * 100 : 0;
    integrityScore += Math.min(hashIntegrity * 0.3, 30); // Up to 30 points for hash integrity

    // Clamp score
    integrityScore = Math.min(Math.round(integrityScore), 100);

    // Verification result
    const verificationResult = {
      projectId,
      projectName: project.name,
      crossValidation: {
        passed: crossValidationPassed,
        requiredSourceTypes: minimumSourceTypes,
        actualSourceTypes: uniqueSourceCount,
        sourceBreakdown: Object.entries(sourceTypeMap).map(([type, logs]) => ({
          sourceType: type,
          logCount: logs.length,
          activities: logs.map((l) => l.activityType),
        })),
      },
      integrityScore,
      integrityGrade: integrityScore >= 80 ? 'A' : integrityScore >= 60 ? 'B' : integrityScore >= 40 ? 'C' : 'D',
      hashCoverage: Math.round(hashIntegrity),
      recommendation: crossValidationPassed
        ? 'Data verified with sufficient cross-modal evidence'
        : `Insufficient source types (${uniqueSourceCount}/${minimumSourceTypes}). Add more data sources for verification.`,
    };

    await db.auditLog.create({
      data: {
        agentName: 'VerificationAgent',
        action: 'cross_modal_validation',
        projectId,
        details: JSON.stringify(verificationResult),
        severity: crossValidationPassed ? 'INFO' : 'WARNING',
      },
    });

    return NextResponse.json({ success: true, verification: verificationResult });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Verification failed', details: String(error) }, { status: 500 });
  }
}
