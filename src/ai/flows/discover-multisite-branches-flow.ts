'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DiscoveredBranchSchema = z.object({
  name: z.string().describe("Name of the branch or location (e.g. 'Sydney Office', 'Melbourne Distribution Center', 'Parramatta Store')"),
  street: z.string().optional().describe("Street address if available"),
  suburb: z.string().describe("Suburb, town, or city in Australia"),
  state: z.string().describe("Australian state abbreviation (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)"),
  postcode: z.string().optional().describe("Postal code if available"),
  fullAddress: z.string().describe("Complete formatted address string"),
  phone: z.string().optional().describe("Branch direct phone number"),
  email: z.string().optional().describe("Branch direct email"),
  source: z.string().optional().describe("Discovery source tag: AI / Website / Hunter.io"),
});

const DiscoverBranchesOutputSchema = z.object({
  companyName: z.string().optional(),
  websiteUrl: z.string().optional(),
  companySummary: z.string().optional().describe("Brief analysis of company branch footprint in Australia"),
  branches: z.array(DiscoveredBranchSchema),
  extractedEmails: z.array(z.string()).optional(),
  extractedPhones: z.array(z.string()).optional(),
});

const DiscoverBranchesInputSchema = z.object({
  companyName: z.string().describe("The company name to discover branches for."),
  websiteUrl: z.string().optional().describe("Website URL of the company."),
});

const discoverBranchesPrompt = ai.definePrompt({
  name: 'discoverBranchesPrompt',
  input: {
    schema: z.object({
      companyName: z.string(),
      websiteUrl: z.string().optional(),
      siteContent: z.string(),
    }),
  },
  output: { schema: DiscoverBranchesOutputSchema },
  prompt: `You are an expert enterprise research agent specializing in Australian company footprints.
Your job is to analyze the extracted website content for "{{companyName}}" (Website: {{websiteUrl}}) and extract ALL branch locations, offices, warehouses, depots, or retail store locations across Australia.

Extract each branch with:
- Branch name or title
- Street address (if mentioned)
- Suburb/City
- State (MUST use valid Australian state code: NSW, VIC, QLD, WA, SA, TAS, ACT, NT)
- Postcode (if mentioned)
- Full formatted address
- Phone number / Email for that specific location (if available)

Website Content:
"""
{{{siteContent}}}
"""
`,
});

export const discoverCompanyBranchesFlow = ai.defineFlow(
  {
    name: 'discoverCompanyBranchesFlow',
    inputSchema: DiscoverBranchesInputSchema,
    outputSchema: DiscoverBranchesOutputSchema,
  },
  async ({ companyName, websiteUrl }) => {
    let siteContent = '';
    const fetchedPages: string[] = [];

    let targetUrl = websiteUrl?.trim();
    if (!targetUrl && companyName) {
      const clean = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.length > 2) {
        targetUrl = `https://www.${clean}.com.au`;
      }
    }

    if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    if (targetUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(targetUrl, { signal: controller.signal as any });
        clearTimeout(timeout);

        if (res.ok) {
          const html = await res.text();
          const homepageText = html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          fetchedPages.push(homepageText.substring(0, 8000));

          // Look for location / contact / store links in HTML
          const linkRegex = /href=["']([^"']*(?:location|store|branch|contact|about|depot|find-us)[^"']*)["']/gi;
          let match;
          const locationLinks = new Set<string>();
          while ((match = linkRegex.exec(html)) !== null) {
            let link = match[1];
            if (link.startsWith('/')) {
              try {
                const parsedUrl = new URL(targetUrl);
                link = `${parsedUrl.origin}${link}`;
              } catch (e) {
                continue;
              }
            }
            if (/^https?:\/\//i.test(link) && locationLinks.size < 3) {
              locationLinks.add(link);
            }
          }

          // Fetch subpages in parallel
          const subpagePromises = Array.from(locationLinks).map(async (url) => {
            try {
              const subCtrl = new AbortController();
              const subTimeout = setTimeout(() => subCtrl.abort(), 8000);
              const subRes = await fetch(url, { signal: subCtrl.signal as any });
              clearTimeout(subTimeout);
              if (subRes.ok) {
                const subHtml = await subRes.text();
                return subHtml
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .substring(0, 8000);
              }
            } catch (e) {
              // Ignore subpage fetch errors
            }
            return null;
          });

          const subpages = await Promise.all(subpagePromises);
          subpages.forEach((p) => p && fetchedPages.push(p));
        }
      } catch (err) {
        console.warn(`Web scraper warning for ${companyName}:`, err);
      }
    }

    siteContent = fetchedPages.join('\n--- PAGE SEPARATOR ---\n');

    // Hunter.io API Integration if configured
    const hunterBranches: z.infer<typeof DiscoveredBranchSchema>[] = [];
    if (targetUrl) {
      try {
        const apiKey = process.env.HUNTER_API_KEY;
        if (apiKey) {
          const domainMatch = targetUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
          if (domainMatch) {
            const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${domainMatch}&api_key=${apiKey}&type=personal`;
            const hCtrl = new AbortController();
            const hTimeout = setTimeout(() => hCtrl.abort(), 8000);
            const hRes = await fetch(hunterUrl, { signal: hCtrl.signal as any });
            clearTimeout(hTimeout);
            if (hRes.ok) {
              const hData = (await hRes.json()) as any;
              const org = hData?.data?.organization || companyName;
              const city = hData?.data?.city;
              const state = hData?.data?.state;
              const street = hData?.data?.street;
              const postalCode = hData?.data?.postal_code;
              if (city || state || street) {
                hunterBranches.push({
                  name: `${org} Head Office / Primary Site`,
                  street: street || undefined,
                  suburb: city || 'Australia',
                  state: state || 'AU',
                  postcode: postalCode || undefined,
                  fullAddress: [street, city, state, postalCode, 'Australia'].filter(Boolean).join(', '),
                  phone: hData?.data?.phone_number || undefined,
                  email: hData?.data?.email || undefined,
                  source: 'Hunter.io',
                });
              }
            }
          }
        }
      } catch (hunterErr) {
        console.warn('Hunter.io fetch warning:', hunterErr);
      }
    }

    if (!siteContent || siteContent.length < 50) {
      return {
        companyName,
        websiteUrl,
        companySummary: `No detailed website text found for ${companyName}.`,
        branches: hunterBranches,
      };
    }

    const truncatedText = siteContent.substring(0, 20000);
    const { output } = await discoverBranchesPrompt({
      companyName,
      websiteUrl,
      siteContent: truncatedText,
    });

    const aiBranches = (output?.branches || []).map((b) => ({
      ...b,
      source: 'AI / Website',
    }));

    // Deduplicate Hunter and AI branches
    const allBranches = [...aiBranches, ...hunterBranches];
    const uniqueBranches = allBranches.filter(
      (b, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.fullAddress.toLowerCase() === b.fullAddress.toLowerCase() ||
            (t.suburb.toLowerCase() === b.suburb.toLowerCase() && t.state.toLowerCase() === b.state.toLowerCase())
        )
    );

    return {
      companyName,
      websiteUrl,
      companySummary: output?.companySummary || `Discovered ${uniqueBranches.length} branch locations online.`,
      branches: uniqueBranches,
    };
  }
);

export async function discoverCompanyBranches(input: z.infer<typeof DiscoverBranchesInputSchema>) {
  try {
    const result = await discoverCompanyBranchesFlow(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error in discoverCompanyBranches action:', error);
    return { success: false, error: error.message || String(error) };
  }
}
