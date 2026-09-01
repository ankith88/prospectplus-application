import { NextResponse } from 'next/server';
import { processScheduledServiceChanges } from '@/services/scheduled-service-transition';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'prospectplus-cron-secret';
    
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const result = await processScheduledServiceChanges();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Cron API Error] process-scheduled-service-changes failed:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
