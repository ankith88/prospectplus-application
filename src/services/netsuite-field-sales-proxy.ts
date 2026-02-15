
'use server';

interface FieldSalesOutcomePayload {
  leadId: string;
  outcome: "Send Quote/Free Trial" | "Sign Up";
  linkedSalesRep: string;
}

interface NetSuiteResponse {
  success: boolean;
  message: string;
}

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

    console.log(`[Field Sales Proxy] Sending outcome for lead ${leadId} to NetSuite...`);
    console.log(`[Field Sales Proxy] URL: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Field Sales Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        // NetSuite scriptlet might not return a JSON body on success.
        // We'll optimistically assume success if the request was OK.
        console.log(`[Field Sales Proxy] Successfully sent request for lead ${leadId}.`);
        return { success: true, message: 'Request sent to NetSuite.' };

    } catch (error: any) {
        console.error("[Field Sales Proxy] A fatal error occurred during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
