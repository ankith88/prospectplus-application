import { NextResponse } from 'next/server';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { logEmailServer } from '@/services/firebase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from, to, cc, subject, html, metadata } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters: to, subject, html.' },
        { status: 400 }
      );
    }

    // Send the email using the central dispatcher
    const sendResult = await sendPhysicalEmail({
      to,
      cc,
      subject,
      html,
      customFrom: from
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, message: sendResult.error || 'Failed to send email.' },
        { status: 500 }
      );
    }

    // Log the email against the company profile if customerId is provided
    if (metadata && metadata.customerId) {
      const nowStr = new Date().toISOString();
      const status = sendResult.simulated ? 'simulated' : 'delivered';
      const customerIdStr = String(metadata.customerId).trim();
      
      if (customerIdStr) {
        await logEmailServer(customerIdStr, {
          subject,
          bodyHtml: html,
          sentAt: nowStr,
          sender: from || 'default', // Optional, depends on how the config resolves it
          recipient: to,
          status: status
        }, 'leads'); // The leads collection holds company profiles
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully.',
      simulated: sendResult.simulated,
      metadata
    });

  } catch (error: any) {
    console.error('Error in NetSuite send-email API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error processing request.' },
      { status: 500 }
    );
  }
}
