
'use server'
/**
 * @fileOverview A Genkit tool for fetching calendar availability for a sales rep.
 */

import { ai } from '@/ai/genkit'
import { z } from 'genkit'

// Mock availability for different sales reps
// In a real application, this would be replaced with a call to an external calendar API (e.g., Microsoft Graph)
const MOCKED_AVAILABILITY: { [key: string]: string[] } = {
  'Leonie Feata': ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30'],
  'Luke Forbes': ['11:00', '11:30', '12:00', '15:00', '15:30', '16:00'],
  'Default': ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
};

const GetAvailabilityInputSchema = z.object({
    salesRepName: z.string().describe('The name of the sales representative.'),
    date: z.string().describe('The date to check for availability in ISO 8601 format.'),
});

const GetAvailabilityOutputSchema = z.object({
    timeSlots: z.array(z.string()).describe('A list of available time slots in HH:mm format.'),
});

export async function getAvailability(input: z.infer<typeof GetAvailabilityInputSchema>): Promise<z.infer<typeof GetAvailabilityOutputSchema>> {
    return getAvailabilityFlow(input);
}


const getAvailabilityFlow = ai.defineFlow(
  {
    name: 'getAvailabilityFlow',
    inputSchema: GetAvailabilityInputSchema,
    outputSchema: GetAvailabilityOutputSchema,
  },
  async ({ salesRepName, date }) => {
    console.log(`Fetching availability for ${salesRepName} on ${date}`);
    
    // This is where you would integrate with a real calendar API.
    // For now, we'll use the mock data. We'll ignore the date for the simulation.
    const timeSlots = MOCKED_AVAILABILITY[salesRepName] || MOCKED_AVAILABILITY['Default'];

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      timeSlots,
    };
  }
);
