import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dmrv/submission — List submissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where = projectId ? { projectId } : {};
    const submissions = await db.submission.findMany({
      where,
      include: { project: { select: { id: true, name: true, methodology: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: submissions.length,
      readyForVerification: submissions.filter((s) => s.status === 'READY_FOR_VERIFICATION').length,
      verified: submissions.filter((s) => s.status === 'VERIFIED').length,
      submitted: submissions.filter((s) => s.status === 'SUBMITTED').length,
      rejected: submissions.filter((s) => s.status === 'REJECTED').length,
    };

    return NextResponse.json({ submissions, summary });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

// POST /api/dmrv/submission — Create submission form
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId: string;
      data: Record<string, unknown>;
      status?: string;
    };

    const { projectId, data, status } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const submission = await db.submission.create({
      data: {
        projectId,
        data: JSON.stringify(data ?? {}),
        status: status ?? 'READY_FOR_VERIFICATION',
      },
    });

    await db.auditLog.create({
      data: {
        agentName: 'SubmissionAgent',
        action: 'create_submission',
        projectId,
        details: JSON.stringify({ submissionId: submission.id, status: submission.status }),
        severity: 'INFO',
      },
    });

    return NextResponse.json(
      {
        success: true,
        submission: { ...submission, data: JSON.parse(submission.data) },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Submission creation error:', error);
    return NextResponse.json({ error: 'Submission creation failed', details: String(error) }, { status: 500 });
  }
}
