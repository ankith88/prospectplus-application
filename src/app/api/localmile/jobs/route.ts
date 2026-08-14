import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);
const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log('[LocalMile Webhook] Incoming Request:', body);
    const { leadId, jobId, status, ...jobDetails } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const leadRef = db.collection('leads').doc(String(leadId));
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const leadData = leadSnap.data()!;

    // 1. Save/Update job details in localMileJobs subcollection
    const jobDocRef = leadRef.collection('localMileJobs').doc(String(jobId));
    const jobSnap = await jobDocRef.get();
    const existingJobData = jobSnap.exists ? jobSnap.data() : null;

    await jobDocRef.set({
      jobId: String(jobId),
      status: status || 'created',
      ...jobDetails,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existingJobData ? {} : { createdAt: FieldValue.serverTimestamp() })
    }, { merge: true });

    // 2. Fetch all jobs for this lead to calculate accurate jobCount and localMileTrialsRemaining
    const jobsSnap = await leadRef.collection('localMileJobs').get();
    const totalJobCount = jobsSnap.docs.length;
    const activeTrialJobsCount = jobsSnap.docs.filter(d => {
      const st = d.data()?.status;
      return st !== 'recredited' && st !== 'cancelled';
    }).length;

    const computedTrialsRemaining = Math.max(0, 5 - activeTrialJobsCount);
    const isFirstJob = !leadData.hasCreatedJob && totalJobCount > 0;

    const leadUpdates: any = {
      jobCount: totalJobCount,
      hasCreatedJob: totalJobCount > 0,
      localMileTrialsRemaining: computedTrialsRemaining,
      lastLocalMileJobCreatedAt: new Date().toISOString(),
      localMileNudgeCount: 0,
      lastLocalMileNudgeSentAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isFirstJob) {
      leadUpdates.firstJobCreatedAt = new Date().toISOString();
      leadUpdates.status = 'Trialing LocalMile';
      leadUpdates.customerStatus = 'Trialing LocalMile';

      const oldBucket = leadData.bucket || (leadData.fieldSales ? 'field_sales' : 'outbound');
      leadUpdates.bucket = 'account_manager';
      leadUpdates.bucketHistory = [
        {
          id: `bh-${Date.now()}`,
          oldBucket,
          newBucket: 'account_manager',
          date: new Date().toISOString(),
          author: 'LocalMile.Plus Webhook'
        },
        ...(leadData.bucketHistory || [])
      ];

      if (leadData.nurtureJourneyId === 'op8xIHH4I70YeL8NRDly') {
        leadUpdates.nurtureStatus = 'completed';
        leadUpdates.nurtureLastActionAt = new Date().toISOString();
      }
    }

    await leadRef.update(leadUpdates);

    // 3. Log activity in CRM
    const activityRef = leadRef.collection('activity');
    if (!existingJobData) {
      if (isFirstJob) {
        await activityRef.add({
          type: 'Update',
          date: new Date().toISOString(),
          notes: `First LocalMile Job created (Ref: ${jobId}). Status transitioned to Trialing LocalMile. Trials remaining: ${computedTrialsRemaining}.`,
          author: 'LocalMile.Plus Webhook'
        });
      } else {
        await activityRef.add({
          type: 'Update',
          date: new Date().toISOString(),
          notes: `LocalMile Job created (Ref: ${jobId}). Total jobs: ${totalJobCount}. Trials remaining: ${computedTrialsRemaining}.`,
          author: 'LocalMile.Plus Webhook'
        });
      }
    }

    // 4. Synchronize updated trial count to localmile-plus backend
    const localMileApiKey = process.env.LOCALMILE_PLUS_API_KEY || process.env.PROSPECTPLUS_API_KEY;
    if (localMileApiKey) {
      try {
        console.log(`[LocalMile Webhook] Syncing trial remaining count (${computedTrialsRemaining}) to localmile-plus for company ${leadId}...`);
        const syncResponse = await fetch(`https://us-central1-localmile-plus.cloudfunctions.net/api/api/v1/companies/${leadId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': localMileApiKey
          },
          body: JSON.stringify({
            trial_credits_balance: computedTrialsRemaining
          })
        });
        if (!syncResponse.ok) {
          console.error(`[LocalMile Webhook] Failed to sync trial balance to localmile-plus: Status ${syncResponse.status}, Error: ${await syncResponse.text()}`);
        } else {
          console.log(`[LocalMile Webhook] Successfully synced trial balance to localmile-plus.`);
        }
      } catch (syncError) {
        console.error('[LocalMile Webhook] Error calling localmile-plus sync API:', syncError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Job recorded successfully',
      jobId,
      jobCount: totalJobCount,
      trialsRemaining: computedTrialsRemaining
    });

  } catch (error: any) {
    console.error('Error processing LocalMile job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
