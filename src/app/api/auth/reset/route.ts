import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventoryService';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await inventoryService.resetDbState();
    return NextResponse.json({ success: true, message: 'Activity logs and reservation inventory state reset successfully.' });
  } catch (error: any) {
    console.error('Error in POST /api/auth/reset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset activity state' },
      { status: 500 }
    );
  }
}
