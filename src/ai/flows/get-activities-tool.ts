
'use server'
/**
 * @fileOverview A Genkit tool for fetching activities from Firebase.
 */

import { ai } from '@/ai/genkit';
import { getAllActivities } from '@/services/firebase';
import { z } from 'genkit';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const GetActivitiesInputSchema = z.object({
  dialerAssigned: z.string().optional().describe('Filter activities by the assigned dialer.'),
  type: z.enum(['Call', 'Email', 'Meeting', 'Update']).optional().describe('Filter by activity type.'),
  dateRange: z.enum([
      'today', 
      'yesterday', 
      'this_week', 
      'last_week', 
      'this_month', 
      'last_month'
  ]).optional().describe("A relative date range. If the user asks for a specific date or range, infer the best fit from these options."),
  startDate: z.string().optional().describe('The start date for a custom filter (e.g., YYYY-MM-DD). Use dateRange for relative queries.'),
  endDate: z.string().optional().describe('The end date for a custom filter (e.g., YYYY-MM-DD). Use dateRange for relative queries.'),
});

export const getActivitiesTool = ai.defineTool(
  {
    name: 'getActivities',
    description: 'Returns a list of activities from the CRM system (Firebase), optionally filtered by dialer, type, or date range. Handles both relative (e.g., "today") and absolute date ranges.',
    inputSchema: GetActivitiesInputSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    const allActivities = await getAllActivities();

    if (!input) {
      return allActivities;
    }

    let dateFilter: { from: Date, to: Date } | null = null;
    const now = new Date();

    if (input.dateRange) {
        switch (input.dateRange) {
            case 'today':
                dateFilter = { from: startOfDay(now), to: endOfDay(now) };
                break;
            case 'yesterday':
                const yesterday = subDays(now, 1);
                dateFilter = { from: startOfDay(yesterday), to: endOfDay(yesterday) };
                break;
            case 'this_week':
                dateFilter = { from: startOfWeek(now), to: endOfWeek(now) };
                break;
            case 'last_week':
                 const lastWeekStart = startOfWeek(subDays(now, 7));
                 const lastWeekEnd = endOfWeek(subDays(now, 7));
                 dateFilter = { from: lastWeekStart, to: lastWeekEnd };
                 break;
            case 'this_month':
                dateFilter = { from: startOfMonth(now), to: endOfMonth(now) };
                break;
            case 'last_month':
                const lastMonthStart = startOfMonth(subMonths(now, 1));
                const lastMonthEnd = endOfMonth(subMonths(now, 1));
                dateFilter = { from: lastMonthStart, to: lastMonthEnd };
                break;
        }
    } else if (input.startDate) {
        const from = new Date(input.startDate);
        from.setHours(0,0,0,0);
        const to = input.endDate ? new Date(input.endDate) : from;
        to.setHours(23,59,59,999);
        dateFilter = { from, to };
    }


    return allActivities.filter(activity => {
      const dialerMatch = !input.dialerAssigned || activity.author === input.dialerAssigned;
      const typeMatch = !input.type || activity.type === input.type;
      
      let dateMatch = true;
      if (dateFilter) {
          const activityDate = new Date(activity.date);
          dateMatch = activityDate >= dateFilter.from && activityDate <= dateFilter.to;
      }
      
      return dialerMatch && typeMatch && dateMatch;
    });
  }
);
