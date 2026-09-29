import { NextRequest, NextResponse } from 'next/server';
import { generateMissedCallsReport, getAircallNumbers } from '@/services/aircall-reporting-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Check if client is just requesting the list of Aircall lines
    if (searchParams.get('action') === 'numbers') {
      const numbers = await getAircallNumbers();
      return NextResponse.json({ success: true, numbers });
    }

    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const numberIdParam = searchParams.get('numberId');

    const now = Math.floor(Date.now() / 1000);
    // Default to last 7 days if not provided
    let fromSeconds = fromParam ? Math.floor(new Date(fromParam).getTime() / 1000) : now - 7 * 24 * 3600;
    let toSeconds = toParam ? Math.floor(new Date(toParam).getTime() / 1000) : now;

    if (isNaN(fromSeconds)) fromSeconds = now - 7 * 24 * 3600;
    if (isNaN(toSeconds)) toSeconds = now;

    // Safety: ensure toSeconds is after fromSeconds
    if (toSeconds < fromSeconds) {
      const temp = fromSeconds;
      fromSeconds = toSeconds;
      toSeconds = temp;
    }

    let numberIdFilter: number | number[] | undefined = undefined;
    if (numberIdParam && numberIdParam !== 'all') {
      if (numberIdParam.includes(',')) {
        const parsed = numberIdParam.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        if (parsed.length > 0) numberIdFilter = parsed;
      } else {
        const parsed = parseInt(numberIdParam.trim(), 10);
        if (!isNaN(parsed)) numberIdFilter = parsed;
      }
    }

    const report = await generateMissedCallsReport(fromSeconds, toSeconds, numberIdFilter);

    return NextResponse.json({
      success: true,
      timeframe: {
        from: new Date(fromSeconds * 1000).toISOString(),
        to: new Date(toSeconds * 1000).toISOString(),
      },
      ...report,
    });
  } catch (error: any) {
    console.error('[Aircall Missed Calls Report API Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate Aircall missed calls report',
      },
      { status: 500 }
    );
  }
}
