import { db } from '@/lib/db';

// ─── Project Definitions ────────────────────────────────────────────────
const PROJECTS = [
  {
    name: 'สมุทรสาคร Blue Carbon',
    description: 'Mangrove restoration project along the Tha Chin estuary, restoring coastal blue carbon ecosystems and supporting local fishing communities.',
    methodology: 'T-VER-FOREST',
    status: 'Active',
    areaHa: 500,
    location: 'Samut Sakhon',
    region: 'Central Thailand',
    country: 'Thailand',
    centerLat: 13.55,
    centerLng: 100.27,
    province: 'สมุทรสาคร',
    startDate: new Date('2022-06-15'),
  },
  {
    name: 'ลพบุรี Biochar',
    description: 'Biochar production from agricultural residues, converting rice husk and cassava waste into stable carbon sequestration material.',
    methodology: 'IPCC-2023',
    status: 'Active',
    areaHa: 120,
    location: 'Lopburi',
    region: 'Central Thailand',
    country: 'Thailand',
    centerLat: 14.80,
    centerLng: 100.65,
    province: 'ลพบุรี',
    startDate: new Date('2023-01-10'),
  },
  {
    name: 'นครราชสีมา AWD Rice',
    description: 'Alternate Wetting and Drying (AWD) rice cultivation project reducing methane emissions from paddy fields in the Korat plateau.',
    methodology: 'IPCC-2023',
    status: 'Active',
    areaHa: 800,
    location: 'Nakhon Ratchasima',
    region: 'Northeastern Thailand',
    country: 'Thailand',
    centerLat: 14.97,
    centerLng: 102.08,
    province: 'นครราชสีมา',
    startDate: new Date('2022-09-01'),
  },
  {
    name: 'ชลบุรี Biogas',
    description: 'Biogas capture from industrial wastewater treatment at a cassava starch factory, converting methane into renewable energy.',
    methodology: 'IPCC-2023',
    status: 'Pending',
    areaHa: 50,
    location: 'Chonburi',
    region: 'Eastern Thailand',
    country: 'Thailand',
    centerLat: 13.36,
    centerLng: 100.98,
    province: 'ชลบุรี',
    startDate: new Date('2023-08-20'),
  },
  {
    name: 'ขอนแก่น Solar PV',
    description: 'Utility-scale solar photovoltaic farm replacing fossil fuel electricity generation in the Isan region.',
    methodology: 'IPCC-2023',
    status: 'Active',
    areaHa: 200,
    location: 'Khon Kaen',
    region: 'Northeastern Thailand',
    country: 'Thailand',
    centerLat: 16.43,
    centerLng: 102.83,
    province: 'ขอนแก่น',
    startDate: new Date('2023-03-15'),
  },
  {
    name: 'เชียงใหม่ Forest Conservation',
    description: 'Forest conservation and REDD+ project protecting upper watershed forests in Doi Inthanon National Park buffer zone.',
    methodology: 'T-VER-FOREST',
    status: 'Active',
    areaHa: 1200,
    location: 'Chiang Mai',
    region: 'Northern Thailand',
    country: 'Thailand',
    centerLat: 18.79,
    centerLng: 98.98,
    province: 'เชียงใหม่',
    startDate: new Date('2021-11-01'),
  },
];

// ─── Helper: Generate polygon coordinates around a center point ─────────
function makePolygon(centerLat: number, centerLng: number, offsetDeg: number): string {
  const offsets = [
    [-offsetDeg, -offsetDeg],
    [-offsetDeg, offsetDeg],
    [offsetDeg, offsetDeg],
    [offsetDeg, -offsetDeg],
  ];
  return JSON.stringify(offsets.map(([dlat, dlng]) => [centerLat + dlat, centerLng + dlng]));
}

// ─── Plot definitions per project ───────────────────────────────────────
const PLOT_DEFINITIONS: Record<number, Array<{ plotId: string; offsetDeg: number; areaHa: number; status: string; ownerInfo: string }>> = {
  0: [
    { plotId: 'SMS-BC-001', offsetDeg: 0.010, areaHa: 120, status: 'ACTIVE', ownerInfo: 'สมาคมประมงบ้านบางน้ำจืด' },
    { plotId: 'SMS-BC-002', offsetDeg: 0.015, areaHa: 140, status: 'VERIFIED', ownerInfo: 'องค์การบริหารส่วนตำบลบางโทรัด' },
    { plotId: 'SMS-BC-003', offsetDeg: 0.020, areaHa: 100, status: 'ACTIVE', ownerInfo: 'กลุ่มอนุรักษ์ป่าชายเลนสมุทรสาคร' },
    { plotId: 'SMS-BC-004', offsetDeg: 0.008, areaHa: 80, status: 'REGISTERED', ownerInfo: 'เทศบาลตำบลท่าจีน' },
    { plotId: 'SMS-BC-005', offsetDeg: 0.012, areaHa: 60, status: 'ACTIVE', ownerInfo: 'ชุมชนประมงบ้านโคกขาม' },
  ],
  1: [
    { plotId: 'LPB-BC-001', offsetDeg: 0.010, areaHa: 35, status: 'ACTIVE', ownerInfo: 'สหกรณ์การเกษตรลพบุรี' },
    { plotId: 'LPB-BC-002', offsetDeg: 0.015, areaHa: 40, status: 'VERIFIED', ownerInfo: 'บริษัท ไบโอชาร์ไทย จำกัด' },
    { plotId: 'LPB-BC-003', offsetDeg: 0.008, areaHa: 30, status: 'ACTIVE', ownerInfo: 'กลุ่มเกษตรกรอินทรีย์เมืองลพบุรี' },
    { plotId: 'LPB-BC-004', offsetDeg: 0.012, areaHa: 15, status: 'REGISTERED', ownerInfo: 'องค์การบริหารส่วนตำบลเขาสมิง' },
  ],
  2: [
    { plotId: 'NMA-AWD-001', offsetDeg: 0.020, areaHa: 250, status: 'ACTIVE', ownerInfo: 'สหกรณ์การเกษตรนครราชสีมา' },
    { plotId: 'NMA-AWD-002', offsetDeg: 0.015, areaHa: 200, status: 'ACTIVE', ownerInfo: 'กลุ่มเกษตรกรอัจฉริยะโคราช' },
    { plotId: 'NMA-AWD-003', offsetDeg: 0.010, areaHa: 180, status: 'VERIFIED', ownerInfo: 'ศูนย์เทคโนโลยีการเกษตรภาคตะวันออกเฉียงเหนือ' },
    { plotId: 'NMA-AWD-004', offsetDeg: 0.018, areaHa: 120, status: 'REGISTERED', ownerInfo: 'เกษตรกรรายย่อยอำเภอเมืองนครราชสีมา' },
    { plotId: 'NMA-AWD-005', offsetDeg: 0.012, areaHa: 50, status: 'ACTIVE', ownerInfo: 'กองทุนหมู่บ้านทับบุตรี' },
  ],
  3: [
    { plotId: 'CBR-BG-001', offsetDeg: 0.005, areaHa: 20, status: 'ACTIVE', ownerInfo: 'บริษัท มันสำปะหลังไทย จำกัด (มหาชน)' },
    { plotId: 'CBR-BG-002', offsetDeg: 0.008, areaHa: 15, status: 'REGISTERED', ownerInfo: 'บริษัท ไบโอก๊าซชลบุรี จำกัด' },
    { plotId: 'CBR-BG-003', offsetDeg: 0.006, areaHa: 15, status: 'ACTIVE', ownerInfo: 'องค์การบริหารส่วนตำบลหนองปลาหมอ' },
  ],
  4: [
    { plotId: 'KKC-SP-001', offsetDeg: 0.012, areaHa: 80, status: 'ACTIVE', ownerInfo: 'บริษัท โซลาร์เอนเนอร์ยี่ขอนแก่น จำกัด' },
    { plotId: 'KKC-SP-002', offsetDeg: 0.010, areaHa: 60, status: 'VERIFIED', ownerInfo: 'การไฟฟ้าส่วนภูมิภาค (กฟภ.)' },
    { plotId: 'KKC-SP-003', offsetDeg: 0.015, areaHa: 40, status: 'ACTIVE', ownerInfo: 'บริษัท พลังงานสะอาดอีสาน จำกัด' },
    { plotId: 'KKC-SP-004', offsetDeg: 0.008, areaHa: 20, status: 'REGISTERED', ownerInfo: 'มหาวิทยาลัยขอนแก่น (ศูนย์พลังงานทดแทน)' },
  ],
  5: [
    { plotId: 'CMM-FC-001', offsetDeg: 0.020, areaHa: 350, status: 'ACTIVE', ownerInfo: 'อุทยานแห่งชาติดอยอินทนนท์' },
    { plotId: 'CMM-FC-002', offsetDeg: 0.018, areaHa: 280, status: 'VERIFIED', ownerInfo: 'กลุ่มอนุรักษ์ป่าชุมชนดอยสุเทพ' },
    { plotId: 'CMM-FC-003', offsetDeg: 0.015, areaHa: 250, status: 'ACTIVE', ownerInfo: 'มูลนิธิโครงการหลวง' },
    { plotId: 'CMM-FC-004', offsetDeg: 0.022, areaHa: 200, status: 'ACTIVE', ownerInfo: 'องค์การบริหารส่วนตำบลแม่แจ่ม' },
    { plotId: 'CMM-FC-005', offsetDeg: 0.010, areaHa: 120, status: 'REGISTERED', ownerInfo: 'กลุ่มวิสาหกิจชุมชนป่าไม้เชียงใหม่' },
  ],
};

