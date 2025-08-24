
'use server';

/**
 * @fileOverview A Genkit flow for analyzing a call transcript.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { updateTranscriptAnalysis } from '@/services/firebase';

const AnalyzeTranscriptInputSchema = z.object({
  leadId: z.string().describe('The ID of the lead the transcript belongs to.'),
  transcriptId: z.string().describe('The ID of the transcript to analyze.'),
  transcriptContent: z.string().describe('The full content of the transcript, formatted as a conversation.'),
});
export type AnalyzeTranscriptInput = z.infer<typeof AnalyzeTranscriptInputSchema>;

const TranscriptAnalysisSchema = z.object({
  summary: z.string().describe('A concise summary of the entire conversation.'),
  sentiment: z.enum(['Positive', 'Negative', 'Neutral']).describe('The overall sentiment of the conversation.'),
  actionItems: z.array(z.string()).describe('A list of clear action items or next steps identified from the call.'),
  keyTopics: z.array(z.string()).describe('The main topics or keywords discussed during the call.'),
});

const AnalyzeTranscriptOutputSchema = z.object({
    analysis: TranscriptAnalysisSchema,
    error: z.string().optional(),
});
export type AnalyzeTranscriptOutput = z.infer<typeof AnalyzeTranscriptOutputSchema>;


export async function analyzeTranscript(input: AnalyzeTranscriptInput): Promise<AnalyzeTranscriptOutput> {
    return analyzeTranscriptFlow(input);
}


const analyzeTranscriptPrompt = ai.definePrompt({
    name: 'analyzeTranscriptPrompt',
    input: { schema: z.object({ transcriptContent: z.string() }) },
    output: { schema: TranscriptAnalysisSchema },
    prompt: `You are an expert sales call analyst. Your task is to analyze the following call transcript and extract key information.

    Please provide:
    1.  A brief summary of the conversation.
    2.  The overall sentiment of the call (Positive, Negative, or Neutral).
    3.  A list of any action items or follow-ups mentioned. If none, return an empty array.
    4.  The key topics that were discussed.

    Transcript:
    """
    {{{transcriptContent}}}
    """

    Provide the output in the specified JSON format.
    `,
});


const analyzeTranscriptFlow = ai.defineFlow(
  {
    name: 'analyzeTranscriptFlow',
    inputSchema: AnalyzeTranscriptInputSchema,
    outputSchema: AnalyzeTranscriptOutputSchema,
  },
  async ({ leadId, transcriptId, transcriptContent }) => {
    try {
        const { output } = await analyzeTranscriptPrompt({ transcriptContent });
        
        if (!output) {
            throw new Error("AI failed to generate transcript analysis.");
        }

        // Save the analysis to the transcript document in Firebase
        await updateTranscriptAnalysis(leadId, transcriptId, output);

        return { analysis: output };
    } catch (error: any) {
        console.error('Error analyzing transcript:', error);
        return { analysis: {} as any, error: `An unexpected error occurred: ${error.message}` };
    }
  }
);
