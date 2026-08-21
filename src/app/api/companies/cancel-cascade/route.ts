import { NextRequest, NextResponse } from 'next/server';
import { processLpoCancellationCascade } from '@/services/lpo-cancellation-cascade-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, companyName, cancellationReason, cancelledBy } = body;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
    }

    const result = await processLpoCancellationCascade({
      leadId,
      companyName,
      cancellationReason: cancellationReason || 'Customer Cancelled',
      cancelledBy: cancelledBy || 'System User'
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/companies/cancel-cascade Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
