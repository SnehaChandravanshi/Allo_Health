import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventoryService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required.' },
        { status: 400 }
      );
    }

    const result = await inventoryService.releaseReservation(id);
    const isMock = await inventoryService.isMockMode();

    return NextResponse.json(
      { ...result.body, isMockMode: isMock },
      {
        status: result.status,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error in POST /api/reservations/[id]/release:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
