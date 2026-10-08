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
    const compRef = db.collection('companies').doc(String(leadId));

    const [leadSnap, compSnap] = await Promise.all([
      leadRef.get(),
      compRef.get()
    ]);

    if (!leadSnap.exists && !compSnap.exists) {
      return NextResponse.json({ error: 'Lead or company not found' }, { status: 404 });
    }

    const leadData = leadSnap.exists ? leadSnap.data()! : compSnap.data()!;

    // 1. Save/Update job details in localMileJobs subcollection across leads and companies
    const jobPayload = {
      jobId: String(jobId),
      status: status || 'created',
      ...jobDetails,
      updatedAt: FieldValue.serverTimestamp(),
    };

    let existingJobData = null;
    const savePromises: Promise<any>[] = [];

    if (leadSnap.exists) {
      const jobDocRef = leadRef.collection('localMileJobs').doc(String(jobId));
      const jobSnap = await jobDocRef.get();
      if (jobSnap.exists) existingJobData = jobSnap.data();
      savePromises.push(jobDocRef.set({
        ...jobPayload,
        ...(existingJobData ? {} : { createdAt: FieldValue.serverTimestamp() })
      }, { merge: true }));
    }

    if (compSnap.exists) {
      const compJobDocRef = compRef.collection('localMileJobs').doc(String(jobId));
      const compJobSnap = await compJobDocRef.get();
      if (compJobSnap.exists && !existingJobData) existingJobData = compJobSnap.data();
      savePromises.push(compJobDocRef.set({
        ...jobPayload,
        ...(existingJobData ? {} : { createdAt: FieldValue.serverTimestamp() })
      }, { merge: true }));
    }

    await Promise.all(savePromises);

    // 2. Fetch all jobs across both subcollections to calculate accurate jobCount and localMileTrialsRemaining
    const [leadJobsSnap, compJobsSnap] = await Promise.all([
      leadSnap.exists ? leadRef.collection('localMileJobs').get() : { docs: [] },
      compSnap.exists ? compRef.collection('localMileJobs').get() : { docs: [] }
    ]);

    const jobsMap = new Map<string, any>();
    leadJobsSnap.docs.forEach((d: any) => jobsMap.set(d.id, d.data()));
    compJobsSnap.docs.forEach((d: any) => jobsMap.set(d.id, { ...(jobsMap.get(d.id) || {}), ...d.data() }));

    const allJobsList = Array.from(jobsMap.values());
    const totalJobCount = allJobsList.length;
    const activeTrialJobsCount = allJobsList.filter(d => {
      const st = d?.status;
      return st !== 'recredited' && st !== 'cancelled';
    }).length;

    const computedTrialsRemaining = Math.max(0, 5 - activeTrialJobsCount);
    const isFirstJob = !leadData.hasCreatedJob && totalJobCount > 0;
    const isAlreadySignedOrWon = 
      leadData.status === 'Won' ||
      leadData.status === 'Signed' ||
      leadData.customerStatus === 'Signed' ||
      leadData.customerStatus === 'Won' ||
      leadData.customerStatus === 'Signed Up' ||
      leadData.customerStatus === 'Active Customer' ||
      leadData.customerStatus === 'Customer' ||
      Boolean(leadData.signedUpAt) ||
      Boolean(leadData.isConverted) ||
      compSnap.exists;

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
      if (!isAlreadySignedOrWon) {
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
    }

    const docUpdatesPromises: Promise<any>[] = [];
    if (leadSnap.exists) {
      docUpdatesPromises.push(leadRef.update(leadUpdates));
    }
    if (compSnap.exists) {
      docUpdatesPromises.push(compRef.update(leadUpdates));
    }
    await Promise.all(docUpdatesPromises);

    // 3. Log activity in CRM
    const actPromises: Promise<any>[] = [];
    if (!existingJobData) {
      const actNote = isFirstJob
        ? (isAlreadySignedOrWon
            ? `First LocalMile Job created (Ref: ${jobId}). Trials remaining: ${computedTrialsRemaining}.`
            : `First LocalMile Job created (Ref: ${jobId}). Status transitioned to Trialing LocalMile. Trials remaining: ${computedTrialsRemaining}.`)
        : `LocalMile Job created (Ref: ${jobId}). Total jobs: ${totalJobCount}. Trials remaining: ${computedTrialsRemaining}.`;

      const actData = {
        type: 'Update',
        date: new Date().toISOString(),
        notes: actNote,
        author: 'LocalMile.Plus Webhook'
      };

      if (leadSnap.exists) {
        actPromises.push(leadRef.collection('activity').add(actData));
      }
      if (compSnap.exists) {
        actPromises.push(compRef.collection('activity').add(actData));
      }
    }
    await Promise.all(actPromises);

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
      trialsRemaining: computedTrialsRemaining,
      isFirstJob,
      hasCreatedJob: totalJobCount > 0
    });

  } catch (error: any) {
    console.error('Error processing LocalMile job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
