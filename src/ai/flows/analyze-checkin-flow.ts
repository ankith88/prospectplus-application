
'use server';
/**
 * @fileOverview An AI flow to analyze a recorded sales check-in conversation.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { updateLeadDiscoveryData, updateLeadDetails } from '@/services/firebase';
import type { Lead } from '@/lib/types';
import { calculateScoreAndRouting } from '@/lib/discovery-scoring';


const CheckinAnalysisInputSchema = z.object({
  leadId: z.string(),
  audioDataUri: z.string().describe("The recorded check-in conversation as a data URI."),
  leadProfile: z.string().describe("A summary of the lead's profile."),
});
export type CheckinAnalysisInput = z.infer<typeof CheckinAnalysisInputSchema>;

const DiscoveryDataSchema = z.object({
  discoverySignals: z.array(z.string()).optional(),
  inconvenience: z.enum(['Very inconvenient', 'Somewhat inconvenient', 'Not a big issue']).optional(),
  occurrence: z.enum(['Daily', 'Weekly', 'Ad-hoc']).optional(),
  recurring: z.enum(['Yes - predictable', 'Sometimes', 'One-off']).optional(),
});

const CheckinAnalysisSchema = z.object({
  summary: z.string().describe("A concise summary of the entire conversation."),
  painPoints: z.array(z.string()).describe("A list of pain points or challenges mentioned by the lead."),
  actionItems: z.array(z.string()).describe("A list of clear, actionable next steps for the sales representative based on the conversation."),
  discoveryData: DiscoveryDataSchema.describe("Structured data from the field discovery questions."),
  transcript: z.string().describe("The full transcript of the conversation."),
  checkinScore: z.number().optional(),
  checkinRoutingTag: z.string().optional(),
  checkinScoringReason: z.string().optional(),
});
export type CheckinAnalysis = z.infer<typeof CheckinAnalysisSchema>;


const discoverySignals = [
  { id: 'pays_aus_post', label: 'Pays Australia Post' },
  { id: 'staff_handle_post', label: 'Staff Handle Post' },
  { id: 'drop_off_hassle', label: 'Drop-off is a Hassle' },
  { id: 'uses_couriers_lt_5kg', label: 'Uses Other Couriers (<5kg)' },
  { id: 'uses_couriers_100_plus', label: 'Uses Other Couriers (100+/wk)' },
  { id: 'banking_runs', label: 'Banking Runs' },
  { id: 'needs_same_day', label: 'Needs Same-Day Delivery' },
  { id: 'inter_office', label: 'Inter-Office Deliveries' },
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
    5.  **Field Discovery:** Based *only* on the transcript, extract the following information into the 'discoveryData' object.
        - **discoverySignals**: Identify which of the following signals are present in the conversation: ${discoverySignals.map(s => `'${s.label}'`).join(", ")}.
        - **inconvenience**: How inconvenient is their current process? ('Very inconvenient', 'Somewhat inconvenient', 'Not a big issue').
        - **occurrence**: How often does the inconvenience occur? ('Daily', 'Weekly', 'Ad-hoc').
        - **recurring**: Is this a recurring problem? ('Yes - predictable', 'Sometimes', 'One-off').

    Provide the output in the specified JSON format.
    `,
});

const analyzeCheckinFlow = ai.defineFlow(
    {
        name: 'analyzeCheckinFlow',
        inputSchema: CheckinAnalysisInputSchema,
        outputSchema: CheckinAnalysisSchema,
    },
    async ({ leadId, audioDataUri, leadProfile }) => {
        const { output: aiOutput } = await analyzeCheckinPrompt({ audioDataUri, leadProfile });

        if (!aiOutput) {
            throw new Error("AI failed to generate check-in analysis.");
        }

        const discoveryDataWithScore = calculateScoreAndRouting(aiOutput.discoveryData || {});
        
        await updateLeadDiscoveryData(leadId, discoveryDataWithScore);
        
        await updateLeadDetails(leadId, { id: leadId } as Lead, { companyDescription: aiOutput.summary });

        return {
            ...aiOutput,
            checkinScore: discoveryDataWithScore.score,
            checkinRoutingTag: discoveryDataWithScore.routingTag,
            checkinScoringReason: discoveryDataWithScore.scoringReason,
            discoveryData: discoveryDataWithScore,
        };
    }
);

export async function analyzeCheckin(input: CheckinAnalysisInput): Promise<CheckinAnalysis> {
    return analyzeCheckinFlow(input);
}
