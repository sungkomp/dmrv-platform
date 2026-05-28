import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Adaptor pattern: Normalize data from different source types
interface RawIngestionData {
  sourceType: string;
  activityType: string;
  payload: Record<string, unknown>;
  evidenceUrl?: string;
  projectId: string;
}

function normalizePayload(sourceType: string, rawPayload: Record<string, unknown>): Record<string, unknown> {
  const base = {
    _sourceType: sourceType,
    _normalizedAt: new Date().toISOString(),
    _version: '1.0',
  };

  switch (sourceType) {
    case 'satellite':
      return { ...base, imagery: rawPayload.imagery ?? rawPayload.url, resolution: rawPayload.resolution ?? '10m', captureDate: rawPayload.captureDate ?? rawPayload.date, bbox: rawPayload.bbox ?? rawPayload.bounds };
    case 'iot':
      return { ...base, sensorId: rawPayload.sensorId ?? rawPayload.device_id, readings: rawPayload.readings ?? rawPayload.data, unit: rawPayload.unit ?? 'ppm', measurementDate: rawPayload.measurementDate ?? rawPayload.ts };
    case 'drone':
      return { ...base, flightId: rawPayload.flightId ?? rawPayload.flight_id, imagery: rawPayload.imagery ?? rawPayload.photos, altitude: rawPayload.altitude ?? '50m', flightDate: rawPayload.flightDate ?? rawPayload.date };
    case 'photo':
      return { ...base, photoUrl: rawPayload.photoUrl ?? rawPayload.url, geolocation: rawPayload.geolocation ?? rawPayload.location, capturedAt: rawPayload.capturedAt ?? rawPayload.timestamp, description: rawPayload.description ?? '' };
    case 'lidar':
      return { ...base, scanId: rawPayload.scanId ?? rawPayload.scan_id, pointCloud: rawPayload.pointCloud ?? rawPayload.points, density: rawPayload.density ?? '10pts/m2', scanDate: rawPayload.scanDate ?? rawPayload.date };
    default:
      return { ...base, ...rawPayload };
  }
}

// GET /api/dmrv/ingestion — List all ingestion logs with optional projectId filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where = projectId ? { projectId } : {};
    const logs = await db.ingestionLog.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ logs, count: logs.length });
  } catch (error) {
    console.error('Error fetching ingestion logs:', error);
    return NextResponse.json({ error: 'Failed to fetch ingestion logs' }, { status: 500 });
  }
}

// POST /api/dmrv/ingestion — Ingest new data
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RawIngestionData;
    const { sourceType, activityType, payload, evidenceUrl, projectId } = body;

    if (!sourceType || !activityType || !projectId) {
      return NextResponse.json({ error: 'sourceType, activityType, and projectId are required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Normalize using adaptor pattern
    const normalizedPayload = normalizePayload(sourceType, payload);

    // Generate integrity hash
    const crypto = await import('crypto');
    const integrityHash = crypto.createHash('sha256').update(JSON.stringify(normalizedPayload)).digest('hex');

    // Auto-classify: check for PII-like patterns
    const payloadStr = JSON.stringify(normalizedPayload).toLowerCase();
    const hasPII = ['email', 'phone', 'idcard', 'address', 'name'].some((p) => payloadStr.includes(p));
    const classification = hasPII ? 'CONFIDENTIAL' : 'PUBLIC';

    const log = await db.ingestionLog.create({
      data: {
        projectId,
        sourceType,
        activityType,
        payload: JSON.stringify(normalizedPayload),
        evidenceUrl: evidenceUrl ?? '',
        integrityHash,
        classification,
        isEncrypted: classification === 'CONFIDENTIAL',
      },
    });

    await db.auditLog.create({
      data: {
        agentName: 'IngestionAgent',
        action: 'ingest_data',
        projectId,
        details: JSON.stringify({ logId: log.id, sourceType, activityType, classification, integrityHash }),
        severity: 'INFO',
      },
    });

    return NextResponse.json({ success: true, log: { ...log, payload: JSON.parse(log.payload) } }, { status: 201 });
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ error: 'Ingestion failed', details: String(error) }, { status: 500 });
  }
}
