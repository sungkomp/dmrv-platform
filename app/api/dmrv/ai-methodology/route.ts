import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';
import ZAI from 'z-ai-web-dev-sdk';

// GET /api/dmrv/ai-methodology — List AI generation sessions
export async function GET() {
  try {
    await ensureSeeded();

    const sessions = await db.aIGenerationSession.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const byStatus: Record<string, number> = {};
    for (const s of sessions) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    }

    return NextResponse.json({
      sessions,
      summary: { total: sessions.length, byStatus },
    });
  } catch (error) {
    console.error('AI Methodology GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI sessions', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/ai-methodology — Generate methodology via AI or manage sessions
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      action: 'generate' | 'apply' | 'feedback';
      prompt?: string;
      methodology?: string;
      trackType?: string;
      sessionId?: string;
      feedback?: string;
    };

    const { action } = body;

    if (action === 'generate') {
      const { prompt, methodology, trackType } = body;
      if (!prompt) {
        return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
      }

      const session = await db.aIGenerationSession.create({
        data: {
          prompt,
          methodology: methodology || 'T-VER',
          trackType: trackType || 'forest',
          status: 'GENERATING',
          aiModel: 'z-ai-llm',
          createdBy: 'Admin',
        },
      });

      try {
        const zai = await ZAI.create();
        const systemPrompt = `You are an expert carbon credit methodology engineer specializing in Thailand T-VER, Verra VCS, Gold Standard, CDM, and IPCC carbon calculation standards.

Given a natural language description, generate a carbon calculation methodology including:
1. A mathematical formula expression
2. Variable definitions with units
3. Input parameters with types, constraints, and defaults
4. Validation conditions

Respond with ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "formula": {
    "expression": "mathematical expression here",
    "variables": { "VAR_NAME": "description (unit)" }
  },
  "parameters": [
    { "name": "param_name", "type": "number", "required": true, "description": "...", "default": "value", "unit": "..." }
  ],
  "conditions": [
    { "field": "field_name", "operator": ">=", "value": 0, "message": "error message" }
  ],
  "calculationNodes": [
    { "id": "n1", "type": "input", "label": "Node Label", "x": 50, "y": 50 }
  ]
}

Be precise with carbon accounting standards. Use proper units (tCO2e, ha, MWh, etc). Apply IPCC AR6 GWP values.`;

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'assistant', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          thinking: { type: 'disabled' },
        });

        const aiResponse = completion.choices[0]?.message?.content || '';

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(aiResponse);
        } catch {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('AI response is not valid JSON');
          }
        }

        const formulaData = (parsed.formula || {}) as Record<string, unknown>;
        const paramsData = (parsed.parameters || []) as unknown[];
        const conditionsData = (parsed.conditions || []) as unknown[];
        const nodesData = (parsed.calculationNodes || []) as unknown[];

        const updatedSession = await db.aIGenerationSession.update({
          where: { id: session.id },
          data: {
            generatedFormula: JSON.stringify(formulaData),
            generatedParams: JSON.stringify(paramsData),
            generatedConditions: JSON.stringify(conditionsData),
            generatedNodes: JSON.stringify(nodesData),
            status: 'COMPLETED',
          },
        });

        return NextResponse.json({ success: true, session: updatedSession, raw: parsed });
      } catch (aiError) {
        await db.aIGenerationSession.update({
          where: { id: session.id },
          data: {
            status: 'FAILED',
            feedback: `AI generation error: ${aiError instanceof Error ? aiError.message : String(aiError)}`,
          },
        });
        return NextResponse.json({ error: 'AI generation failed', details: String(aiError) }, { status: 500 });
      }
    }

    if (action === 'apply') {
      const { sessionId } = body;
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
      }

      const session = await db.aIGenerationSession.findUnique({ where: { id: sessionId } });
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      if (session.status !== 'COMPLETED') {
        return NextResponse.json({ error: 'Session must be COMPLETED before applying' }, { status: 400 });
      }

      const rule = await db.methodologyRule.create({
        data: {
          name: `AI Generated: ${session.prompt.substring(0, 60)}`,
          methodology: session.methodology,
          trackType: session.trackType,
          version: '1.0',
          description: `Auto-generated from AI prompt: ${session.prompt}`,
          formula: session.generatedFormula,
          parameters: session.generatedParams,
          conditions: session.generatedConditions,
          calculationNodes: session.generatedNodes,
          status: 'DRAFT',
          aiGenerated: true,
          aiGenerationId: session.id,
          sourceTemplate: 'AI-GENERATED',
          createdBy: 'AI Studio',
        },
      });

      await db.aIGenerationSession.update({
        where: { id: sessionId },
        data: { status: 'APPLIED', ruleId: rule.id },
      });

      return NextResponse.json({ success: true, rule, session });
    }

    if (action === 'feedback') {
      const { sessionId, feedback } = body;
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
      }

      const updated = await db.aIGenerationSession.update({
        where: { id: sessionId },
        data: { feedback: feedback || '' },
      });

      return NextResponse.json({ success: true, session: updated });
    }

    return NextResponse.json({ error: 'Invalid action. Use "generate", "apply", or "feedback"' }, { status: 400 });
  } catch (error) {
    console.error('AI Methodology POST error:', error);
    return NextResponse.json({ error: 'Failed to process AI methodology', details: String(error) }, { status: 500 });
  }
}
