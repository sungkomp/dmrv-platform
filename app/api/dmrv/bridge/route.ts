import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';

// GET /api/dmrv/bridge — List bridges and recent transactions
export async function GET() {
  try {
    await ensureSeeded();

    const bridges = await db.crossChainBridge.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    const allTransactions = await db.bridgeTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalBridges = bridges.length;
    const connectedBridges = bridges.filter(b => b.status === 'CONNECTED').length;
    const totalCreditsSynced = bridges.reduce((sum, b) => sum + b.totalCreditsSynced, 0);

    const byBridgeStatus: Record<string, number> = {};
    for (const b of bridges) {
      byBridgeStatus[b.status] = (byBridgeStatus[b.status] || 0) + 1;
    }

    const byTxStatus: Record<string, number> = {};
    const byTxType: Record<string, number> = {};
    const byDirection: Record<string, number> = {};
    let totalCreditAmount = 0;
    for (const tx of allTransactions) {
      byTxStatus[tx.status] = (byTxStatus[tx.status] || 0) + 1;
      byTxType[tx.txType] = (byTxType[tx.txType] || 0) + 1;
      byDirection[tx.direction] = (byDirection[tx.direction] || 0) + 1;
      totalCreditAmount += tx.creditAmount;
    }

    return NextResponse.json({
      bridges,
      recentTransactions: allTransactions,
      summary: {
        totalBridges,
        connectedBridges,
        totalCreditsSynced: Math.round(totalCreditsSynced * 100) / 100,
        totalTransactionAmount: Math.round(totalCreditAmount * 100) / 100,
        byBridgeStatus,
        byTxStatus,
        byTxType,
        byDirection,
      },
    });
  } catch (error) {
    console.error('Bridge GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch bridge data', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/bridge — Create/manage bridges and transactions
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      action: 'create_bridge' | 'connect' | 'disconnect' | 'transfer' | 'sync';
      name?: string;
      registryType?: string;
      endpoint?: string;
      apiKeyRef?: string;
      accountId?: string;
      accountName?: string;
      bridgeProtocol?: string;
      syncInterval?: number;
      metadata?: Record<string, unknown>;
      bridgeId?: string;
      txType?: string;
      direction?: string;
      creditAmount?: number;
      creditTokenId?: string;
      initiatedBy?: string;
    };

    const { action } = body;

    if (action === 'create_bridge') {
      const { name, registryType, endpoint, apiKeyRef, accountId, accountName, bridgeProtocol, syncInterval, metadata } = body;
      if (!name || !registryType) {
        return NextResponse.json({ error: 'name and registryType are required' }, { status: 400 });
      }

      const bridge = await db.crossChainBridge.create({
        data: {
          name,
          registryType,
          endpoint: endpoint || '',
          apiKeyRef: apiKeyRef || '',
          accountId: accountId || '',
          accountName: accountName || '',
          bridgeProtocol: bridgeProtocol || 'API',
          syncInterval: syncInterval || 3600,
          metadata: metadata ? JSON.stringify(metadata) : '{}',
          status: 'PENDING',
        },
      });

      return NextResponse.json({ success: true, bridge }, { status: 201 });
    }

    if (action === 'connect') {
      const { bridgeId } = body;
      if (!bridgeId) {
        return NextResponse.json({ error: 'bridgeId is required' }, { status: 400 });
      }

      const bridge = await db.crossChainBridge.findUnique({ where: { id: bridgeId } });
      if (!bridge) {
        return NextResponse.json({ error: 'Bridge not found' }, { status: 404 });
      }

      const updated = await db.crossChainBridge.update({
        where: { id: bridgeId },
        data: { status: 'CONNECTED', lastSyncAt: new Date() },
      });

      await db.bridgeTransaction.create({
        data: {
          bridgeId,
          txType: 'SYNC',
          direction: 'INBOUND',
          status: 'CONFIRMED',
          metadata: JSON.stringify({ action: 'connection_established' }),
          initiatedBy: 'Admin',
        },
      });

      return NextResponse.json({ success: true, bridge: updated });
    }

    if (action === 'disconnect') {
      const { bridgeId } = body;
      if (!bridgeId) {
        return NextResponse.json({ error: 'bridgeId is required' }, { status: 400 });
      }

      const updated = await db.crossChainBridge.update({
        where: { id: bridgeId },
        data: { status: 'DISCONNECTED' },
      });

      return NextResponse.json({ success: true, bridge: updated });
    }

    if (action === 'transfer') {
      const { bridgeId, txType, direction, creditAmount, creditTokenId, metadata, initiatedBy } = body;
      if (!bridgeId || !txType || !direction || !creditAmount) {
        return NextResponse.json({ error: 'bridgeId, txType, direction, and creditAmount are required' }, { status: 400 });
      }

      const bridge = await db.crossChainBridge.findUnique({ where: { id: bridgeId } });
      if (!bridge) {
        return NextResponse.json({ error: 'Bridge not found' }, { status: 404 });
      }

      if (bridge.status !== 'CONNECTED' && bridge.status !== 'SYNCING') {
        return NextResponse.json({ error: 'Bridge must be CONNECTED to perform transfers' }, { status: 400 });
      }

      const tx = await db.bridgeTransaction.create({
        data: {
          bridgeId,
          txType,
          direction,
          creditAmount,
          creditTokenId: creditTokenId || '',
          status: 'SUBMITTED',
          txHash: `0x${Math.random().toString(36).substring(2, 18)}...${Math.random().toString(36).substring(2, 10)}`,
          metadata: metadata ? JSON.stringify(metadata) : '{}',
          initiatedBy: initiatedBy || 'Admin',
        },
      });

      await db.crossChainBridge.update({
        where: { id: bridgeId },
        data: {
          totalCreditsSynced: bridge.totalCreditsSynced + creditAmount,
          lastSyncAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
    }

    if (action === 'sync') {
      const { bridgeId } = body;
      if (!bridgeId) {
        return NextResponse.json({ error: 'bridgeId is required' }, { status: 400 });
      }

      const bridge = await db.crossChainBridge.findUnique({ where: { id: bridgeId } });
      if (!bridge) {
        return NextResponse.json({ error: 'Bridge not found' }, { status: 404 });
      }

      await db.crossChainBridge.update({
        where: { id: bridgeId },
        data: { status: 'CONNECTED', lastSyncAt: new Date() },
      });

      const syncTx = await db.bridgeTransaction.create({
        data: {
          bridgeId,
          txType: 'SYNC',
          direction: 'INBOUND',
          status: 'CONFIRMED',
          metadata: JSON.stringify({ triggeredBy: 'manual_sync' }),
          initiatedBy: 'Admin',
        },
      });

      return NextResponse.json({ success: true, transaction: syncTx });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Bridge POST error:', error);
    return NextResponse.json({ error: 'Failed to process bridge action', details: String(error) }, { status: 500 });
  }
}
