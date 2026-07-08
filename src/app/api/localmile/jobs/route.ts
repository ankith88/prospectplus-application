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

    const leadRef = db.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const leadData = leadSnap.data()!;
    let currentTrials = leadData.localMileTrialsRemaining;

    // Load existing job details if any to prevent double-decrementing trials and double-incrementing job counts
    const jobDocRef = db.collection('leads').doc(leadId).collection('localMileJobs').doc(String(jobId));
    const jobSnap = await jobDocRef.get();
    const existingJobData = jobSnap.exists ? jobSnap.data() : null;
    const existingStatus = existingJobData?.status;

    const leadUpdates: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    const decrementedTrial = false;

    const isNewJob = !existingJobData;
    if (isNewJob) {
      // It's a job creation call
      const isFirstJob = !leadData.hasCreatedJob;
      const newJobCount = (leadData.jobCount || 0) + 1;
      
      leadUpdates.jobCount = newJobCount;
      leadUpdates.hasCreatedJob = true;
      leadUpdates.lastLocalMileJobCreatedAt = new Date().toISOString();
      leadUpdates.localMileNudgeCount = 0;
      leadUpdates.lastLocalMileNudgeSentAt = null;

      if (isFirstJob) {
        leadUpdates.firstJobCreatedAt = new Date().toISOString();
        // Always transition to Trialing LocalMile on first job creation, regardless of previous status
        leadUpdates.status = 'Trialing LocalMile';
        leadUpdates.customerStatus = 'Trialing LocalMile';

        // Move to account_manager bucket
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
        
        // Remove from 'Activated - No First Job' nurture journey if enrolled
        if (leadData.nurtureJourneyId === 'op8xIHH4I70YeL8NRDly') {
          leadUpdates.nurtureStatus = 'completed';
          leadUpdates.nurtureLastActionAt = new Date().toISOString();
        }
      }

    }

    await leadRef.update(leadUpdates);

    // Log activity in the CRM
    const activityRef = db.collection('leads').doc(leadId).collection('activity');
    if (decrementedTrial) {
      await activityRef.add({
        type: 'Update',
        date: new Date().toISOString(),
        notes: `LocalMile Trial decremented for job ${jobId}. Status: ${status}. Remaining trials: ${typeof currentTrials === 'number' ? currentTrials : 'N/A'}`,
        author: 'LocalMile.Plus Webhook'
      });

      // Synchronize trial count to localmile-plus backend
      const localMileApiKey = process.env.LOCALMILE_PLUS_API_KEY || process.env.PROSPECTPLUS_API_KEY;
      if (localMileApiKey && typeof currentTrials === 'number') {
        try {
          console.log(`[LocalMile Webhook] Syncing trial remaining count (${currentTrials}) to localmile-plus for company ${leadId}...`);
          const syncResponse = await fetch(`https://us-central1-localmile-plus.cloudfunctions.net/api/api/v1/companies/${leadId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': localMileApiKey
            },
            body: JSON.stringify({
              trial_credits_balance: currentTrials
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
      } else {
        console.warn('[LocalMile Webhook] Skipping localmile-plus sync: API key or currentTrials is invalid.');
      }
    }

    if (isNewJob) {
      const isFirstJob = !leadData.hasCreatedJob;
      const newJobCount = (leadData.jobCount || 0) + 1;
      if (isFirstJob) {
        await activityRef.add({
          type: 'Update',
          date: new Date().toISOString(),
          notes: `First LocalMile Job created!${leadData.nurtureJourneyId === 'op8xIHH4I70YeL8NRDly' ? ' Removed from Nurture Journey.' : ''} Status transitioned to Trialing LocalMile and moved to Account Manager bucket.`,
          author: 'LocalMile.Plus Webhook'
        });
      } else {
        await activityRef.add({
          type: 'Update',
          date: new Date().toISOString(),
          notes: `LocalMile Job created. Job count: ${newJobCount}.`,
          author: 'LocalMile.Plus Webhook'
        });
      }
    }

    // Save/Update job details in subcollection
    await jobDocRef.set({
      jobId,
      status: status || 'created',
      ...jobDetails,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existingJobData ? {} : { createdAt: FieldValue.serverTimestamp() })
    }, { merge: true });

    return NextResponse.json({ 
      success: true, 
      message: status === 'completed' ? 'Job completion recorded successfully' : 'Job recorded successfully',
      jobId,
      trialsRemaining: currentTrials
    });

  } catch (error: any) {
    console.error('Error processing LocalMile job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
