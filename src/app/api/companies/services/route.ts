import { NextRequest, NextResponse } from 'next/server';
import { POST as handleCompanyServicesPOST, PUT as handleCompanyServicesPUT, PATCH as handleCompanyServicesPATCH } from '@/app/api/companies/[id]/services/route';

export const dynamic = 'force-dynamic';

async function delegateToCompanyServices(req: NextRequest, handler: Function) {
  try {
    const cloneReq = req.clone();
    const body = await cloneReq.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const companyId = body?.companyId || body?.id || searchParams.get('companyId') || searchParams.get('id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Missing required "companyId" in request body or query parameter.' },
        { status: 400 }
      );
    }

    return handler(req, { params: Promise.resolve({ id: String(companyId) }) });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Error processing request.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return delegateToCompanyServices(req, handleCompanyServicesPOST);
}

export async function PUT(req: NextRequest) {
  return delegateToCompanyServices(req, handleCompanyServicesPUT);
}

export async function PATCH(req: NextRequest) {
  return delegateToCompanyServices(req, handleCompanyServicesPATCH);
}
