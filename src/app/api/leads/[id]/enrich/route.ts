import { NextRequest, NextResponse } from 'next/server';
import { enrichLeadAction } from '@/ai/flows/enrich-lead-flow';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const rawParams = context?.params;
    const resolvedParams = rawParams instanceof Promise ? await rawParams : rawParams;
    const leadId = resolvedParams?.id;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const result = await enrichLeadAction(leadId);

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
