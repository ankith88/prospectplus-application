import { NextRequest, NextResponse } from 'next/server';
import { enrichLeadAction } from '@/ai/flows/enrich-lead-flow';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const leadId = resolvedParams?.id;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    let requestorOptions: any = undefined;
    try {
      const body = await req.json();
      if (body) {
        requestorOptions = {
          requestorName: body.requestorName,
          requestorEmail: body.requestorEmail,
          requestorUid: body.requestorUid,
        };
      }
    } catch {}

    const result = await enrichLeadAction(leadId, requestorOptions);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Lead ${leadId} successfully enriched.`,
    });
  } catch (error: any) {
    console.error('Error in lead enrichment API route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
