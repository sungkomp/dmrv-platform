import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dmrv/marketplace — List credits with status
export async function GET() {
  try {
    const credits = await db.carbonCredit.findMany({
      include: { project: { select: { id: true, name: true, methodology: true, location: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const marketplace = {
      available: credits.filter((c) => c.status === 'Available').map((c) => ({
        id: c.id,
        tokenId: c.tokenId,
        amount: c.amount,
        project: c.project.name,
        methodology: c.project.methodology,
        location: c.project.location,
        metadata: JSON.parse(c.metadata || '{}'),
      })),
      traded: credits.filter((c) => c.status === 'Traded').map((c) => ({
        id: c.id,
        tokenId: c.tokenId,
        amount: c.amount,
        buyer: c.buyer || 'Unknown',
        project: c.project.name,
        tradedAt: c.updatedAt.toISOString(),
      })),
      retired: credits.filter((c) => c.status === 'Retired').map((c) => ({
        id: c.id,
        tokenId: c.tokenId,
        amount: c.amount,
        buyer: c.buyer || 'Self-retired',
        project: c.project.name,
        retiredAt: c.updatedAt.toISOString(),
      })),
    };

    const summary = {
      totalCredits: credits.reduce((sum, c) => sum + c.amount, 0),
      availableVolume: marketplace.available.reduce((sum, c) => sum + c.amount, 0),
      tradedVolume: marketplace.traded.reduce((sum, c) => sum + c.amount, 0),
      retiredVolume: marketplace.retired.reduce((sum, c) => sum + c.amount, 0),
      availableCount: marketplace.available.length,
      tradedCount: marketplace.traded.length,
      retiredCount: marketplace.retired.length,
    };

    return NextResponse.json({ marketplace, summary });
  } catch (error) {
    console.error('Marketplace error:', error);
    return NextResponse.json({ error: 'Failed to fetch marketplace data' }, { status: 500 });
  }
}

// POST /api/dmrv/marketplace — Mint/Trade/Retire credits
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: 'mint' | 'trade' | 'retire';
      projectId: string;
      amount: number;
      buyer?: string;
      creditId?: string;
      trackType?: string;
    };

    const { action, projectId, amount, buyer, creditId, trackType } = body;

    if (!action || !projectId) {
      return NextResponse.json({ error: 'action and projectId are required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    switch (action) {
      case 'mint': {
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Valid amount is required for minting' }, { status: 400 });
        }

        const tokenId = `TCO2E-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const credit = await db.carbonCredit.create({
          data: {
            tokenId,
            projectId,
            amount,
            status: 'Available',
            metadata: JSON.stringify({ trackType: trackType ?? 'general', mintedAt: new Date().toISOString(), source: 'marketplace_mint' }),
          },
        });

        await db.auditLog.create({
          data: {
            agentName: 'MarketplaceAgent',
            action: 'mint_credits',
            projectId,
            details: JSON.stringify({ tokenId, amount, trackType }),
            severity: 'INFO',
          },
        });

        return NextResponse.json({ success: true, action: 'mint', credit }, { status: 201 });
      }

      case 'trade': {
        if (!creditId || !buyer) {
          return NextResponse.json({ error: 'creditId and buyer are required for trading' }, { status: 400 });
        }

        const credit = await db.carbonCredit.findUnique({ where: { id: creditId } });
        if (!credit) {
          return NextResponse.json({ error: 'Credit not found' }, { status: 404 });
        }
        if (credit.status !== 'Available') {
          return NextResponse.json({ error: `Credit is not available for trading (current status: ${credit.status})` }, { status: 400 });
        }

        const updatedCredit = await db.carbonCredit.update({
          where: { id: creditId },
          data: { status: 'Traded', buyer },
        });

        // Create settlement
        await db.settlement.create({
          data: {
            creditId: creditId,
            assetId: credit.tokenId,
            amount: credit.amount,
            status: 'processed',
          },
        });

        await db.auditLog.create({
          data: {
            agentName: 'MarketplaceAgent',
            action: 'trade_credits',
            projectId: credit.projectId,
            details: JSON.stringify({ tokenId: credit.tokenId, amount: credit.amount, buyer }),
            severity: 'INFO',
          },
        });

        return NextResponse.json({ success: true, action: 'trade', credit: updatedCredit, buyer });
      }

      case 'retire': {
        if (!creditId) {
          return NextResponse.json({ error: 'creditId is required for retiring' }, { status: 400 });
        }

        const credit = await db.carbonCredit.findUnique({ where: { id: creditId } });
        if (!credit) {
          return NextResponse.json({ error: 'Credit not found' }, { status: 404 });
        }
        if (credit.status === 'Retired') {
          return NextResponse.json({ error: 'Credit is already retired' }, { status: 400 });
        }

        const updatedCredit = await db.carbonCredit.update({
          where: { id: creditId },
          data: { status: 'Retired', buyer: buyer || credit.buyer || 'Self-retired' },
        });

        await db.auditLog.create({
          data: {
            agentName: 'MarketplaceAgent',
            action: 'retire_credits',
            projectId: credit.projectId,
            details: JSON.stringify({ tokenId: credit.tokenId, amount: credit.amount, retiredBy: buyer ?? 'Self-retired' }),
            severity: 'INFO',
          },
        });

        return NextResponse.json({ success: true, action: 'retire', credit: updatedCredit });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use mint, trade, or retire' }, { status: 400 });
    }
  } catch (error) {
    console.error('Marketplace action error:', error);
    return NextResponse.json({ error: 'Marketplace action failed', details: String(error) }, { status: 500 });
  }
}
