import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export function getPrismaClient(): PrismaClient | null {
  // If we are in build/compilation environment without database url, return null
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl || dbUrl.includes('localhost:51213') || dbUrl === 'placeholder' || dbUrl === '') {
    return null;
  }
  
  try {
    if (globalForPrisma.prisma) {
      return globalForPrisma.prisma;
    }
    
    // Create connection pool and pass to PrismaPg adapter (Prisma 7 driver architecture)
    const pool = new pg.Pool({ 
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }
    
    return client;
  } catch (error) {
    console.error('❌ Failed to initialize Prisma Client with pg adapter:', error);
    return null;
  }
}
