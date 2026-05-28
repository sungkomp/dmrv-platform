import { NextRequest, NextResponse } from 'next/server';

// Simulation parameters and results
interface SimulationParams {
  simulationType: 'awd' | 'biogas' | 'solar' | 'biochar' | 'footprint';
  years?: number;
  // AWD params
  baselineEmission?: number;
  mitigationFactor?: number;
  areaHa?: number;
  // Biogas params
  ch4CaptureRate?: number;
  animalUnits?: number;
  fuelDisplacementRate?: number;
  // Solar params
  systemCapacityKw?: number;
  capacityFactor?: number;
  gridEmissionFactor?: number;
  // Biochar params
  biocharMassKg?: number;
  carbonFraction?: number;
  stabilityFactor?: number;
  // Footprint params
  electricityKwh?: number;
  dieselLiters?: number;
  gasolineLiters?: number;
  naturalGasM3?: number;
}

interface SimulationYearResult {
  year: number;
  tco2e: number;
  cumulative: number;
  details: Record<string, unknown>;
}

function runAwdSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const baseline = params.baselineEmission ?? 3.5;
  const mitigation = params.mitigationFactor ?? 0.5;
  const area = params.areaHa ?? 100;
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    // Slight improvement over years as AWD adoption increases
    const yearMitigation = mitigation * (1 + 0.02 * (y - 1));
    const tco2e = baseline * yearMitigation * area;
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: { baseline, mitigationFactor: yearMitigation, area, formula: 'baseline × mitigation × area' },
    });
  }

  return {
    results,
    summary: {
      methodology: 'AWD (Alternate Wetting and Drying)',
      totalYears: years,
      areaHa: area,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

function runBiogasSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const ch4Rate = params.ch4CaptureRate ?? 0.85;
  const animals = params.animalUnits ?? 500;
  const fuelRate = params.fuelDisplacementRate ?? 20;
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    // CH4 from 500 dairy cows ≈ 120 kg CH4/cow/year * GWP25 = 3000 kgCO2e/cow/year baseline
    const ch4Baseline = animals * 3.0; // tCO2e
    const ch4Captured = ch4Baseline * ch4Rate;
    const fuelDisplaced = fuelRate * animals / 25; // Scale with animals
    const tco2e = ch4Captured + fuelDisplaced;
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: { ch4Captured: Math.round(ch4Captured * 100) / 100, fuelDisplaced: Math.round(fuelDisplaced * 100) / 100, animals, captureRate: ch4Rate },
    });
  }

  return {
    results,
    summary: {
      methodology: 'Biogas Capture',
      totalYears: years,
      animalUnits: animals,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

function runSolarSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 25;
  const capacityKw = params.systemCapacityKw ?? 500;
  const capacityFactor = params.capacityFactor ?? 0.18;
  const gridEF = params.gridEmissionFactor ?? 0.51;
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    // Annual degradation of 0.5%
    const degradation = 1 - 0.005 * (y - 1);
    const annualKwh = capacityKw * 8760 * capacityFactor * degradation;
    const tco2e = (annualKwh / 1000) * gridEF;
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: {
        capacityKw,
        capacityFactor,
        degradation: Math.round(degradation * 1000) / 1000,
        annualKwh: Math.round(annualKwh),
        formula: '(kW × 8760 × CF × degradation) / 1000 × gridEF',
      },
    });
  }

  return {
    results,
    summary: {
      methodology: 'Solar PV',
      totalYears: years,
      systemCapacityKw: capacityKw,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

function runBiocharSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const massKg = params.biocharMassKg ?? 50000;
  const carbonFraction = params.carbonFraction ?? 0.7;
  const stability = params.stabilityFactor ?? 0.85;
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    // Biochar is a one-time removal but permanent — annual production
    const tco2e = massKg * carbonFraction * stability * 3.667;
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: {
        massKg,
        carbonFraction,
        stability,
        conversionFactor: 3.667,
        formula: 'mass × carbon_fraction × stability × 3.667',
      },
    });
  }

  return {
    results,
    summary: {
      methodology: 'Biochar Carbon Removal',
      totalYears: years,
      annualProductionKg: massKg,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

function runFootprintSimulation(params: SimulationParams): { results: Record<string, unknown>; summary: Record<string, unknown> } {
  const electricityKwh = params.electricityKwh ?? 100000;
  const dieselLiters = params.dieselLiters ?? 5000;
  const gasolineLiters = params.gasolineLiters ?? 3000;
  const naturalGasM3 = params.naturalGasM3 ?? 2000;

  const scope1 = {
    diesel: dieselLiters * 2.68,
    gasoline: gasolineLiters * 2.31,
    naturalGas: naturalGasM3 * 2.02,
  };
  const scope1Total = Object.values(scope1).reduce((sum, v) => sum + v, 0);

  const scope2 = {
    electricity: electricityKwh * 0.51,
  };
  const scope2Total = Object.values(scope2).reduce((sum, v) => sum + v, 0);

  const totalKgCO2e = scope1Total + scope2Total;

  return {
    results: {
      scope1: {
        breakdown: scope1,
        totalKgCO2e: Math.round(scope1Total * 100) / 100,
      },
      scope2: {
        breakdown: scope2,
        totalKgCO2e: Math.round(scope2Total * 100) / 100,
      },
      totalKgCO2e: Math.round(totalKgCO2e * 100) / 100,
      totalTco2e: Math.round((totalKgCO2e / 1000) * 1000) / 1000,
    },
    summary: {
      methodology: 'Carbon Footprint Assessment',
      inputs: { electricityKwh, dieselLiters, gasolineLiters, naturalGasM3 },
      largestContributor: scope1Total > scope2Total ? 'Scope 1 (Direct emissions)' : 'Scope 2 (Indirect energy)',
    },
  };
}

// POST /api/dmrv/simulation — Run simulation and return results
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SimulationParams;

    const simulationType = body.simulationType || (body as unknown as Record<string, unknown>).type as string || '';
    if (!simulationType) {
      return NextResponse.json(
        { error: 'simulationType is required', validTypes: ['awd', 'biogas', 'solar', 'biochar', 'footprint'] },
        { status: 400 },
      );
    }

    let simulationResult: Record<string, unknown>;

    switch (simulationType) {
      case 'awd':
        simulationResult = runAwdSimulation(body);
        break;
      case 'biogas':
        simulationResult = runBiogasSimulation(body);
        break;
      case 'solar':
        simulationResult = runSolarSimulation(body);
        break;
      case 'biochar':
        simulationResult = runBiocharSimulation(body);
        break;
      case 'footprint':
        simulationResult = runFootprintSimulation(body);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown simulation type: ${body.simulationType}`, validTypes: ['awd', 'biogas', 'solar', 'biochar', 'footprint'] },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      simulationType,
      simulation: simulationResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json({ error: 'Simulation failed', details: String(error) }, { status: 500 });
  }
}