const TRACK_TYPES = ['forest', 'biochar', 'awd', 'biogas', 'solar', 'forest'];

const SENSOR_TYPES_PER_PROJECT: Record<number, Array<{ sensorType: string; unit: string; readingRange: [number, number] }>> = {
  0: [
    { sensorType: 'soil_moisture', unit: '%', readingRange: [40, 80] },
    { sensorType: 'temperature', unit: '°C', readingRange: [25, 38] },
    { sensorType: 'humidity', unit: '%', readingRange: [60, 95] },
    { sensorType: 'co2', unit: 'ppm', readingRange: [380, 520] },
  ],
  1: [
    { sensorType: 'temperature', unit: '°C', readingRange: [200, 600] },
    { sensorType: 'co2', unit: 'ppm', readingRange: [400, 800] },
    { sensorType: 'ch4', unit: 'ppm', readingRange: [1.5, 12] },
  ],
  2: [
    { sensorType: 'water_level', unit: 'cm', readingRange: [0, 15] },
    { sensorType: 'soil_moisture', unit: '%', readingRange: [50, 90] },
    { sensorType: 'temperature', unit: '°C', readingRange: [22, 40] },
  ],
  3: [
    { sensorType: 'ch4', unit: 'ppm', readingRange: [50, 500] },
    { sensorType: 'temperature', unit: '°C', readingRange: [30, 55] },
    { sensorType: 'humidity', unit: '%', readingRange: [55, 85] },
  ],
  4: [
    { sensorType: 'solar_irradiance', unit: 'W/m²', readingRange: [200, 1000] },
    { sensorType: 'temperature', unit: '°C', readingRange: [25, 45] },
    { sensorType: 'wind_speed', unit: 'm/s', readingRange: [0.5, 8] },
  ],
  5: [
    { sensorType: 'co2', unit: 'ppm', readingRange: [370, 490] },
    { sensorType: 'humidity', unit: '%', readingRange: [65, 98] },
    { sensorType: 'temperature', unit: '°C', readingRange: [15, 32] },
    { sensorType: 'soil_moisture', unit: '%', readingRange: [35, 75] },
  ],
};

