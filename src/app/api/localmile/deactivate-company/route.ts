import { NextRequest, NextResponse } from 'next/server';
import { deactivateLocalMileCompany } from '@/services/localmile-company-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyId,
      leadId,
      reason,
      deactivateScheduledJobs = true,
      deactivatedBy = 'ProspectPlus Staff',
    } = body;

    const targetId = companyId || leadId;

    if (!targetId) {
      return NextResponse.json(
        { success: false, message: 'companyId or leadId is required.' },
        { status: 400 }
      );
    }

    const result = await deactivateLocalMileCompany({
      companyId: String(targetId),
      reason: reason || 'Manual LocalMile account deactivation',
      deactivateScheduledJobs: Boolean(deactivateScheduledJobs),
      deactivatedBy: String(deactivatedBy),
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /localmile/deactivate-company] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
