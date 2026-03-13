'use server';

/**
 * @fileoverview Server action to proxy Field Sales outcomes to NetSuite.
 */

interface FieldSalesOutcomePayload {
  leadId: string;
  outcome: string;
  linkedSalesRep: string;
}

interface NetSuiteResponse {
  success: boolean;
  message: string;
}

/**
 * Sends a processed field lead outcome to NetSuite.
 * @param payload The outcome details to transmit.
 */
export async function sendFieldSalesOutcomeToNetSuite(payload: FieldSalesOutcomePayload): Promise<NetSuiteResponse> {
    const { leadId, outcome, linkedSalesRep } = payload;
    
    if (!leadId || !outcome || !linkedSalesRep) {
        const errorMsg = 'Invalid payload: leadId, outcome, and linkedSalesRep are required.';
        console.error(`[Field Sales Proxy Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2514",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQJhlGIUNNmxKFwd5sprCqoBuWrh_H7J14_qzpLd1ajvg",
        leadId: leadId,
        outcome: outcome,
        salesRep: linkedSalesRep,
    });
    
    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[Field Sales Proxy] Sending outcome "${outcome}" for lead ${leadId} to NetSuite...`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Field Sales Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        console.log(`[Field Sales Proxy] Successfully sent request for lead ${leadId}.`);
        return { success: true, message: 'Outcome successfully synced with NetSuite.' };

    } catch (error: any) {
        console.error("[Field Sales Proxy] Fatal error during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
