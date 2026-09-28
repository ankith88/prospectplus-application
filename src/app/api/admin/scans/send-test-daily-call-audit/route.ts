import { NextResponse } from 'next/server';
import { runDailyCallAudit } from '@/lib/daily-call-audit/audit-runner';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, date } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients list is required' }, { status: 400 });
    }

    console.log(`[API Test Daily Call Audit] Running test audit for date: ${date || 'today'}, recipients:`, recipients);

    const result = await runDailyCallAudit({
      date,
      recipients
    });

    return NextResponse.json({
      success: true,
      message: `Daily Call Audit report processed and dispatched successfully for ${result.dateFormatted}.`,
      result
    });
  } catch (error: any) {
    console.error('[API Test Daily Call Audit Error]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while running daily call audit.' },
      { status: 500 }
    );
  }
}
