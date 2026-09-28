'use server';

import { adminDb } from '@/services/firebase-server';

interface RecreditResponse {
  success: boolean;
  message?: string;
  newTrials?: number;
}

export async function recreditLocalMileTrial(leadId: string, jobId: string): Promise<RecreditResponse> {
  if (!leadId || !jobId) {
    return { success: false, message: 'leadId and jobId are required.' };
  }

  try {
    const leadRef = adminDb.collection('leads').doc(leadId);
    const companyRef = adminDb.collection('companies').doc(leadId);

    const [leadSnap, companySnap] = await Promise.all([
      leadRef.get(),
      companyRef.get()
    ]);

    if (!leadSnap.exists && !companySnap.exists) {
      return { success: false, message: 'Record not found in leads or companies.' };
    }

    // 1. Update job status in the localMileJobs subcollection across both leads and companies
    const updatePromises: Promise<any>[] = [];
    if (leadSnap.exists) {
      updatePromises.push(leadRef.collection('localMileJobs').doc(String(jobId)).set({
        status: 'recredited',
        updatedAt: new Date().toISOString()
      }, { merge: true }));
    }
    if (companySnap.exists) {
      updatePromises.push(companyRef.collection('localMileJobs').doc(String(jobId)).set({
        status: 'recredited',
        updatedAt: new Date().toISOString()
      }, { merge: true }));
    }
    await Promise.all(updatePromises);

    // 2. Query all jobs in localMileJobs from both subcollections to calculate exact active trial count
    const [leadsJobsSnap, companiesJobsSnap] = await Promise.all([
      leadSnap.exists ? leadRef.collection('localMileJobs').get() : { docs: [] },
      companySnap.exists ? companyRef.collection('localMileJobs').get() : { docs: [] }
    ]);

    const jobMap = new Map<string, any>();
    leadsJobsSnap.docs.forEach((d: any) => jobMap.set(d.id, d.data()));
    companiesJobsSnap.docs.forEach((d: any) => jobMap.set(d.id, { ...(jobMap.get(d.id) || {}), ...d.data() }));

    const allJobs = Array.from(jobMap.values());
    const totalJobCount = allJobs.length;
    const activeTrialJobsCount = allJobs.filter(d => {
      const st = d?.status;
      return st !== 'recredited' && st !== 'cancelled';
    }).length;

    const newTrials = Math.max(0, 5 - activeTrialJobsCount);

    // 3. Update trials count & job count in ProspectPlus document(s)
    const docUpdates = {
      jobCount: totalJobCount,
      localMileTrialsRemaining: newTrials,
      updatedAt: new Date().toISOString()
    };

    const parentUpdates: Promise<any>[] = [];
    if (leadSnap.exists) {
      parentUpdates.push(leadRef.update(docUpdates));
    }
    if (companySnap.exists) {
      parentUpdates.push(companyRef.update(docUpdates));
    }
    await Promise.all(parentUpdates);

    // 4. Log activity in CRM
    const actPromises: Promise<any>[] = [];
    const actData = {
      type: 'Update',
      date: new Date().toISOString(),
      notes: `LocalMile Trial recredited for job ${jobId}. Remaining trials: ${newTrials}`,
      author: 'ProspectPlus System'
    };
    if (leadSnap.exists) {
      actPromises.push(leadRef.collection('activity').add(actData));
    }
    if (companySnap.exists) {
      actPromises.push(companyRef.collection('activity').add(actData));
    }
    await Promise.all(actPromises);

    // 5. Sync the new count to localmile-plus backend
    const localMileApiKey = process.env.LOCALMILE_PLUS_API_KEY || process.env.PROSPECTPLUS_API_KEY || process.env.EXTERNAL_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';
    try {
      console.log(`[LocalMile Recredit] Syncing updated trial remaining count (${newTrials}) to localmile-plus for company ${leadId}...`);
      const syncResponse = await fetch(`https://us-central1-localmile-plus.cloudfunctions.net/api/api/v1/companies/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': localMileApiKey
        },
        body: JSON.stringify({
          trial_credits_balance: newTrials
        })
      });
      if (!syncResponse.ok) {
        console.error(`[LocalMile Recredit] Failed to sync trial balance to localmile-plus: Status ${syncResponse.status}, Error: ${await syncResponse.text()}`);
      } else {
        console.log(`[LocalMile Recredit] Successfully synced trial balance to localmile-plus.`);
      }
    } catch (syncError) {
      console.error('[LocalMile Recredit] Error calling localmile-plus sync API:', syncError);
    }

    return { success: true, newTrials };
  } catch (error: any) {
    console.error('Error recrediting trial:', error);
    return { success: false, message: error.message || 'Internal Server Error' };
  }
}
