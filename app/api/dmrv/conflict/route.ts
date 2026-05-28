import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';

// GET /api/dmrv/conflict — List all conflict cases with project info and summary stats
export async function GET() {
  try {
    await ensureSeeded();

    const cases = await db.conflictCase.findMany({
      include: {
        project: {
          select: { id: true, name: true, province: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byConflictType: Record<string, number> = {};
    for (const c of cases) {
      bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byConflictType[c.conflictType] = (byConflictType[c.conflictType] || 0) + 1;
    }

    return NextResponse.json({
      cases,
      summary: {
        total: cases.length,
        bySeverity,
        byStatus,
        byConflictType,
      },
    });
  } catch (error) {
    console.error('Conflict GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch conflict cases', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/conflict — Create, resolve, or escalate a conflict case
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      action: 'create' | 'resolve' | 'escalate';
      projectId: string;
      title?: string;
      description?: string;
      sourceA?: string;
      sourceB?: string;
      conflictType?: string;
      severity?: string;
      caseId?: string;
      resolution?: string;
      resolvedBy?: string;
      evidenceUrl?: string;
    };

    const {
      action, projectId, title, description, sourceA, sourceB,
      conflictType, severity, caseId, resolution, resolvedBy, evidenceUrl,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'create') {
      const conflictCase = await db.conflictCase.create({
        data: {
          projectId,
          title: title || `Conflict detected in ${project.name}`,
          description: description || '',
          sourceA: sourceA || '{}',
          sourceB: sourceB || '{}',
          conflictType: conflictType || 'DATA_MISMATCH',
          severity: severity || 'MEDIUM',
          status: 'FLAGGED',
        },
        include: {
          project: { select: { id: true, name: true, province: true } },
        },
      });

      return NextResponse.json({ success: true, case: conflictCase }, { status: 201 });
    }

    if (action === 'resolve') {
      if (!caseId) {
        return NextResponse.json({ error: 'caseId is required for resolve' }, { status: 400 });
      }

      const existing = await db.conflictCase.findUnique({ where: { id: caseId } });
      if (!existing) {
        return NextResponse.json({ error: 'Conflict case not found' }, { status: 404 });
      }

      const updated = await db.conflictCase.update({
        where: { id: caseId },
        data: {
          status: 'RESOLVED',
          resolution: resolution || 'Resolved',
          resolvedBy: resolvedBy || '',
          evidenceUrl: evidenceUrl || '',
          resolvedAt: new Date(),
        },
        include: {
          project: { select: { id: true, name: true, province: true } },
        },
      });

      return NextResponse.json({ success: true, case: updated });
    }

    if (action === 'escalate') {
      if (!caseId) {
        return NextResponse.json({ error: 'caseId is required for escalate' }, { status: 400 });
      }

      const existing = await db.conflictCase.findUnique({ where: { id: caseId } });
      if (!existing) {
        return NextResponse.json({ error: 'Conflict case not found' }, { status: 404 });
      }

      const updated = await db.conflictCase.update({
        where: { id: caseId },
        data: {
          status: 'ESCALATED',
          severity: 'CRITICAL',
        },
        include: {
          project: { select: { id: true, name: true, province: true } },
        },
      });

      return NextResponse.json({ success: true, case: updated });
    }

    return NextResponse.json({ error: 'Invalid action. Use "create", "resolve", or "escalate"' }, { status: 400 });
  } catch (error) {
    console.error('Conflict POST error:', error);
    return NextResponse.json({ error: 'Failed to process conflict case', details: String(error) }, { status: 500 });
  }
}
