import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';

// GET /api/dmrv/devportal — List all API keys and webhooks with summary stats
export async function GET() {
  try {
    await ensureSeeded();

    const apiKeys = await db.apiKey.findMany({ orderBy: { createdAt: 'desc' } });
    const webhooks = await db.webhook.findMany({ orderBy: { createdAt: 'desc' } });

    // Summary stats
    const activeKeys = apiKeys.filter((k) => k.status === 'ACTIVE').length;
    const activeWebhooks = webhooks.filter((w) => w.status === 'ACTIVE').length;

    // Recent activity: last used keys and last webhook deliveries
    const recentKeyActivity = apiKeys
      .filter((k) => k.lastUsed)
      .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
      .slice(0, 5)
      .map((k) => ({
        id: k.id,
        name: k.name,
        status: k.status,
        lastUsed: k.lastUsed?.toISOString() || null,
      }));

    const recentWebhookActivity = webhooks
      .filter((w) => w.lastDelivery)
      .sort((a, b) => (b.lastDelivery?.getTime() || 0) - (a.lastDelivery?.getTime() || 0))
      .slice(0, 5)
      .map((w) => ({
        id: w.id,
        url: w.url,
        status: w.status,
        lastDelivery: w.lastDelivery?.toISOString() || null,
        failureCount: w.failureCount,
      }));

    return NextResponse.json({
      apiKeys,
      webhooks,
      summary: {
        totalApiKeys: apiKeys.length,
        activeKeys,
        revokedKeys: apiKeys.filter((k) => k.status === 'REVOKED').length,
        expiredKeys: apiKeys.filter((k) => k.status === 'EXPIRED').length,
        totalWebhooks: webhooks.length,
        activeWebhooks,
        failedWebhooks: webhooks.filter((w) => w.status === 'FAILED').length,
        pausedWebhooks: webhooks.filter((w) => w.status === 'PAUSED').length,
        recentKeyActivity,
        recentWebhookActivity,
      },
    });
  } catch (error) {
    console.error('DevPortal GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch dev portal data', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/devportal — Manage API keys and webhooks
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      action: 'create_key' | 'revoke_key' | 'create_webhook' | 'update_webhook' | 'test_webhook';
      // API Key fields
      name?: string;
      permissions?: string;
      createdBy?: string;
      keyId?: string;
      // Webhook fields
      url?: string;
      events?: string;
      secret?: string;
      webhookId?: string;
      status?: string;
    };

    const {
      action, name, permissions, createdBy, keyId,
      url, events, secret, webhookId, status,
    } = body;

    if (action === 'create_key') {
      if (!name) {
        return NextResponse.json({ error: 'name is required for creating API key' }, { status: 400 });
      }

      const key = `dmrv_${Math.random().toString(36).substring(2, 14)}${Math.random().toString(36).substring(2, 14)}`;
      const apiKey = await db.apiKey.create({
        data: {
          name,
          key,
          permissions: permissions || '[]',
          status: 'ACTIVE',
          createdBy: createdBy || 'Admin',
          expiresAt: new Date(Date.now() + 365 * 86400000),
        },
      });

      return NextResponse.json({ success: true, apiKey }, { status: 201 });
    }

    if (action === 'revoke_key') {
      if (!keyId) {
        return NextResponse.json({ error: 'keyId is required for revoking API key' }, { status: 400 });
      }

      const existing = await db.apiKey.findUnique({ where: { id: keyId } });
      if (!existing) {
        return NextResponse.json({ error: 'API key not found' }, { status: 404 });
      }

      const apiKey = await db.apiKey.update({
        where: { id: keyId },
        data: { status: 'REVOKED' },
      });

      return NextResponse.json({ success: true, apiKey });
    }

    if (action === 'create_webhook') {
      if (!url) {
        return NextResponse.json({ error: 'url is required for creating webhook' }, { status: 400 });
      }

      const webhook = await db.webhook.create({
        data: {
          url,
          events: events || '[]',
          secret: secret || `whsec_${Math.random().toString(36).substring(2, 18)}`,
          status: 'ACTIVE',
          createdBy: createdBy || 'Admin',
        },
      });

      return NextResponse.json({ success: true, webhook }, { status: 201 });
    }

    if (action === 'update_webhook') {
      if (!webhookId) {
        return NextResponse.json({ error: 'webhookId is required for updating webhook' }, { status: 400 });
      }

      const existing = await db.webhook.findUnique({ where: { id: webhookId } });
      if (!existing) {
        return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
      }

      const updateData: Record<string, unknown> = {};
      if (url !== undefined) updateData.url = url;
      if (events !== undefined) updateData.events = events;
      if (secret !== undefined) updateData.secret = secret;
      if (status !== undefined) updateData.status = status;

      const webhook = await db.webhook.update({
        where: { id: webhookId },
        data: updateData,
      });

      return NextResponse.json({ success: true, webhook });
    }

    if (action === 'test_webhook') {
      if (!webhookId) {
        return NextResponse.json({ error: 'webhookId is required for testing webhook' }, { status: 400 });
      }

      const existing = await db.webhook.findUnique({ where: { id: webhookId } });
      if (!existing) {
        return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
      }

      // Simulate a test delivery
      const testResult = {
        webhookId: existing.id,
        url: existing.url,
        testPayload: {
          event: 'webhook.test',
          timestamp: new Date().toISOString(),
          data: { message: 'Test webhook delivery from dMRV platform' },
        },
        simulated: true,
        status: 'delivered',
      };

      // Update last delivery time
      await db.webhook.update({
        where: { id: webhookId },
        data: { lastDelivery: new Date() },
      });

      return NextResponse.json({ success: true, testResult });
    }

    return NextResponse.json({ error: 'Invalid action. Use "create_key", "revoke_key", "create_webhook", "update_webhook", or "test_webhook"' }, { status: 400 });
  } catch (error) {
    console.error('DevPortal POST error:', error);
    return NextResponse.json({ error: 'Failed to process dev portal action', details: String(error) }, { status: 500 });
  }
}
