
'use server'

import type { DiscoveryData, Lead, Contact, Note } from "@/lib/types";

/**
 * @fileOverview A mock service for interacting with a NetSuite API.
 */

/**
 * Sends lead data to a mock NetSuite API endpoint for LPO referral.
 * In a real application, this would make an HTTP request to the actual NetSuite API.
 * 
 * @param lead The lead object to send to NetSuite.
 * @returns A promise that resolves when the data has been "sent".
 */
export async function sendToNetSuite(lead: Lead): Promise<{ success: boolean; message: string }> {
  console.log(`[Mock NetSuite API] Received request to send lead ${lead.id} (${lead.companyName}) to NetSuite for LPO.`);
  
  // In a real implementation, you would construct the request body and headers here.
  
  const requestBody = {
    leadId: lead.id,
    companyName: lead.companyName,
    status: "LPO Review",
    // Add any other relevant lead details here
  };
  
  console.log('[Mock NetSuite API] Sending data for LPO:', JSON.stringify(requestBody, null, 2));
  
  // Simulate an API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`[Mock NetSuite API] Successfully sent lead ${lead.id} to NetSuite for LPO.`);
  
  return { success: true, message: `Lead ${lead.id} sent to NetSuite.` };
}

interface NetSuiteOutcomePayload {
    leadId: string;
    outcome: string;
    reason: string;
    dialerAssigned: string;
    notes: string;
    salesRecordInternalId: string;
}

/**
 * Sends a specific call outcome to a NetSuite scriptlet.
 * @param payload The data to send to the NetSuite scriptlet.
 * @returns A promise that resolves with the result of the API call.
 */
export async function sendToNetSuiteForOutcome(payload: NetSuiteOutcomePayload): Promise<{ success: boolean; message: string }> {
    const { leadId, outcome, reason, dialerAssigned, notes, salesRecordInternalId } = payload;
    
    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2156",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQrXaUiyrcK7JhiN0lUSv9b2uOL2FluSjbC6Z3EMXV3Qs",
        leadID: leadId,
        outcome: outcome,
        reason: reason,
        dialerAssigned: dialerAssigned,
        notes: notes,
    });

    if (salesRecordInternalId) {
        params.append('salesrecordid', salesRecordInternalId);
    }

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite API] Sending outcome for lead ${leadId} to NetSuite...`);
    console.log(`[NetSuite API] URL: ${url}`);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`NetSuite API request failed with status ${response.status}: ${errorBody}`);
        }

        const responseBody = await response.text();
        console.log(`[NetSuite API] Successfully sent outcome for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: `Outcome for lead ${leadId} sent to NetSuite.` };

    } catch (error) {
        console.error("[NetSuite API] Error sending outcome:", error);
        throw error;
    }
}

interface NetSuiteDiscoveryPayload {
    leadId: string;
    discoveryData: DiscoveryData;
}

/**
 * Sends discovery questions data to a NetSuite scriptlet.
 * @param payload The discovery data to send.
 * @returns A promise that resolves with the result of the API call.
 */
export async function sendDiscoveryDataToNetSuite(payload: NetSuiteDiscoveryPayload): Promise<{ success: boolean, message: string }> {
    console.log('[NetSuite Service] Server action received. Payload:', payload);
    const { leadId, discoveryData } = payload;
    
    if (!leadId || !discoveryData) {
        const errorMsg = 'Invalid payload: leadId and discoveryData are required.';
        console.error(`[NetSuite Service Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";

    const params = new URLSearchParams({
        script: "2161",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQrXaUiyrcK7JhiN0lUSv9b2uOL2FluSjbC6Z3EMXV3Qs",
        leadID: leadId,
    });

    // Flatten the discoveryData object into query parameters
    for (const [key, value] of Object.entries(discoveryData)) {
        if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    params.append(key, value.join(','));
                }
            } else {
                params.append(key, value.toString());
            }
        }
    }

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite Service] Sending discovery data for lead ${leadId} to NetSuite...`);
    console.log(`[NetSuite Service] Final Request URL being called: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Service Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. Full error: ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite Service] Successfully sent discovery data for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: 'Discovery data sent to NetSuite.' };
    } catch (error: any) {
        console.error("[NetSuite Service] A fatal error occurred during fetch:", error);
        console.error(`[NetSuite Service] Failed URL: ${url}`);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}


interface NetSuiteContactPayload {
    leadId: string;
    contact: Contact;
}

/**
 * Sends contact data to a NetSuite scriptlet.
 * @param payload The contact data to send.
 * @returns A promise that resolves with the result of the API call.
 */
export async function sendContactToNetSuite(payload: NetSuiteContactPayload): Promise<{ success: boolean, message: string }> {
    const { leadId, contact } = payload;
    
    if (!leadId || !contact) {
        const errorMsg = 'Invalid payload: leadId and contact are required.';
        console.error(`[NetSuite Contact Service Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";

    const params = new URLSearchParams({
        script: "2162",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQiABijVECkP4VMN5S4EQRn4vSKQ0EnMiG99-nTlSJ1ck",
        leadID: leadId,
        contactid: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        title: contact.title,
    });

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite Contact Service] Sending contact data for lead ${leadId} to NetSuite...`);
    console.log(`[NetSuite Contact Service] Final Request URL being called: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Contact Service Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. Full error: ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite Contact Service] Successfully sent contact data for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: 'Contact data sent to NetSuite.' };
    } catch (error: any) {
        console.error("[NetSuite Contact Service] A fatal error occurred during fetch:", error);
        console.error(`[NetSuite Contact Service] Failed URL: ${url}`);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}

interface NetSuiteNotePayload {
    leadId: string;
    noteId: string;
    author: string;
    content: string;
}

/**
 * Sends note data to a NetSuite scriptlet.
 * @param payload The note data to send.
 * @returns A promise that resolves with the result of the API call.
 */
export async function sendNoteToNetSuite(payload: NetSuiteNotePayload): Promise<{ success: boolean, message: string }> {
    const { leadId, noteId, author, content } = payload;
    
    if (!leadId || !noteId || !author || !content) {
        const errorMsg = 'Invalid payload: leadId, noteId, author, and content are required.';
        console.error(`[NetSuite Note Service Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";

    const params = new URLSearchParams({
        script: "2163",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQv82BUnS0O7ggE-shiuIVD0iRQJbU_RdY_87W2N0W3lw",
        leadID: leadId,
        noteID: noteId,
        author,
        content,
    });

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite Note Service] Sending note ${noteId} for lead ${leadId} to NetSuite...`);
    console.log(`[NetSuite Note Service] Final Request URL being called: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Note Service Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. Full error: ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite Note Service] Successfully sent note for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: 'Note sent to NetSuite.' };
    } catch (error: any) {
        console.error("[NetSuite Note Service] A fatal error occurred during fetch:", error);
        console.error(`[NetSuite Note Service] Failed URL: ${url}`);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
