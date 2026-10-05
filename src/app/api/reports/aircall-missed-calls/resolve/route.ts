import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getSydneyISOString } from '@/lib/utils';

const db = getFirestore(adminApp);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      callId,
      resolutionType,
      notes,
      authorName,
      authorEmail,
      leadId,
      leadType,
      callerNumber,
    } = body;

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'callId is required' },
        { status: 400 }
      );
    }

    if (!resolutionType) {
      return NextResponse.json(
        { success: false, error: 'resolutionType is required' },
        { status: 400 }
      );
    }

    const resolvedAt = getSydneyISOString();
    const resolutionData = {
      callId: String(callId),
      resolutionType,
      notes: notes || '',
      authorName: authorName || 'Staff Member',
      authorEmail: authorEmail || '',
      leadId: leadId || null,
      leadType: leadType || null,
      callerNumber: callerNumber || '',
      resolvedAt,
      updatedAt: resolvedAt,
    };

    // 1. Save to missed_call_resolutions collection
    await db.collection('missed_call_resolutions').doc(String(callId)).set(resolutionData, { merge: true });

    // 2. If matched to a Lead or Company, log an activity entry to their timeline
    if (leadId && leadType && (leadType === 'leads' || leadType === 'companies')) {
      try {
        const resolutionLabels: Record<string, string> = {
          callback_manual: 'Outbound Callback Made',
          left_voicemail: 'Left Voicemail',
          emailed: 'Contacted via Email',
          spam_wrong_number: 'Marked as Spam / Wrong Number',
          handled_external: 'Handled by Operations / Customer Service',
          other: 'Missed Call Resolved',
        };

        const label = resolutionLabels[resolutionType] || 'Missed Call Follow-Up';
        const activityNote = notes
          ? `Missed Call Follow-up (${label}): ${notes}`
          : `Missed Call Follow-up (${label})`;

        const activityType = resolutionType === 'callback_manual' || resolutionType === 'left_voicemail'
          ? 'Call'
          : resolutionType === 'emailed'
          ? 'Email'
          : 'Note';

        await db.collection(leadType).doc(leadId).collection('activity').add({
          type: activityType,
          date: resolvedAt,
          author: authorName || 'Staff Member',
          authorEmail: authorEmail || '',
          notes: activityNote,
          source: 'missed_call_resolution',
          callId: String(callId),
        });
      } catch (actErr) {
        console.warn(`[Missed Call Resolution] Could not log lead activity for ${leadId}:`, actErr);
      }
    }

    return NextResponse.json({
      success: true,
      resolution: resolutionData,
    });
  } catch (error: any) {
    console.error('[Missed Call Resolution API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resolve missed call' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'callId is required' },
        { status: 400 }
      );
    }

    await db.collection('missed_call_resolutions').doc(String(callId)).delete();

    return NextResponse.json({
      success: true,
      message: 'Resolution removed',
    });
  } catch (error: any) {
    console.error('[Missed Call Resolution Delete Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove resolution' },
      { status: 500 }
    );
  }
}
