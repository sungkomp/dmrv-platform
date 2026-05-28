import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dmrv/certification — List certificates
export async function GET() {
  try {
    const certificates = await db.certificate.findMany({
      include: { project: { select: { id: true, name: true, methodology: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: certificates.length,
      submitted: certificates.filter((c) => c.status === 'SUBMITTED').length,
      approved: certificates.filter((c) => c.status === 'APPROVED').length,
      rejected: certificates.filter((c) => c.status === 'REJECTED').length,
      totalTco2e: certificates.filter((c) => c.status === 'APPROVED').reduce((sum, c) => sum + c.amountTco2e, 0),
    };

    return NextResponse.json({ certificates, summary });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}

// POST /api/dmrv/certification — Submit for certification (T-VER), issue certificate
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId: string;
      trackType: string;
      amountTco2e?: number;
      action?: 'submit' | 'approve' | 'reject';
      certId?: string;
      validator?: string;
    };

    const { projectId, trackType, amountTco2e, action = 'submit', certId, validator } = body;

    if (!projectId || !trackType) {
      return NextResponse.json({ error: 'projectId and trackType are required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'submit') {
      // Create new certificate submission for T-VER
      const newCertId = `TVER-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const certAmount = amountTco2e ?? 0;

      // Auto-calculate if not provided
      const credits = await db.carbonCredit.findMany({ where: { projectId, status: 'Available' } });
      const autoAmount = certAmount || credits.reduce((sum, c) => sum + c.amount, 0);

      const certificate = await db.certificate.create({
        data: {
          certId: newCertId,
          projectId,
          trackType,
          status: 'SUBMITTED',
          amountTco2e: Math.round(autoAmount * 100) / 100,
          validator: validator ?? 'T-VER-Auto-Validator',
        },
      });

      await db.auditLog.create({
        data: {
          agentName: 'CertificationAgent',
          action: 'submit_certification',
          projectId,
          details: JSON.stringify({ certId: newCertId, trackType, amountTco2e: autoAmount }),
          severity: 'INFO',
        },
      });

      return NextResponse.json({ success: true, certificate, tverStatus: 'SUBMITTED' }, { status: 201 });
    }

    if (action === 'approve' || action === 'reject') {
      if (!certId) {
        return NextResponse.json({ error: 'certId is required for approve/reject actions' }, { status: 400 });
      }

      const existingCert = await db.certificate.findFirst({ where: { certId } });
      if (!existingCert) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }

      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      const updatedCert = await db.certificate.update({
        where: { id: existingCert.id },
        data: {
          status: newStatus,
          validator: validator ?? existingCert.validator,
        },
      });

      // Generate master certificate ID on approval
      if (action === 'approve') {
        const masterCertId = `MCERT-${Date.now()}`;
        await db.certificate.update({
          where: { id: existingCert.id },
          data: { masterCertId },
        });
        updatedCert.masterCertId = masterCertId;
      }

      await db.auditLog.create({
        data: {
          agentName: 'CertificationAgent',
          action: `${action}_certification`,
          projectId: existingCert.projectId,
          details: JSON.stringify({ certId, newStatus, validator }),
          severity: action === 'approve' ? 'INFO' : 'WARNING',
        },
      });

      return NextResponse.json({ success: true, certificate: updatedCert, tverStatus: newStatus });
    }

    return NextResponse.json({ error: 'Invalid action. Use submit, approve, or reject' }, { status: 400 });
  } catch (error) {
    console.error('Certification error:', error);
    return NextResponse.json({ error: 'Certification failed', details: String(error) }, { status: 500 });
  }
}
