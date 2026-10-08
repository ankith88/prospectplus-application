import { NextRequest, NextResponse } from 'next/server';
import { testProviderConnectionServer } from '@/services/telephony-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey } = body;

    if (!provider || !['aircall', 'dialpad'].includes(provider)) {
      return NextResponse.json({ success: false, message: 'Invalid provider specified' }, { status: 400 });
    }

    const result = await testProviderConnectionServer(provider, apiKey);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Admin Telephony Test API] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
