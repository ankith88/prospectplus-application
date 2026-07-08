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
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return { success: false, message: 'Lead not found.' };
    }

    const leadData = leadSnap.data() || {};
    const currentTrials = typeof leadData.localMileTrialsRemaining === 'number' 
      ? leadData.localMileTrialsRemaining 
      : 5;
    
    const newTrials = currentTrials + 1;

    // 1. Update trials count in ProspectPlus Lead document
    await leadRef.update({
      localMileTrialsRemaining: newTrials,
      updatedAt: new Date().toISOString()
    });

    // 2. Update job status in the localMileJobs subcollection
    const jobDocRef = leadRef.collection('localMileJobs').doc(String(jobId));
    await jobDocRef.set({
      status: 'recredited',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 3. Log activity in CRM
    const activityRef = leadRef.collection('activity');
    await activityRef.add({
      type: 'Update',
      date: new Date().toISOString(),
      notes: `LocalMile Trial recredited (credit restored) for job ${jobId}. Remaining trials: ${newTrials}`,
      author: 'ProspectPlus System'
    });

    // 4. Sync the new count to localmile-plus backend
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
