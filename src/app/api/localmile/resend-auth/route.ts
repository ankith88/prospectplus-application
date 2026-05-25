import { NextResponse } from 'next/server';
import { resendLocalMileEmail } from '@/services/netsuite-localmile-proxy';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;
    
    if (!validApiKey || apiKey !== validApiKey) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactEmail, contactFirstName, securityCode, localMilePlusAuthLink } = body;

    if (!contactEmail || !securityCode || !localMilePlusAuthLink) {
        return NextResponse.json({ success: false, message: 'Missing required parameters' }, { status: 400 });
    }

    const result = await resendLocalMileEmail({
        contactEmail,
        contactFirstName: contactFirstName || 'Valued Customer',
        securityCode,
        localMilePlusAuthLink,
        userEmail: 'localmile@mailplus.com.au'
    });

    if (result.success) {
        return NextResponse.json({ success: true, message: 'Email sent successfully via ProspectPlus dispatcher.' });
    } else {
        return NextResponse.json({ success: false, message: result.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API /localmile/resend-auth] Fatal error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
