import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dmrv/devices — Device & Oracle Management
export async function GET() {
  try {
    const devices = await db.deviceRegistration.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true,
            province: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute summary
    const total = devices.length;
    const bySigningStatus: Record<string, number> = {};
    const byConnectionStatus: Record<string, number> = {};
    const byHealthStatus: Record<string, number> = {};
    const byDeviceType: Record<string, number> = {};

    for (const device of devices) {
      bySigningStatus[device.signingStatus] = (bySigningStatus[device.signingStatus] || 0) + 1;
      byConnectionStatus[device.connectionStatus] = (byConnectionStatus[device.connectionStatus] || 0) + 1;
      byHealthStatus[device.healthStatus] = (byHealthStatus[device.healthStatus] || 0) + 1;
      byDeviceType[device.deviceType] = (byDeviceType[device.deviceType] || 0) + 1;
    }

    // Seed demo devices if none exist
    if (devices.length === 0) {
      const projects = await db.project.findMany({ take: 3 });
      if (projects.length > 0) {
        const demoDevices = [
          { deviceId: 'IOT-SMC-001', deviceType: 'iot', manufacturer: 'SenseAir', model: 'S8-P', firmwareVersion: '2.4.1', signingStatus: 'SIGNED', connectionStatus: 'connected', healthStatus: 'HEALTHY', batteryLevel: 92, signalStrength: -45, publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7...' },
          { deviceId: 'IOT-SMC-002', deviceType: 'iot', manufacturer: 'Sensirion', model: 'SCD30', firmwareVersion: '3.1.0', signingStatus: 'SIGNED', connectionStatus: 'connected', healthStatus: 'HEALTHY', batteryLevel: 78, signalStrength: -62, publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC8...' },
          { deviceId: 'IOT-SMC-003', deviceType: 'iot', manufacturer: 'Davis Instruments', model: 'Vantage Pro2', firmwareVersion: '1.8.5', signingStatus: 'UNSIGNED', connectionStatus: 'connected', healthStatus: 'DEGRADED', batteryLevel: 45, signalStrength: -78, publicKey: '' },
          { deviceId: 'DRONE-LP-001', deviceType: 'drone', manufacturer: 'DJI', model: 'Matrice 300 RTK', firmwareVersion: '4.2.0', signingStatus: 'SIGNED', connectionStatus: 'disconnected', healthStatus: 'HEALTHY', batteryLevel: 100, signalStrength: 0, publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC9...' },
          { deviceId: 'DRONE-LP-002', deviceType: 'drone', manufacturer: 'DJI', model: 'Phantom 4 RTK', firmwareVersion: '5.1.3', signingStatus: 'EXPIRED', connectionStatus: 'maintenance', healthStatus: 'CRITICAL', batteryLevel: 12, signalStrength: 0, publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD0...' },
          { deviceId: 'SAT-KKN-001', deviceType: 'satellite', manufacturer: 'Planet Labs', model: 'SuperDove', firmwareVersion: '7.0.2', signingStatus: 'SIGNED', connectionStatus: 'connected', healthStatus: 'HEALTHY', batteryLevel: 100, signalStrength: -30, publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD1...' },
          { deviceId: 'SAT-KKN-002', deviceType: 'satellite', manufacturer: 'Maxar', model: 'WorldView-3', firmwareVersion: '9.3.1', signingStatus: 'SIGNED', connectionStatus: 'connected', healthStatus: 'HEALTHY', batteryLevel: 100, signalStrength: -25, publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD2...' },
          { deviceId: 'IOT-CM-001', deviceType: 'iot', manufacturer: 'Meters UK', model: 'CH4-Detector-X1', firmwareVersion: '1.2.0', signingStatus: 'REVOKED', connectionStatus: 'disconnected', healthStatus: 'CRITICAL', batteryLevel: 5, signalStrength: 0, publicKey: '' },
          { deviceId: 'IOT-CB-001', deviceType: 'iot', manufacturer: 'Sentek', model: 'Drill & Drop', firmwareVersion: '2.0.3', signingStatus: 'UNSIGNED', connectionStatus: 'connected', healthStatus: 'DEGRADED', batteryLevel: 63, signalStrength: -71, publicKey: '' },
          { deviceId: 'IOT-CB-002', deviceType: 'iot', manufacturer: 'Campbell Scientific', model: 'CR6', firmwareVersion: '4.5.1', signingStatus: 'SIGNED', connectionStatus: 'connected', healthStatus: 'HEALTHY', batteryLevel: 88, signalStrength: -38, publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD3...' },
          { deviceId: 'DRONE-CB-001', deviceType: 'drone', manufacturer: 'Autel', model: 'EVO II Pro', firmwareVersion: '2.7.0', signingStatus: 'UNSIGNED', connectionStatus: 'connected', healthStatus: 'HEALTHY', batteryLevel: 95, signalStrength: -42, publicKey: '' },
          { deviceId: 'IOT-NMA-001', deviceType: 'iot', manufacturer: 'Sunflector', model: 'SolarEdge-M', firmwareVersion: '3.3.0', signingStatus: 'SIGNED', connectionStatus: 'connected', healthStatus: 'HEALTHY', batteryLevel: 100, signalStrength: -15, publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD4...' },
        ];

        for (let i = 0; i < demoDevices.length; i++) {
          const d = demoDevices[i];
          const projectIdx = Math.min(i % projects.length, projects.length - 1);
          const calDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000);

          await db.deviceRegistration.create({
            data: {
              projectId: projects[projectIdx].id,
              deviceId: d.deviceId,
              deviceType: d.deviceType,
              manufacturer: d.manufacturer,
              model: d.model,
              firmwareVersion: d.firmwareVersion,
              signingStatus: d.signingStatus as 'UNSIGNED' | 'SIGNED' | 'EXPIRED' | 'REVOKED',
              connectionStatus: d.connectionStatus as 'connected' | 'disconnected' | 'maintenance',
              healthStatus: d.healthStatus as 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN',
              publicKey: d.publicKey,
              batteryLevel: d.batteryLevel,
              signalStrength: d.signalStrength,
              lastCalibration: calDate,
              metadata: JSON.stringify({
                serialNumber: `SN-${d.deviceId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                supportedMeasurements: getSupportedMeasurement(d.deviceType),
                calibrationHistory: [
                  { date: calDate.toISOString(), result: 'PASS', nextDue: new Date(calDate.getTime() + 90 * 86400000).toISOString() },
                ],
              }),
            },
          });
        }

        // Re-fetch after seeding
        const seededDevices = await db.deviceRegistration.findMany({
          include: {
            project: {
              select: {
                id: true,
                name: true,
                province: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const seededTotal = seededDevices.length;
        const seededBySigningStatus: Record<string, number> = {};
        const seededByConnectionStatus: Record<string, number> = {};
        const seededByHealthStatus: Record<string, number> = {};
        const seededByDeviceType: Record<string, number> = {};

        for (const device of seededDevices) {
          seededBySigningStatus[device.signingStatus] = (seededBySigningStatus[device.signingStatus] || 0) + 1;
          seededByConnectionStatus[device.connectionStatus] = (seededByConnectionStatus[device.connectionStatus] || 0) + 1;
          seededByHealthStatus[device.healthStatus] = (seededByHealthStatus[device.healthStatus] || 0) + 1;
          seededByDeviceType[device.deviceType] = (seededByDeviceType[device.deviceType] || 0) + 1;
        }

        return NextResponse.json({
          devices: seededDevices,
          summary: {
            total: seededTotal,
            bySigningStatus: seededBySigningStatus,
            byConnectionStatus: seededByConnectionStatus,
            byHealthStatus: seededByHealthStatus,
            byDeviceType: seededByDeviceType,
          },
        });
      }
    }

    return NextResponse.json({
      devices,
      summary: {
        total,
        bySigningStatus,
        byConnectionStatus,
        byHealthStatus,
        byDeviceType,
      },
    });
  } catch (error) {
    console.error('Devices error:', error);
    return NextResponse.json({ error: 'Failed to fetch device data' }, { status: 500 });
  }
}

// POST /api/dmrv/devices — Register a new device
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId: string;
      deviceId: string;
      deviceType: string;
      manufacturer: string;
      model: string;
      firmwareVersion?: string;
      publicKey?: string;
    };

    const { projectId, deviceId, deviceType, manufacturer, model, firmwareVersion, publicKey } = body;

    if (!projectId || !deviceId || !deviceType || !manufacturer || !model) {
      return NextResponse.json({ error: 'projectId, deviceId, deviceType, manufacturer, and model are required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const device = await db.deviceRegistration.create({
      data: {
        projectId,
        deviceId,
        deviceType,
        manufacturer,
        model,
        firmwareVersion: firmwareVersion || '1.0.0',
        publicKey: publicKey || '',
        signingStatus: publicKey ? 'SIGNED' : 'UNSIGNED',
        connectionStatus: 'disconnected',
        healthStatus: 'UNKNOWN',
        metadata: JSON.stringify({
          serialNumber: `SN-${deviceId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          supportedMeasurements: getSupportedMeasurement(deviceType),
          calibrationHistory: [],
        }),
      },
      include: {
        project: { select: { id: true, name: true, province: true } },
      },
    });

    await db.auditLog.create({
      data: {
        agentName: 'DeviceManagementAgent',
        action: 'register_device',
        projectId,
        details: JSON.stringify({ deviceId, deviceType, manufacturer, model }),
        severity: 'INFO',
      },
    });

    return NextResponse.json({ success: true, device }, { status: 201 });
  } catch (error) {
    console.error('Device registration error:', error);
    return NextResponse.json({ error: 'Device registration failed', details: String(error) }, { status: 500 });
  }
}

function getSupportedMeasurement(deviceType: string): string[] {
  switch (deviceType) {
    case 'iot':
      return ['soil_moisture', 'temperature', 'humidity', 'ch4', 'co2', 'water_level', 'ph'];
    case 'drone':
      return ['aerial_imagery', 'lidar_scan', 'ndvi', 'multispectral', 'thermal'];
    case 'satellite':
      return ['multispectral_imagery', 'sar', 'thermal_imagery', 'ndvi', 'land_cover'];
    case 'lidar':
      return ['point_cloud', 'dem', 'canopy_height', 'biomass_estimation'];
    default:
      return ['manual_observation'];
  }
}
