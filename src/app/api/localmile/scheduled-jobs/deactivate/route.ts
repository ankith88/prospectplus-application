import { NextRequest, NextResponse } from 'next/server';
import { deactivateLocalMileScheduledJobs } from '@/services/localmile-scheduled-jobs-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetId = body.companyId || body.leadId || body.customerId || body.id;

    if (!targetId) {
      return NextResponse.json(
        { success: false, message: 'companyId or leadId is required.' },
        { status: 400 }
      );
    }

    const result = await deactivateLocalMileScheduledJobs(targetId, {
      reason: body.reason || body.cancellationReason || 'Deactivated via API',
      deactivatedBy: body.deactivatedBy || body.cancelledBy || 'API Caller',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/localmile/scheduled-jobs/deactivate Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
