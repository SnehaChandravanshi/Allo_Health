import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventoryService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity = 1 } = body;
    const idempotencyKey = request.headers.get('Idempotency-Key') || undefined;

    if (!productId || !warehouseId) {
      return NextResponse.json(
        { error: 'Missing required fields: productId and warehouseId are required.' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: 'Quantity must be a positive integer.' },
        { status: 400 }
      );
    }

    // Create reservation (handles idempotency and database concurrency safety internally)
    const result = await inventoryService.createReservation({
      productId,
      warehouseId,
      quantity,
      idempotencyKey
    });

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
    console.error('Error in POST /api/reservations:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const reservations = await inventoryService.getReservations();
    const isMock = await inventoryService.isMockMode();
    return NextResponse.json(
      { reservations, isMockMode: isMock },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/reservations:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
