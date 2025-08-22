
'use server';

/**
 * @fileOverview A Genkit flow for fetching all call transcripts for a given AirCall user ID.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { getUserAircallId, logActivity } from '@/services/firebase';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, addDoc } from 'firebase/firestore';


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
 * Finds a lead in Firestore by a given phone number.
 * @param {string} phoneNumber The phone number to search for (must be in E.164 format).
 * @returns {Promise<{ id: string } | null>} The found lead's ID or null.
 */
async function findLeadByPhoneNumber(phoneNumber: string): Promise<{ id: string } | null> {
  if (!phoneNumber) return null;
  
  const leadsRef = collection(firestore, 'leads');
  
  const q = query(
    leadsRef,
    where('customerPhone', '==', phoneNumber),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id };
  }

  const allLeadsSnapshot = await getDocs(leadsRef);
  for (const leadDoc of allLeadsSnapshot.docs) {
      const contactsRef = collection(firestore, 'leads', leadDoc.id, 'contacts');
      const contactsQuery = query(contactsRef, where('phone', '==', phoneNumber), limit(1));
      const contactsSnapshot = await getDocs(contactsQuery);
      if (!contactsSnapshot.empty) {
          return { id: leadDoc.id };
      }
  }

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
