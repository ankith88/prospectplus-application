
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
  startDate: z.string().optional().describe('The start date for the filter (e.g., YYYY-MM-DD).'),
  endDate: z.string().optional().describe('The end date for the filter (e.g., YYYY-MM-DD).'),
});

export const getActivitiesTool = ai.defineTool(
  {
    name: 'getActivities',
    description: 'Returns a list of activities from the CRM system (Firebase), optionally filtered by dialer, type, or date range.',
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
      
      let dateMatch = true;
      const activityDate = new Date(activity.date);
      if (input.startDate) {
        const startDate = new Date(input.startDate);
        startDate.setHours(0, 0, 0, 0); // Start of day
        dateMatch = dateMatch && activityDate >= startDate;
      }
      if (input.endDate) {
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        dateMatch = dateMatch && activityDate <= endDate;
      }
      
      return dialerMatch && typeMatch && dateMatch;
    });
  }
);
