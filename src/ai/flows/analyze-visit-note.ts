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
    prompt: `You are an expert data entry assistant. Analyze the following sales visit note and extract the key information.

    Note:
    """
    {{{noteContent}}}
    """

    Your Tasks:
    1.  Extract the company name.
    2.  Extract the full address.
    3.  Extract the name of the person they spoke with.
    4.  Extract any contact details for that person (title, email, phone).
    5.  Summarize the outcome of the visit.
    6.  List any action items.

    Provide the output in the specified JSON format. If a piece of information is not present, omit the field.
    `,
});

export async function analyzeVisitNote(noteContent: string): Promise<VisitNoteAnalysis> {
    const { output } = await analyzeVisitNotePrompt({ noteContent });
    if (!output) {
        throw new Error("AI failed to analyze the visit note.");
    }
    return output;
}
