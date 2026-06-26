'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ClassifyEmailIntentInputSchema = z.object({
  senderEmail: z.string().describe('The email address of the sender.'),
  subject: z.string().describe('The subject line of the email.'),
  body: z.string().describe('The plain text body content of the email.'),
});

export type ClassifyEmailIntentInput = z.infer<typeof ClassifyEmailIntentInputSchema>;

const ClassifyEmailIntentOutputSchema = z.object({
  intent: z.enum([
    'Unsubscribe Request',
    'Objection/Follow-up',
    'Interested',
    'Out of Office',
    'Other'
  ]).describe('The classified intent of the email.'),
  reasoning: z.string().describe('The reasoning for the classification decision.'),
  suggestedStatus: z.enum([
    'New',
    'Hot Lead',
    'Priority Lead',
    'Email Brush Off',
    'Future Follow-up',
    'Unqualified',
    'In Progress'
  ]).describe('Suggested lead status update based on response tone and intent.'),
});

export type ClassifyEmailIntentOutput = z.infer<typeof ClassifyEmailIntentOutputSchema>;

const prompt = ai.definePrompt({
  name: 'classifyEmailIntentPrompt',
  input: { schema: ClassifyEmailIntentInputSchema },
  output: { schema: ClassifyEmailIntentOutputSchema },
  prompt: `You are an AI sales assistant for MailPlus CRM. Analyze the incoming email reply from a customer/lead and determine their intent.

  Email Details:
  Sender: {{{senderEmail}}}
  Subject: {{{subject}}}
  Body:
  """
  {{{body}}}
  """

  Classify into one of the following intents:
  1. 'Unsubscribe Request': The user explicitly asks to stop receiving emails, unsubscribes, says "remove me", "don't email me", "stop", "take me off your list", etc.
  2. 'Objection/Follow-up': The user has objections (e.g., pricing is too high, already have a provider, not interested right now but maybe later, "no thank you", "too busy", "send info later").
  3. 'Interested': The user wants to learn more, schedules a call, is positive, asks for pricing details, says "tell me more", etc.
  4. 'Out of Office': Automatic vacation responder, out-of-office message, delayed reply.
  5. 'Other': Generic replies, unclear intent, or other general enquiries.

  Also suggest an updated status:
  - If Unsubscribe Request: suggest 'Unqualified'.
  - If Objection/Follow-up: suggest 'Email Brush Off' or 'Future Follow-up' depending on if they are completely rejecting or open to future contact.
  - If Interested: suggest 'Hot Lead' or 'Priority Lead'.
  - If Out of Office: suggest 'Future Follow-up'.
  - Otherwise, return their current likely state.`,
});

export const classifyEmailIntent = ai.defineFlow(
  {
    name: 'classifyEmailIntent',
    inputSchema: ClassifyEmailIntentInputSchema,
    outputSchema: ClassifyEmailIntentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to classify email intent.');
    }
    return output;
  }
);
