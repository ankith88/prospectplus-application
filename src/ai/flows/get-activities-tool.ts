
'use server'
/**
 * @fileOverview A Genkit tool for fetching activities from Firebase.
 */

import { ai } from '@/ai/genkit';
import { getAllActivities } from '@/services/firebase';
import { z } from 'genkit';

const GetActivitiesInputSchema = z.object({
  dialerAssigned: z.string().optional().describe('Filter activities by the assigned dialer.'),
  type: z.enum(['Call', 'Email', 'Meeting', 'Update']).optional().describe('Filter by activity type.'),
});

export const getActivitiesTool = ai.defineTool(
  {
    name: 'getActivities',
    description: 'Returns a list of activities from the CRM system (Firebase), optionally filtered by dialer or type.',
    inputSchema: GetActivitiesInputSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    const allActivities = await getAllActivities();

    if (!input) {
      return allActivities;
    }

    return allActivities.filter(activity => {
      const dialerMatch = !input.dialerAssigned || activity.author === input.dialerAssigned;
      const typeMatch = !input.type || activity.type === input.type;
      return dialerMatch && typeMatch;
    });
  }
);
