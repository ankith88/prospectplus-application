import { NextRequest, NextResponse } from 'next/server';
import { provisionLpoPlusAccount, LpoPlusProvisionPayload } from '@/services/lpo-plus-service';

export async function POST(request: NextRequest) {
  try {
    const body: LpoPlusProvisionPayload = await request.json();

    if (!body || !body.netsuiteId || !body.contactEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required payload parameters: netsuiteId and contactEmail' },
        { status: 400 }
      );
    }

    const result = await provisionLpoPlusAccount(body);

    if (result.success) {
      return NextResponse.json({
        success: true,
        authId: result.authId,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[API /api/lpo-plus/provision Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during LPO.Plus provisioning' },
      { status: 500 }
    );
  }
}
