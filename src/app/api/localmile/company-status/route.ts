import { NextRequest, NextResponse } from 'next/server';
import { getLocalMileCompanyStatus } from '@/services/localmile-company-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') || searchParams.get('leadId') || searchParams.get('id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'companyId query parameter is required.' },
        { status: 400 }
      );
    }

    const status = await getLocalMileCompanyStatus(companyId);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('[API /localmile/company-status] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