function rand(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let seedingPromise: Promise<void> | null = null;

export async function ensureSeeded() {
  if (seedingPromise) {
    await seedingPromise;
    return;
  }

  const projectCount = await db.project.count();
  if (projectCount > 0) return;

  seedingPromise = seedAll().finally(() => {
    seedingPromise = null;
  });
  await seedingPromise;
}

async function seedAll() {
  // ── Create Projects ─────────────────────────────────────────────────
  const createdProjects = [];
  for (const proj of PROJECTS) {
    const project = await db.project.create({ data: proj });
    createdProjects.push(project);
  }

  // ── Create Plots ────────────────────────────────────────────────────
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const plotDefs = PLOT_DEFINITIONS[i];
    const trackType = TRACK_TYPES[i];
    for (const pd of plotDefs) {
      await db.plot.create({
        data: {
          plotId: pd.plotId,
          projectId: project.id,
          coordinates: makePolygon(project.centerLat, project.centerLng, pd.offsetDeg),
          trackType,
          areaHa: pd.areaHa,
          status: pd.status,
          ownerInfo: pd.ownerInfo,
        },
      });
    }
  }

  // ── Create IoT Sensors ──────────────────────────────────────────────
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const sensorDefs = SENSOR_TYPES_PER_PROJECT[i];
    const sensorCount = 3 + Math.floor(Math.random() * 3);
    let sensorIdx = 0;
    for (let s = 0; s < sensorCount; s++) {
      const sensorDef = sensorDefs[sensorIdx % sensorDefs.length];
      sensorIdx++;
      const sensorId = `${project.province.split(' ')[0]}-${sensorDef.sensorType.toUpperCase()}-${String(s + 1).padStart(3, '0')}`;
      const isOnline = Math.random() > 0.15;
      const lastSeen = new Date(Date.now() - randInt(0, 3600000));
      await db.ioTSensor.create({
        data: {
          projectId: project.id,
          sensorId,
          sensorType: sensorDef.sensorType,
          lat: project.centerLat + rand(-0.01, 0.01),
          lng: project.centerLng + rand(-0.01, 0.01),
          status: isOnline ? 'online' : 'offline',
          lastReading: rand(sensorDef.readingRange[0], sensorDef.readingRange[1]),
          unit: sensorDef.unit,
          battery: randInt(70, 100),
          lastSeen,
        },
      });
    }
  }

  // ── Create Carbon Credits ───────────────────────────────────────────
  const creditStatuses = ['Available', 'Traded', 'Retired', 'Buffered'];
  const createdCredits: { id: string; projectId: string; amount: number }[] = [];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const creditCount = randInt(2, 4);
    for (let c = 0; c < creditCount; c++) {
      const amount = rand(100, 5000);
      const status = pick(creditStatuses);
      const ts = Date.now() - randInt(0, 86400000 * 30);
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const credit = await db.carbonCredit.create({
        data: {
          projectId: project.id,
          tokenId: `TCO2E-${ts}-${randomSuffix}`,
          amount,
          status,
          metadata: JSON.stringify({
            vintage: `V${2023 + (c % 2)}`,
            standard: project.methodology === 'T-VER-FOREST' ? 'T-VER' : 'IPCC',
            province: project.province,
          }),
        },
      });
      createdCredits.push({ id: credit.id, projectId: project.id, amount: credit.amount });
    }
  }

  // ── Create Certificates ─────────────────────────────────────────────
  const certStatuses = ['SUBMITTED', 'APPROVED', 'REJECTED', 'REVOKED'];
  const createdCerts: { id: string; projectId: string; certNumber: string }[] = [];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const trackType = TRACK_TYPES[i];
    const certCount = randInt(1, 2);
    for (let c = 0; c < certCount; c++) {
      const status = c === 0 ? 'APPROVED' : pick(certStatuses);
      const validFrom = new Date(project.startDate.getTime() + randInt(30, 180) * 86400000);
      const validUntil = new Date(validFrom.getTime() + 365 * 86400000);
      const certNumber = `TGO-CERT-${project.province.substring(0, 3)}-${2024 + c}`;
      const certId = `TVER-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const amountTco2e = rand(200, 5000);
      const validator = pick(['TGO-VVB-Auto', 'Bureau Veritas', 'SGS Thailand', 'TÜV SÜD']);
      const masterCertId = status === 'APPROVED' ? `MCERT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : '';
      const cert = await db.certificate.create({
        data: {
          projectId: project.id,
          certId,
          trackType,
          status,
          amountTco2e: Math.round(amountTco2e * 100) / 100,
          issuedBy: 'TGO',
          validator,
          masterCertId,
          certificateNumber: certNumber,
          validFrom,
          validUntil,
        },
      });
      createdCerts.push({ id: cert.id, projectId: project.id, certNumber });
    }
  }

  // ── Create Ingestion Logs ───────────────────────────────────────────
  const sourceTypes = ['satellite', 'iot', 'drone', 'photo', 'lidar'];
  const activityTypes = ['monitoring', 'verification', 'measurement'];
  const classifications = ['PUBLIC', 'CONFIDENTIAL'];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const logCount = randInt(5, 8);
    for (let l = 0; l < logCount; l++) {
      const sourceType = pick(sourceTypes);
      const activityType = pick(activityTypes);
      const ts = new Date(Date.now() - randInt(0, 86400000 * 60));
      await db.ingestionLog.create({
        data: {
          projectId: project.id,
          sourceType,
          activityType,
          payload: JSON.stringify({
            resolution: sourceType === 'satellite' ? '10m' : sourceType === 'drone' ? '5cm' : 'N/A',
            coverage_km2: rand(0.5, 50),
            cloud_cover_pct: sourceType === 'satellite' ? randInt(5, 40) : 0,
            bands: sourceType === 'satellite' ? ['RGB', 'NIR', 'SWIR'] : undefined,
            flight_altitude_m: sourceType === 'drone' ? randInt(50, 120) : undefined,
            device_id: sourceType === 'iot' ? `DEV-${randInt(100, 999)}` : undefined,
          }),
          evidenceUrl: `https://evidence.dmrv-th.org/${project.id}/${sourceType}/${ts.getTime()}`,
          integrityHash: `sha256:${Math.random().toString(36).substring(2, 34)}`,
          classification: pick(classifications),
          isEncrypted: Math.random() > 0.7,
          timestamp: ts,
        },
      });
    }
  }

  // ── Create Submissions ──────────────────────────────────────────────
  const submissionTypes = ['VERIFICATION', 'CERTIFICATION', 'MONITORING'];
  const submissionStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
  const reviewers = ['ดร.สมชาย วิชาการ', 'คุณสุภาพ ตรวจสอบ', 'ดร.วิภา ประเมินผล'];
  const submitters = ['ผู้จัดการโครงการ', 'วิศวกรสิ่งแวดล้อม', 'เจ้าหน้าที่ตรวจวัด'];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const subCount = randInt(1, 3);
    for (let s = 0; s < subCount; s++) {
      const type = pick(submissionTypes);
      const status = pick(submissionStatuses);
      const submittedAt = new Date(Date.now() - randInt(7, 90) * 86400000);
      const reviewedAt = status === 'PENDING' || status === 'UNDER_REVIEW' ? null : new Date(submittedAt.getTime() + randInt(3, 21) * 86400000);
      await db.submission.create({
        data: {
          projectId: project.id,
          type,
          status,
          data: JSON.stringify({
            period: `Q${randInt(1, 4)}-${2024 + (s % 2)}`,
            emissions_reduced_tco2e: rand(50, 2000),
            monitoring_data_points: randInt(100, 5000),
            methodology_version: 'v3.2',
          }),
          submittedBy: pick(submitters),
          reviewedBy: reviewedAt ? pick(reviewers) : '',
          submittedAt,
          reviewedAt,
        },
      });
    }
  }

  // ── Create Audit Logs ───────────────────────────────────────────────
  const agentNames = [
    'SecurityAgent', 'ClassificationAgent', 'VerificationAgent',
    'IngestionAgent', 'MonitoringAgent', 'ReportingAgent', 'ComplianceAgent',
  ];
  const auditActions = [
    { action: 'DATA_INGESTION_COMPLETED', severity: 'INFO' },
    { action: 'CLASSIFICATION_APPLIED', severity: 'INFO' },
    { action: 'INTEGRITY_CHECK_PASSED', severity: 'INFO' },
    { action: 'VERIFICATION_STARTED', severity: 'INFO' },
    { action: 'CERTIFICATE_APPROVED', severity: 'INFO' },
    { action: 'ANOMALY_DETECTED', severity: 'WARNING' },
    { action: 'SENSOR_OFFLINE_ALERT', severity: 'WARNING' },
    { action: 'DATA_THRESHOLD_EXCEEDED', severity: 'WARNING' },
    { action: 'SUSPICIOUS_ACTIVITY_FLAGGED', severity: 'CRITICAL' },
    { action: 'UNAUTHORIZED_ACCESS_ATTEMPT', severity: 'CRITICAL' },
    { action: 'HASH_MISMATCH_DETECTED', severity: 'ERROR' },
    { action: 'SUBMISSION_REVIEWED', severity: 'INFO' },
    { action: 'CREDIT_MINTED', severity: 'INFO' },
    { action: 'CERTIFICATE_RENEWED', severity: 'INFO' },
    { action: 'MONITORING_REPORT_GENERATED', severity: 'INFO' },
  ];
  const auditCount = randInt(10, 15);
  for (let a = 0; a < auditCount; a++) {
    const auditDef = auditActions[a % auditActions.length];
    const project = pick(createdProjects);
    await db.auditLog.create({
      data: {
        agentName: pick(agentNames),
        action: auditDef.action,
        projectId: project.id,
        details: JSON.stringify({
          projectName: project.name,
          province: project.province,
          timestamp_iso: new Date(Date.now() - randInt(0, 86400000 * 7)).toISOString(),
        }),
        severity: auditDef.severity,
        timestamp: new Date(Date.now() - randInt(0, 86400000 * 7)),
      },
    });
  }

  // ── Create Alerts ───────────────────────────────────────────────────
  const alerts = [
    { severity: 'CRITICAL', message: 'Sensor CH4-CBR-003 in Chonburi reporting dangerously high methane levels (487 ppm). Immediate inspection required.' },
    { severity: 'WARNING', message: 'Soil moisture sensor SMS-BC-002 in Samut Sakhon offline for 6+ hours. Data gap detected in mangrove monitoring zone.' },
    { severity: 'INFO', message: 'Monthly verification cycle completed for Nakhon Ratchasima AWD Rice project. All plots validated successfully.' },
    { severity: 'WARNING', message: 'Satellite imagery cloud cover exceeds 35% threshold for Lopburi Biochar project. Re-acquisition scheduled.' },
    { severity: 'CRITICAL', message: 'Integrity hash mismatch detected in ingestion log for Khon Kaen Solar PV project. Data tampering investigation initiated.' },
  ];
  const alertCount = randInt(3, 5);
  for (let a = 0; a < alertCount; a++) {
    await db.alert.create({
      data: {
        severity: alerts[a].severity,
        message: alerts[a].message,
        resolved: a === 2,
        timestamp: new Date(Date.now() - randInt(0, 86400000 * 3)),
      },
    });
  }

  // ── ENTERPRISE: Create VVB Reviews ──────────────────────────────────
  const vvbOrgs = [
    'Bureau Veritas (Thailand)', 'SGS (Thailand) Ltd.', 'TÜV SÜD (Thailand)',
    'Thai VV Association', 'DET NORSKE VERITAS (DNV-GL)',
  ];
  const vvbReviewers = [
    'ดร.ประภาส ตรวจสอบ', 'คุณสุนทร วิชาการ', 'ดร.มาลี ประเมินผล',
    'คุณวิชัย พิสูจน์จริง', 'ดร.สุนีย์ รับรอง',
  ];
  const reviewTypes = ['VALIDATION', 'VERIFICATION', 'PERIODIC_VERIFICATION'];
  const vvbStatuses = ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'REQUESTED_INFO'];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const reviewCount = randInt(1, 3);
    for (let r = 0; r < reviewCount; r++) {
      const status = vvbStatuses[r === 0 ? randInt(0, 2) : randInt(0, 4)];
      const reviewType = pick(reviewTypes);
      await db.vVBReview.create({
        data: {
          projectId: project.id,
          reviewerOrg: pick(vvbOrgs),
          reviewerName: pick(vvbReviewers),
          reviewType,
          status,
          evidenceRefs: JSON.stringify([
            { refId: `EV-${randInt(100, 999)}`, type: 'satellite', description: 'Land cover change analysis' },
            { refId: `EV-${randInt(100, 999)}`, type: 'iot', description: 'Sensor data validation report' },
            { refId: `EV-${randInt(100, 999)}`, type: 'ground_truth', description: 'Field measurement records' },
          ]),
          findings: JSON.stringify({
            completeness: rand(75, 100),
            accuracy: rand(80, 99),
            consistency: rand(70, 98),
            materialMisstatement: status === 'REJECTED',
            nonConformities: status === 'REQUESTED_INFO' ? ['Missing baseline data for Q2 2024', 'Incomplete monitoring records'] : [],
          }),
          recommendation: status === 'APPROVED' ? 'approve' : status === 'REJECTED' ? 'reject' : 'request_more_info',
          comments: status === 'APPROVED'
            ? 'All verification criteria met. Data integrity confirmed. No material misstatement found.'
            : status === 'REJECTED'
            ? 'Significant data gaps detected. Baseline methodology not followed. Re-submission required.'
            : status === 'REQUESTED_INFO'
            ? 'Additional documentation required: baseline emission factors and Q2 monitoring data.'
            : 'Under review by validation team.',
          reviewedAt: ['APPROVED', 'REJECTED', 'REQUESTED_INFO'].includes(status)
            ? new Date(Date.now() - randInt(1, 14) * 86400000)
            : null,
        },
      });
    }
  }

  // ── ENTERPRISE: Create Conflict Cases ───────────────────────────────
  const conflictTitles = [
    'Satellite vs IoT: Forest cover discrepancy',
    'CH4 sensor reading exceeds satellite prediction',
    'Soil moisture inconsistency between drone and IoT',
    'Water level data conflict: IoT vs manual measurement',
    'CO₂ flux mismatch: Eddy covariance vs satellite estimate',
    'Land use change detected but sensor data normal',
    'Biochar production volume mismatch: Reported vs measured',
    'Solar irradiance sensor vs satellite data deviation',
  ];
  const conflictTypes = ['DATA_MISMATCH', 'THRESHOLD_EXCEEDED', 'INTEGRITY_FAIL', 'SPATIAL_MISMATCH'];
  const conflictSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const conflictStatuses = ['FLAGGED', 'IN_REVIEW', 'RESOLVED', 'ESCALATED'];
  const conflictCount = randInt(4, 7);
  for (let c = 0; c < conflictCount; c++) {
    const project = pick(createdProjects);
    const severity = conflictSeverities[Math.min(c, conflictSeverities.length - 1)];
    const status = conflictStatuses[c % conflictStatuses.length];
    await db.conflictCase.create({
      data: {
        projectId: project.id,
        title: conflictTitles[c % conflictTitles.length],
        description: `Discrepancy detected in ${project.province} project between data sources. Automated ExistenceVerifier flagged this case for human review.`,
        sourceA: JSON.stringify({
          type: c % 2 === 0 ? 'satellite' : 'iot',
          id: c % 2 === 0 ? `SAT-${randInt(10, 99)}-2024` : `IOT-${randInt(100, 999)}`,
          value: c % 2 === 0 ? `${randInt(80, 120)} ha forest cover` : `${rand(350, 500)} ppm CO₂`,
          timestamp: new Date(Date.now() - randInt(1, 7) * 86400000).toISOString(),
        }),
        sourceB: JSON.stringify({
          type: c % 2 === 0 ? 'iot' : 'drone',
          id: c % 2 === 0 ? `IOT-${randInt(100, 999)}` : `DRN-${randInt(10, 99)}-2024`,
          value: c % 2 === 0 ? `${rand(380, 440)} ppm CO₂` : `${randInt(90, 130)} ha forest cover`,
          timestamp: new Date(Date.now() - randInt(1, 7) * 86400000).toISOString(),
        }),
        conflictType: conflictTypes[c % conflictTypes.length],
        severity,
        status,
        resolution: status === 'RESOLVED'
          ? 'Ground-truth verification confirmed satellite data is accurate. IoT sensor recalibrated.'
          : '',
        resolvedBy: status === 'RESOLVED' ? 'ดร.สมชาย วิชาการ' : '',
        evidenceUrl: status === 'RESOLVED'
          ? `https://evidence.dmrv-th.org/conflict/${c + 1}/resolution`
          : '',
        resolvedAt: status === 'RESOLVED' ? new Date(Date.now() - randInt(1, 3) * 86400000) : null,
      },
    });
  }

  // ── ENTERPRISE: Create Audit Trail Entries (Merkle Tree) ────────────
  for (const cert of createdCerts) {
    const eventTypes = ['ORIGIN', 'QUANTIFY', 'VERIFY', 'CERTIFY', 'MINT'];
    let prevHash = '0'.repeat(64); // Genesis hash
    const project = createdProjects.find(p => p.id === cert.projectId);
    for (let e = 0; e < eventTypes.length; e++) {
      const dataHash = `sha256:${Math.random().toString(36).substring(2, 34)}${Date.now().toString(36)}`;
      const merkleRoot = `mr:${Math.random().toString(36).substring(2, 30)}`;
      await db.auditTrailEntry.create({
        data: {
          certificateId: cert.id,
          eventType: eventTypes[e],
          previousHash: prevHash,
          dataHash,
          merkleRoot,
          metadata: JSON.stringify({
            actor: e < 2 ? 'IngestionModule' : e < 4 ? 'CarbonQuantifier' : 'MarketplaceModule',
            action: eventTypes[e],
            projectProvince: project?.province || '',
            amount_tco2e: rand(50, 500),
            de_identified: true,
            pdpa_compliant: true,
          }),
          timestamp: new Date(Date.now() - (eventTypes.length - e) * randInt(1, 14) * 86400000),
        },
      });
      prevHash = dataHash;
    }
  }

  // ── ENTERPRISE: Create Device Registrations ─────────────────────────
  const manufacturers = ['Davis Instruments', 'Campbell Scientific', 'Vaisala', 'Hoboware', 'Sensirion', 'Libelium'];
  const deviceTypes = ['iot', 'iot', 'iot', 'drone', 'satellite', 'iot'];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const devCount = randInt(2, 4);
    for (let d = 0; d < devCount; d++) {
      const deviceType = pick(deviceTypes);
      const manufacturer = pick(manufacturers);
      const isConnected = Math.random() > 0.2;
      const isSigned = Math.random() > 0.4;
      await db.deviceRegistration.create({
        data: {
          projectId: project.id,
          deviceId: `DEV-${project.province.substring(0, 3)}-${deviceType.toUpperCase()}-${String(d + 1).padStart(3, '0')}`,
          deviceType,
          manufacturer,
          model: `${manufacturer.split(' ')[0]}-${randInt(100, 999)}`,
          firmwareVersion: `v${randInt(1, 3)}.${randInt(0, 9)}.${randInt(0, 9)}`,
          publicKey: isSigned ? `ecdsa-p256:${Math.random().toString(36).substring(2, 18)}...` : '',
          signingStatus: isSigned ? 'SIGNED' : (Math.random() > 0.7 ? 'EXPIRED' : 'UNSIGNED'),
          connectionStatus: isConnected ? 'connected' : 'disconnected',
          healthStatus: isConnected ? (Math.random() > 0.3 ? 'HEALTHY' : 'DEGRADED') : 'CRITICAL',
          lastCalibration: new Date(Date.now() - randInt(7, 90) * 86400000),
          batteryLevel: randInt(60, 100),
          signalStrength: isConnected ? randInt(-70, -30) : randInt(-100, -80),
          metadata: JSON.stringify({
            dataProvider: manufacturer,
            calibrationDue: new Date(Date.now() + randInt(30, 180) * 86400000).toISOString(),
            supportedMeasurements: ['temperature', 'humidity', 'co2'].slice(0, randInt(1, 3)),
          }),
        },
      });
    }
  }

  // ── ENTERPRISE: Create Buffer Pool Entries ──────────────────────────
  const riskCategories = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
  const bufferPcts: Record<string, number> = { LOW: 10, MEDIUM: 15, HIGH: 20, VERY_HIGH: 30 };
  for (const credit of createdCredits) {
    if (Math.random() > 0.5) continue; // ~50% of credits go to buffer
    const riskCategory = pick(riskCategories);
    const bufferPct = bufferPcts[riskCategory];
    const uncertaintyPct = rand(5, 45);
    await db.bufferPoolEntry.create({
      data: {
        projectId: credit.projectId,
        creditId: credit.id,
        amount: Math.round(credit.amount * bufferPct / 100 * 100) / 100,
        uncertaintyPct,
        bufferPct,
        riskCategory,
        reason: `Auto-deducted per Governance Module: ${riskCategory} risk category (${bufferPct}% buffer)`,
      },
    });
  }

  // ── ENTERPRISE: Create Forward Contracts ────────────────────────────
  const buyers = [
    'PTT Public Company Limited', 'Bangkok Bank (ESG Portfolio)', 'SCG Chemicals',
    'Thai Beverage (ESG Fund)', 'AIS Green Fund', 'CP Group (Carbon Neutral)',
  ];
  const contractStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
  for (let i = 0; i < createdProjects.length; i++) {
    if (Math.random() > 0.6) continue;
    const project = createdProjects[i];
    const creditAmount = rand(200, 3000);
    const pricePerUnit = rand(5, 25);
    const status = pick(contractStatuses);
    await db.forwardContract.create({
      data: {
        projectId: project.id,
        sellerName: project.name,
        buyerName: pick(buyers),
        creditAmount,
        pricePerUnit,
        totalValue: Math.round(creditAmount * pricePerUnit * 100) / 100,
        deliveryDate: new Date(Date.now() + randInt(90, 365) * 86400000),
        status,
        terms: JSON.stringify({
          paymentSchedule: 'quarterly',
          deliveryMethod: 'registry_transfer',
          verificationRequired: true,
          penaltyClause: '2% per month delay',
          forceMajeure: true,
          governingLaw: 'Thai Law',
          disputeResolution: 'Thai Arbitration Institute',
        }),
      },
    });
  }

  // ── ENTERPRISE: Create API Keys ─────────────────────────────────────
  const apiKeyNames = [
    'ERP Integration (SAP)', 'Industrial Park Monitor', 'Mobile App Backend',
    'Partner Data Feed', 'Dashboard Analytics', 'CI/CD Pipeline',
  ];
  const apiPermissions = [
    ['ingestion:write', 'monitoring:read'],
    ['ingestion:write', 'monitoring:read', 'carbon:read'],
    ['monitoring:read', 'reporting:read', 'carbon:read'],
    ['ingestion:write', 'verification:read'],
    ['monitoring:read', 'reporting:read', 'audit:read'],
    ['ingestion:read', 'carbon:read', 'footprint:read', 'simulation:read'],
  ];
  for (let k = 0; k < apiKeyNames.length; k++) {
    const key = `dmrv_${Math.random().toString(36).substring(2, 14)}${Math.random().toString(36).substring(2, 14)}`;
    const isRevoked = k === apiKeyNames.length - 1;
    await db.apiKey.create({
      data: {
        name: apiKeyNames[k],
        key,
        permissions: JSON.stringify(apiPermissions[k]),
        lastUsed: isRevoked ? null : new Date(Date.now() - randInt(0, 72) * 3600000),
        status: isRevoked ? 'REVOKED' : 'ACTIVE',
        createdBy: 'Admin',
        expiresAt: new Date(Date.now() + randInt(90, 365) * 86400000),
      },
    });
  }

  // ── ENTERPRISE: Create Webhooks ─────────────────────────────────────
  const webhookUrls = [
    'https://erp.example.co.th/api/dmrv/callback',
    'https://monitoring.industrial-park.or.th/webhook',
    'https://api.partner-org.com/events/dmrv',
    'https://hooks.slack.com/services/T00/B00/xxx',
  ];
  const webhookEvents = [
    ['credit.minted', 'credit.retired', 'certificate.approved'],
    ['sensor.offline', 'alert.critical', 'monitoring.health_change'],
    ['ingestion.completed', 'verification.completed', 'submission.status_change'],
    ['alert.critical', 'alert.warning'],
  ];
  for (let w = 0; w < webhookUrls.length; w++) {
    const hasFailed = w === webhookUrls.length - 1;
    await db.webhook.create({
      data: {
        url: webhookUrls[w],
        events: JSON.stringify(webhookEvents[w]),
        secret: `whsec_${Math.random().toString(36).substring(2, 18)}`,
        status: hasFailed ? 'FAILED' : 'ACTIVE',
        lastDelivery: hasFailed ? new Date(Date.now() - 86400000 * 3) : new Date(Date.now() - randInt(0, 72) * 3600000),
        failureCount: hasFailed ? randInt(3, 8) : 0,
        lastFailure: hasFailed ? 'Connection timeout after 30s' : '',
        createdBy: 'Admin',
      },
    });
  }

  // ── ENTERPRISE: Create Methodology Rules ────────────────────────────
  const methodologyRules = [
    {
      name: 'T-VER Forest Carbon Sequestration',
      methodology: 'T-VER-FOREST',
      trackType: 'forest',
      version: '3.2',
      description: 'Standard methodology for calculating carbon sequestration from afforestation and reforestation projects under Thailand T-VER program.',
      formula: JSON.stringify({
        expression: 'ΔC = Σ(A_i × ΔC_i × UF)',
        variables: { 'ΔC': 'Carbon stock change (tCO₂e)', 'A_i': 'Area of stratum i (ha)', 'ΔC_i': 'Carbon stock change per ha in stratum i', 'UF': 'Uncertainty factor' },
      }),
      parameters: JSON.stringify([
        { name: 'baseline_scenario', type: 'string', required: true, description: 'Pre-project land use scenario' },
        { name: 'project_scenario', type: 'string', required: true, description: 'Post-project land use scenario' },
        { name: 'monitoring_frequency', type: 'enum', values: ['annual', 'biannual', 'quarterly'], default: 'annual' },
        { name: 'uncertainty_discount', type: 'number', min: 0, max: 0.5, default: 0.1 },
      ]),
      conditions: JSON.stringify([
        { field: 'area_ha', operator: '>=', value: 1, message: 'Minimum project area is 1 ha' },
        { field: 'project_duration', operator: '>=', value: 10, message: 'Minimum crediting period is 10 years' },
        { field: 'additionality', operator: '==', value: true, message: 'Project must demonstrate additionality' },
      ]),
      status: 'ACTIVE',
      createdBy: 'TGO Thailand',
    },
    {
      name: 'IPCC Biochar Carbon Removal',
      methodology: 'IPCC-2023',
      trackType: 'biochar',
      version: '2.1',
      description: 'Methodology for quantifying carbon removal through biochar production and application based on IPCC 2023 guidelines.',
      formula: JSON.stringify({
        expression: 'CR = M_bc × f_c × (1 - f_H) × (44/12) × Per',
        variables: { 'CR': 'Carbon removal (tCO₂e)', 'M_bc': 'Mass of biochar (tonnes)', 'f_c': 'Carbon fraction', 'f_H': 'Hydrogen fraction', 'Per': 'Permanence factor' },
      }),
      parameters: JSON.stringify([
        { name: 'feedstock_type', type: 'enum', values: ['rice_husk', 'cassava_waste', 'wood_chip', 'corn_stover'], required: true },
        { name: 'pyrolysis_temperature', type: 'number', min: 350, max: 700, unit: '°C', required: true },
        { name: 'application_method', type: 'enum', values: ['soil_amendment', 'construction', 'water_filtration'], required: true },
      ]),
      conditions: JSON.stringify([
        { field: 'pyrolysis_temperature', operator: '>=', value: 350, message: 'Minimum pyrolysis temp 350°C for stability' },
        { field: 'carbon_content_pct', operator: '>=', value: 10, message: 'Biochar must have ≥10% carbon content' },
      ]),
      status: 'ACTIVE',
      createdBy: 'IPCC Working Group III',
    },
    {
      name: 'AWD Rice Cultivation Emission Reduction',
      methodology: 'IPCC-2023',
      trackType: 'awd',
      version: '1.5',
      description: 'Methodology for calculating methane emission reductions from Alternate Wetting and Drying rice cultivation.',
      formula: JSON.stringify({
        expression: 'ER = (EF_CFP - EF_AWD) × A × 10⁻³ × GWP_CH4',
        variables: { 'ER': 'Emission reduction (tCO₂e)', 'EF_CFP': 'Emission factor continuous flooding', 'EF_AWD': 'Emission factor AWD', 'A': 'Area (ha)', 'GWP_CH4': 'Global warming potential CH4' },
      }),
      parameters: JSON.stringify([
        { name: 'water_management_regime', type: 'enum', values: ['safe_awd', 'strict_awd', 'aeri'], required: true },
        { name: 'rice_variety', type: 'string', required: true },
        { name: 'soil_type', type: 'enum', values: ['clay', 'loam', 'sandy_loam'], required: true },
        { name: 'gwp_ch4', type: 'number', default: 28, description: 'GWP for CH4 (IPCC AR6)' },
      ]),
      conditions: JSON.stringify([
        { field: 'water_level_threshold_cm', operator: '<=', value: 15, message: 'AWD threshold must be ≤15cm' },
        { field: 'growing_season_days', operator: '>=', value: 90, message: 'Minimum growing season 90 days' },
      ]),
      status: 'ACTIVE',
      createdBy: 'IRRI / IPCC',
    },
    {
      name: 'Biogas Capture from Wastewater',
      methodology: 'IPCC-2023',
      trackType: 'biogas',
      version: '2.0',
      description: 'Methodology for quantifying emission reductions from methane capture in industrial wastewater treatment.',
      formula: JSON.stringify({
        expression: 'ER = (B₀ × MCF_CFP - B₀ × MCF_BIOGAS) × COD × GWP_CH4',
        variables: { 'ER': 'Emission reduction (tCO₂e)', 'B₀': 'Maximum CH4 producing capacity', 'MCF': 'Methane conversion factor', 'COD': 'Chemical oxygen demand', 'GWP_CH4': 'GWP for CH4' },
      }),
      parameters: JSON.stringify([
        { name: 'wastewater_type', type: 'enum', values: ['cassava', 'palm_oil', 'rubber', 'tapioca'], required: true },
        { name: 'treatment_system', type: 'enum', values: ['anaerobic_digester', 'covered_lagoon', 'uasb'], required: true },
        { name: 'capture_efficiency', type: 'number', min: 0.5, max: 0.99, default: 0.9 },
      ]),
      conditions: JSON.stringify([
        { field: 'capture_efficiency', operator: '>=', value: 0.5, message: 'Minimum capture efficiency 50%' },
        { field: 'flare_destruction_efficiency', operator: '>=', value: 0.98, message: 'Flare destruction ≥98%' },
      ]),
      status: 'ACTIVE',
      createdBy: 'CDM Methodology Panel',
    },
    {
      name: 'Solar PV Emission Avoidance',
      methodology: 'IPCC-2023',
      trackType: 'solar',
      version: '1.3',
      description: 'Methodology for calculating emission reductions from solar photovoltaic electricity generation displacing fossil fuel grid electricity.',
      formula: JSON.stringify({
        expression: 'ER = EG × EF_grid × (1 - LT)',
        variables: { 'ER': 'Emission reduction (tCO₂e)', 'EG': 'Electricity generated (MWh)', 'EF_grid': 'Grid emission factor (tCO₂/MWh)', 'LT': 'Leakage factor' },
      }),
      parameters: JSON.stringify([
        { name: 'grid_emission_factor', type: 'number', default: 0.5713, unit: 'tCO₂/MWh', description: 'Thailand grid EF (2024)' },
        { name: 'capacity_mw', type: 'number', required: true },
        { name: 'leakage_factor', type: 'number', default: 0, min: 0, max: 0.1 },
      ]),
      conditions: JSON.stringify([
        { field: 'capacity_mw', operator: '<=', value: 15, message: 'Small-scale: ≤15 MW' },
        { field: 'grid_connection', operator: '==', value: true, message: 'Must be grid-connected' },
      ]),
      status: 'ACTIVE',
      createdBy: 'EGAT / IPCC',
    },
    {
      name: 'Draft: Mangrove Blue Carbon Enhancement',
      methodology: 'T-VER-FOREST',
      trackType: 'forest',
      version: '0.9',
      description: 'Draft methodology for blue carbon enhancement through mangrove restoration - pending TGO approval.',
      formula: JSON.stringify({
        expression: 'ΔBC = (C_biomass + C_soil)_post - (C_biomass + C_soil)_pre',
        variables: { 'ΔBC': 'Blue carbon stock change', 'C_biomass': 'Carbon in above/below ground biomass', 'C_soil': 'Soil organic carbon' },
      }),
      parameters: JSON.stringify([
        { name: 'mangrove_species', type: 'multi', values: ['rhizophora', 'avicennia', 'sonneratia', 'bruguiera'], required: true },
        { name: 'tidal_zone', type: 'enum', values: ['intertidal', 'subtidal', 'supratidal'], required: true },
      ]),
      conditions: JSON.stringify([
        { field: 'salinity_ppt', operator: '<=', value: 35, message: 'Maximum salinity 35 ppt' },
      ]),
      status: 'DRAFT',
      createdBy: 'DMCR Thailand',
    },
  ];
  for (const rule of methodologyRules) {
    await db.methodologyRule.create({ data: rule });
  }

  // ── ENTERPRISE: Create AI Generation Sessions ─────────────────────────
  const aiSessions = [
    {
      prompt: 'Generate carbon sequestration formula for mangrove restoration per Verra VM0033 methodology',
      methodology: 'T-VER-FOREST',
      trackType: 'forest',
      generatedFormula: JSON.stringify({
        expression: 'ΔC_mangrove = Σ(A_i × G_wp × (1 - UF)) + B_soil',
        variables: { 'ΔC_mangrove': 'Total mangrove carbon sequestration (tCO₂e)', 'A_i': 'Area of mangrove stratum i (ha)', 'G_wp': 'Growth rate woody pools (tC/ha/yr)', 'UF': 'Uncertainty factor', 'B_soil': 'Soil carbon stock change (tCO₂e)' },
      }),
      generatedParams: JSON.stringify([
        { name: 'mangrove_species', type: 'enum', values: ['rhizophora', 'avicennia', 'sonneratia', 'mixed'], required: true },
        { name: 'age_of_stand', type: 'number', min: 1, max: 100, unit: 'years', required: true },
        { name: 'tidal_inundation_class', type: 'enum', values: ['fringe', 'riverine', 'basin', 'overwash'], required: true },
        { name: 'soil_carbon_factor', type: 'number', default: 0.37, description: 'Soil organic carbon fraction' },
      ]),
      generatedConditions: JSON.stringify([
        { field: 'area_ha', operator: '>=', value: 0.5, message: 'Minimum mangrove area 0.5 ha' },
        { field: 'uncertainty_discount', operator: '<=', value: 0.3, message: 'Maximum uncertainty discount 30%' },
      ]),
      generatedNodes: JSON.stringify([
        { id: 'n1', type: 'input', label: 'Mangrove Area Data', x: 50, y: 50 },
        { id: 'n2', type: 'process', label: 'Carbon Stock Assessment', x: 250, y: 50 },
        { id: 'n3', type: 'process', label: 'Growth Rate Application', x: 250, y: 150 },
        { id: 'n4', type: 'process', label: 'Uncertainty Discount', x: 450, y: 100 },
        { id: 'n5', type: 'output', label: 'ΔC_mangrove Result', x: 650, y: 100 },
      ]),
      status: 'APPLIED',
      aiModel: 'z-ai-llm',
      ruleId: 'applied-rule-1',
      feedback: 'Excellent formula generation. Accurate to Verra VM0033 standard.',
      createdBy: 'Admin',
    },
    {
      prompt: 'Create emission reduction formula for improved cookstove project replacing charcoal with LPG',
      methodology: 'CDM',
      trackType: 'biochar',
      generatedFormula: JSON.stringify({
        expression: 'ER = N_stoves × (EF_charcoal - EF_LPG) × D_cooking × GWP_CO2',
        variables: { 'ER': 'Emission reduction (tCO₂e/yr)', 'N_stoves': 'Number of cookstoves', 'EF_charcoal': 'Emission factor charcoal (kgCO₂/GJ)', 'EF_LPG': 'Emission factor LPG (kgCO₂/GJ)', 'D_cooking': 'Annual cooking energy demand (GJ)', 'GWP_CO2': 'GWP for CO₂' },
      }),
      generatedParams: JSON.stringify([
        { name: 'stove_efficiency_new', type: 'number', min: 0.3, max: 0.95, default: 0.55, required: true },
        { name: 'stove_efficiency_old', type: 'number', min: 0.1, max: 0.4, default: 0.2, required: true },
        { name: 'household_size', type: 'number', default: 4.5 },
      ]),
      generatedConditions: JSON.stringify([
        { field: 'stove_efficiency_new', operator: '>', value: 0.3, message: 'New stove must exceed 30% efficiency' },
      ]),
      generatedNodes: JSON.stringify([
        { id: 'n1', type: 'input', label: 'Cookstove Data', x: 50, y: 50 },
        { id: 'n2', type: 'process', label: 'Baseline Emissions', x: 250, y: 50 },
        { id: 'n3', type: 'process', label: 'Project Emissions', x: 250, y: 150 },
        { id: 'n4', type: 'process', label: 'Net Reduction', x: 450, y: 100 },
        { id: 'n5', type: 'output', label: 'ER Result', x: 650, y: 100 },
      ]),
      status: 'COMPLETED',
      aiModel: 'z-ai-llm',
      ruleId: '',
      feedback: '',
      createdBy: 'Admin',
    },
    {
      prompt: 'Generate REDD+ deforestation avoidance calculation for Thailand Northern watershed',
      methodology: 'T-VER-FOREST',
      trackType: 'forest',
      generatedFormula: JSON.stringify({
        expression: 'ER_REDD = (D_baseline - D_project) × C_stock × (44/12) × UF_REDD',
        variables: { 'ER_REDD': 'REDD+ emission reduction (tCO₂e)', 'D_baseline': 'Baseline deforestation rate (ha/yr)', 'D_project': 'Project deforestation rate (ha/yr)', 'C_stock': 'Average carbon stock (tC/ha)', 'UF_REDD': 'REDD+ uncertainty factor' },
      }),
      generatedParams: JSON.stringify([
        { name: 'deforestation_driver', type: 'enum', values: ['agriculture', 'logging', 'infrastructure', 'fire'], required: true },
        { name: 'reference_period_yrs', type: 'number', min: 5, max: 20, default: 10 },
      ]),
      generatedConditions: JSON.stringify([
        { field: 'reference_period_yrs', operator: '>=', value: 5, message: 'Minimum reference period 5 years' },
      ]),
      generatedNodes: JSON.stringify([]),
      status: 'FAILED',
      aiModel: 'z-ai-llm',
      ruleId: '',
      feedback: 'Generation failed - insufficient reference data for Northern watershed',
      createdBy: 'Admin',
    },
  ];

  for (const session of aiSessions) {
    await db.aIGenerationSession.create({ data: session });
  }

  // ── ENTERPRISE: Create Cross-Chain Bridges ────────────────────────────
  const bridges = [
    {
      name: 'Verra Registry (VCS)',
      registryType: 'VERRA',
      endpoint: 'https://registry.verra.org/api/v1',
      apiKeyRef: 'vault:verra-api-key-prod',
      accountId: 'VCS-TH-00412',
      accountName: 'Thailand T-VER Bridge Account',
      bridgeProtocol: 'API',
      status: 'CONNECTED',
      lastSyncAt: new Date(Date.now() - 3600000),
      syncInterval: 1800,
      totalCreditsSynced: rand(5000, 25000),
      metadata: JSON.stringify({
        supportedStandards: ['VCS', 'CCB', 'SD VISTA'],
        apiVersion: 'v1',
        webhookEnabled: true,
        autoSync: true,
      }),
    },
    {
      name: 'Gold Standard Registry',
      registryType: 'GOLD_STANDARD',
      endpoint: 'https://registry.goldstandard.org/api/v2',
      apiKeyRef: 'vault:gs-api-key-prod',
      accountId: 'GS-TH-02158',
      accountName: 'TGO Gold Standard Account',
      bridgeProtocol: 'API',
      status: 'CONNECTED',
      lastSyncAt: new Date(Date.now() - 7200000),
      syncInterval: 3600,
      totalCreditsSynced: rand(2000, 10000),
      metadata: JSON.stringify({
        supportedStandards: ['GS', 'GS-CER', 'GS-VER'],
        apiVersion: 'v2',
        webhookEnabled: true,
        autoSync: false,
      }),
    },
    {
      name: 'I-REC Standard Bridge',
      registryType: 'I_REC',
      endpoint: 'https://irec.registry.org/api/v1',
      apiKeyRef: 'vault:irec-api-key',
      accountId: 'IREC-TH-00087',
      accountName: 'Thailand Renewable Energy Bridge',
      bridgeProtocol: 'API',
      status: 'SYNCING',
      lastSyncAt: new Date(Date.now() - 86400000),
      syncInterval: 7200,
      totalCreditsSynced: rand(1000, 5000),
      metadata: JSON.stringify({
        supportedStandards: ['I-REC(E)', 'I-REC(G)'],
        apiVersion: 'v1',
        syncInProgress: true,
      }),
    },
    {
      name: 'Polygon Blockchain Bridge',
      registryType: 'CUSTOM',
      endpoint: 'https://bridge.dmrv-th.org/polygon',
      apiKeyRef: 'vault:polygon-bridge-key',
      accountId: '0x7a3B...e9F2',
      accountName: 'dMRV Polygon Mumbai Testnet',
      bridgeProtocol: 'POLYGON_BRIDGE',
      status: 'PENDING',
      syncInterval: 0,
      totalCreditsSynced: 0,
      metadata: JSON.stringify({
        chainId: 80001,
        contractAddress: '0xAb5801a7...7dE85',
        network: 'mumbai',
        gasLimit: 500000,
      }),
    },
    {
      name: 'Ethereum Mainnet Bridge',
      registryType: 'CUSTOM',
      endpoint: 'https://bridge.dmrv-th.org/ethereum',
      apiKeyRef: 'vault:eth-bridge-key',
      accountId: '0x1f9E...4aC8',
      accountName: 'dMRV Ethereum Mainnet',
      bridgeProtocol: 'ETHEREUM_BRIDGE',
      status: 'DISCONNECTED',
      syncInterval: 0,
      totalCreditsSynced: 0,
      metadata: JSON.stringify({
        chainId: 1,
        contractAddress: '0xNotDeployed',
        network: 'mainnet',
        pendingDeployment: true,
      }),
    },
  ];

  const createdBridges = [];
  for (const bridge of bridges) {
    const b = await db.crossChainBridge.create({ data: bridge });
    createdBridges.push(b);
  }

  // ── ENTERPRISE: Create Bridge Transactions ────────────────────────────
  const bridgeTxs = [
    {
      bridgeId: createdBridges[0]?.id || '',
      txType: 'MINT',
      direction: 'INBOUND',
      creditAmount: rand(500, 2000),
      creditTokenId: 'TCO2E-VCS-001',
      externalRef: 'VCS-VCU-12345-2024',
      externalStatus: 'ISSUED',
      txHash: '0xabc123...def456',
      status: 'CONFIRMED',
      metadata: JSON.stringify({ vintage: 'V2024', projectName: 'Chiang Mai Forest' }),
      initiatedBy: 'Admin',
    },
    {
      bridgeId: createdBridges[0]?.id || '',
      txType: 'TRANSFER',
      direction: 'OUTBOUND',
      creditAmount: rand(200, 800),
      creditTokenId: 'TCO2E-VCS-002',
      externalRef: 'VCS-VCU-12346-2024',
      externalStatus: 'RETIRED',
      txHash: '0x789ghi...jkl012',
      status: 'CONFIRMED',
      metadata: JSON.stringify({ buyer: 'PTT Public Company Limited', purpose: 'Carbon Neutral 2024' }),
      initiatedBy: 'Admin',
    },
    {
      bridgeId: createdBridges[1]?.id || '',
      txType: 'SYNC',
      direction: 'INBOUND',
      creditAmount: rand(100, 500),
      creditTokenId: '',
      externalRef: 'GS-SYNC-2024-Q1',
      externalStatus: 'COMPLETED',
      txHash: '',
      status: 'CONFIRMED',
      metadata: JSON.stringify({ syncedRecords: 42, period: 'Q1-2024' }),
      initiatedBy: 'System',
    },
    {
      bridgeId: createdBridges[2]?.id || '',
      txType: 'VERIFY',
      direction: 'INBOUND',
      creditAmount: rand(50, 300),
      creditTokenId: '',
      externalRef: 'IREC-VERIFY-0087',
      externalStatus: 'PENDING',
      txHash: '',
      status: 'PENDING',
      metadata: JSON.stringify({ verificationType: 'certificate_authenticity' }),
      initiatedBy: 'Admin',
    },
    {
      bridgeId: createdBridges[0]?.id || '',
      txType: 'RETIRE',
      direction: 'OUTBOUND',
      creditAmount: rand(100, 600),
      creditTokenId: 'TCO2E-VCS-003',
      externalRef: 'VCS-RETIRE-9876',
      externalStatus: 'FAILED',
      txHash: '',
      status: 'FAILED',
      errorMessage: 'External registry timeout: credit retirement could not be confirmed within 30s',
      metadata: JSON.stringify({ retiree: 'SCG Chemicals', beneficiary: 'Climate Action Thailand' }),
      initiatedBy: 'Admin',
    },
  ];

  for (const tx of bridgeTxs) {
    if (tx.bridgeId) {
      await db.bridgeTransaction.create({ data: tx });
    }
  }
}
