import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';
import { NextResponse } from 'next/server';

export async function GET() {
  await ensureSeeded();

  const projects = await db.project.findMany({
    include: {
      plots: true,
      credits: true,
      certificates: true,
      iotSensors: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // ── Build project response with nested relations ────────────────────
  const mappedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    methodology: p.methodology,
    status: p.status,
    areaHa: p.areaHa,
    location: p.location,
    region: p.region,
    centerLat: p.centerLat,
    centerLng: p.centerLng,
    province: p.province,
    plots: p.plots.map((pl) => ({
      id: pl.id,
      plotId: pl.plotId,
      coordinates: pl.coordinates,
      trackType: pl.trackType,
      areaHa: pl.areaHa,
      status: pl.status,
      ownerInfo: pl.ownerInfo,
    })),
    credits: p.credits.map((c) => ({
      amount: c.amount,
      status: c.status,
    })),
    certificates: p.certificates.map((ce) => ({
      status: ce.status,
    })),
    iotSensors: p.iotSensors.map((s) => ({
      id: s.id,
      sensorId: s.sensorId,
      sensorType: s.sensorType,
      lat: s.lat,
      lng: s.lng,
      status: s.status,
      lastReading: s.lastReading,
      unit: s.unit,
      battery: s.battery,
      lastSeen: s.lastSeen,
    })),
  }));

  // ── Stats ────────────────────────────────────────────────────────────
  const allSensors = projects.flatMap((p) => p.iotSensors);
  const allPlots = projects.flatMap((p) => p.plots);
  const allCredits = projects.flatMap((p) => p.credits);

  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'Active').length,
    totalAreaHa: projects.reduce((sum, p) => sum + p.areaHa, 0),
    totalCredits: allCredits.reduce((sum, c) => sum + c.amount, 0),
    totalSensors: allSensors.length,
    onlineSensors: allSensors.filter((s) => s.status === 'online').length,
    totalPlots: allPlots.length,
  };

  // ── Sensor Summary ──────────────────────────────────────────────────
  const byType: Record<string, { count: number; online: number; avgReading: number; totalReading: number }> = {};
  for (const sensor of allSensors) {
    if (!byType[sensor.sensorType]) {
      byType[sensor.sensorType] = { count: 0, online: 0, avgReading: 0, totalReading: 0 };
    }
    byType[sensor.sensorType].count++;
    byType[sensor.sensorType].totalReading += sensor.lastReading;
    if (sensor.status === 'online') {
      byType[sensor.sensorType].online++;
    }
  }

  // Compute averages
  const byTypeFinal: Record<string, { count: number; online: number; avgReading: number }> = {};
  for (const [type, data] of Object.entries(byType)) {
    byTypeFinal[type] = {
      count: data.count,
      online: data.online,
      avgReading: Math.round((data.totalReading / data.count) * 100) / 100,
    };
  }

  // Recent alerts from sensors (offline or unusual readings)
  const recentAlerts = allSensors
    .filter((s) => s.status === 'offline')
    .map((s) => ({
      sensorId: s.sensorId,
      type: s.sensorType,
      message: `Sensor ${s.sensorId} (${s.sensorType}) is offline. Last reading: ${s.lastReading} ${s.unit}`,
      timestamp: s.lastSeen,
    }));

  const sensorSummary = {
    byType: byTypeFinal,
    recentAlerts,
  };

  return NextResponse.json({
    projects: mappedProjects,
    stats,
    sensorSummary,
  });
}
