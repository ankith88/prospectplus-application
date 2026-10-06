/**
 * Server-side helper to synchronize PMPO recurring service changes
 * to LocalMile Plus scheduled_jobs collection.
 */

import { checkLocalMileCompanyExists, getLocalMilePlusDb } from '@/lib/localmile-db';

export async function syncPmpoToLocalMileServer(
  leadId: string,
  leadData: any,
  services: any[],
  effectiveDateStr?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!services || !Array.isArray(services)) {
      return { success: false, message: 'No services array provided' };
    }

    const pmpoService = services.find((s: any) => {
      const sName = String(s.name || s.service || '').toLowerCase();
      return sName.includes('pmpo') || sName.includes('outgoing mail lodgement');
    });

    if (!pmpoService) {
      console.log(`[LocalMile Sync] No PMPO service found for lead ${leadId}. Skipping scheduled_jobs sync.`);
      return { success: true, message: 'No PMPO service present' };
    }

    // Verify company document exists in LocalMile application database (companies collection) before proceeding
    const companyExists = await checkLocalMileCompanyExists(leadId, 3, 1000);
    if (!companyExists) {
      console.warn(`[LocalMile Sync] Company ${leadId} does not exist in LocalMile application database (companies collection). Skipping scheduled_jobs creation.`);
      return { success: false, message: `Company ${leadId} does not exist in LocalMile application database.` };
    }

    const freqRaw = pmpoService.frequency;
    const isAdhoc =
      !freqRaw ||
      (typeof freqRaw === 'string' && freqRaw.trim().toLowerCase() === 'adhoc') ||
      (pmpoService.serviceType && String(pmpoService.serviceType).toLowerCase() === 'adhoc');

    if (isAdhoc) {
      console.log(`[LocalMile Sync] PMPO frequency for lead ${leadId} is Adhoc. No scheduled_jobs will be created.`);
      // If there are existing scheduled jobs in LocalMile Plus for this company, deactivate them since service is Adhoc
      try {
        const { deactivateLocalMileScheduledJobs } = await import('@/services/localmile-scheduled-jobs-service');
        await deactivateLocalMileScheduledJobs(leadId, { reason: 'PMPO service frequency is Adhoc' });
      } catch (deactErr) {
        console.warn(`[LocalMile Sync] Could not clean up scheduled jobs for Adhoc lead ${leadId}:`, deactErr);
      }
      return { success: true, message: 'Adhoc PMPO service does not require scheduled_jobs.' };
    }

    let frequencyArray: string[] = [];
    if (Array.isArray(freqRaw)) {
      frequencyArray = freqRaw.filter(Boolean);
    } else if (typeof freqRaw === 'string') {
      const lower = freqRaw.trim().toLowerCase();
      if (lower === 'daily') {
        frequencyArray = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      } else {
        frequencyArray = freqRaw.split(',').map((f: string) => f.trim()).filter(Boolean);
      }
    }

    if (frequencyArray.length === 0) {
      console.log(`[LocalMile Sync] No recurring days specified for lead ${leadId}. Skipping scheduled_jobs creation.`);
      return { success: true, message: 'No recurring days specified.' };
    }

    const startDateVal = effectiveDateStr || new Date().toISOString().split('T')[0];
    const localMileApiKey = process.env.LOCALMILE_PLUS_API_KEY || process.env.PROSPECTPLUS_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';

    const rawAddress = (typeof leadData?.postalAddress === 'object' ? leadData?.postalAddress?.street : leadData?.postalAddress) ||
      (typeof leadData?.address === 'object' ? leadData?.address?.street : leadData?.address) ||
      (leadData as any)?.street ||
      (leadData as any)?.address1 ||
      '';
    const rawSuburb = (typeof leadData?.postalAddress === 'object' ? leadData?.postalAddress?.city : '') ||
      (typeof leadData?.address === 'object' ? leadData?.address?.city : '') ||
      (leadData as any)?.city ||
      (leadData as any)?.suburb ||
      '';
    const rawState = (typeof leadData?.postalAddress === 'object' ? leadData?.postalAddress?.state : '') ||
      (typeof leadData?.address === 'object' ? leadData?.address?.state : '') ||
      (leadData as any)?.state ||
      'NSW';
    const rawPostcode = (typeof leadData?.postalAddress === 'object' ? (leadData?.postalAddress?.zip || (leadData?.postalAddress as any)?.postcode) : '') ||
      (typeof leadData?.address === 'object' ? (leadData?.address?.zip || (leadData?.address as any)?.postcode) : '') ||
      (leadData as any)?.zip ||
      (leadData as any)?.postcode ||
      '';

    const customerObj = {
      company: leadData?.companyName || leadData?.name || '',
      address: rawAddress === 'undefined' ? '' : rawAddress,
      suburb: rawSuburb === 'undefined' ? '' : rawSuburb,
      state: rawState === 'undefined' ? 'NSW' : rawState,
      postcode: rawPostcode === 'undefined' ? '' : rawPostcode,
      email: leadData?.customerServiceEmail || leadData?.email || '',
      phone: leadData?.customerPhone || leadData?.phone || ''
    };

    const schedPayload = {
      parentId: '',
      parent_id: '',
      startDate: startDateVal,
      date: startDateVal,
      frequency: frequencyArray,
      service: 'site-to-australia post',
      userRole: 'customer',
      accountManagerName: leadData?.accountManagerAssigned || leadData?.salesRepAssigned || '',
      customer: customerObj,
      recipient: {
        company: 'Australia Post',
        address: customerObj.address || '',
        suburb: customerObj.suburb || '',
        state: customerObj.state || 'NSW',
        postcode: customerObj.postcode || '',
        firstName: 'Australia',
        lastName: 'Post',
        phone: '13 13 18',
        email: 'no-reply@auspost.com.au'
      },
      auspostContact: {
        firstName: 'Australia',
        lastName: 'Post',
        phone: '13 13 18',
        email: 'no-reply@auspost.com.au'
      }
    };

    console.log(`[LocalMile Sync] Updating PMPO scheduled_job for lead ${leadId} (Date: ${startDateVal}, Freq: ${frequencyArray.join(',')})...`);

    const response = await fetch(`https://us-central1-localmile-plus.cloudfunctions.net/api/api/v1/companies/${leadId}/scheduled-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': localMileApiKey
      },
      body: JSON.stringify(schedPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[LocalMile Sync Error] Failed to update scheduled_jobs for ${leadId}: ${response.status} ${errText}`);
      return { success: false, message: errText };
    }

    const resData = await response.json();
    console.log(`[LocalMile Sync Success] Successfully synced scheduled_job for lead ${leadId}:`, resData);

    // Enforce empty parent_id on the scheduled_jobs document (do not store franchisee ID under parent_id)
    const createdJobId = resData?.data?.id || resData?.id;
    if (createdJobId) {
      try {
        const db = getLocalMilePlusDb();
        await db.collection('scheduled_jobs').doc(String(createdJobId)).update({ parent_id: '' });
        console.log(`[LocalMile Sync] Ensured parent_id is empty for scheduled_job ${createdJobId}`);
      } catch (dbErr) {
        console.warn(`[LocalMile Sync] Could not enforce empty parent_id directly on scheduled_job ${createdJobId}:`, dbErr);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`[LocalMile Sync Exception] Error syncing scheduled_job for lead ${leadId}:`, error);
    return { success: false, message: error.message || String(error) };
  }
}
