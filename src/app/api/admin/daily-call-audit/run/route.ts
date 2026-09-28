import { NextResponse } from 'next/server';
import { runDailyCallAudit } from '@/lib/daily-call-audit/audit-runner';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { date, recipients, skipEmail, fromAddress } = body;

    const result = await runDailyCallAudit({
      date,
      recipients,
      skipEmail,
      fromAddress
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Daily Call Audit API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute daily call audit' },
      { status: 500 }
    );
  }
}
