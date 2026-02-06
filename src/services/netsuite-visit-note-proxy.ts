
'use server';

interface VisitNotePayload {
  capturedBy: string;
  outcome: string;
  companyName: string;
  discoveryAnswers: string;
}

interface NetSuiteResponse {
  success: boolean;
  message: string;
}

export async function sendVisitNoteToNetSuite(payload: VisitNotePayload): Promise<NetSuiteResponse> {
    const { capturedBy, outcome, companyName, discoveryAnswers } = payload;

    if (!capturedBy || !outcome || !companyName) {
        return { success: false, message: 'Missing required fields for NetSuite sync.' };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2413",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQK8u56Yfz3hNds2mmrb8a8jPUIwnuq-0CGJEHr1ygdt8",
        capturedBy,
        outcome,
        companyName,
        discoveryAnswers: discoveryAnswers || 'No discovery data provided.',
    });
    
    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[Visit Note Proxy] Sending request to NetSuite for: ${companyName}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Visit Note Proxy Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}.` };
        }

        const responseText = await response.text();
        console.log(`[Visit Note Proxy] Successfully received response for ${companyName}. Response:`, responseText);
        
        if (responseText.trim() === '1' || responseText.toLowerCase().includes('success')) {
             return { success: true, message: 'Sync successful.' };
        }
        
        try {
            const responseJson = JSON.parse(responseText);
            return responseJson as NetSuiteResponse;
        } catch (e) {
             console.warn(`[Visit Note Proxy] NetSuite response was not standard JSON. Body: ${responseText}`);
             return { success: true, message: `Sync initiated. Raw response: ${responseText}` };
        }

    } catch (error: any) {
        console.error("[Visit Note Proxy] A fatal error occurred during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
