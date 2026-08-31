import { NextRequest, NextResponse } from 'next/server';
import { assignKerryONeillToLpoBucket } from '@/services/lpo-account-manager-service';

export async function GET(req: NextRequest) {
  try {
    const result = await assignKerryONeillToLpoBucket();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error assigning Kerry O\'Neill as AM:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update account managers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await assignKerryONeillToLpoBucket();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error assigning Kerry O\'Neill as AM:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update account managers' },
      { status: 500 }
    );
  }
}
