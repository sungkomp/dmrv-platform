import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Methodology definitions stored in memory (would be a DB table in production)
interface Methodology {
  id: string;
  name: string;
  version: string;
  trackType: string;
  description: string;
  formula: string;
  parameters: Array<{ name: string; type: string; default: number | string; description: string }>;
  approvedBy: string;
  status: string;
  updatedAt: string;
}

const methodologies: Methodology[] = [
  {
    id: 'meth-001',
    name: 'T-VER-FOREST',
    version: '2.0',
    trackType: 'forest',
    description: 'Thailand Voluntary Emission Reduction for Forestry — Blue Carbon methodology for mangrove conservation',
    formula: 'tCO2e = area_ha × sequestration_rate',
    parameters: [
      { name: 'area_ha', type: 'number', default: 0, description: 'Project area in hectares' },
      { name: 'sequestration_rate', type: 'number', default: 8.5, description: 'tCO2e per hectare per year (mangrove average)' },
    ],
    approvedBy: 'TGO (Thailand Greenhouse Gas Management Organization)',
    status: 'APPROVED',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'meth-002',
    name: 'IPCC-2023-BIOCHAR',
    version: '1.0',
    trackType: 'biochar',
    description: 'IPCC 2023 Guidelines for biochar carbon removal — mass-based quantification',
    formula: 'tCO2e = mass_kg × carbon_fraction × stability_factor × 3.667',
    parameters: [
      { name: 'mass_kg', type: 'number', default: 1000, description: 'Biochar mass in kilograms' },
      { name: 'carbon_fraction', type: 'number', default: 0.7, description: 'Carbon content fraction (0-1)' },
      { name: 'stability_factor', type: 'number', default: 0.85, description: 'Stability factor for permanence (0-1)' },
    ],
    approvedBy: 'IPCC',
    status: 'APPROVED',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'meth-003',
    name: 'IPCC-2023-AWD',
    version: '1.0',
    trackType: 'awd',
    description: 'Alternate Wetting and Drying rice cultivation emission reduction methodology',
    formula: 'tCO2e = baseline_emission × mitigation_factor × area_ha',
    parameters: [
      { name: 'baseline_emission', type: 'number', default: 3.5, description: 'Baseline emission in tCO2e/ha' },
      { name: 'mitigation_factor', type: 'number', default: 0.5, description: 'Mitigation factor (0-1)' },
      { name: 'area_ha', type: 'number', default: 1, description: 'Area in hectares' },
    ],
    approvedBy: 'IPCC',
    status: 'APPROVED',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'meth-004',
    name: 'IPCC-2023-BIOGAS',
    version: '1.0',
    trackType: 'biogas',
    description: 'Biogas capture and utilization methodology — CH4 avoidance + fuel displacement',
    formula: 'tCO2e = CH4_capture + fuel_displacement',
    parameters: [
      { name: 'CH4_capture', type: 'number', default: 50, description: 'CH4 captured in tCO2e' },
      { name: 'fuel_displacement', type: 'number', default: 20, description: 'Fuel displacement in tCO2e' },
    ],
    approvedBy: 'IPCC',
    status: 'APPROVED',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'meth-005',
    name: 'IPCC-2023-SOLAR',
    version: '1.0',
    trackType: 'solar',
    description: 'Solar PV emission reduction methodology — grid displacement calculation',
    formula: 'tCO2e = (kWh / 1000) × grid_emission_factor',
    parameters: [
      { name: 'kWh', type: 'number', default: 500000, description: 'Electricity generated in kWh' },
      { name: 'grid_emission_factor', type: 'number', default: 0.5, description: 'Grid emission factor in tCO2e/MWh' },
    ],
    approvedBy: 'IPCC',
    status: 'APPROVED',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'meth-006',
    name: 'PDPA-2019',
    version: '1.0',
    trackType: 'governance',
    description: 'Thailand Personal Data Protection Act compliance rules for data classification',
    formula: 'N/A',
    parameters: [
      { name: 'consent_required', type: 'boolean', default: 'true', description: 'Whether PDPA consent is required' },
      { name: 'data_classification', type: 'string', default: 'CONFIDENTIAL', description: 'Default classification for PII data' },
    ],
    approvedBy: 'PDPC Thailand',
    status: 'APPROVED',
    updatedAt: new Date().toISOString(),
  },
];

