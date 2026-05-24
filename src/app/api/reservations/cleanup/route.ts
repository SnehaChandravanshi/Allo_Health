import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventoryService';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await inventoryService.cleanupExpiredReservations();
    const isMock = await inventoryService.isMockMode();
    
    return NextResponse.json(
      { ...result, isMockMode: isMock },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error in POST /api/reservations/cleanup:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
