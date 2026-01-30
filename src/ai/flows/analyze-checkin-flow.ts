'use server';
/**
 * @fileOverview An AI flow to analyze a recorded sales check-in conversation.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { updateLeadCheckinQuestions, updateLeadDetails } from '@/services/firebase';
import type { CheckinQuestion, Lead } from '@/lib/types';


export const CheckinAnalysisInputSchema = z.object({
  leadId: z.string(),
  audioDataUri: z.string().describe("The recorded check-in conversation as a data URI."),
  leadProfile: z.string().describe("A summary of the lead's profile."),
});
export type CheckinAnalysisInput = z.infer<typeof CheckinAnalysisInputSchema>;

export const CheckinAnalysisSchema = z.object({
  summary: z.string().describe("A concise summary of the entire conversation."),
  painPoints: z.array(z.string()).describe("A list of pain points or challenges mentioned by the lead."),
  actionItems: z.array(z.string()).describe("A list of clear, actionable next steps for the sales representative based on the conversation."),
  checkinQuestions: z.array(z.object({
      question: z.string(),
      answer: z.union([z.string(), z.array(z.string())]),
  })).describe("An array of answers to the standard check-in questions, extracted from the conversation."),
  transcript: z.string().describe("The full transcript of the conversation."),
});
export type CheckinAnalysis = z.infer<typeof CheckinAnalysisSchema>;


const checkinQuestionsList = [
    "Do you have a relationship with Australia Post?",
    "What do you use them for?",
    "Do you drop it off or do they come here? (Answer should be 'Drop-off', 'They collect', or both)",
    "Do you pay for the service?",
    "Do you use any other couriers?",
    "Which Courier do you use? (List them)",
    "Do you have any need for local same-day deliveries?",
    "Do people leave the office during the day?",
    "What are the reasons people leave the office? (e.g., Banking, Post office)",
];

const analyzeCheckinPrompt = ai.definePrompt({
    name: 'analyzeCheckinPrompt',
    input: { schema: z.object({ leadProfile: z.string(), audioDataUri: z.string() }) },
    output: { schema: CheckinAnalysisSchema },
    prompt: `You are an expert sales call analyst for MailPlus. Your task is to transcribe and analyze the following recorded field sales check-in conversation.

    **Lead Profile:**
    {{{leadProfile}}}

    **Conversation Audio:**
    {{media url=audioDataUri}}

    **Your Tasks:**
    1.  **Transcribe the conversation:** Provide a full, accurate transcript of the audio.
    2.  **Summarize the conversation:** Provide a brief summary of the key discussion points.
    3.  **Identify Pain Points:** List any challenges or problems the lead mentioned regarding their current shipping, mail, or logistics processes.
    4.  **Define Action Items:** Create a list of clear, actionable next steps for the sales representative.
    5.  **Answer Check-in Questions:** Based *only* on the transcript, answer the following questions. If the information is not mentioned, leave the answer as an empty string or empty array.
        - ${checkinQuestionsList.join("\n        - ")}

    Provide the output in the specified JSON format.
    `,
});

export const analyzeCheckinFlow = ai.defineFlow(
    {
        name: 'analyzeCheckinFlow',
        inputSchema: CheckinAnalysisInputSchema,
        outputSchema: CheckinAnalysisSchema,
    },
    async ({ leadId, audioDataUri, leadProfile }) => {
        const { output } = await analyzeCheckinPrompt({ audioDataUri, leadProfile });

        if (!output) {
            throw new Error("AI failed to generate check-in analysis.");
        }

        // Save the analysis to Firebase
        await updateLeadCheckinQuestions(leadId, output.checkinQuestions as CheckinQuestion[]);
        await updateLeadDetails(leadId, { id: leadId } as Lead, { companyDescription: output.summary });

        return output;
    }
);

export async function analyzeCheckin(input: CheckinAnalysisInput): Promise<CheckinAnalysis> {
    return analyzeCheckinFlow(input);
}
