'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateEmailDraftInputSchema = z.object({
  emailHistory: z.string().describe('The summary or history of recent emails in the thread.'),
  leadProfile: z.string().describe('The profile details of the lead from the CRM.'),
  customInstruction: z.string().optional().describe('Custom instructions or points the sales rep wants to include.'),
});

export type GenerateEmailDraftInput = z.infer<typeof GenerateEmailDraftInputSchema>;

const GenerateEmailDraftOutputSchema = z.object({
  subject: z.string().describe('Suggested subject line for the email.'),
  body: z.string().describe('The suggested plain text or rich HTML body of the email response.'),
});

export type GenerateEmailDraftOutput = z.infer<typeof GenerateEmailDraftOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateEmailDraftPrompt',
  input: { schema: GenerateEmailDraftInputSchema },
  output: { schema: GenerateEmailDraftOutputSchema },
  prompt: `You are an expert copywriter and sales assistant for MailPlus. Generate a professional email reply draft for a lead.

  Here is the background info:
  Lead Profile:
  {{{leadProfile}}}

  Email History:
  {{{emailHistory}}}

  Custom Instructions from Sales Rep:
  {{{customInstruction}}}

  Brand Guidelines:
  - Tone: Professional, helpful, concise, and trustworthy.
  - Value proposition: Reliable next-day parcel delivery for 1kg to 20kg parcels across Australia.
  - Color palette reference (for context, do not write code unless formatting as HTML email): Professional Blue (#095c7b) and Accent Yellow (#eaf143).
  - Sign-off: Professional signature template placeholder.

  Provide a response with a suitable subject line and a clean, beautifully formatted email body. Do not include markdown headers inside the body. Just clean paragraph formatting (HTML tags like <p>, <br> are allowed if they make it read better, but simple text with newlines is preferred).`,
});

export const generateEmailDraft = ai.defineFlow(
  {
    name: 'generateEmailDraft',
    inputSchema: GenerateEmailDraftInputSchema,
    outputSchema: GenerateEmailDraftOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate email draft.');
    }
    return output;
  }
);
