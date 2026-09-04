'use server'

import type { DiscoveryData, Lead, Contact, Note, Activity, Address, CheckinQuestion, LeadBucket } from "@/lib/types";
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';


const LEAD_SOURCE_ID_MAP: Record<string, string> = {
  '-4': 'Franchisee Generated',
  '491777': 'LocalMile.Plus',
  '487126': 'WooCommerce',
  '437098': 'ProspectPlus Lead Generation',
  '246306': 'Shopify',
  '207048': 'NeoPost',
  '97943': 'Head Office Generated',
  '17': 'Inbound - Call',
  '11': 'Referral',
  '492239': 'Account Manager Generated'
};

const TIMEOUT_DURATION = 60000; // 60 seconds for all requests

class AbortError extends Error {
    constructor(message = 'The request was aborted.') {
        super(message);
        this.name = 'AbortError';
    }
}

function getShorthandState(state: string): string {
  if (!state) return '';
  const s = state.trim().toLowerCase();
  switch (s) {
    case 'new south wales': return 'NSW';
    case 'victoria': return 'VIC';
    case 'queensland': return 'QLD';
    case 'south australia': return 'SA';
    case 'western australia': return 'WA';
    case 'tasmania': return 'TAS';
    case 'northern territory': return 'NT';
    case 'australian capital territory': return 'ACT';
    default: return state.toUpperCase(); // Assume it's already an abbreviation, or pass as is
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
    contact: Partial<Contact>;
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

    const name = contact.name || '';
    const nameParts = name.split(' ');
    const firstName = (contact.firstName || nameParts[0] || '').trim();
    const lastName = (contact.lastName || nameParts.slice(1).join(' ') || '').trim();

    const params = new URLSearchParams({
        script: "2162",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQiABijVECkP4VMN5S4EQRn4vSKQ0EnMiG99-nTlSJ1ck",
        leadID: leadId,
        firstname: firstName,
        lastname: lastName,
        firstName: firstName,
        lastName: lastName,
        first_name: firstName,
        last_name: lastName,
        name: name,
        fullname: name,
        email: contact.email || '',
        phone: contact.phone || '',
        title: contact.title || '',
        primary: contact.isPrimary ? 'yes' : 'no',
        isprimary: contact.isPrimary ? 'yes' : 'no',
        accounts_payable: contact.isAccountsPayable ? 'yes' : 'no',
        isaccountspayable: contact.isAccountsPayable ? 'yes' : 'no',
        localmile: contact.accessToLocalMile || 'no',
        localmile_access: contact.accessToLocalMile || 'no',
        access_to_localmile: contact.accessToLocalMile || 'no',
        shipmate: contact.accessToShipMate || 'no',
        shipmate_access: contact.accessToShipMate || 'no',
        access_to_shipmate: contact.accessToShipMate || 'no',
    });

    if (contact.id) {
        params.append('contactid', contact.id);
    }

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
        return { success: true, message: responseBody };
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
    phone?: string;
    website?: string;
    industry?: string;
    abn?: string;
    address?: Partial<Address>;
    franchiseeName?: string;
    franchiseeInternalId?: string;
}

/**
 * Sends updated lead details to a NetSuite scriptlet.
 * @param payload The lead update data to send.
 * @returns A promise that resolves with the result of the API call.
 */
export async function sendLeadUpdateToNetSuite(payload: NetSuiteLeadUpdatePayload): Promise<{ success: boolean, message: string }> {
    const { leadId, companyName, email, phone, website, industry, abn, address, franchiseeName, franchiseeInternalId } = payload;
    
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
    if (phone) params.append('phone', phone);
    if (website) params.append('website', website);
    if (industry) params.append('category', industry);
    if (abn) {
        params.append('custentity_abn', abn);
        params.append('abn', abn);
    }
    if (franchiseeName) params.append('franchisee_name', franchiseeName);
    if (franchiseeInternalId) params.append('franchisee_id', franchiseeInternalId);
    
    if (address) {
        if (address.address1) params.append('address1', address.address1);
        if (address.street) params.append('addr1', address.street);
        if (address.city) params.append('city', address.city);
        if (address.state) params.append('state', getShorthandState(address.state));
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

export interface NetSuiteUpdateCustomerPayload {
    internalId: string;
    companyName: string;
    email: string;
    phone: string;
    franchiseeId: string;
    prospectPlusId: string;
    abn?: string;
}

/**
 * Sends updated customer/company details to NetSuite Scriptlet 1900 with operation 'updateCustomer'.
 * @param payload The customer update payload containing document IDs, company name, email, phone, franchisee ID, and abn.
 * @returns A promise that resolves with the result of the NetSuite API call.
 */
export async function sendCompanyCustomerUpdateToNetSuite(payload: NetSuiteUpdateCustomerPayload): Promise<{ success: boolean; message: string }> {
    const { internalId, companyName, email, phone, franchiseeId, prospectPlusId, abn } = payload;

    if (!internalId && !prospectPlusId) {
        const errorMsg = 'Invalid payload: internalId or prospectPlusId is required.';
        console.error(`[NetSuite Customer Update Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1900&deploy=2&compid=1048144&ns-at=AAEJ7tMQubKtieJuj6WwyGZO8oUmYeVsGjJVKqWKrTXbBqMNWuc";

    const requestData = {
        operation: "updateCustomer",
        requestParams: {
            internalId: internalId || prospectPlusId,
            companyName: companyName || '',
            email: email || '',
            phone: phone || '',
            franchiseeId: franchiseeId || '',
            prospectPlusId: prospectPlusId || internalId,
            abn: abn || '',
        }
    };

    const url = `${baseUrl}&requestData=${encodeURIComponent(JSON.stringify(requestData))}`;

    console.log(`[NetSuite Customer Update Service] Sending customer update for ${internalId || prospectPlusId} to NetSuite...`);
    console.log(`[NetSuite Customer Update Service] Final Request URL being called: ${url}`);
    console.log(`[NetSuite Customer Update Service] Payload:`, requestData);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, TIMEOUT_DURATION);

        const response = await fetch(url, { method: 'GET', signal: controller.signal as any });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[NetSuite Customer Update Error] Status: ${response.status}, URL: ${url}, Body: ${errorBody}`);
            return { success: false, message: `NetSuite API request failed with status ${response.status}. ${errorBody}` };
        }

        const responseBody = await response.text();
        console.log(`[NetSuite Customer Update Service] Successfully sent customer update. Response: ${responseBody}`);
        return { success: true, message: 'Customer details updated in NetSuite.' };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error(`[NetSuite Customer Update Error] Request for customer update ${internalId || prospectPlusId} timed out.`);
            return { success: false, message: 'The request to NetSuite timed out.' };
        }
        console.error("[NetSuite Customer Update Error] A fatal error occurred during fetch:", error);
        console.error(`[NetSuite Customer Update Error] Failed URL: ${url}`);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}


interface NetSuiteAddressUpdatePayload {
    leadId: string;
    address?: Partial<Address>;
    postalAddress?: Partial<Address>;
    tag?: string;
    partnerLocationId?: string;
}

async function runAddressSyncInBackground(leadId: string): Promise<void> {
    try {
        console.log(`[NetSuite Address Sync Background] Starting sync for lead/company: ${leadId}`);
        const db = getFirestore(adminApp);
        
        let docSnap = await db.collection('leads').doc(leadId).get();
        let isCompany = false;
        if (!docSnap.exists) {
            docSnap = await db.collection('companies').doc(leadId).get();
            isCompany = true;
        }
        
        if (!docSnap.exists) {
            console.error(`[NetSuite Address Sync Background Error] Document not found in leads or companies for ID: ${leadId}`);
            return;
        }

        const data = docSnap.data();
        const pathPrefix = isCompany ? 'companies' : 'leads';
        
        const siteAddress = data?.address || {
            address1: data?.address1,
            street: data?.street,
            city: data?.city,
            state: data?.state,
            zip: data?.zip,
            country: data?.country || 'Australia',
            lat: data?.latitude ?? data?.lat,
            lng: data?.longitude ?? data?.lng,
        };

        const postalAddress = data?.postalAddress;

        const addressesSnap = await db.collection(pathPrefix).doc(leadId).collection('addresses').get();
        const additionalAddresses = addressesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as any[];

        const tasks: { type: 'site' | 'postal' | 'additional'; tag?: string; address: any; partnerLocationId?: string }[] = [];

        if (siteAddress && (siteAddress.street || siteAddress.city)) {
            tasks.push({ type: 'site', address: siteAddress });
        }

        if (postalAddress && (postalAddress.street || postalAddress.address1 || postalAddress.city)) {
            tasks.push({
                type: 'postal',
                tag: 'postal',
                address: postalAddress,
                partnerLocationId: postalAddress.partnerLocationId
            });
        }

        additionalAddresses.forEach(addr => {
            if (addr.street || addr.address1 || addr.city) {
                tasks.push({
                    type: 'additional',
                    tag: addr.tag || 'additional',
                    address: addr,
                    partnerLocationId: addr.partnerLocationId
                });
            }
        });

        console.log(`[NetSuite Address Sync Background] Found ${tasks.length} addresses to sync.`);

        const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";

        for (const task of tasks) {
            const params = new URLSearchParams({
                script: "2657",
                deploy: "1",
                compid: "1048144",
                "ns-at": "AAEJ7tMQLyH0sQZzAGMKfbtQg8JEhmYtmEtlEJwUqkRuxrLR4Xs",
                leadID: leadId,
            });

            if (task.tag) {
                params.append('tag', task.tag);
            }

            if (task.partnerLocationId) {
                params.append('partnerLocationId', task.partnerLocationId);
            }

            if (task.type === 'site') {
                const addr = task.address;
                if (addr.address1) params.append('address1', addr.address1);
                if (addr.street) params.append('addr1', addr.street);
                if (addr.city) params.append('city', addr.city);
                if (addr.state) params.append('state', getShorthandState(addr.state));
                if (addr.zip) params.append('zip', addr.zip);
                if (addr.country) params.append('country', addr.country);
                if (addr.lat !== undefined && addr.lat !== null) params.append('lat', String(addr.lat));
                if (addr.lng !== undefined && addr.lng !== null) params.append('lng', String(addr.lng));
            } else {
                const addr = task.address;
                if (addr.address1) params.append('postal_address1', addr.address1);
                if (addr.street) params.append('postal_addr1', addr.street);
                if (addr.city) params.append('postal_city', addr.city);
                if (addr.state) params.append('postal_state', getShorthandState(addr.state));
                if (addr.zip) params.append('postal_zip', addr.zip);
                if (addr.country) params.append('postal_country', addr.country || 'Australia');
                if (addr.lat !== undefined && addr.lat !== null) params.append('postal_lat', String(addr.lat));
                if (addr.lng !== undefined && addr.lng !== null) params.append('postal_lng', String(addr.lng));
            }

            const url = `${baseUrl}?${params.toString()}`;
            console.log(`[NetSuite Address Sync Background] Syncing address type: ${task.type}, Tag: ${task.tag || 'none'}, URL: ${url}`);

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), TIMEOUT_DURATION);
                const response = await fetch(url, { method: 'GET', signal: controller.signal as any });
                clearTimeout(timeout);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[NetSuite Address Sync Background Error] Type: ${task.type}, Status: ${response.status}, Body: ${errorText}`);
                } else {
                    const resultText = await response.text();
                    console.log(`[NetSuite Address Sync Background Success] Type: ${task.type}, Response: ${resultText}`);
                }
            } catch (err: any) {
                console.error(`[NetSuite Address Sync Background Exception] Type: ${task.type}, Error: ${err.message}`);
            }
        }
        console.log(`[NetSuite Address Sync Background] Complete for lead/company: ${leadId}`);
    } catch (error: any) {
        console.error(`[NetSuite Address Sync Background Fatal Error] ${error.message}`);
    }
}

export async function sendAddressUpdateToNetSuite(payload: NetSuiteAddressUpdatePayload): Promise<{ success: boolean, message: string }> {
    const { leadId } = payload;
    
    if (!leadId) {
        const errorMsg = 'Invalid payload: leadId is required.';
        console.error(`[NetSuite Address Update Service Error] ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

    runAddressSyncInBackground(leadId).catch(err => {
        console.error("[NetSuite Address Sync Background Invocation Error]:", err);
    });

    return { success: true, message: 'Address sync triggered in the background.' };
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
  fieldRepAssigned?: string;
  accountManagerAssigned?: string;
  discoveryData?: Partial<DiscoveryData>;
  visitNoteID?: string;
  franchiseeInternalId?: string;
  franchiseeName?: string;
  leadSource?: string;
  bucket?: LeadBucket;
  noFranchisees?: boolean;
  selectedServiceOption?: string;
  droppedOffBrochures?: boolean;
  hadConversationWithContact?: boolean;
  isPriority?: boolean;
  isZeeCreated?: boolean;
  franchiseeReviewPending?: boolean;
  parentLeadId?: string;
  parentId?: string;
  parentCustomer?: string;
  lpoLeadId?: string;
  linkedLpoLeadId?: string;
  pageUrl?: string;
  attribution?: Record<string, any>;
}

export async function sendNewLeadToNetSuite(payload: NewLeadData): Promise<{ success: boolean; leadId?: string; salesRecordInternalId?: string; message: string; }> {
    if (!payload) {
        return { success: false, message: 'Invalid payload provided for new lead creation.' };
    }
    const { companyName, websiteUrl, customerPhone, customerServiceEmail, abn, industryCategory, campaign, address, contact, initialNotes, dialerAssigned, salesRepAssigned, discoveryData, visitNoteID, franchiseeInternalId, franchiseeName, leadSource, bucket, noFranchisees, selectedServiceOption, parentLeadId, parentId, parentCustomer, lpoLeadId, linkedLpoLeadId, pageUrl, attribution } = payload;

    const isChildLead = !!(parentId || parentLeadId || parentCustomer || bucket === 'multisite');
    const effectivePhone = customerPhone || (isChildLead ? '1300656595' : '');
    const effectiveEmail = customerServiceEmail || (isChildLead ? 'abc@abc.com' : '');
    const effectiveContactPhone = contact?.phone || effectivePhone;
    const effectiveContactEmail = contact?.email || effectiveEmail;

    const baseUrl = "https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl";
    const params = new URLSearchParams({
        script: "2194",
        deploy: "1",
        compid: "1048144",
        "ns-at": "AAEJ7tMQ6MIVXCrzpiLKSEmYLRVtAlRSAOWEC4Dyr1D-_83sS4g",
        companyname: companyName,
        website: websiteUrl || '',
        phone: effectivePhone,
        email: effectiveEmail,
        custentity_abn: abn || '',
        category: industryCategory || '',
        custentity_leadsource: attribution?.channel || campaign || '',
        billaddr1: address?.street || (address as any)?.address1 || '',
        billcity: address?.city || '',
        billstate: getShorthandState(address?.state || ''),
        billzip: address?.zip || '',
        billcountry: address?.country || 'Australia',
        custentity_primary_contact_name: `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim(),
        custentity_primary_contact_firstname: (contact?.firstName || '').trim(),
        custentity_primary_contact_lastname: (contact?.lastName || '').trim(),
        firstname: (contact?.firstName || '').trim(),
        lastname: (contact?.lastName || '').trim(),
        firstName: (contact?.firstName || '').trim(),
        lastName: (contact?.lastName || '').trim(),
        custentity_primary_contact_title: contact?.title || '',
        custentity_primary_contact_email: effectiveContactEmail,
        custentity_primary_contact_phone: effectiveContactPhone,
    });

    if (attribution) {
      if (attribution.utmSource) params.append('custentity_utm_source', attribution.utmSource);
      if (attribution.utmMedium) params.append('custentity_utm_medium', attribution.utmMedium);
      if (attribution.utmCampaign) params.append('custentity_utm_campaign', attribution.utmCampaign);
      if (attribution.utmContent) params.append('custentity_utm_content', attribution.utmContent);
      if (attribution.utmTerm) params.append('custentity_utm_term', attribution.utmTerm);
      if (attribution.adClickId) params.append('custentity_ad_click_id', attribution.adClickId);
      if (attribution.channel) params.append('custentity_marketing_channel', attribution.channel);
      if (attribution.posthogSessionId) params.append('custentity_posthog_session_id', attribution.posthogSessionId);
      if (attribution.posthogSessionUrl) params.append('custentity_posthog_session_url', attribution.posthogSessionUrl);
      if (attribution.landingPage) params.append('custentity_landing_page', attribution.landingPage);
    }
    
    const effectiveParentId = parentId || parentLeadId || parentCustomer;
    if (effectiveParentId) {
        params.append('parent', effectiveParentId);
        params.append('parent_id', effectiveParentId);
        params.append('custentity_parent_id', effectiveParentId);
        params.append('parentCustomer', effectiveParentId);
    }

    const effectiveLpoLeadId = lpoLeadId || linkedLpoLeadId;
    if (effectiveLpoLeadId) {
        params.append('custentity_lpo_lead_id', effectiveLpoLeadId);
        params.append('lpoLeadId', effectiveLpoLeadId);
        params.append('lpo_lead_id', effectiveLpoLeadId);
        params.append('custentity_lpo_lead', effectiveLpoLeadId);
    }

    if (address?.address1) {
        params.append('billaddr2', address.address1);
    }
    if (address?.lat) {
        params.append('custentity_addr_lat', String(address.lat));
    }
    if (address?.lng) {
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
    if (discoveryData || attribution) {
        let discoveryString = discoveryData ? Object.entries(discoveryData)
            .map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return '';
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
                return `${formattedKey}: ${formattedValue}`;
            })
            .filter(Boolean)
            .join('\n') : '';

        if (attribution) {
          const attrLines = [];
          if (attribution.channel) attrLines.push(`Ad Channel: ${attribution.channel}`);
          if (attribution.utmCampaign) attrLines.push(`Campaign: ${attribution.utmCampaign}`);
          if (attribution.utmSource) attrLines.push(`UTM Source: ${attribution.utmSource}`);
          if (attribution.utmMedium) attrLines.push(`UTM Medium: ${attribution.utmMedium}`);
          if (attribution.utmContent) attrLines.push(`Ad Content: ${attribution.utmContent}`);
          if (attribution.posthogSessionUrl) attrLines.push(`PostHog Replay: ${attribution.posthogSessionUrl}`);
          
          if (attrLines.length > 0) {
            discoveryString = discoveryString ? `${discoveryString}\n\n--- Marketing Attribution ---\n${attrLines.join('\n')}` : `--- Marketing Attribution ---\n${attrLines.join('\n')}`;
          }
        }

        if (discoveryString) {
          params.append('custentity_checkin_questions', discoveryString);
        }
    }

    if (visitNoteID) {
        params.append('custentity_visit_note_id', visitNoteID);
    }
    if (franchiseeInternalId) {
        params.append('franchisee_id', franchiseeInternalId);
    }
    if (franchiseeName) {
        params.append('franchisee_name', franchiseeName);
    }
    const leadSourceText = (leadSource && LEAD_SOURCE_ID_MAP[leadSource]) ? LEAD_SOURCE_ID_MAP[leadSource] : (campaign || 'Franchisee Generated');
    if (leadSource) {
        params.append('leadsource', leadSource);
        params.append('leadsource_text', leadSourceText);
    }
    params.append('source', leadSourceText);
    params.append('customer_source', leadSourceText);
    if (bucket) {
        params.append('bucket', bucket);
    }
    if (discoveryData?.weeklyParcels) {
        params.append('weekly_parcels', discoveryData.weeklyParcels);
    }
    if (noFranchisees) {
        params.append('suburb_status', 'OOT');
    }
    if (selectedServiceOption) {
        params.append('custentity_selected_service_option', selectedServiceOption);
    }
    if (payload.droppedOffBrochures !== undefined) {
        params.append('dropped_off_brochures', String(payload.droppedOffBrochures));
    }
    if (payload.hadConversationWithContact !== undefined) {
        params.append('had_conversation_with_contact', String(payload.hadConversationWithContact));
    }
    if (payload.isPriority !== undefined) {
        params.append('is_priority', String(payload.isPriority));
    }
    if (payload.isZeeCreated !== undefined) {
        params.append('is_zee_created', String(payload.isZeeCreated));
    }
    if (payload.franchiseeReviewPending !== undefined) {
        params.append('franchisee_review_pending', String(payload.franchiseeReviewPending));
    }
    if (pageUrl) {
        params.append('page_url', pageUrl);
        params.append('custentity_page_url', pageUrl);
        params.append('pageUrl', pageUrl);
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
            if (!jsonResponse || typeof jsonResponse !== 'object') {
                return { success: false, message: `Unexpected response format from NetSuite: ${responseBody}` };
            }
            const returnedId = jsonResponse.leadID || jsonResponse.leadId || jsonResponse.internalid || jsonResponse.id;
            const salesRecordId = jsonResponse.salesRecordInternalId || jsonResponse.salesrecordid || jsonResponse.salesRecordId || jsonResponse.salesRecordInternalID || jsonResponse.sales_record_id;
            if (jsonResponse.success && returnedId) {
                 return { 
                   success: true, 
                   leadId: String(returnedId), 
                   salesRecordInternalId: salesRecordId ? String(salesRecordId) : undefined,
                   message: jsonResponse.message || 'Lead created in NetSuite.' 
                 };
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
    const result = await aiProspectWebsiteTool(input);
    return {
        searchKeywords: result.searchKeywords,
        companyDescription: result.companyDescription,
        logoUrl: result.logoUrl,
        contacts: result.contacts?.map(c => ({
            id: c.id,
            name: c.name || '',
            title: c.title || '',
            email: c.email || '',
            phone: c.phone || ''
        }))
    };
}

/**
 * Sends converted LPO lead information to NetSuite.
 * Logs the full payload for integration debugging.
 */
export async function sendLpoConversionToNetSuite(leadId: string, conversionData: any): Promise<{ success: boolean; message: string }> {
  console.log(`[LPO Conversion] Conversion data for LPO lead ID ${leadId} processed locally (NetSuite API 2673 discontinued):`, JSON.stringify(conversionData, null, 2));
  
  return {
    success: true,
    message: "LPO Lead conversion details saved locally."
  };
}

