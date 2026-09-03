/**
 * Server-side helper to synchronize PMPO recurring service changes
 * to LocalMile Plus scheduled_jobs collection.
 */

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

    const freqRaw = pmpoService.frequency;
    let frequencyArray: string[] = [];
    if (Array.isArray(freqRaw)) {
      frequencyArray = freqRaw;
    } else if (typeof freqRaw === 'string' && freqRaw.toLowerCase() !== 'adhoc') {
      frequencyArray = freqRaw.split(',').map((f: string) => f.trim()).filter(Boolean);
    } else {
      frequencyArray = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    }

    const startDateVal = effectiveDateStr || new Date().toISOString().split('T')[0];
    const localMileApiKey = process.env.LOCALMILE_PLUS_API_KEY || process.env.PROSPECTPLUS_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';

    const customerObj = {
      company: leadData?.companyName || leadData?.name || '',
      address: (leadData as any)?.address1 || (leadData as any)?.street || (typeof leadData?.address === 'object' ? leadData?.address?.street : leadData?.address) || '',
      suburb: (leadData as any)?.city || (typeof leadData?.address === 'object' ? leadData?.address?.city : '') || '',
      state: (leadData as any)?.state || (typeof leadData?.address === 'object' ? leadData?.address?.state : '') || 'NSW',
      postcode: (leadData as any)?.zip || (typeof leadData?.address === 'object' ? leadData?.address?.zip : '') || '',
      email: leadData?.customerServiceEmail || leadData?.email || '',
      phone: leadData?.customerPhone || leadData?.phone || ''
    };

    const schedPayload = {
      parentId: '',
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
    return { success: true };
  } catch (error: any) {
    console.error(`[LocalMile Sync Exception] Error syncing scheduled_job for lead ${leadId}:`, error);
    return { success: false, message: error.message || String(error) };
  }
}
