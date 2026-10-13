import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateLeadDossier } from '@/services/agent-reach/lead-dossier';

const DeepResearchInputSchema = z.object({
  leadId: z.string(),
  companyName: z.string(),
  websiteUrl: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
});

const DeepResearchOutputSchema = z.object({
  officialWebsite: z.string().optional(),
  verifiedDomain: z.string().optional(),
  summary: z.string(),
  decisionMakers: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      department: z.string().optional(),
      linkedinUrl: z.string().optional(),
      snippet: z.string().optional(),
      confidence: z.enum(['High', 'Medium', 'Low']).optional(),
    })
  ),
  carriersDetected: z.array(z.string()),
  dispatchLocations: z.array(z.string()),
  cutoffTimes: z.string().optional(),
  socialFootprint: z.object({
    instagramHandle: z.string().optional(),
    instagramUrl: z.string().optional(),
    facebookUrl: z.string().optional(),
    followersCount: z.string().optional(),
    shippingSentiment: z.string().optional(),
  }),
  coldCallBattlecard: z.object({
    tailoredOpener: z.string().describe('High-converting cold call phone opener tailored to this exact business and their shipping profile.'),
    topValueDrivers: z.array(z.string()).describe('Top 3 MailPlus value propositions for this prospect.'),
    objectionHandling: z.string().describe('How to position MailPlus against their currently detected parcel carrier.'),
  }),
});

const battlecardPrompt = ai.definePrompt({
  name: 'battlecardPrompt',
  input: {
    schema: z.object({
      companyName: z.string(),
      websiteUrl: z.string().optional(),
      carriersDetected: z.array(z.string()),
      cutoffTimes: z.string().optional(),
      decisionMakerName: z.string().optional(),
      decisionMakerTitle: z.string().optional(),
      shippingSentiment: z.string().optional(),
      logisticsSnippets: z.array(z.string()),
    }),
  },
  output: {
    schema: z.object({
      tailoredOpener: z.string(),
      topValueDrivers: z.array(z.string()),
      objectionHandling: z.string(),
    }),
  },
  prompt: `You are an elite B2B sales strategist for MailPlus Australia (express parcel delivery up to 5kg, Post Office runs, dedicated owner-operator daily pickups, free ShipMate e-commerce platform for Shopify/WooCommerce).

Generate an aggressive, highly personalized cold call battlecard for a sales representative calling:
Company: {{companyName}}
Website: {{websiteUrl}}
Target Contact: {{decisionMakerName}} ({{decisionMakerTitle}})
Detected Carriers: {{#each carriersDetected}}{{{this}}}, {{/each}}
Cutoff Times: {{cutoffTimes}}
Social Shipping Sentiment: {{shippingSentiment}}
Logistics Evidence:
{{#each logisticsSnippets}}
- {{{this}}}
{{/each}}

Create:
1. tailoredOpener: 2-3 sentences opening the call with instant rapport, acknowledging their dispatch volume and carrier setup, and establishing relevance immediately without sounding generic.
2. topValueDrivers: 3 bullet points with specific MailPlus advantages (guaranteed owner-operator pickup, flat-rate pricing up to 5kg, ShipMate automation).
3. objectionHandling: How to counter their current carrier setup (especially if they use Australia Post / StarTrack / Sendle).
`,
});

export const deepLeadResearchFlow = ai.defineFlow(
  {
    name: 'deepLeadResearchFlow',
    inputSchema: DeepResearchInputSchema,
    outputSchema: DeepResearchOutputSchema,
  },
  async (input) => {
    // 1. Run Agent Reach research dossier
    const dossier = await generateLeadDossier(input);

    const topContact = dossier.decisionMakers[0];

    // 2. Run Gemini battlecard generator
    const { output: battlecard } = await battlecardPrompt({
      companyName: input.companyName,
      websiteUrl: dossier.officialWebsite || input.websiteUrl,
      carriersDetected: dossier.logisticsSignals?.carrierDetected || [],
      cutoffTimes: dossier.logisticsSignals?.cutoffTimes,
      decisionMakerName: topContact?.name,
      decisionMakerTitle: topContact?.title,
      shippingSentiment: dossier.socialIntelligence?.shippingSentiment,
      logisticsSnippets: dossier.logisticsSignals?.rawSnippets || [],
    });

    return {
      officialWebsite: dossier.officialWebsite,
      verifiedDomain: dossier.verifiedDomain,
      summary: dossier.summary,
      decisionMakers: dossier.decisionMakers,
      carriersDetected: dossier.logisticsSignals?.carrierDetected || [],
      dispatchLocations: dossier.logisticsSignals?.dispatchLocations || [],
      cutoffTimes: dossier.logisticsSignals?.cutoffTimes,
      socialFootprint: {
        instagramHandle: dossier.socialIntelligence?.instagramHandle,
        instagramUrl: dossier.socialIntelligence?.instagramUrl,
        facebookUrl: dossier.socialIntelligence?.facebookUrl,
        followersCount: dossier.socialIntelligence?.followersCount,
        shippingSentiment: dossier.socialIntelligence?.shippingSentiment,
      },
      coldCallBattlecard: battlecard || {
        tailoredOpener: `Hi ${topContact?.name || 'there'}, this is MailPlus. We provide dedicated daily parcel pickups for Australian businesses like ${input.companyName}.`,
        topValueDrivers: [
          'Guaranteed local owner-operator driver pickup every afternoon',
          'National 1-2 day express parcel delivery flat-rate up to 5kg',
          'Free ShipMate platform with Shopify & WooCommerce integrations',
        ],
        objectionHandling: 'We complement Australia Post lodgements or replace unreliable courier pickups with dedicated drivers.',
      },
    };
  }
);
