import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// In-memory tracking and inventory state (would be a proper DB table in production)
interface TrackingPosition {
  assetId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: string;
}

interface InventoryItem {
  assetId: string;
  stock: number;
  unit: string;
  lastUpdated: string;
}

const trackingPositions: TrackingPosition[] = [];
const inventoryItems: InventoryItem[] = [];

// GET /api/dmrv/logistics — Get tracking/inventory/settlement data
export async function GET() {
  try {
    const settlements = await db.settlement.findMany({ orderBy: { timestamp: 'desc' } });

    return NextResponse.json({
      tracking: trackingPositions,
      inventory: inventoryItems,
      settlements,
      summary: {
        trackingPoints: trackingPositions.length,
        inventoryItems: inventoryItems.length,
        totalSettlements: settlements.length,
        totalSettlementAmount: settlements.reduce((sum, s) => sum + s.amount, 0),
        processedSettlements: settlements.filter((s) => s.status === 'processed').length,
      },
    });
  } catch (error) {
    console.error('Logistics error:', error);
    return NextResponse.json({ error: 'Failed to fetch logistics data' }, { status: 500 });
  }
}

// POST /api/dmrv/logistics — Update tracking position, inventory stock, or process settlement
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: 'tracking' | 'inventory' | 'settlement';
      // Tracking
      assetId?: string;
      latitude?: number;
      longitude?: number;
      status?: string;
      // Inventory
      stock?: number;
      unit?: string;
      // Settlement
      amount?: number;
    };

    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required (tracking, inventory, or settlement)' }, { status: 400 });
    }

    switch (action) {
      case 'tracking': {
        if (!body.assetId || body.latitude === undefined || body.longitude === undefined) {
          return NextResponse.json({ error: 'assetId, latitude, and longitude are required' }, { status: 400 });
        }

        const position: TrackingPosition = {
          assetId: body.assetId,
          latitude: body.latitude,
          longitude: body.longitude,
          timestamp: new Date().toISOString(),
          status: body.status ?? 'in_transit',
        };

        // Update existing or add new
        const existingIndex = trackingPositions.findIndex((t) => t.assetId === body.assetId);
        if (existingIndex >= 0) {
          trackingPositions[existingIndex] = position;
        } else {
          trackingPositions.push(position);
        }

        await db.auditLog.create({
          data: {
            agentName: 'LogisticsAgent',
            action: 'update_tracking',
            details: JSON.stringify(position),
            severity: 'INFO',
          },
        });

        return NextResponse.json({ success: true, action: 'tracking', position });
      }

      case 'inventory': {
        if (!body.assetId || body.stock === undefined) {
          return NextResponse.json({ error: 'assetId and stock are required' }, { status: 400 });
        }

        const item: InventoryItem = {
          assetId: body.assetId!,
          stock: body.stock!,
          unit: body.unit ?? 'kg',
          lastUpdated: new Date().toISOString(),
        };

        const existingIndex = inventoryItems.findIndex((i) => i.assetId === body.assetId);
        if (existingIndex >= 0) {
          inventoryItems[existingIndex] = item;
        } else {
          inventoryItems.push(item);
        }

        await db.auditLog.create({
          data: {
            agentName: 'LogisticsAgent',
            action: 'update_inventory',
            details: JSON.stringify(item),
            severity: 'INFO',
          },
        });

        return NextResponse.json({ success: true, action: 'inventory', item });
      }

      case 'settlement': {
        if (!body.assetId || !body.amount) {
          return NextResponse.json({ error: 'assetId and amount are required' }, { status: 400 });
        }

        // Find the credit by tokenId (assetId) to link the settlement
        const credit = await db.carbonCredit.findFirst({ where: { tokenId: body.assetId } });
        if (!credit) {
          return NextResponse.json({ error: 'Credit not found for the given assetId' }, { status: 404 });
        }

        const settlement = await db.settlement.create({
          data: {
            creditId: credit.id,
            assetId: body.assetId,
            amount: body.amount,
            status: 'processed',
          },
        });

        await db.auditLog.create({
          data: {
            agentName: 'LogisticsAgent',
            action: 'process_settlement',
            details: JSON.stringify({ settlementId: settlement.id, assetId: body.assetId, amount: body.amount }),
            severity: 'INFO',
          },
        });

        return NextResponse.json({ success: true, action: 'settlement', settlement }, { status: 201 });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use tracking, inventory, or settlement' }, { status: 400 });
    }
  } catch (error) {
    console.error('Logistics action error:', error);
    return NextResponse.json({ error: 'Logistics action failed', details: String(error) }, { status: 500 });
  }
}
