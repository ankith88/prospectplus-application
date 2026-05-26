import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendSms } from '@/services/sms-service';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message, leadId, author } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: to, message.' },
        { status: 400 }
      );
    }

    const sendResult = await sendSms(to, message);

    if (!sendResult.success) {
      // If a leadId is provided, optionally log the failure
      if (leadId) {
        try {
          const nowStr = new Date().toISOString();
          const leadRef = db.collection('leads').doc(leadId);
          await leadRef.collection('activity').add({
            type: 'SMS',
            date: nowStr,
            notes: `Custom SMS failed: '${message}'. Error: ${sendResult.message || 'Unknown error'}.`,
            author: author || 'System'
          });
        } catch (logErr) {
          console.error('Failed to log SMS failure to lead:', logErr);
        }
      }

      return NextResponse.json(
        { success: false, message: sendResult.message || 'Failed to dispatch SMS.' },
        { status: 500 }
      );
    }

    // Log to Lead Activity if leadId is provided
    if (leadId) {
      try {
        const nowStr = new Date().toISOString();
        const leadRef = db.collection('leads').doc(leadId);
        await leadRef.collection('activity').add({
          type: 'SMS',
          date: nowStr,
          notes: `Custom SMS sent: '${message}'. Status: Delivered.`,
          author: author || 'System'
        });
      } catch (logErr) {
        console.error('Failed to log SMS success to lead:', logErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'SMS dispatched successfully.'
    });

  } catch (error: any) {
    console.error('Error in send-custom-sms API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error during send.' },
      { status: 500 }
    );
  }
}
