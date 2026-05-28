import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';

// GET /api/dmrv/methodology — List all methodology rules with summary stats
export async function GET() {
  try {
    await ensureSeeded();

    const rules = await db.methodologyRule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const byStatus: Record<string, number> = {};
    const byTrackType: Record<string, number> = {};
    for (const rule of rules) {
      byStatus[rule.status] = (byStatus[rule.status] || 0) + 1;
      byTrackType[rule.trackType] = (byTrackType[rule.trackType] || 0) + 1;
    }

    return NextResponse.json({
      rules,
      summary: {
        total: rules.length,
        byStatus,
        byTrackType,
      },
    });
  } catch (error) {
    console.error('Methodology GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch methodology rules', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/methodology — Create, update, or deprecate methodology rule
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      action: 'create' | 'update' | 'deprecate';
      name?: string;
      methodology?: string;
      trackType?: string;
      version?: string;
      description?: string;
      formula?: string;
      parameters?: string;
      conditions?: string;
      ruleId?: string;
      status?: string;
    };

    const {
      action, name, methodology, trackType, version,
      description, formula, parameters, conditions, ruleId, status,
    } = body;

    if (action === 'create') {
      if (!name) {
        return NextResponse.json({ error: 'name is required for creating methodology rule' }, { status: 400 });
      }

      const rule = await db.methodologyRule.create({
        data: {
          name,
          methodology: methodology || 'T-VER',
          trackType: trackType || 'forest',
          version: version || '1.0',
          description: description || '',
          formula: formula || '{}',
          parameters: parameters || '[]',
          conditions: conditions || '[]',
          status: status || 'DRAFT',
          createdBy: 'Admin',
        },
      });

      return NextResponse.json({ success: true, rule }, { status: 201 });
    }

    if (action === 'update') {
      if (!ruleId) {
        return NextResponse.json({ error: 'ruleId is required for update' }, { status: 400 });
      }

      const existing = await db.methodologyRule.findUnique({ where: { id: ruleId } });
      if (!existing) {
        return NextResponse.json({ error: 'Methodology rule not found' }, { status: 404 });
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (methodology !== undefined) updateData.methodology = methodology;
      if (trackType !== undefined) updateData.trackType = trackType;
      if (version !== undefined) updateData.version = version;
      if (description !== undefined) updateData.description = description;
      if (formula !== undefined) updateData.formula = formula;
      if (parameters !== undefined) updateData.parameters = parameters;
      if (conditions !== undefined) updateData.conditions = conditions;
      if (status !== undefined) updateData.status = status;

      const rule = await db.methodologyRule.update({
        where: { id: ruleId },
        data: updateData,
      });

      return NextResponse.json({ success: true, rule });
    }

    if (action === 'deprecate') {
      if (!ruleId) {
        return NextResponse.json({ error: 'ruleId is required for deprecation' }, { status: 400 });
      }

      const existing = await db.methodologyRule.findUnique({ where: { id: ruleId } });
      if (!existing) {
        return NextResponse.json({ error: 'Methodology rule not found' }, { status: 404 });
      }

      const rule = await db.methodologyRule.update({
        where: { id: ruleId },
        data: { status: 'DEPRECATED' },
      });

      return NextResponse.json({ success: true, rule, message: 'Methodology rule deprecated' });
    }

    return NextResponse.json({ error: 'Invalid action. Use "create", "update", or "deprecate"' }, { status: 400 });
  } catch (error) {
    console.error('Methodology POST error:', error);
    return NextResponse.json({ error: 'Failed to process methodology rule', details: String(error) }, { status: 500 });
  }
}
