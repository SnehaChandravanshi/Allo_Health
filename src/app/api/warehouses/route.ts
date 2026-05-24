import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventoryService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const warehouses = await inventoryService.getWarehouses();
    const isMock = await inventoryService.isMockMode();
    
    return NextResponse.json(
      { warehouses, isMockMode: isMock },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/warehouses:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
