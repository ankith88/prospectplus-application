
'use server';

/**
 * @fileoverview Server action to proxy Customer Signup requests to NetSuite.
 */

interface ServiceSelection {
    service: 'Outgoing Mail Lodgement' | 'Express Banking';
    frequency: string[] | 'Adhoc';
    rate: number;
}

interface InitiateSignupPayload {
  leadId: string;
  services: ServiceSelection[];
  startDate: string; // YYYY-MM-DD
}

interface NetSuiteResponse {
  success: boolean;
  message: string;
}

export async function initiateSignup(payload: InitiateSignupPayload): Promise<NetSuiteResponse> {
    const { leadId, services, startDate } = payload;
    
    if (!leadId || !services || services.length === 0 || !startDate) {
        const errorMsg = 'Invalid payload: leadId, services, and startDate are required.';
        console.error(`[Signup Proxy Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2308",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQmZjCd9FN1j8hKHfB5G8oo7XgkVNbvEENnIkQiY45tMI",
        leadId: leadId,
        startDate: startDate,
    });
    
    services.forEach((s, index) => {
        params.append(`service_${index + 1}`, s.service);
        params.append(`frequency_${index + 1}`, Array.isArray(s.frequency) ? s.frequency.join(',') : s.frequency);
        params.append(`rate_${index + 1}`, s.rate.toString());
    });

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[Signup Proxy] Sending signup request for lead ${leadId} to NetSuite...`);
    console.log(`[Signup Proxy] URL: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Signup Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        const responseBody = await response.json();
        console.log(`[Signup Proxy] Successfully received response for lead ${leadId}. Response:`, responseBody);
        
        return responseBody as NetSuiteResponse;

    } catch (error: any) {
        console.error("[Signup Proxy] A fatal error occurred during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
