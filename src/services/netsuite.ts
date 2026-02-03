

'use server'

import type { DiscoveryData, Lead, Contact, Note, Activity, Address } from "@/lib/types";
import fetch from 'node-fetch';
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';

const TIMEOUT_DURATION = 20000; // 20 seconds for all requests

class AbortError extends Error {
    constructor(message = 'The request was aborted.') {
        super(message);
        this.name = 'AbortError';
    }
}


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
    let params: URLSearchParams;
    
    if (dialerAssigned === 'Lachlan Ball') {
        params = new URLSearchParams({
            script: "2156",
            deploy: "2",
            compid: "1048144",
            "ns-at": "AAEJ7tMQnNZU_8ydzRGGa5ahHvXzSQtFIXRXuSENy7Y5LfPM2sc",
            leadID: leadId,
            outcome: outcome,
            reason: reason,
            dialerAssigned: dialerAssigned,
            notes: notes,
        });
    } else if (dialerAssigned === 'Lalaine Revilla') {
        params = new URLSearchParams({
            script: "2156",
            deploy: "3",
            compid: "1048144",
            "ns-at": "AAEJ7tMQtjnGS0_7N6bf6_oVhlxLQscg10d91PP0UkV_be_flEM",
            leadID: leadId,
            outcome: outcome,
            reason: reason,
            dialerAssigned: dialerAssigned,
            notes: notes,
        });
    } else if (dialerAssigned === 'Elmarez Guerrero') {
        params = new URLSearchParams({
            script: "2156",
            deploy: "4",
            compid: "1048144",
            "ns-at": "AAEJ7tMQGegW2NQZA9xEft6BpUWOFwrRkxCBqe05kNbxzzveErU",
            leadID: leadId,
            outcome: outcome,
            reason: reason,
            dialerAssigned: dialerAssigned,
            notes: notes,
        });
    } else {
        params = new URLSearchParams({
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
    }

    if (salesRecordInternalId) {
        params.append('salesrecordid', salesRecordInternalId);
    }

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite API] Sending outcome for lead ${leadId} to NetSuite...`);
    console.log(`[NetSuite API] URL: ${url}`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, TIMEOUT_DURATION);

        const response = await fetch(url, { signal: controller.signal as any });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`NetSuite API request failed with status ${response.status}: ${errorBody}`);
        }

        const responseBody = await response.text();
        console.log(`[NetSuite API] Successfully sent outcome for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: `Outcome for lead ${leadId} sent to NetSuite.` };

    } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error(`[NetSuite API] Request for lead outcome ${leadId} timed out.`);
          return { success: false, message: 'The request to NetSuite timed out.' };
        }
        console.error("[NetSuite API] Error sending outcome:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
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
        "ns-at": "AAEJ7tMQ0npCZCvJuVUBGGvoJjWTgPUWIKy4vZfFXJJ2pOutWQo",
        leadID: leadId,
    });

    // Flatten the discoveryData object into query parameters
    for (const [key, value] of Object.entries(discoveryData)) {
        if (value) {
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
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, TIMEOUT_DURATION);

        const response = await fetch(url, { method: 'GET', signal: controller.signal as any });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Service Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. Full error: ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite Service] Successfully sent discovery data for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: 'Discovery data sent to NetSuite.' };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`[NetSuite Service] Request for discovery data on lead ${leadId} timed out.`);
            return { success: false, message: 'The request to NetSuite timed out.' };
        }
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

    const nameParts = contact.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ');

    const params = new URLSearchParams({
        script: "2162",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQiABijVECkP4VMN5S4EQRn4vSKQ0EnMiG99-nTlSJ1ck",
        leadID: leadId,
        contactid: contact.id,
        firstname: firstName,
        lastname: lastName,
        email: contact.email,
        phone: contact.phone,
        title: contact.title,
    });

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite Contact Service] Sending contact data for lead ${leadId} to NetSuite...`);
    console.log(`[NetSuite Contact Service] Final Request URL being called: ${url}`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, TIMEOUT_DURATION);

        const response = await fetch(url, { method: 'GET', signal: controller.signal as any });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Contact Service Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. Full error: ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite Contact Service] Successfully sent contact data for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: 'Contact data sent to NetSuite.' };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`[NetSuite Contact Service] Request for contact on lead ${leadId} timed out.`);
            return { success: false, message: 'The request to NetSuite timed out.' };
        }
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
    let params: URLSearchParams;

    if (author === 'Lachlan Ball') {
        params = new URLSearchParams({
            script: "2163",
            deploy: "2",
            compid: "1048144",
            "ns-at": "AAEJ7tMQifr1Zy5ZAH7_XU99qvbnccxk_8zzRdRA0tTNuiZ1c4U",
            leadID: leadId,
            noteID: noteId,
            author,
            content,
        });
    } else if (author === 'Lalaine Revilla') {
        params = new URLSearchParams({
            script: "2163",
            deploy: "3",
            compid: "1048144",
            "ns-at": "AAEJ7tMQFFIRCUzYAfnhpgPpDPcn8IxetvArSVKqte6lc-Oo9wU",
            leadID: leadId,
            noteID: noteId,
            author,
            content,
        });
    } else if (author === 'Elmarez Guerrero') {
        params = new URLSearchParams({
            script: "2163",
            deploy: "4",
            compid: "1048144",
            "ns-at": "AAEJ7tMQBSNXuoMj6A0jNf6iUisGtdzB5tPq0z95mU7EFjmfJA0",
            leadID: leadId,
            noteID: noteId,
            author,
            content,
        });
    } else {
        params = new URLSearchParams({
            script: "2163",
            deploy: "1",
            compid: "1048144",
            "ns-at": "AAEJ7tMQv82BUnS0O7ggE-shiuIVD0iRQJbU_RdY_87W2N0W3lw",
            leadID: leadId,
            noteID: noteId,
            author,
            content,
        });
    }


    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite Note Service] Sending note ${noteId} for lead ${leadId} to NetSuite...`);
    console.log(`[NetSuite Note Service] Final Request URL being called: ${url}`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, TIMEOUT_DURATION);

        const response = await fetch(url, { method: 'GET', signal: controller.signal as any });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Note Service Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. Full error: ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite Note Service] Successfully sent note for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: 'Note sent to NetSuite.' };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`[NetSuite Note Service] Request for note ${noteId} on lead ${leadId} timed out.`);
            return { success: false, message: 'The request to NetSuite timed out.' };
        }
        console.error("[NetSuite Note Service] A fatal error occurred during fetch:", error);
        console.error(`[NetSuite Note Service] Failed URL: ${url}`);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}

