import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Emission factors database
interface EmissionFactor {
  id: string;
  scope: number; // 1, 2, or 3
  category: string;
  activityType: string;
  factor: number; // kgCO2e per unit
  unit: string;
  source: string;
}

const EMISSION_FACTORS: EmissionFactor[] = [
  // Scope 1 — Direct emissions
  { id: 'EF-S1-001', scope: 1, category: 'stationary_combustion', activityType: 'diesel', factor: 2.68, unit: 'kgCO2e/liter', source: 'IPCC 2006' },
  { id: 'EF-S1-002', scope: 1, category: 'stationary_combustion', activityType: 'natural_gas', factor: 2.02, unit: 'kgCO2e/m³', source: 'IPCC 2006' },
  { id: 'EF-S1-003', scope: 1, category: 'stationary_combustion', activityType: 'lpg', factor: 1.51, unit: 'kgCO2e/liter', source: 'IPCC 2006' },
  { id: 'EF-S1-004', scope: 1, category: 'mobile_combustion', activityType: 'gasoline', factor: 2.31, unit: 'kgCO2e/liter', source: 'IPCC 2006' },
  { id: 'EF-S1-005', scope: 1, category: 'fugitive_emissions', activityType: 'ch4_leak', factor: 25.0, unit: 'kgCO2e/kg CH4', source: 'IPCC AR5' },
  { id: 'EF-S1-006', scope: 1, category: 'process_emissions', activityType: 'cement', factor: 0.51, unit: 'kgCO2e/kg cement', source: 'IPCC 2006' },

  // Scope 2 — Indirect energy emissions
  { id: 'EF-S2-001', scope: 2, category: 'purchased_electricity', activityType: 'electricity_thailand', factor: 0.51, unit: 'kgCO2e/kWh', source: 'EGAT 2023' },
  { id: 'EF-S2-002', scope: 2, category: 'purchased_electricity', activityType: 'electricity_grid_average', factor: 0.50, unit: 'kgCO2e/kWh', source: 'IEA 2023' },
  { id: 'EF-S2-003', scope: 2, category: 'purchased_steam', activityType: 'steam', factor: 0.18, unit: 'kgCO2e/kg steam', source: 'DEFRA 2023' },

  // Scope 3 — Other indirect emissions
  { id: 'EF-S3-001', scope: 3, category: 'transportation', activityType: 'road_freight', factor: 0.09, unit: 'kgCO2e/tonne-km', source: 'DEFRA 2023' },
  { id: 'EF-S3-002', scope: 3, category: 'transportation', activityType: 'sea_freight', factor: 0.01, unit: 'kgCO2e/tonne-km', source: 'DEFRA 2023' },
  { id: 'EF-S3-003', scope: 3, category: 'transportation', activityType: 'air_freight', factor: 0.60, unit: 'kgCO2e/tonne-km', source: 'DEFRA 2023' },
  { id: 'EF-S3-004', scope: 3, category: 'waste_disposal', activityType: 'landfill', factor: 0.41, unit: 'kgCO2e/kg waste', source: 'IPCC 2006' },
  { id: 'EF-S3-005', scope: 3, category: 'waste_disposal', activityType: 'recycling', factor: 0.02, unit: 'kgCO2e/kg waste', source: 'DEFRA 2023' },
  { id: 'EF-S3-006', scope: 3, category: 'purchased_goods', activityType: 'steel', factor: 1.55, unit: 'kgCO2e/kg', source: 'World Steel 2023' },
  { id: 'EF-S3-007', scope: 3, category: 'purchased_goods', activityType: 'concrete', factor: 0.16, unit: 'kgCO2e/kg', source: 'GCCA 2023' },
];

