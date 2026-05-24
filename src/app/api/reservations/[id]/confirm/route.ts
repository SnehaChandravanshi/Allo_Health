import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventoryService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idempotencyKey = request.headers.get('Idempotency-Key') || undefined;

    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required.' },
        { status: 400 }
      );
    }

    const result = await inventoryService.confirmReservation(id, idempotencyKey);
    const isMock = await inventoryService.isMockMode();

    const headers: Record<string, string> = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    };

    if (result.isIdempotent) {
      headers['X-Cache-Lookup'] = 'HIT - Idempotent Request';
    }

    return NextResponse.json(
      { ...result.body, isMockMode: isMock },
      { status: result.status, headers }
    );
  } catch (error) {
    console.error('Error in POST /api/reservations/[id]/confirm:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
