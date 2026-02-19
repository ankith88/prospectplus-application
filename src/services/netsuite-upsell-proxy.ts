'use server';

/**
 * @fileoverview Server action to proxy Upsell notifications to NetSuite.
 */

interface UpsellPayload {
  leadId: string;
}

interface NetSuiteResponse {
  success: boolean;
  message: string;
}

/**
 * Calls the NetSuite Upsell scriptlet with the provided leadId.
 * @param payload The payload containing the leadId (customer ID).
 * @returns A promise resolving to the API call result.
 */
export async function sendUpsellToNetSuite(payload: UpsellPayload): Promise<NetSuiteResponse> {
    const { leadId } = payload;
    
    if (!leadId) {
        const errorMsg = 'Invalid payload: leadId is required.';
        console.error(`[Upsell Proxy Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2515",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQJXuVOabq_AMsOif5cbeVcJpldzCqTnbRjZjUM8DtnMo",
        leadId: leadId,
    });
    
    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[Upsell Proxy] Notifying NetSuite of upsell for lead/customer ${leadId}...`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Upsell Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        console.log(`[Upsell Proxy] Successfully notified NetSuite for lead ${leadId}.`);
        return { success: true, message: 'Upsell successfully synced with NetSuite.' };

    } catch (error: any) {
        console.error("[Upsell Proxy] A fatal error occurred during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
