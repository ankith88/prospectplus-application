
'use server';

/**
 * @fileOverview A Genkit flow for fetching all call transcripts for a given AirCall user ID.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { getUserAircallId, logActivity } from '@/services/firebase';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, addDoc, or } from 'firebase/firestore';


const GetUserTranscriptsInputSchema = z.object({
  userDisplayName: z.string().describe('The display name of the user to fetch transcripts for.'),
});
export type GetUserTranscriptsInput = z.infer<typeof GetUserTranscriptsInputSchema>;

const GetUserTranscriptsOutputSchema = z.object({
  transcriptsFound: z.number(),
  error: z.string().optional(),
});
export type GetUserTranscriptsOutput = z.infer<typeof GetUserTranscriptsOutputSchema>;


export async function getUserCallTranscripts(input: GetUserTranscriptsInput): Promise<GetUserTranscriptsOutput> {
    return getUserCallTranscriptsFlow(input);
}

/**
 * Generates different formats of a phone number to ensure a match.
 * @param {string} phoneNumber The phone number, preferably in E.164 format.
 * @returns {string[]} An array of possible phone number formats.
 */
function getPhoneNumberVariations(phoneNumber: string): string[] {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it's a +61 number
    if (cleaned.startsWith('61')) {
        const localPart = cleaned.substring(2);
        return [
            `+${cleaned}`,      // +61412345678
            `0${localPart}`,     // 0412345678
            localPart,           // 412345678
        ];
    }
    
    // If it's a local number starting with 0
    if (cleaned.startsWith('0')) {
        const localPart = cleaned.substring(1);
        return [
            `+61${localPart}`,   // +61412345678
            cleaned,             // 0412345678
            localPart,           // 412345678
        ];
    }

    // If it's a number without a leading 0 (e.g. from some other system)
    return [
        `+61${cleaned}`,     // +61412345678
        `0${cleaned}`,      // 0412345678
        cleaned,             // 412345678
    ];
}


/**
 * Finds a lead in Firestore by a given phone number, trying multiple formats.
 * @param {string} phoneNumber The phone number to search for (E.164 format preferred).
 * @returns {Promise<{ id: string } | null>} The found lead's ID or null.
 */
async function findLeadByPhoneNumber(phoneNumber: string): Promise<{ id: string } | null> {
    if (!phoneNumber) return null;

    const variations = getPhoneNumberVariations(phoneNumber);
    if (variations.length === 0) return null;

    console.log(`Searching for lead with phone number variations: ${variations.join(', ')}`);

    const leadsRef = collection(firestore, 'leads');

    // Query on the main customerPhone field
    const q = query(leadsRef, where('customerPhone', 'in', variations), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        console.log(`Found lead ${doc.id} by direct customerPhone match.`);
        return { id: doc.id };
    }

    // If no direct match, search within the contacts subcollection of all leads.
    // This is less efficient but necessary.
    try {
        const allLeadsSnapshot = await getDocs(leadsRef);
        for (const leadDoc of allLeadsSnapshot.docs) {
            const contactsRef = collection(firestore, 'leads', leadDoc.id, 'contacts');
            const contactsQuery = query(contactsRef, where('phone', 'in', variations), limit(1));
            const contactsSnapshot = await getDocs(contactsQuery);
            if (!contactsSnapshot.empty) {
                console.log(`Found lead ${leadDoc.id} via contact phone number match.`);
                return { id: leadDoc.id };
            }
        }
    } catch(e) {
      console.error("Error searching contacts subcollections:", e);
    }


    console.log(`No lead found for any variation of phone number: ${phoneNumber}`);
    return null;
}

const getUserCallTranscriptsFlow = ai.defineFlow(
  {
    name: 'getUserCallTranscriptsFlow',
    inputSchema: GetUserTranscriptsInputSchema,
    outputSchema: GetUserTranscriptsOutputSchema,
  },
  async ({ userDisplayName }) => {
    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      const errorMsg = 'AirCall API credentials are not configured.';
      console.error(errorMsg);
      return { transcriptsFound: 0, error: errorMsg };
    }

    const aircallUserId = await getUserAircallId(userDisplayName);

    if (!aircallUserId) {
        const errorMsg = `Could not find AirCall User ID for ${userDisplayName}.`;
        console.error(errorMsg);
        return { transcriptsFound: 0, error: errorMsg };
    }
    
    const url = `https://api.aircall.io/v1/calls?order=desc&per_page=50&user_id=${aircallUserId}`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    console.log(`Fetching all recent calls from AirCall for user: ${userDisplayName} (ID: ${aircallUserId})`);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const errorMsg = `AirCall API request failed with status: ${response.status}. Body: ${errorBody}`;
        console.error(errorMsg);
        return { transcriptsFound: 0, error: errorMsg };
      }

      const responseData = await response.json() as any;
      const allCalls = responseData?.calls || [];
      
      let transcriptsFound = 0;

      if (allCalls.length === 0) {
        console.log(`No calls found for user: ${userDisplayName}`);
        return { transcriptsFound: 0 };
      }

      for (const call of allCalls) {
        if (call?.transcription?.content) {
          // Phone number can be in `raw_digits` or in the `phone_number` object.
          const phoneNumber = call.raw_digits || call.phone_number?.e164;
          
          if (phoneNumber) {
            const lead = await findLeadByPhoneNumber(phoneNumber);
            if (lead) {
              transcriptsFound++;
              const noteContent = `Transcript for call with ${call.direction} direction on ${new Date(call.started_at).toLocaleString()}:\n\n${call.transcription.content}`;
              
              const notesRef = collection(firestore, 'leads', lead.id, 'notes');
              await addDoc(notesRef, {
                  content: noteContent,
                  author: userDisplayName,
                  date: new Date(call.started_at).toISOString(),
              });

              await logActivity(lead.id, { 
                  type: 'Update', 
                  notes: `Transcript synced for call on ${new Date(call.started_at).toLocaleDateString()}` 
              });

              console.log(`Transcript found and logged for call ID: ${call.id} to lead ID: ${lead.id}`);
            } else {
                 console.log(`No lead found for phone number ${phoneNumber} from call ID ${call.id}`);
            }
          }
        }
      }
      
      console.log(`Found and processed ${transcriptsFound} transcripts for user: ${userDisplayName}`);
      return { transcriptsFound };

    } catch (error: any) {
      console.error('Error fetching call transcripts from AirCall:', error);
      return { transcriptsFound: 0, error: `An unexpected error occurred: ${error.message}` };
    }
  }
);

    