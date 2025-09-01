
'use server';

/**
 * @fileOverview A Genkit flow for scoring a cold call based on a scorecard.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { updateScorecardAnalysis } from '@/services/firebase';

const ScorecardPillarScoreSchema = z.object({
    pillar: z.string().describe("The name of the performance pillar being scored (e.g., 'Frame Control', 'Diagnostic Acumen')."),
    score: z.number().min(0).max(10).describe("A numerical score from 0 to 10 for this pillar."),
    feedback: z.string().describe("Specific, actionable feedback for this pillar, explaining the reason for the score and providing suggestions for improvement.")
});

const ScorecardAnalysisSchema = z.object({
    overallScore: z.number().min(0).max(10).describe("The overall weighted score for the call, from 0 to 10."),
    overallFeedback: z.string().describe("A summary of the call's strengths and areas for improvement."),
    pillarScores: z.array(ScorecardPillarScoreSchema).length(6).describe("An array of scores and feedback for each of the 6 pillars.")
});
export type ScorecardAnalysis = z.infer<typeof ScorecardAnalysisSchema>;

const ScoreColdCallInputSchema = z.object({
  leadId: z.string(),
  scorecardId: z.string(),
  openingClarity: z.enum(['clear', 'unclear', 'somewhat_clear']),
  openingRapport: z.boolean(),
  diagnosticQuestionQuality: z.enum(['effective', 'ineffective', 'needs_improvement']),
  painPointIdentification: z.boolean(),
  pitchClarity: z.enum(['clear', 'unclear', 'somewhat_clear']),
  pitchRelevance: z.enum(['relevant', 'irrelevant', 'somewhat_relevant']),
  valuePropositionCommunicated: z.boolean(),
  nextStepsDefined: z.enum(['clear', 'unclear', 'not_defined']),
  objectionHandling: z.enum(['effective', 'ineffective', 'not_applicable']),
  callControl: z.enum(['strong', 'weak', 'moderate']),
  listeningSkills: z.enum(['strong', 'weak', 'moderate']),
  confidence: z.enum(['high', 'low', 'moderate']),
});
export type ScoreColdCallInput = z.infer<typeof ScoreColdCallInputSchema>;


export async function scoreColdCall(input: ScoreColdCallInput): Promise<ScorecardAnalysis> {
  const analysis = await scoreColdCallFlow(input);
  if (!analysis) {
    throw new Error('AI failed to generate scorecard analysis.');
  }
  await updateScorecardAnalysis(input.leadId, input.scorecardId, analysis);
  return analysis;
}

const scoreColdCallPrompt = ai.definePrompt({
  name: 'scoreColdCallPrompt',
  input: { schema: ScoreColdCallInputSchema },
  output: { schema: ScorecardAnalysisSchema },
  prompt: `You are an expert sales coach tasked with analyzing a cold call based on a submitted scorecard. Your analysis should be objective, constructive, and actionable.

Evaluate the call based on the following 6 pillars:
1.  **Frame Control:** Did the dialer lead the conversation confidently and maintain control?
2.  **Diagnostic Acumen:** Were the questions effective in uncovering the lead's needs and pain points?
3.  **Product Knowledge:** Was the value proposition clear, relevant, and well-communicated?
4.  **Closing Technique:** Were clear next steps established? Was objection handling effective?
5.  **Rapport Building:** Did the dialer build a connection with the lead?
6.  **Communication Clarity:** Was the dialer's communication clear, concise, and professional?

Based on the scorecard data below, provide a score (0-10) and specific feedback for each pillar. Then, calculate a weighted overall score and provide summary feedback.

**Scorecard Data:**
- **Opening Clarity:** {{{openingClarity}}}
- **Built Rapport:** {{{openingRapport}}}
- **Diagnostic Question Quality:** {{{diagnosticQuestionQuality}}}
- **Identified Pain Points:** {{{painPointIdentification}}}
- **Pitch Clarity:** {{{pitchClarity}}}
- **Pitch Relevance:** {{{pitchRelevance}}}
- **Value Proposition Communicated:** {{{valuePropositionCommunicated}}}
- **Next Steps Defined:** {{{nextStepsDefined}}}
- **Objection Handling:** {{{objectionHandling}}}
- **Call Control:** {{{callControl}}}
- **Listening Skills:** {{{listeningSkills}}}
- **Confidence:** {{{confidence}}}

**Weighting for Overall Score:**
- Frame Control: 15%
- Diagnostic Acumen: 25%
- Product Knowledge: 20%
- Closing Technique: 20%
- Rapport Building: 10%
- Communication Clarity: 10%

Please return your analysis in the specified JSON format. The 'pillarScores' array must contain exactly 6 items, one for each pillar in the order listed above.
`,
});

const scoreColdCallFlow = ai.defineFlow(
  {
    name: 'scoreColdCallFlow',
    inputSchema: ScoreColdCallInputSchema,
    outputSchema: ScorecardAnalysisSchema,
  },
  async (input) => {
    const { output } = await scoreColdCallPrompt(input);
    if (!output) {
        throw new Error('Failed to get a response from the AI model.');
    }
    return output;
  }
);
