'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CompanyInsightOutputSchema = z.object({
  companyName: z.string().optional().describe("The name of the company or brand."),
  industry: z.string().optional().describe("The primary industry of the company (e.g. E-commerce, Retail, Manufacturing, Professional Services, etc.)."),
  productsServices: z.string().optional().describe("A summary of the products or services offered by the company."),
  targetAudience: z.string().optional().describe("The target audience or ideal customer profile of the company."),
  valueProposition: z.string().optional().describe("The core value proposition or selling point of the company."),
  shippingLogisticsNeeds: z.string().optional().describe("Analysis of their likely shipping/logistics needs. For example, do they sell physical products online? Do they ship B2B? Do they ship express? Mention what they might need from a parcel delivery service (like MailPlus)."),
  talkingPoints: z.array(z.string()).optional().describe("A list of 3-5 custom suggested talking points that a sales rep can use when calling this lead, based on the website content."),
  rawSummary: z.string().optional().describe("A comprehensive summary of the company's business based on website content."),
  extractedEmails: z.array(z.string()).optional().describe("Extracted email addresses."),
  extractedPhones: z.array(z.string()).optional().describe("Extracted phone numbers."),
});

const CompanyInsightInputSchema = z.object({
  websiteUrl: z.string().describe("The website URL to scan."),
});

const companyInsightPrompt = ai.definePrompt({
  name: 'companyInsightPrompt',
  input: { schema: z.object({ siteContent: z.string() }) },
  output: { schema: CompanyInsightOutputSchema },
  prompt: `You are an expert sales analyst and researcher. Your goal is to analyze the extracted website content of a company and generate a comprehensive set of company insights and sales talking points that will help a sales representative when calling the company.

  In particular, look for:
  1. The core products and services they offer.
  2. Who their target audience is.
  3. Their main value proposition.
  4. Likely shipping, logistics, and parcel delivery needs. Note that MailPlus offers next-day express parcel shipping within Australia (typically packages from 1kg to 20kg). Determine if they send physical items, require courier pick-up, B2B shipping, or e-commerce delivery integrations.
  5. 3-5 tailored talking points that build instant rapport (e.g., mentioning their specific products, asking about their delivery volumes, or referring to their current logistics constraints).

  Here is the extracted website text content:
  """
  {{{siteContent}}}
  """
  `,
});

export const gatherCompanyInsightsFlow = ai.defineFlow(
  {
    name: 'gatherCompanyInsightsFlow',
    inputSchema: CompanyInsightInputSchema,
    outputSchema: CompanyInsightOutputSchema,
  },
  async ({ websiteUrl }) => {
    let targetUrl = websiteUrl;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    let siteContent = '';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, 15000); // 15-second timeout

      const response = await fetch(targetUrl, { signal: controller.signal as any });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Failed to fetch website. Status: ${response.status}`);
      }

      const html = await response.text();
      // Basic HTML stripping
      siteContent = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error: any) {
      console.error(`Error fetching website for company insights:`, error);
      throw new Error(`Could not access or read website: ${error.message || error}`);
    }

    if (!siteContent || siteContent.length < 50) {
      throw new Error(`The website returned no readable text content.`);
    }

    // Limit text size to prevent token limit issues (10000 chars is usually enough for homepage text)
    const truncatedText = siteContent.substring(0, 10000);

    const { output } = await companyInsightPrompt({ siteContent: truncatedText });
    if (!output) {
      throw new Error("AI failed to generate insights from the website content.");
    }

    // Extract emails and phone numbers from raw text using regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?61|0)[2-478](?:[ -]?[0-9]){8}/g;

    const emails = Array.from(new Set(truncatedText.match(emailRegex) || []));
    const phones = Array.from(new Set(truncatedText.match(phoneRegex) || []));

    return {
      ...output,
      extractedEmails: emails,
      extractedPhones: phones,
    };
  }
);

export async function gatherCompanyInsights(input: z.infer<typeof CompanyInsightInputSchema>) {
  try {
    const result = await gatherCompanyInsightsFlow(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error in gatherCompanyInsights Server Action:", error);
    return { success: false, error: error.message || String(error) };
  }
}
