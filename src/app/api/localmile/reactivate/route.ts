import { NextRequest, NextResponse } from 'next/server';
import { reactivateLocalMileCompany } from '@/services/localmile-company-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyId,
      leadId,
      contactId,
      contactEmail,
      contacts,
      reactivateScheduledJobs = true,
      reactivatedBy = 'ProspectPlus Staff',
    } = body;

    const targetId = companyId || leadId;

    if (!targetId) {
      return NextResponse.json(
        { success: false, message: 'companyId or leadId is required.' },
        { status: 400 }
      );
    }

    const result = await reactivateLocalMileCompany({
      companyId: String(targetId),
      contactId,
      contactEmail,
      contacts,
      reactivateScheduledJobs: Boolean(reactivateScheduledJobs),
      reactivatedBy: String(reactivatedBy),
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /localmile/reactivate] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
