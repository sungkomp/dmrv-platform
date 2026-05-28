import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';

// GET /api/dmrv/forward — List all forward contracts with project info and summary stats
export async function GET() {
  try {
    await ensureSeeded();

    const contracts = await db.forwardContract.findMany({
      include: {
        project: {
          select: { id: true, name: true, province: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const totalContractValue = contracts.reduce((sum, c) => sum + c.totalValue, 0);

    const byStatus: Record<string, number> = {};

    // Upcoming deliveries (future delivery dates that are not completed/cancelled)
    const now = new Date();
    const upcomingDeliveries = contracts
      .filter((c) => c.deliveryDate > now && !['COMPLETED', 'CANCELLED', 'DEFAULTED'].includes(c.status))
      .map((c) => ({
        id: c.id,
        buyerName: c.buyerName,
        sellerName: c.sellerName,
        creditAmount: c.creditAmount,
        deliveryDate: c.deliveryDate.toISOString(),
        status: c.status,
        project: c.project,
      }))
      .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());

    for (const contract of contracts) {
      byStatus[contract.status] = (byStatus[contract.status] || 0) + 1;
    }

    return NextResponse.json({
      contracts,
      summary: {
        total: contracts.length,
        totalContractValue: Math.round(totalContractValue * 100) / 100,
        byStatus,
        upcomingDeliveriesCount: upcomingDeliveries.length,
        upcomingDeliveries,
      },
    });
  } catch (error) {
    console.error('Forward GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch forward contracts', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/forward — Create or update forward contract
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      action: 'create' | 'update';
      projectId: string;
      sellerName?: string;
      buyerName?: string;
      creditAmount?: number;
      pricePerUnit?: number;
      deliveryDate?: string;
      status?: string;
      terms?: string;
      contractId?: string;
    };

    const {
      action, projectId, sellerName, buyerName, creditAmount,
      pricePerUnit, deliveryDate, status, terms, contractId,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'create') {
      const cAmount = creditAmount || 0;
      const ppu = pricePerUnit || 0;
      const totalValue = Math.round(cAmount * ppu * 100) / 100;

      const contract = await db.forwardContract.create({
        data: {
          projectId,
          sellerName: sellerName || '',
          buyerName: buyerName || '',
          creditAmount: cAmount,
          pricePerUnit: ppu,
          totalValue,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(Date.now() + 180 * 86400000),
          status: status || 'DRAFT',
          terms: terms || '{}',
        },
        include: {
          project: { select: { id: true, name: true, province: true } },
        },
      });

      return NextResponse.json({ success: true, contract }, { status: 201 });
    }

    if (action === 'update') {
      if (!contractId) {
        return NextResponse.json({ error: 'contractId is required for update' }, { status: 400 });
      }

      const existing = await db.forwardContract.findUnique({ where: { id: contractId } });
      if (!existing) {
        return NextResponse.json({ error: 'Forward contract not found' }, { status: 404 });
      }

      const updateData: Record<string, unknown> = {};
      if (sellerName !== undefined) updateData.sellerName = sellerName;
      if (buyerName !== undefined) updateData.buyerName = buyerName;
      if (creditAmount !== undefined) updateData.creditAmount = creditAmount;
      if (pricePerUnit !== undefined) updateData.pricePerUnit = pricePerUnit;
      if (deliveryDate !== undefined) updateData.deliveryDate = new Date(deliveryDate);
      if (status !== undefined) updateData.status = status;
      if (terms !== undefined) updateData.terms = terms;

      // Recalculate total value if credit amount or price changed
      const newAmount = creditAmount !== undefined ? creditAmount : existing.creditAmount;
      const newPrice = pricePerUnit !== undefined ? pricePerUnit : existing.pricePerUnit;
      updateData.totalValue = Math.round(newAmount * newPrice * 100) / 100;

      const contract = await db.forwardContract.update({
        where: { id: contractId },
        data: updateData,
        include: {
          project: { select: { id: true, name: true, province: true } },
        },
      });

      return NextResponse.json({ success: true, contract });
    }

    return NextResponse.json({ error: 'Invalid action. Use "create" or "update"' }, { status: 400 });
  } catch (error) {
    console.error('Forward POST error:', error);
    return NextResponse.json({ error: 'Failed to process forward contract', details: String(error) }, { status: 500 });
  }
}
