'use server';
/**
 * @fileOverview An AI flow to analyze a sales visit note and extract structured data.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VisitNoteAnalysisSchema = z.object({
  companyName: z.string().optional().describe("The name of the company visited."),
  address: z.string().optional().describe("The full address of the company."),
  contactName: z.string().optional().describe("The name of the person spoken with."),
  contactDetails: z.string().optional().describe("The contact person's title, email, or phone number."),
  outcome: z.string().optional().describe("The summary of the visit's outcome."),
  actionItems: z.array(z.string()).optional().describe("A list of clear, actionable next steps."),
});
export type VisitNoteAnalysis = z.infer<typeof VisitNoteAnalysisSchema>;

const analyzeVisitNotePrompt = ai.definePrompt({
    name: 'analyzeVisitNotePrompt',
    input: { schema: z.object({ noteContent: z.string() }) },
    output: { schema: VisitNoteAnalysisSchema },
    prompt: `You are an expert data entry assistant. Your task is to analyze a sales visit note and extract key information into a structured JSON format. Be concise and extract only the specific information requested for each field.

    Note:
    """
    {{{noteContent}}}
    """

    Your Tasks:
    1.  **companyName**: Extract only the company name.
    2.  **address**: Extract only the full street address.
    3.  **contactName**: Extract only the full name of the person they spoke with.
    4.  **contactDetails**: Extract only the contact person's title, email, or phone number.
    5.  **outcome**: Briefly summarize the outcome of the visit. Do not repeat company name or contact details here.
    6.  **actionItems**: List any clear, actionable next steps.

    Provide the output in the specified JSON format. If a piece of information is not present, omit the field. Do not include any information in a field that belongs in another (e.g., don't put the address in the companyName field).
    `,
});

export async function analyzeVisitNote(noteContent: string): Promise<VisitNoteAnalysis> {
    const { output } = await analyzeVisitNotePrompt({ noteContent });
    if (!output) {
        throw new Error("AI failed to analyze the visit note.");
    }
    return output;
}