interface NetSuiteActivityPayload {
    leadId: string;
    activity: Partial<Activity>;
}

/**
 * Sends activity data to a NetSuite scriptlet.
 * @param payload The activity data to send.
 * @returns A promise that resolves with the result of the API call.
 */
export async function sendActivityToNetSuite(payload: NetSuiteActivityPayload): Promise<{ success: boolean, message: string }> {
    const { leadId, activity } = payload;
    
    if (!leadId || !activity) {
        const errorMsg = 'Invalid payload: leadId and activity data are required.';
        console.error(`[NetSuite Activity Service Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";

    const params = new URLSearchParams({
        script: "2164",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQL_ftCT5OvCNWt6p0ldSNIXUd_vy0qXfpYpz8kfRPOt4",
        leadID: leadId,
    });

    if (activity.callId) params.append('callID', activity.callId);
    if (activity.date) params.append('date', activity.date);
    if (activity.author) params.append('author', activity.author);
    if (activity.notes) params.append('notes', activity.notes);
    if (activity.duration) params.append('duration', activity.duration);
    if (activity.type) params.append('type', activity.type);


    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite Activity Service] Sending activity for lead ${leadId} to NetSuite...`);
    console.log(`[NetSuite Activity Service] Final Request URL being called: ${url}`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, TIMEOUT_DURATION);

        const response = await fetch(url, { method: 'GET', signal: controller.signal as any });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Activity Service Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. Full error: ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite Activity Service] Successfully sent activity for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: 'Activity sent to NetSuite.' };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`[NetSuite Activity Service] Request for activity on lead ${leadId} timed out.`);
            return { success: false, message: 'The request to NetSuite timed out.' };
        }
        console.error("[NetSuite Activity Service] A fatal error occurred during fetch:", error);
        console.error(`[NetSuite Activity Service] Failed URL: ${url}`);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}

interface NetSuiteLeadUpdatePayload {
    leadId: string;
    companyName?: string;
    email?: string;
    address?: Partial<Address>;
}

/**
 * Sends updated lead details to a NetSuite scriptlet.
 * @param payload The lead update data to send.
 * @returns A promise that resolves with the result of the API call.
 */
