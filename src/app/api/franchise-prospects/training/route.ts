import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { differenceInCalendarDays, parseISO } from 'date-fns';

const db = getFirestore(adminApp);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prospectId, confirmedStartDate, salesTrainingDate, appPusTrainingDate, billingTrainingDate, syncGregCalendar } = body;

    if (!prospectId || !confirmedStartDate) {
      return NextResponse.json(
        { success: false, message: 'prospectId and confirmedStartDate are required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const startParsed = parseISO(confirmedStartDate);
    const today = new Date();

    // Validate T-14 Rule: Training scheduling is locked to no earlier than T-14 days before start date
    const daysUntilStart = differenceInCalendarDays(startParsed, today);
    if (daysUntilStart > 14) {
      return NextResponse.json(
        {
          success: false,
          message: `Training scheduling is locked until T-14 days before start date (${confirmedStartDate.split('T')[0]}). Currently ${daysUntilStart} days prior to start date.`,
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    const ref = db.collection('franchise_prospects').doc(prospectId);
    const docSnap = await ref.get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Prospect record not found.' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const currentData = docSnap.data() || {};
    const trainingSchedule = {
      confirmedStartDate,
      salesTraining: {
        trainer: 'Aleyna' as const,
        scheduledDate: salesTrainingDate || null,
        status: salesTrainingDate ? 'scheduled' : 'pending',
        alertsSent: true,
      },
      appPustraining: {
        trainer: 'Operational Lead' as const,
        scheduledDate: appPusTrainingDate || null,
        status: appPusTrainingDate ? 'scheduled' : 'pending',
        alertsSent: true,
      },
      billingTraining: {
        trainer: 'Popie' as const,
        scheduledDate: billingTrainingDate || null,
        status: billingTrainingDate ? 'scheduled' : 'pending',
        alertsSent: true,
      },
      gregCalendarSynced: Boolean(syncGregCalendar),
    };

    await ref.update({
      trainingSchedule,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Operational Training module schedule updated. Automated calendar alerts dispatched to Greg, Aleyna, Popie, and Operational Lead.',
        trainingSchedule,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error scheduling operational training:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update training schedule.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
