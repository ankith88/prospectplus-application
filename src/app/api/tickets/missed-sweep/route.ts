import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketId, userDisplayName } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, message: 'Missing ticketId parameter.' },
        { status: 400 }
      );
    }

    // 1. Fetch ticket details
    const ticketDoc = await db.collection('tickets').doc(ticketId).get();
    if (!ticketDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Ticket not found.' },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data() || {};
    const barcode = ticketData.trackingIdentifier || 'N/A';
    const depot = ticketData.depot || 'Botany Depot';
    const scans = ticketData.enrichedScans || [];
    const latestScan = scans.length > 0 ? scans[scans.length - 1] : {};

    const scanEvent = latestScan.scan_type || 'Missed Sweep Alert';
    const location = latestScan.partnerLocationName || latestScan.depot_id || depot;
    const time = latestScan.formattedTime || latestScan.updated_at || new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });

    // 2. Format subject and body
    const subject = `⚠ MISSED SWEEP — ${barcode} at ${depot}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; padding: 20px; border-radius: 8px;">
        <p><strong>${barcode}</strong> (ticket <strong>${ticketId}</strong>) just recorded a new scan:</p>
        
        <div style="background-color: #fcf8e3; border-left: 4px solid #f0ad4e; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px;"><strong>${scanEvent}</strong> at <strong>${location}</strong>, <strong>${time}</strong>.</p>
        </div>

        <p style="font-size: 12px; color: #666; font-style: italic;">Sent because movement notifications are switched on for this ticket.</p>
      </div>
    `;

    // 3. Dispatch email using configured modern auth or SMTP
    const opsEmails = 'operations@mailplus.com.au, fiona.harrison@mailplus.com.au';
    const emailResult = await sendPhysicalEmail({
      to: opsEmails,
      subject: subject,
      html: htmlBody,
      customFrom: 'customerservice@mailplus.com.au'
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send physical email.');
    }

    // 4. Log the action
    await db.collection('tickets').doc(ticketId).collection('actions').add({
      action: 'Missed Sweep Alert',
      user: userDisplayName || 'Staff',
      date: new Date().toISOString(),
      status: 'Complete',
      notes: 'Missed sweep alert email sent to Operations & Fiona.'
    });

    // 5. Update ticket status to "Awaiting Operations"
    await db.collection('tickets').doc(ticketId).update({
      status: 'Awaiting Operations',
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Missed Sweep alert successfully sent and status updated.',
      simulated: emailResult.simulated
    });

  } catch (error: any) {
    console.error('Error in missed-sweep API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
