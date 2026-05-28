import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Force new PrismaClient to pick up schema changes
// Check if cached client has the latest models; if not, discard it
if (globalForPrisma.prisma) {
  const cached = globalForPrisma.prisma as unknown as Record<string, unknown>;
  if (!cached.aIGenerationSession || !cached.crossChainBridge || !cached.bridgeTransaction) {
    globalForPrisma.prisma = undefined as unknown as PrismaClient;
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db