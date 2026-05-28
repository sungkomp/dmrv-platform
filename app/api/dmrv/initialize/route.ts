import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/dmrv/initialize — Seed the database with demo data
export async function POST() {
  try {
    // Check if data already exists
    const existingProjects = await db.project.count();
    if (existingProjects > 0) {
      return NextResponse.json({
        message: 'Database already has data. Skipping seed.',
        existingProjects,
      });
    }

    // ==========================================
    // 1. Create 3 Demo Projects
    // ==========================================
    const project1 = await db.project.create({
      data: {
        name: 'โครงการป่าชายเลนสมุทรสาคร',
        methodology: 'T-VER-FOREST',
        status: 'Active',
        areaHa: 500,
        location: 'สมุทรสาคร, ประเทศไทย',
      },
    });

    const project2 = await db.project.create({
      data: {
        name: 'โครงการชีวมวลถ่านชีวภาพลพบุรี',
        methodology: 'IPCC-2023',
        status: 'Active',
        areaHa: 50,
        location: 'ลพบุรี, ประเทศไทย',
      },
    });

    const project3 = await db.project.create({
      data: {
        name: 'โครงการพลังงานแสงอาทิตย์นครราชสีมา',
        methodology: 'IPCC-2023',
        status: 'Active',
        areaHa: 200,
        location: 'นครราชสีมา, ประเทศไทย',
      },
    });

    // ==========================================
    // 2. Create Plots
    // ==========================================
    const plots = await Promise.all([
      // Blue Carbon plots
      db.plot.create({
        data: {
          plotId: 'BC-PLOT-001',
          coordinates: JSON.stringify([[13.5485, 100.2742], [13.5505, 100.2762], [13.5525, 100.2742], [13.5505, 100.2722]]),
          ownerInfo: 'ชุมชนบ้านป่าชายเลน',
          projectId: project1.id,
          trackType: 'forest',
          status: 'REGISTERED',
        },
      }),
      db.plot.create({
        data: {
          plotId: 'BC-PLOT-002',
          coordinates: JSON.stringify([[13.5600, 100.2800], [13.5620, 100.2820], [13.5640, 100.2800], [13.5620, 100.2780]]),
          ownerInfo: 'องค์การบริหารส่วนจังหวัดสมุทรสาคร',
          projectId: project1.id,
          trackType: 'forest',
          status: 'REGISTERED',
        },
      }),
      db.plot.create({
        data: {
          plotId: 'BC-PLOT-003',
          coordinates: JSON.stringify([[13.5700, 100.2900], [13.5720, 100.2920]]),
          ownerInfo: 'กรมทรัพยากรทางทะเลและชายฝั่ง',
          projectId: project1.id,
          trackType: 'forest',
          status: 'VERIFIED',
        },
      }),
      // Biochar plots
      db.plot.create({
        data: {
          plotId: 'BIO-PLOT-001',
          coordinates: JSON.stringify([[14.8000, 100.6500], [14.8020, 100.6520]]),
          ownerInfo: 'วิสาหกิจชุมชนถ่านชีวภาพลพบุรี',
          projectId: project2.id,
          trackType: 'biochar',
          status: 'REGISTERED',
        },
      }),
      db.plot.create({
        data: {
          plotId: 'BIO-PLOT-002',
          coordinates: JSON.stringify([[14.8100, 100.6600], [14.8120, 100.6620]]),
          ownerInfo: 'สหกรณ์การเกษตรลพบุรี',
          projectId: project2.id,
          trackType: 'biochar',
          status: 'VERIFIED',
        },
      }),
      // Solar plots
      db.plot.create({
        data: {
          plotId: 'SOL-PLOT-001',
          coordinates: JSON.stringify([[14.9700, 102.0800], [14.9720, 102.0820]]),
          ownerInfo: 'บริษัท โซลาร์ คอร์ป จำกัด',
          projectId: project3.id,
          trackType: 'solar',
          status: 'REGISTERED',
        },
      }),
      db.plot.create({
        data: {
          plotId: 'SOL-PLOT-002',
          coordinates: JSON.stringify([[14.9800, 102.0900], [14.9820, 102.0920]]),
          ownerInfo: 'การไฟฟ้าส่วนภูมิภาค',
          projectId: project3.id,
          trackType: 'solar',
          status: 'VERIFIED',
        },
      }),
    ]);

    // ==========================================
    // 3. Create Ingestion Logs
    // ==========================================
    const ingestionLogs = await Promise.all([
      // Blue Carbon ingestion data
      db.ingestionLog.create({
        data: {
          projectId: project1.id,
          sourceType: 'satellite',
          activityType: 'deforestation_monitoring',
          payload: JSON.stringify({ imagery: 'sentinel2_2024_01', resolution: '10m', captureDate: '2024-01-15', bbox: [13.54, 100.27, 13.56, 100.28], ndvi: 0.82 }),
          evidenceUrl: 'https://earthExplorer.usgs.gov/sentinel2/2024-01-15',
          integrityHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          classification: 'PUBLIC',
          isEncrypted: false,
        },
      }),
      db.ingestionLog.create({
        data: {
          projectId: project1.id,
          sourceType: 'drone',
          activityType: 'biomass_survey',
          payload: JSON.stringify({ flightId: 'DRONE-BC-001', imagery: 'multispectral_4band', altitude: '80m', flightDate: '2024-02-10', biomassEstimate: 185.5 }),
          evidenceUrl: 'https://dronedata.dmrv.local/flight/BC-001',
          integrityHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          classification: 'PUBLIC',
          isEncrypted: false,
        },
      }),
      db.ingestionLog.create({
        data: {
          projectId: project1.id,
          sourceType: 'iot',
          activityType: 'soil_carbon_measurement',
          payload: JSON.stringify({ sensorId: 'SM-001', readings: [{ depth: '0-30cm', soc: 42.3 }, { depth: '30-100cm', soc: 28.7 }], unit: 'tC/ha', measurementDate: '2024-03-01' }),
          evidenceUrl: 'https://iot.dmrv.local/sensor/SM-001',
          integrityHash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
          classification: 'PUBLIC',
          isEncrypted: false,
        },
      }),
      // Biochar ingestion data
      db.ingestionLog.create({
        data: {
          projectId: project2.id,
          sourceType: 'iot',
          activityType: 'pyrolysis_temperature',
          payload: JSON.stringify({ sensorId: 'PYR-001', readings: [{ temp: 450, duration: 120 }, { temp: 500, duration: 90 }], unit: '°C', measurementDate: '2024-02-15' }),
          evidenceUrl: 'https://iot.dmrv.local/sensor/PYR-001',
          integrityHash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
          classification: 'PUBLIC',
          isEncrypted: false,
        },
      }),
      db.ingestionLog.create({
        data: {
          projectId: project2.id,
          sourceType: 'photo',
          activityType: 'biochar_quality_inspection',
          payload: JSON.stringify({ photoUrl: 'https://evidence.dmrv.local/biochar/QC-001.jpg', geolocation: { lat: 14.8, lon: 100.65 }, capturedAt: '2024-02-20', description: 'Biochar sample QC inspection' }),
          evidenceUrl: 'https://evidence.dmrv.local/biochar/QC-001.jpg',
          integrityHash: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
          classification: 'PUBLIC',
          isEncrypted: false,
        },
      }),
      // Solar ingestion data
      db.ingestionLog.create({
        data: {
          projectId: project3.id,
          sourceType: 'iot',
          activityType: 'electricity_generation',
          payload: JSON.stringify({ sensorId: 'SOL-METER-001', readings: { jan: 62000, feb: 58000, mar: 65000, apr: 68000 }, unit: 'kWh', measurementDate: '2024-04-01' }),
          evidenceUrl: 'https://iot.dmrv.local/sensor/SOL-METER-001',
          integrityHash: 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
          classification: 'PUBLIC',
          isEncrypted: false,
        },
      }),
      db.ingestionLog.create({
        data: {
          projectId: project3.id,
          sourceType: 'satellite',
          activityType: 'solar_panel_monitoring',
          payload: JSON.stringify({ imagery: 'planet_labs_2024_03', resolution: '3m', captureDate: '2024-03-20', panelCoverage: '95.2%', soilingIndex: 'low' }),
          evidenceUrl: 'https://earthExplorer.usgs.gov/planet/2024-03-20',
          integrityHash: '1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b',
          classification: 'PUBLIC',
          isEncrypted: false,
        },
      }),
      // Additional IoT for blue carbon (for cross-validation)
      db.ingestionLog.create({
        data: {
          projectId: project1.id,
          sourceType: 'lidar',
          activityType: 'canopy_height_measurement',
          payload: JSON.stringify({ scanId: 'LIDAR-BC-001', density: '10pts/m2', scanDate: '2024-01-20', meanCanopyHeight: 8.5, maxCanopyHeight: 12.3 }),
          evidenceUrl: 'https://lidar.dmrv.local/scan/LIDAR-BC-001',
          integrityHash: '2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c',
          classification: 'PUBLIC',
          isEncrypted: false,
        },
      }),
    ]);

    // ==========================================
    // 4. Create Carbon Credits
    // ==========================================
    const credits = await Promise.all([
      db.carbonCredit.create({
        data: {
          tokenId: 'TCO2E-2024-BC-0001',
          projectId: project1.id,
          amount: 4250.0, // 500ha × 8.5 tCO2e/ha
          status: 'Available',
          metadata: JSON.stringify({ trackType: 'forest', methodology: 'T-VER-FOREST', vintage: '2024', formula: 'area_ha × sequestration_rate' }),
        },
      }),
      db.carbonCredit.create({
        data: {
          tokenId: 'TCO2E-2024-BC-0002',
          projectId: project1.id,
          amount: 1000.0,
          status: 'Traded',
          buyer: 'บริษัท กรีนเอนเนอร์จี้ จำกัด',
          metadata: JSON.stringify({ trackType: 'forest', methodology: 'T-VER-FOREST', vintage: '2024', tradedAt: '2024-06-15' }),
        },
      }),
      db.carbonCredit.create({
        data: {
          tokenId: 'TCO2E-2024-BIO-0001',
          projectId: project2.id,
          amount: 1090.0, // 50000kg × 0.7 × 0.85 × 3.667 ≈ 1090
          status: 'Available',
          metadata: JSON.stringify({ trackType: 'biochar', methodology: 'IPCC-2023', vintage: '2024', formula: 'mass × carbon_fraction × stability × 3.667' }),
        },
      }),
      db.carbonCredit.create({
        data: {
          tokenId: 'TCO2E-2024-SOL-0001',
          projectId: project3.id,
          amount: 127.5, // 250000kWh / 1000 × 0.51 = 127.5
          status: 'Available',
          metadata: JSON.stringify({ trackType: 'solar', methodology: 'IPCC-2023', vintage: '2024', formula: '(kWh/1000) × gridEF' }),
        },
      }),
      db.carbonCredit.create({
        data: {
          tokenId: 'TCO2E-2024-SOL-0002',
          projectId: project3.id,
          amount: 50.0,
          status: 'Retired',
          buyer: 'บริษัท คาร์บอนซีโร่ จำกัด',
          metadata: JSON.stringify({ trackType: 'solar', methodology: 'IPCC-2023', vintage: '2024', retiredAt: '2024-08-01', reason: 'Corporate net-zero commitment' }),
        },
      }),
    ]);

    // ==========================================
    // 5. Create Certificates
    // ==========================================
    const certificates = await Promise.all([
      db.certificate.create({
        data: {
          certId: 'TVER-2024-BC-0001',
          projectId: project1.id,
          trackType: 'forest',
          status: 'APPROVED',
          amountTco2e: 4250.0,
          masterCertId: 'MCERT-2024-001',
          validator: 'TGO-Validator-001',
        },
      }),
      db.certificate.create({
        data: {
          certId: 'TVER-2024-BIO-0001',
          projectId: project2.id,
          trackType: 'biochar',
          status: 'SUBMITTED',
          amountTco2e: 1090.0,
          validator: 'TGO-Validator-002',
        },
      }),
      db.certificate.create({
        data: {
          certId: 'TVER-2024-SOL-0001',
          projectId: project3.id,
          trackType: 'solar',
          status: 'APPROVED',
          amountTco2e: 177.5,
          masterCertId: 'MCERT-2024-002',
          validator: 'TGO-Validator-003',
        },
      }),
    ]);

    // ==========================================
    // 6. Create Submissions
    // ==========================================
    const submissions = await Promise.all([
      db.submission.create({
        data: {
          projectId: project1.id,
          data: JSON.stringify({ submitter: 'ผู้จัดการโครงการป่าชายเลน', period: '2024-Q1', totalArea: 500, sourceTypes: ['satellite', 'drone', 'iot', 'lidar'] }),
          status: 'VERIFIED',
        },
      }),
      db.submission.create({
        data: {
          projectId: project2.id,
          data: JSON.stringify({ submitter: 'วิสาหกิจชุมชนถ่านชีวภาพ', period: '2024-Q1', productionKg: 50000, carbonContent: 0.7 }),
          status: 'READY_FOR_VERIFICATION',
        },
      }),
      db.submission.create({
        data: {
          projectId: project3.id,
          data: JSON.stringify({ submitter: 'บริษัท โซลาร์ คอร์ป จำกัด', period: '2024-Q1', generationKwh: 253000, systemCapacityKw: 500 }),
          status: 'VERIFIED',
        },
      }),
    ]);

    // ==========================================
    // 7. Create Audit Logs
    // ==========================================
    const auditLogs = await Promise.all([
      db.auditLog.create({
        data: {
          agentName: 'SecurityAgent',
          action: 'validate_signatures',
          projectId: project1.id,
          details: JSON.stringify({ status: 'VERIFIED', signatureValid: true }),
          severity: 'INFO',
        },
      }),
      db.auditLog.create({
        data: {
          agentName: 'ClassificationAgent',
          action: 'classify_data',
          projectId: project1.id,
          details: JSON.stringify({ classification: 'PUBLIC', piiDetected: false }),
          severity: 'INFO',
        },
      }),
      db.auditLog.create({
        data: {
          agentName: 'CarbonQuantifier',
          action: 'quantify_carbon',
          projectId: project1.id,
          details: JSON.stringify({ methodology: 'T-VER-FOREST', tco2e: 4250.0 }),
          severity: 'INFO',
        },
      }),
      db.auditLog.create({
        data: {
          agentName: 'VerificationAgent',
          action: 'cross_modal_validation',
          projectId: project1.id,
          details: JSON.stringify({ sourceTypes: 4, integrityScore: 90, grade: 'A' }),
          severity: 'INFO',
        },
      }),
      db.auditLog.create({
        data: {
          agentName: 'MarketplaceAgent',
          action: 'trade_credits',
          projectId: project1.id,
          details: JSON.stringify({ tokenId: 'TCO2E-2024-BC-0002', amount: 1000, buyer: 'บริษัท กรีนเอนเนอร์จี้ จำกัด' }),
          severity: 'INFO',
        },
      }),
    ]);

    // ==========================================
    // 8. Create Alerts
    // ==========================================
    const alerts = await Promise.all([
      db.alert.create({
        data: {
          severity: 'INFO',
          message: 'System initialized with demo data for 3 projects',
          resolved: true,
        },
      }),
      db.alert.create({
        data: {
          severity: 'WARNING',
          message: 'Biochar project certification pending — awaiting T-VER review',
          resolved: false,
        },
      }),
      db.alert.create({
        data: {
          severity: 'INFO',
          message: 'Blue Carbon project cross-validation score: A (90/100)',
          resolved: true,
        },
      }),
    ]);

    // ==========================================
    // 9. Create Settlements
    // ==========================================
    const settlements = await Promise.all([
      db.settlement.create({
        data: {
          creditId: credits[1].id,
          assetId: 'TCO2E-2024-BC-0002',
          amount: 1000.0,
          status: 'processed',
        },
      }),
      db.settlement.create({
        data: {
          creditId: credits[4].id,
          assetId: 'TCO2E-2024-SOL-0002',
          amount: 50.0,
          status: 'processed',
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: 'Database seeded with demo data',
        data: {
          projects: 3,
          plots: plots.length,
          ingestionLogs: ingestionLogs.length,
          credits: credits.length,
          certificates: certificates.length,
          submissions: submissions.length,
          auditLogs: auditLogs.length,
          alerts: alerts.length,
          settlements: settlements.length,
          projectDetails: [
            { id: project1.id, name: project1.name, methodology: project1.methodology, areaHa: project1.areaHa },
            { id: project2.id, name: project2.name, methodology: project2.methodology, areaHa: project2.areaHa },
            { id: project3.id, name: project3.name, methodology: project3.methodology, areaHa: project3.areaHa },
          ],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Database seeding failed', details: String(error) }, { status: 500 });
  }
}