export async function sendLeadUpdateToNetSuite(payload: NetSuiteLeadUpdatePayload): Promise<{ success: boolean, message: string }> {
    const { leadId, companyName, email, address } = payload;
    
    if (!leadId) {
        const errorMsg = 'Invalid payload: leadId is required.';
        console.error(`[NetSuite Lead Update Service Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";

    const params = new URLSearchParams({
        script: "2165",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQjAoBac5NMovu7TgzYYUBTkw80-MtaJaID2gsRUcr0hs",
        leadID: leadId,
    });

    if (companyName) params.append('companyname', companyName);
    if (email) params.append('email', email);
    if (address) {
        if (address.address1) params.append('address1', address.address1);
        if (address.street) params.append('addr1', address.street);
        if (address.city) params.append('city', address.city);
        if (address.state) params.append('state', address.state);
        if (address.zip) params.append('zip', address.zip);
        if (address.country) params.append('country', address.country);
    }


    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite Lead Update Service] Sending update for lead ${leadId} to NetSuite...`);
    console.log(`[NetSuite Lead Update Service] Final Request URL being called: ${url}`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, TIMEOUT_DURATION);

        const response = await fetch(url, { method: 'GET', signal: controller.signal as any });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Lead Update Service Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. Full error: ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite Lead Update Service] Successfully sent update for lead ${leadId}. Response: ${responseBody}`);
        return { success: true, message: 'Lead details sent to NetSuite.' };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`[NetSuite Lead Update Service] Request for lead update ${leadId} timed out.`);
            return { success: false, message: 'The request to NetSuite timed out.' };
        }
        console.error("[NetSuite Lead Update Service] A fatal error occurred during fetch:", error);
        console.error(`[NetSuite Lead Update Service] Failed URL: ${url}`);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}


interface NewLeadData {
  companyName: string;
  websiteUrl?: string;
  customerPhone?: string;
  customerServiceEmail?: string;
  abn?: string;
  industryCategory?: string;
  campaign?: string;
  address: Address;
  contact: {
    firstName?: string;
    lastName?: string;
    title?: string;
    email?: string;
    phone?: string;
  };
  initialNotes?: string;
  dialerAssigned?: string;
  salesRepAssigned?: string;
}

export async function sendNewLeadToNetSuite(payload: NewLeadData): Promise<{ success: boolean; leadId?: string; message: string; }> {
    const { companyName, websiteUrl, customerPhone, customerServiceEmail, abn, industryCategory, campaign, address, contact, initialNotes, dialerAssigned, salesRepAssigned } = payload;

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2194",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQ6MIVXCrzpiLKSEmYLRVtAlRSAOWEC4Dyr1D-_83sS4g",
        companyname: companyName,
        website: websiteUrl || '',
        phone: customerPhone || '',
        email: customerServiceEmail || '',
        custentity_abn: abn || '',
        category: industryCategory || '',
        custentity_leadsource: campaign || '',
        billaddr1: address.street,
        billcity: address.city,
        billstate: address.state,
        billzip: address.zip,
        billcountry: address.country,
        custentity_primary_contact_name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        custentity_primary_contact_title: contact.title || '',
        custentity_primary_contact_email: contact.email || '',
        custentity_primary_contact_phone: contact.phone || '',
    });
    
    if (address.address1) {
        params.append('billaddr2', address.address1);
    }
    if (address.lat) {
        params.append('custentity_addr_lat', String(address.lat));
    }
    if (address.lng) {
        params.append('custentity_addr_long', String(address.lng));
    }
    if (initialNotes) {
        params.append('custentity_initial_notes', initialNotes);
    }
    if(dialerAssigned) {
        params.append('custentity_dialer', dialerAssigned);
    }
    if (salesRepAssigned) {
        params.append('salesrep', salesRepAssigned);
    }

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[NetSuite New Lead Service] Sending new lead "${companyName}" to NetSuite...`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

        const response = await fetch(url, { method: 'GET', signal: controller.signal as any });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite New Lead Service Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. Message: ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite New Lead Service] Successfully sent new lead. Response: ${responseBody}`);
        
        try {
            const jsonResponse = JSON.parse(responseBody);
            if (jsonResponse.success && jsonResponse.leadID) {
                 return { success: true, leadId: jsonResponse.leadID, message: jsonResponse.message || 'Lead created in NetSuite.' };
            } else {
                return { success: false, message: jsonResponse.message || 'An unknown error occurred in NetSuite.' };
            }
         } catch(e) {
            return { success: false, message: `Failed to parse NetSuite response: ${responseBody}` };
         }

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`[NetSuite New Lead Service] Request for new lead timed out.`);
            return { success: false, message: 'The request to NetSuite timed out.' };
        }
        console.error("[NetSuite New Lead Service] A fatal error occurred during fetch:", error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
    
export async function prospectWebsiteTool(input: { leadId: string; websiteUrl: string; }): Promise<{ searchKeywords?: string[], contacts?: Contact[], companyDescription?: string, logoUrl?: string }> {
    return await aiProspectWebsiteTool(input);
}
