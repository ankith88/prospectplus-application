

'use server';

/**
 * @fileoverview Server action to proxy LocalMile free trial requests to NetSuite.
 */

interface InitiateLocalMileTrialPayload {
  leadId: string;
}

interface NetSuiteResponse {
  success: boolean;
  leadID?: string;
  message: string;
  result?: string;
}

export async function initiateMPProductsTrial(payload: InitiateLocalMileTrialPayload): Promise<NetSuiteResponse> {
    const { leadId } = payload;
    
    if (!leadId) {
        const errorMsg = 'Invalid payload: leadId is required.';
        console.error(`[MP Products Proxy Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2305",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQGhcXcO8gwnMwT4vWb1ED9y9xolecXh_KeGO0Kgg9u5c",
        leadId: leadId,
    });
    
    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[MP Products Proxy] Sending request for lead ${leadId} to NetSuite...`);
    console.log(`[MP Products Proxy] URL: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[MP Products Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        const responseBody = await response.json();
        console.log(`[MP Products Proxy] Successfully received response for lead ${leadId}. Response:`, responseBody);
        
        return responseBody as NetSuiteResponse;

    } catch (error: any) {
        console.error("[MP Products Proxy] A fatal error occurred during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}


export async function initiateLocalMileTrial(payload: InitiateLocalMileTrialPayload): Promise<NetSuiteResponse> {
    const { leadId } = payload;
    
    if (!leadId) {
        const errorMsg = 'Invalid payload: leadId is required.';
        console.error(`[LocalMile Proxy Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2304",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQPtx-RkoehGdU54hU1SkptG6L_wpHYmV3FO0CiK9SmdQ",
        leadId: leadId,
    });
    
    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[LocalMile Proxy] Sending request for lead ${leadId} to NetSuite...`);
    console.log(`[LocalMile Proxy] URL: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            if (response.status === 500) {
                 console.error(`[LocalMile Proxy Error] Status: 500, URL: ${url}`);
                 return { success: false, message: "Did not Sync with NetSuite" };
            }
            const errorBody = await response.text();
            console.error(`[LocalMile Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        const responseBody = await response.json();
        console.log(`[LocalMile Proxy] Successfully received response for lead ${leadId}. Response:`, responseBody);
        
        return responseBody as NetSuiteResponse;

    } catch (error: any) {
        console.error("[LocalMile Proxy] A fatal error occurred during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
