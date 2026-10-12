import { NextRequest, NextResponse } from 'next/server';
import { mergeLocalMileAccounts } from '@/services/localmile-merge-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetCompanyId = body.targetLeadId || body.targetCompanyId || body.targetId || body.masterId;
    const sourceCompanyIds = body.sourceLeadIds || body.sourceCompanyIds || body.sourceIds || body.duplicateIds;

    if (!targetCompanyId) {
      return NextResponse.json(
        { success: false, message: 'targetCompanyId or targetLeadId is required.' },
        { status: 400 }
      );
    }

    if (!sourceCompanyIds || (Array.isArray(sourceCompanyIds) && sourceCompanyIds.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'sourceCompanyIds or sourceLeadIds is required.' },
        { status: 400 }
      );
    }

    const result = await mergeLocalMileAccounts(targetCompanyId, sourceCompanyIds);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/localmile/merge-accounts Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to merge LocalMile accounts.' },
      { status: 500 }
    );
  }
}
