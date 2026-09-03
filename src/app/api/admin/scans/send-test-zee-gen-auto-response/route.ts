import { NextResponse } from 'next/server';
import { processZeeGenAutoResponse } from '@/lib/zee-gen-leads-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { recipients, date } = body;

    const testEmail = (recipients && Array.isArray(recipients) && recipients.length > 0)
      ? recipients[0]
      : 'ankith.ravindran@mailplus.com.au';

    const result = await processZeeGenAutoResponse({
      testEmail,
      targetDate: date,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Send Test Zee Gen Auto Response] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send test Zee Gen auto-response emails' },
      { status: 500 }
    );
  }
}
