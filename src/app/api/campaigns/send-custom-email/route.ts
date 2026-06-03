import { NextResponse } from 'next/server';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, html, customFrom, cc, bcc } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: to, subject, html.' },
        { status: 400 }
      );
    }

    const sendResult = await sendPhysicalEmail({
      to,
      subject,
      html,
      customFrom,
      cc,
      bcc
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, message: sendResult.error || 'Failed to dispatch email.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email dispatched successfully.',
      simulated: sendResult.simulated
    });

  } catch (error: any) {
    console.error('Error in send-custom-email API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error during send.' },
      { status: 500 }
    );
  }
}
