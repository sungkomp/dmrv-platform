import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Carbon quantification formulas
interface CarbonCalculationInput {
  methodology: string;
  trackType: string;
  // Biochar inputs
  mass?: number; // kg
  carbonFraction?: number; // 0-1
  stability?: number; // 0-1
  // AWD inputs
  baseline?: number; // tCO2e/ha
  mitigationFactor?: number; // 0-1
  area?: number; // ha
  // Biogas inputs
  ch4Capture?: number; // tCO2e
  fuelDisplacement?: number; // tCO2e
  // Solar inputs
  kwh?: number; // kWh
  gridEF?: number; // tCO2e/MWh
  // Project reference
  projectId?: string;
}

function calculateCarbon(input: CarbonCalculationInput & { type?: string }): { tco2e: number; formula: string; breakdown: Record<string, number> } {
  const trackType = input.trackType || input.type || '';

  switch (trackType) {
    case 'biochar': {
      const mass = input.mass ?? 1000;
      const carbonFraction = input.carbonFraction ?? 0.7;
      const stability = input.stability ?? 0.85;
      const tco2e = mass * carbonFraction * stability * 3.667;
      return {
        tco2e: Math.round(tco2e * 100) / 100,
        formula: 'tCO2e = mass × carbon_fraction × stability × 3.667',
        breakdown: { mass, carbonFraction, stability, conversionFactor: 3.667 },
      };
    }
    case 'awd': {
      const baseline = input.baseline ?? 3.5;
      const mitigationFactor = input.mitigationFactor ?? 0.5;
      const area = input.area ?? 1;
      const tco2e = baseline * mitigationFactor * area;
      return {
        tco2e: Math.round(tco2e * 100) / 100,
        formula: 'tCO2e = baseline × mitigation_factor × area',
        breakdown: { baseline, mitigationFactor, area },
      };
    }
    case 'biogas': {
      const ch4Capture = input.ch4Capture ?? 50;
      const fuelDisplacement = input.fuelDisplacement ?? 20;
      const tco2e = ch4Capture + fuelDisplacement;
      return {
        tco2e: Math.round(tco2e * 100) / 100,
        formula: 'tCO2e = CH4_capture + fuel_displacement',
        breakdown: { ch4Capture, fuelDisplacement },
      };
    }
    case 'solar': {
      const kwh = input.kwh ?? 500000;
      const gridEF = input.gridEF ?? 0.5;
      const tco2e = (kwh / 1000) * gridEF;
      return {
        tco2e: Math.round(tco2e * 100) / 100,
        formula: 'tCO2e = (kWh / 1000) × grid_emission_factor',
        breakdown: { kwh, gridEF },
      };
    }
    default:
      return { tco2e: 0, formula: 'Unknown track type', breakdown: {} };
  }
}

// GET /api/dmrv/carbon — List carbon credits
export async function GET() {
  try {
    const credits = await db.carbonCredit.findMany({
      include: { project: { select: { id: true, name: true, methodology: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      totalCredits: credits.reduce((sum, c) => sum + c.amount, 0),
      available: credits.filter((c) => c.status === 'Available').reduce((sum, c) => sum + c.amount, 0),
      traded: credits.filter((c) => c.status === 'Traded').reduce((sum, c) => sum + c.amount, 0),
      retired: credits.filter((c) => c.status === 'Retired').reduce((sum, c) => sum + c.amount, 0),
    };

    return NextResponse.json({ credits, summary });
  } catch (error) {
    console.error('Error fetching carbon credits:', error);
    return NextResponse.json({ error: 'Failed to fetch carbon credits' }, { status: 500 });
  }
}

// POST /api/dmrv/carbon — Calculate carbon and optionally create credit
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CarbonCalculationInput & { createCredit?: boolean };
    const { projectId, createCredit } = body;

    const calculation = calculateCarbon(body);

    if (createCredit && projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const tokenId = `TCO2E-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const credit = await db.carbonCredit.create({
        data: {
          tokenId,
          projectId,
          amount: calculation.tco2e,
          status: 'Available',
          metadata: JSON.stringify({ formula: calculation.formula, breakdown: calculation.breakdown, trackType: body.trackType }),
        },
      });

      await db.auditLog.create({
        data: {
          agentName: 'CarbonQuantifier',
          action: 'create_credit',
          projectId,
          details: JSON.stringify({ tokenId, amount: calculation.tco2e, trackType: body.trackType }),
          severity: 'INFO',
        },
      });

      return NextResponse.json({ success: true, calculation, credit }, { status: 201 });
    }

    return NextResponse.json({ success: true, calculation });
  } catch (error) {
    console.error('Carbon calculation error:', error);
    return NextResponse.json({ error: 'Carbon calculation failed', details: String(error) }, { status: 500 });
  }
}
