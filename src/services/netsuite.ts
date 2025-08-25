
'use server'

import type { Lead } from "@/lib/types";

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
}

/**
 * Sends a specific call outcome to a NetSuite scriptlet.
 * @param payload The data to send to the NetSuite scriptlet.
 * @returns A promise that resolves with the result of the API call.
 */
export async function sendToNetSuiteForOutcome(payload: NetSuiteOutcomePayload): Promise<{ success: boolean; message: string }> {
    const { leadId, outcome, reason, dialerAssigned, notes } = payload;
    
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
