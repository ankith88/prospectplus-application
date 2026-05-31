import { adminDb } from '@/services/firebase-server';
import { BrandProfile } from '@/lib/types';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeCampaignsOutputSchema = z.object({
  topPerformingKeywords: z.array(z.string()).describe('List of keywords that appeared in the most successful campaigns.'),
  learnedBehaviorModifiers: z.string().describe('A paragraph describing what we learned (e.g. "Short subjects with urgency work best").')
});

const analyzeCampaignsPrompt = ai.definePrompt({
  name: 'analyzeCampaignsPrompt',
  output: { schema: AnalyzeCampaignsOutputSchema },
  prompt: `You are an AI Marketing Data Analyst. Review the following campaign performance metrics and extract the top performing keywords and learned behavioral modifiers to guide future marketing efforts.

Campaign Data:
{{{campaignData}}}
`
});

/**
 * Aggregates campaign performance data and updates the BrandProfile's marketingBrainContext
 * using AI to synthesize the learnings.
 * This function can be triggered via a cron job, a manual admin button, or as part of a background hook.
 */
export async function updateMarketingBrainContext() {
  try {
    console.log('Starting marketing brain context update...');

    // 1. Fetch historical campaigns (this assumes a marketing_templates or campaigns collection exists with metrics)
    const templatesSnap = await adminDb.collection('marketing_templates').limit(50).get();
    
    if (templatesSnap.empty) {
      console.log('No marketing templates found to analyze.');
      return;
    }

    const campaignData = templatesSnap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        name: data.name,
        subject: data.subject,
        // Mocking metrics if they don't exist yet, in reality these would come from sendgrid/mailgun webhooks
        openRate: data.openRate || Math.random() * 0.4 + 0.1, 
        clickRate: data.clickRate || Math.random() * 0.1,
      };
    });

    const campaignDataStr = JSON.stringify(campaignData, null, 2);

    // 2. Use Genkit to analyze the data and generate insights
    const { output } = await analyzeCampaignsPrompt({
      campaignData: campaignDataStr
    } as any);

    if (!output) {
      throw new Error("Failed to generate marketing insights.");
    }

    // 3. Update the default_company Brand Profile
    const profileRef = adminDb.collection('brandProfiles').doc('default_company');
    
    await profileRef.set({
      marketingBrainContext: {
        topPerformingKeywords: output.topPerformingKeywords,
        learnedBehaviorModifiers: output.learnedBehaviorModifiers,
        lastAnalysisTimestamp: new Date().toISOString()
      }
    }, { merge: true });

    console.log('Marketing brain context updated successfully.', output);
    return output;

  } catch (error) {
    console.error('Error updating marketing brain context:', error);
    throw error;
  }
}
