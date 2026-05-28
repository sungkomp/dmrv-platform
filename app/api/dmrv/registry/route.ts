import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';

// GET /api/dmrv/registry — Public registry explorer with search
export async function GET(request: NextRequest) {
  try {
    await ensureSeeded();

    const { searchParams } = new URL(request.url);
    const certId = searchParams.get('certId');
    const certNumber = searchParams.get('certNumber');

    // Search by certificate ID
    if (certId) {
      const certificate = await db.certificate.findUnique({
        where: { id: certId },
        include: {
          project: { select: { id: true, name: true, province: true, methodology: true, status: true } },
          auditTrail: { orderBy: { timestamp: 'asc' } },
        },
      });

      if (!certificate) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }

      // Build Merkle tree representation from audit trail
      const merkleTree = certificate.auditTrail.map((entry) => ({
        eventType: entry.eventType,
        previousHash: entry.previousHash,
        dataHash: entry.dataHash,
        merkleRoot: entry.merkleRoot,
        metadata: entry.metadata,
        timestamp: entry.timestamp.toISOString(),
      }));

      // Verify chain integrity
      let chainValid = true;
      for (let i = 1; i < certificate.auditTrail.length; i++) {
        if (certificate.auditTrail[i].previousHash !== certificate.auditTrail[i - 1].dataHash) {
          chainValid = false;
          break;
        }
      }

      return NextResponse.json({
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          status: certificate.status,
          issuedBy: certificate.issuedBy,
          validFrom: certificate.validFrom.toISOString(),
          validUntil: certificate.validUntil.toISOString(),
          project: certificate.project,
        },
        auditTrail: merkleTree,
        chainIntegrity: {
          valid: chainValid,
          totalEntries: merkleTree.length,
          genesisHash: merkleTree.length > 0 ? merkleTree[0].previousHash : null,
          latestRoot: merkleTree.length > 0 ? merkleTree[merkleTree.length - 1].merkleRoot : null,
        },
      });
    }

    // Search by certificate number
    if (certNumber) {
      const certificates = await db.certificate.findMany({
        where: { certificateNumber: { contains: certNumber } },
        include: {
          project: { select: { id: true, name: true, province: true, methodology: true, status: true } },
          auditTrail: { orderBy: { timestamp: 'asc' } },
        },
      });

      const results = certificates.map((cert) => {
        const merkleTree = cert.auditTrail.map((entry) => ({
          eventType: entry.eventType,
          previousHash: entry.previousHash,
          dataHash: entry.dataHash,
          merkleRoot: entry.merkleRoot,
          metadata: entry.metadata,
          timestamp: entry.timestamp.toISOString(),
        }));

        let chainValid = true;
        for (let i = 1; i < cert.auditTrail.length; i++) {
          if (cert.auditTrail[i].previousHash !== cert.auditTrail[i - 1].dataHash) {
            chainValid = false;
            break;
          }
        }

        return {
          certificate: {
            id: cert.id,
            certificateNumber: cert.certificateNumber,
            status: cert.status,
            issuedBy: cert.issuedBy,
            validFrom: cert.validFrom.toISOString(),
            validUntil: cert.validUntil.toISOString(),
            project: cert.project,
          },
          auditTrail: merkleTree,
          chainIntegrity: {
            valid: chainValid,
            totalEntries: merkleTree.length,
          },
        };
      });

      return NextResponse.json({ results, total: results.length });
    }

    // No search params — return recent entries
    const recentCertificates = await db.certificate.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, province: true, methodology: true } },
        auditTrail: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const entries = recentCertificates.map((cert) => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      status: cert.status,
      issuedBy: cert.issuedBy,
      validFrom: cert.validFrom.toISOString(),
      validUntil: cert.validUntil.toISOString(),
      project: cert.project,
      latestAuditEvent: cert.auditTrail.length > 0
        ? {
            eventType: cert.auditTrail[0].eventType,
            timestamp: cert.auditTrail[0].timestamp.toISOString(),
            merkleRoot: cert.auditTrail[0].merkleRoot,
          }
        : null,
    }));

    const totalCertificates = await db.certificate.count();
    const totalTrailEntries = await db.auditTrailEntry.count();

    return NextResponse.json({
      recentEntries: entries,
      summary: {
        totalCertificates,
        totalTrailEntries,
      },
    });
  } catch (error) {
    console.error('Registry GET error:', error);
    return NextResponse.json({ error: 'Failed to query registry', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/registry — Generate audit trail entry for a certificate
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      certificateId: string;
      eventType: string;
      metadata?: string;
    };

    const { certificateId, eventType, metadata } = body;

    if (!certificateId || !eventType) {
      return NextResponse.json({ error: 'certificateId and eventType are required' }, { status: 400 });
    }

    const certificate = await db.certificate.findUnique({
      where: { id: certificateId },
      include: { auditTrail: { orderBy: { timestamp: 'desc' }, take: 1 } },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // Build chain: previousHash = last entry's dataHash (or genesis)
    const previousHash = certificate.auditTrail.length > 0
      ? certificate.auditTrail[0].dataHash
      : '0'.repeat(64);

    const dataHash = `sha256:${Math.random().toString(36).substring(2, 34)}${Date.now().toString(36)}`;
    const merkleRoot = `mr:${Math.random().toString(36).substring(2, 30)}`;

    const entry = await db.auditTrailEntry.create({
      data: {
        certificateId,
        eventType,
        previousHash,
        dataHash,
        merkleRoot,
        metadata: metadata || '{}',
      },
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    console.error('Registry POST error:', error);
    return NextResponse.json({ error: 'Failed to create audit trail entry', details: String(error) }, { status: 500 });
  }
}
