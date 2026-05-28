import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';

// GET /api/dmrv/vvb — List all VVB reviews with project info and summary stats
export async function GET() {
  try {
    await ensureSeeded();

    const reviews = await db.vVBReview.findMany({
      include: {
        project: {
          select: { id: true, name: true, province: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats by status
    const byStatus: Record<string, number> = {};
    const byReviewType: Record<string, number> = {};
    for (const review of reviews) {
      byStatus[review.status] = (byStatus[review.status] || 0) + 1;
      byReviewType[review.reviewType] = (byReviewType[review.reviewType] || 0) + 1;
    }

    return NextResponse.json({
      reviews,
      summary: {
        total: reviews.length,
        byStatus,
        byReviewType,
      },
    });
  } catch (error) {
    console.error('VVB GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch VVB reviews', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/vvb — Create or update a VVB review
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      action: 'create' | 'update';
      projectId: string;
      reviewerOrg?: string;
      reviewerName?: string;
      reviewType?: string;
      status?: string;
      recommendation?: string;
      comments?: string;
      evidenceRefs?: string;
      findings?: string;
      reviewId?: string;
    };

    const { action, projectId, reviewerOrg, reviewerName, reviewType, status, recommendation, comments, evidenceRefs, findings, reviewId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'create') {
      const review = await db.vVBReview.create({
        data: {
          projectId,
          reviewerOrg: reviewerOrg || '',
          reviewerName: reviewerName || '',
          reviewType: reviewType || 'VALIDATION',
          status: status || 'PENDING',
          recommendation: recommendation || '',
          comments: comments || '',
          evidenceRefs: evidenceRefs || '[]',
          findings: findings || '{}',
          reviewedAt: ['APPROVED', 'REJECTED', 'REQUESTED_INFO'].includes(status || '')
            ? new Date()
            : null,
        },
        include: {
          project: { select: { id: true, name: true, province: true } },
        },
      });

      return NextResponse.json({ success: true, review }, { status: 201 });
    }

    if (action === 'update') {
      if (!reviewId) {
        return NextResponse.json({ error: 'reviewId is required for update' }, { status: 400 });
      }

      const existing = await db.vVBReview.findUnique({ where: { id: reviewId } });
      if (!existing) {
        return NextResponse.json({ error: 'VVB review not found' }, { status: 404 });
      }

      const updateData: Record<string, unknown> = {};
      if (reviewerOrg !== undefined) updateData.reviewerOrg = reviewerOrg;
      if (reviewerName !== undefined) updateData.reviewerName = reviewerName;
      if (reviewType !== undefined) updateData.reviewType = reviewType;
      if (status !== undefined) {
        updateData.status = status;
        if (['APPROVED', 'REJECTED', 'REQUESTED_INFO'].includes(status)) {
          updateData.reviewedAt = new Date();
        }
      }
      if (recommendation !== undefined) updateData.recommendation = recommendation;
      if (comments !== undefined) updateData.comments = comments;
      if (evidenceRefs !== undefined) updateData.evidenceRefs = evidenceRefs;
      if (findings !== undefined) updateData.findings = findings;

      const review = await db.vVBReview.update({
        where: { id: reviewId },
        data: updateData,
        include: {
          project: { select: { id: true, name: true, province: true } },
        },
      });

      return NextResponse.json({ success: true, review });
    }

    return NextResponse.json({ error: 'Invalid action. Use "create" or "update"' }, { status: 400 });
  } catch (error) {
    console.error('VVB POST error:', error);
    return NextResponse.json({ error: 'Failed to process VVB review', details: String(error) }, { status: 500 });
  }
}
