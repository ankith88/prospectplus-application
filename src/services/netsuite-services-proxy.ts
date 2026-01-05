
'use server';

/**
 * @fileoverview Server action to proxy Services free trial requests to NetSuite.
 */

interface ServiceTrialPayload {
  leadId: string;
  services: {
    service: 'Outgoing Mail Lodgement' | 'Express Banking';
    frequency: string[] | 'Adhoc';
  }[];
  trialPeriod: string[]; // Array of 'DD/MM/YYYY' strings
}

interface NetSuiteResponse {
  success: boolean;
  message: string;
}

export async function initiateServicesTrial(payload: ServiceTrialPayload): Promise<NetSuiteResponse> {
    const { leadId, services, trialPeriod } = payload;
    
    if (!leadId || !services || services.length === 0 || !trialPeriod || trialPeriod.length === 0) {
        const errorMsg = 'Invalid payload: leadId, services, and trialPeriod are required.';
        console.error(`[Services Trial Proxy Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2306",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQvFqILU5xNSJOhmHaWbX9Nmn6KtyJWAhcM3YnOru5ggU",
        leadId: leadId,
    });
    
    services.forEach((s, index) => {
        params.append(`service_${index + 1}`, s.service);
        params.append(`frequency_${index + 1}`, Array.isArray(s.frequency) ? s.frequency.join(',') : s.frequency);
    });

    params.append('trialPeriod', JSON.stringify(trialPeriod));

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[Services Trial Proxy] Sending request for lead ${leadId} to NetSuite...`);
    console.log(`[Services Trial Proxy] URL: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Services Trial Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        const responseBody = await response.json();
        console.log(`[Services Trial Proxy] Successfully received response for lead ${leadId}. Response:`, responseBody);
        
        return responseBody as NetSuiteResponse;

    } catch (error: any) {
        console.error("[Services Trial Proxy] A fatal error occurred during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