// Governance rules
const governanceRules = [
  {
    ruleId: 'GR-001',
    name: 'Cross-Validation Requirement',
    description: 'All carbon claims must be supported by evidence from at least 2 independent source types',
    severity: 'MANDATORY',
    category: 'verification',
  },
  {
    ruleId: 'GR-002',
    name: 'Double-Claiming Prevention',
    description: 'Credits cannot be claimed for the same emission reduction by more than one entity',
    severity: 'MANDATORY',
    category: 'marketplace',
  },
  {
    ruleId: 'GR-003',
    name: 'Data Freshness Check',
    description: 'Ingestion data must be less than 30 days old for carbon quantification',
    severity: 'WARNING',
    category: 'quantification',
  },
  {
    ruleId: 'GR-004',
    name: 'PDPA Data Classification',
    description: 'All data containing PII must be classified as CONFIDENTIAL and encrypted',
    severity: 'MANDATORY',
    category: 'security',
  },
  {
    ruleId: 'GR-005',
    name: 'T-VER Certification',
    description: 'All carbon credits must be certified under T-VER before trading',
    severity: 'MANDATORY',
    category: 'certification',
  },
];

// GET /api/dmrv/governance — List methodologies and rules
export async function GET() {
  try {
    return NextResponse.json({
      methodologies,
      rules: governanceRules,
      summary: {
        totalMethodologies: methodologies.length,
        approvedMethodologies: methodologies.filter((m) => m.status === 'APPROVED').length,
        totalRules: governanceRules.length,
        mandatoryRules: governanceRules.filter((r) => r.severity === 'MANDATORY').length,
      },
    });
  } catch (error) {
    console.error('Governance error:', error);
    return NextResponse.json({ error: 'Failed to fetch governance data' }, { status: 500 });
  }
}

// POST /api/dmrv/governance — Add/update methodology
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: 'add' | 'update';
      id?: string;
      name: string;
      version?: string;
      trackType: string;
      description?: string;
      formula?: string;
      parameters?: Array<{ name: string; type: string; default: number | string; description: string }>;
      approvedBy?: string;
      status?: string;
    };

    const { action, name, trackType } = body;

    if (!action || !name || !trackType) {
      return NextResponse.json({ error: 'action, name, and trackType are required' }, { status: 400 });
    }

    if (action === 'add') {
      const newMethodology: Methodology = {
        id: `meth-${Date.now()}`,
        name,
        version: body.version ?? '1.0',
        trackType,
        description: body.description ?? '',
        formula: body.formula ?? 'N/A',
        parameters: body.parameters ?? [],
        approvedBy: body.approvedBy ?? 'Pending',
        status: body.status ?? 'DRAFT',
        updatedAt: new Date().toISOString(),
      };
      methodologies.push(newMethodology);

      await db.auditLog.create({
        data: {
          agentName: 'GovernanceAgent',
          action: 'add_methodology',
          details: JSON.stringify({ id: newMethodology.id, name, trackType }),
          severity: 'INFO',
        },
      });

      return NextResponse.json({ success: true, methodology: newMethodology }, { status: 201 });
    }

    if (action === 'update') {
      if (!body.id) {
        return NextResponse.json({ error: 'id is required for update' }, { status: 400 });
      }

      const existingIndex = methodologies.findIndex((m) => m.id === body.id);
      if (existingIndex < 0) {
        return NextResponse.json({ error: 'Methodology not found' }, { status: 404 });
      }

      methodologies[existingIndex] = {
        ...methodologies[existingIndex],
        name: name ?? methodologies[existingIndex].name,
        version: body.version ?? methodologies[existingIndex].version,
        trackType: trackType ?? methodologies[existingIndex].trackType,
        description: body.description ?? methodologies[existingIndex].description,
        formula: body.formula ?? methodologies[existingIndex].formula,
        parameters: body.parameters ?? methodologies[existingIndex].parameters,
        approvedBy: body.approvedBy ?? methodologies[existingIndex].approvedBy,
        status: body.status ?? methodologies[existingIndex].status,
        updatedAt: new Date().toISOString(),
      };

      await db.auditLog.create({
        data: {
          agentName: 'GovernanceAgent',
          action: 'update_methodology',
          details: JSON.stringify({ id: body.id, name, trackType }),
          severity: 'INFO',
        },
      });

      return NextResponse.json({ success: true, methodology: methodologies[existingIndex] });
    }

    return NextResponse.json({ error: 'Invalid action. Use add or update' }, { status: 400 });
  } catch (error) {
    console.error('Governance action error:', error);
    return NextResponse.json({ error: 'Governance action failed', details: String(error) }, { status: 500 });
  }
}
