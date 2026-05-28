import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';

// GET /api/dmrv/buffer — List all buffer pool entries with project and credit info
export async function GET() {
  try {
    await ensureSeeded();

    const entries = await db.bufferPoolEntry.findMany({
      include: {
        project: {
          select: { id: true, name: true, province: true },
        },
        credit: {
          select: { id: true, tokenId: true, amount: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const totalBuffered = entries.reduce((sum, e) => sum + e.amount, 0);

    const byRiskCategory: Record<string, number> = {};
    const byProject: Record<string, { projectName: string; province: string; amount: number; count: number }> = {};

    for (const entry of entries) {
      byRiskCategory[entry.riskCategory] = (byRiskCategory[entry.riskCategory] || 0) + entry.amount;

      if (!byProject[entry.projectId]) {
        byProject[entry.projectId] = {
          projectName: entry.project.name,
          province: entry.project.province,
          amount: 0,
          count: 0,
        };
      }
      byProject[entry.projectId].amount += entry.amount;
      byProject[entry.projectId].count += 1;
    }

    // Round risk category values
    const byRiskCategoryRounded: Record<string, number> = {};
    for (const [key, val] of Object.entries(byRiskCategory)) {
      byRiskCategoryRounded[key] = Math.round(val * 100) / 100;
    }

    return NextResponse.json({
      entries,
      summary: {
        total: entries.length,
        totalBuffered: Math.round(totalBuffered * 100) / 100,
        byRiskCategory: byRiskCategoryRounded,
        byProject,
      },
    });
  } catch (error) {
    console.error('Buffer GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch buffer pool entries', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/buffer — Create buffer pool entry or release buffer
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      action: 'create' | 'release';
      projectId: string;
      creditId?: string;
      amount?: number;
      uncertaintyPct?: number;
      bufferPct?: number;
      riskCategory?: string;
      reason?: string;
      entryId?: string;
    };

    const {
      action, projectId, creditId, amount, uncertaintyPct,
      bufferPct, riskCategory, reason, entryId,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'create') {
      if (!creditId) {
        return NextResponse.json({ error: 'creditId is required for creating buffer entry' }, { status: 400 });
      }

      const credit = await db.carbonCredit.findUnique({ where: { id: creditId } });
      if (!credit) {
        return NextResponse.json({ error: 'Carbon credit not found' }, { status: 404 });
      }

      // Check if credit already has a buffer pool entry (creditId is unique)
      const existingEntry = await db.bufferPoolEntry.findUnique({ where: { creditId } });
      if (existingEntry) {
        return NextResponse.json({ error: 'This credit already has a buffer pool entry' }, { status: 409 });
      }

      const entry = await db.bufferPoolEntry.create({
        data: {
          projectId,
          creditId,
          amount: amount || 0,
          uncertaintyPct: uncertaintyPct || 0,
          bufferPct: bufferPct || 0,
          riskCategory: riskCategory || 'MEDIUM',
          reason: reason || '',
        },
        include: {
          project: { select: { id: true, name: true, province: true } },
          credit: { select: { id: true, tokenId: true, amount: true, status: true } },
        },
      });

      return NextResponse.json({ success: true, entry }, { status: 201 });
    }

    if (action === 'release') {
      if (!entryId) {
        return NextResponse.json({ error: 'entryId is required for release' }, { status: 400 });
      }

      const existing = await db.bufferPoolEntry.findUnique({
        where: { id: entryId },
        include: { credit: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Buffer pool entry not found' }, { status: 404 });
      }

      if (existing.releasedAt) {
        return NextResponse.json({ error: 'Buffer already released' }, { status: 409 });
      }

      const updated = await db.bufferPoolEntry.update({
        where: { id: entryId },
        data: { releasedAt: new Date() },
        include: {
          project: { select: { id: true, name: true, province: true } },
          credit: { select: { id: true, tokenId: true, amount: true, status: true } },
        },
      });

      return NextResponse.json({ success: true, entry: updated, message: 'Buffer credits released' });
    }

    return NextResponse.json({ error: 'Invalid action. Use "create" or "release"' }, { status: 400 });
  } catch (error) {
    console.error('Buffer POST error:', error);
    return NextResponse.json({ error: 'Failed to process buffer pool action', details: String(error) }, { status: 500 });
  }
}
