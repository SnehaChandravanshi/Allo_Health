import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventoryService';

export const dynamic = 'force-dynamic';

export async function GET(
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

    const reservation = await inventoryService.getReservation(id);

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found.' },
        { status: 404 }
      );
    }

    const isMock = await inventoryService.isMockMode();

    return NextResponse.json(
      { ...reservation, isMockMode: isMock },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/reservations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
