
'use server';

/**
 * @fileoverview Server action to proxy Services free trial requests to NetSuite.
 */

interface ServiceTrialPayload {
  leadId: string;
  services: {
    service: string;
    frequency: string[] | 'Adhoc';
    rate: number;
  }[];
  trialPeriod: string[]; // Array of 'DD/MM/YYYY' strings
  accountManagerName?: string;
}

interface NetSuiteResponse {
  success: boolean;
  message: string;
  commRegId?: string;
  dynamicScfUrl?: string;
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

    if (payload.accountManagerName) {
        params.append('accountManagerName', payload.accountManagerName);
    }
    
    services.forEach((s, index) => {
        params.append(`service_${index + 1}`, s.service);
        params.append(`frequency_${index + 1}`, Array.isArray(s.frequency) ? s.frequency.join(',') : s.frequency);
        params.append(`rate_${index + 1}`, s.rate.toString());
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

export interface QuoteServicePayload {
  operation?: "quoteCustomer" | "signCustomer";
  customerId: string;
  contactId: string;
  salesRecordId: string;
  salesRepId: string;
  commDate: string;
  services: {
    id: string;
    name: string;
    price: string;
    freq: string;
  }[];
  accountManagerName?: string;
}

export async function submitServiceQuote(payload: QuoteServicePayload): Promise<NetSuiteResponse> {
    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1900&deploy=2&compid=1048144&ns-at=AAEJ7tMQubKtieJuj6WwyGZO8oUmYeVsGjJVKqWKrTXbBqMNWuc";
    
    const { operation = "quoteCustomer", ...restPayload } = payload;
    
    const requestData = {
        operation: operation,
        requestParams: {
            ...restPayload,
            dateArray: []
        }
    };
    
    let url = `${baseUrl}&requestData=${encodeURIComponent(JSON.stringify(requestData))}`;
    if (payload.accountManagerName) {
        url += `&accountManagerName=${encodeURIComponent(payload.accountManagerName)}`;
    }
    
    console.log(`[Submit ${operation} Proxy] Sending request for customer ${restPayload.customerId} to NetSuite...`);
    console.log(`[Submit ${operation} Proxy] Payload:`, requestData);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Submit Quote Proxy Error] Status: ${response.status}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        const responseBody = await response.json();
        console.log(`[Submit ${operation} Proxy] Successfully received response:`, responseBody);
        
        return { 
            success: true, 
            message: 'Quote submitted successfully.',
            commRegId: responseBody.commRegId,
            dynamicScfUrl: responseBody.dynamicScfUrl
        };
    } catch (error: any) {
        console.error("[Submit Quote Proxy] A fatal error occurred during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
