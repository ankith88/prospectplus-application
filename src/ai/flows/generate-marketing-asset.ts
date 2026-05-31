'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { adminDb } from '@/services/firebase-server';
import { BrandProfile } from '@/lib/types';

const GenerateMarketingAssetInputSchema = z.object({
  assetType: z.enum(['email', 'playbook', 'social_post', 'sms']).describe('The type of marketing asset to generate.'),
  targetICP: z.string().describe('The Ideal Customer Profile or specific audience segment to target.'),
  performanceHistory: z.string().describe('Summary of past performance data to influence the generation.'),
  additionalContext: z.string().optional().describe('Any other instructions (e.g., call to action).')
});

export type GenerateMarketingAssetInput = z.infer<typeof GenerateMarketingAssetInputSchema>;

const GenerateMarketingAssetOutputSchema = z.object({
  subject: z.string().optional().describe('The subject line if generating an email.'),
  body: z.string().describe('The generated marketing asset content. HTML if email.'),
  reasoning: z.string().describe('Brief explanation of why this copy fits the brand strategy and past performance.')
});

export type GenerateMarketingAssetOutput = z.infer<typeof GenerateMarketingAssetOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateMarketingAssetPrompt',
  input: { schema: GenerateMarketingAssetInputSchema },
  output: { schema: GenerateMarketingAssetOutputSchema },
  prompt: `You are an expert AI Marketing Strategist.
Your goal is to generate a high-performing marketing asset based on the brand's core strategy, voice guidelines, and past performance history.

Asset Type: {{{assetType}}}
Target Audience: {{{targetICP}}}
Performance History Insights: {{{performanceHistory}}}
Additional Context: {{{additionalContext}}}

--- BRAND PROFILE (Follow this strictly) ---
{{#if brandProfile}}
Positioning: {{{brandProfile.strategy.positioning}}}
Messaging Framework: {{{brandProfile.strategy.brandMessaging}}}
Key Offers:
{{#each brandProfile.strategy.offers}}
- {{this}}
{{/each}}

Voice & Tone Keywords:
{{#each brandProfile.voice.toneKeywords}}
- {{this}}
{{/each}}

"Sounds Like Us" Examples (Emulate this tone):
{{#each brandProfile.voice.soundsLikeUsExamples}}
- "{{this}}"
{{/each}}
{{else}}
Use standard professional B2B SaaS tone.
{{/if}}
--------------------------------------------

Instructions:
1. If the assetType is 'email', generate an engaging subject line and an HTML body. Use standard HTML tags and include personalization variables like {{Contact.Name}} and {{Company.Name}} if appropriate.
2. If it's a 'playbook' or 'social_post', the body should be plain text or markdown formatted suitably.
3. Incorporate the core positioning and offers into the copy.
4. Adapt the messaging based on the Performance History Insights (e.g., if short emails perform better, keep it concise).
5. Ensure the tone matches the Voice Keywords and Examples.

Generate the output containing the subject (if applicable), the body, and the reasoning behind your choices.`
});

export const generateMarketingAssetFlow = ai.defineFlow(
  {
    name: 'generateMarketingAssetFlow',
    inputSchema: GenerateMarketingAssetInputSchema,
    outputSchema: GenerateMarketingAssetOutputSchema,
  },
  async (input) => {
    // Fetch the brand profile securely on the server
    let brandProfile: BrandProfile | null = null;
    try {
      const docSnap = await adminDb.collection('brandProfiles').doc('default_company').get();
      if (docSnap.exists) {
        brandProfile = docSnap.data() as BrandProfile;
      }
    } catch (error) {
      console.error("Failed to fetch brand profile for AI generation", error);
    }

    const { output } = await prompt({
      ...input,
      brandProfile, // pass context to the prompt
    } as any);

    if (!output) {
      throw new Error("AI failed to generate a marketing asset.");
    }
    
    return output;
  }
);

export async function generateMarketingAsset(
  input: GenerateMarketingAssetInput
): Promise<GenerateMarketingAssetOutput> {
  return generateMarketingAssetFlow(input);
}
