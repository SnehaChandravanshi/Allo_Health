import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventoryService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await inventoryService.getDashboardStats();
    const isMock = await inventoryService.isMockMode();
    const dbError = await inventoryService.getDbConnectionError();
    
    return NextResponse.json(
      { ...stats, isMockMode: isMock, dbConnectionError: dbError },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/dashboard:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