// GET /api/dmrv/footprint — Get emission factors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const category = searchParams.get('category');

    let filteredFactors = EMISSION_FACTORS;
    if (scope) {
      filteredFactors = filteredFactors.filter((ef) => ef.scope === parseInt(scope));
    }
    if (category) {
      filteredFactors = filteredFactors.filter((ef) => ef.category === category);
    }

    const groupedByScope: Record<number, EmissionFactor[]> = {
      1: filteredFactors.filter((ef) => ef.scope === 1),
      2: filteredFactors.filter((ef) => ef.scope === 2),
      3: filteredFactors.filter((ef) => ef.scope === 3),
    };

    return NextResponse.json({
      emissionFactors: filteredFactors,
      groupedByScope,
      categories: [...new Set(EMISSION_FACTORS.map((ef) => ef.category))],
      activityTypes: [...new Set(EMISSION_FACTORS.map((ef) => ef.activityType))],
      totalFactors: EMISSION_FACTORS.length,
    });
  } catch (error) {
    console.error('Footprint error:', error);
    return NextResponse.json({ error: 'Failed to fetch emission factors' }, { status: 500 });
  }
}

// POST /api/dmrv/footprint — Calculate footprint (scope, activity_type, quantity * EF)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      calculations: Array<{
        scope: number;
        activityType: string;
        quantity: number;
        customFactor?: number;
      }>;
    };

    const { projectId, calculations } = body;

    if (!calculations || !Array.isArray(calculations) || calculations.length === 0) {
      return NextResponse.json({ error: 'calculations array is required with at least one entry' }, { status: 400 });
    }

    const results = calculations.map((calc) => {
      const ef = EMISSION_FACTORS.find(
        (f) => f.scope === calc.scope && f.activityType === calc.activityType,
      );

      const factor = calc.customFactor ?? ef?.factor ?? 0;
      const emissions = calc.quantity * factor;

      return {
        scope: calc.scope,
        activityType: calc.activityType,
        quantity: calc.quantity,
        unit: ef?.unit ?? 'custom unit',
        emissionFactor: factor,
        factorSource: ef?.source ?? 'custom',
        emissionsKgCO2e: Math.round(emissions * 100) / 100,
        emissionsTco2e: Math.round((emissions / 1000) * 1000) / 1000,
      };
    });

    const totalEmissions = results.reduce((sum, r) => sum + r.emissionsKgCO2e, 0);

    const scopeBreakdown = {
      scope1: results.filter((r) => r.scope === 1).reduce((sum, r) => sum + r.emissionsKgCO2e, 0),
      scope2: results.filter((r) => r.scope === 2).reduce((sum, r) => sum + r.emissionsKgCO2e, 0),
      scope3: results.filter((r) => r.scope === 3).reduce((sum, r) => sum + r.emissionsKgCO2e, 0),
    };

    const footprintResult = {
      calculationId: `FP-${Date.now()}`,
      projectId: projectId ?? 'standalone',
      timestamp: new Date().toISOString(),
      calculations: results,
      totalEmissionsKgCO2e: Math.round(totalEmissions * 100) / 100,
      totalEmissionsTco2e: Math.round((totalEmissions / 1000) * 1000) / 1000,
      scopeBreakdown: {
        scope1: Math.round(scopeBreakdown.scope1 * 100) / 100,
        scope2: Math.round(scopeBreakdown.scope2 * 100) / 100,
        scope3: Math.round(scopeBreakdown.scope3 * 100) / 100,
      },
    };

    if (projectId) {
      await db.auditLog.create({
        data: {
          agentName: 'FootprintAgent',
          action: 'calculate_footprint',
          projectId,
          details: JSON.stringify({
            totalEmissionsTco2e: footprintResult.totalEmissionsTco2e,
            scopeBreakdown: footprintResult.scopeBreakdown,
          }),
          severity: 'INFO',
        },
      });
    }

    return NextResponse.json({ success: true, footprint: footprintResult }, { status: 201 });
  } catch (error) {
    console.error('Footprint calculation error:', error);
    return NextResponse.json({ error: 'Footprint calculation failed', details: String(error) }, { status: 500 });
  }
}
