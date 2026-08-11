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
  source: z.string().optional().describe("Discovery source tag: AI / Web Search / Hunter.io / Google Search"),
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
Your job is to analyze the extracted web search snippets, website content, store locator pages, and Hunter.io records for "{{companyName}}" (Website: {{websiteUrl}}) and extract ALL branch locations, offices, warehouses, depots, or retail store locations across Australia.

Instructions:
1. Examine all scraped pages, "Where We Are" navigation lists, and office subpages.
2. Extract every single branch, city office (e.g. Sydney, Melbourne, Brisbane, Perth, Canberra, Darwin, Adelaide, Gold Coast, Newcastle), warehouse, or depot location.
3. For each location, extract:
   - Branch name or title (e.g. "{{companyName}} - Sydney", "{{companyName}} Melbourne Office")
   - Street address (if mentioned)
   - Suburb/City (in Australia)
   - State (MUST use valid Australian state code: NSW, VIC, QLD, WA, SA, TAS, ACT, NT)
   - Postcode (if mentioned)
   - Full formatted address
   - Phone number / Email for that specific location (if available)

Scraped Content & Search Results:
"""
{{{siteContent}}}
"""
`,
});

function cleanHtmlText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchWebForQuery(query: string): Promise<{ snippets: string[]; urls: string[] }> {
  const snippets: string[] = [];
  const urls: string[] = [];
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(searchUrl, {
      signal: controller.signal as any,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      const cleaned = cleanHtmlText(html);
      snippets.push(cleaned.substring(0, 6000));

      // Extract result URLs
      const urlRegex = /class="result__url"[^>]*href="([^"]+)"/gi;
      let match;
      while ((match = urlRegex.exec(html)) !== null) {
        let url = match[1];
        if (url.includes('uddg=')) {
          const actualUrl = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
          if (/^https?:\/\//i.test(actualUrl) && !actualUrl.includes('duckduckgo.com')) {
            urls.push(actualUrl);
          }
        } else if (/^https?:\/\//i.test(url)) {
          urls.push(url);
        }
      }
    }
  } catch (err) {
    console.warn(`Web search warning for query "${query}":`, err);
  }
  return { snippets, urls };
}

export const discoverCompanyBranchesFlow = ai.defineFlow(
  {
    name: 'discoverCompanyBranchesFlow',
    inputSchema: DiscoverBranchesInputSchema,
    outputSchema: DiscoverBranchesOutputSchema,
  },
  async ({ companyName, websiteUrl }) => {
    const fetchedPages: string[] = [];
    const hunterBranches: z.infer<typeof DiscoveredBranchSchema>[] = [];
    let resolvedWebsiteUrl = websiteUrl;

    // --- STEP 1: Web Search for Store Locators / Branches / Domain if missing ---
    const coreName = companyName.split(' - ')[0].trim();
    const searchQuery = `${coreName} Australia store locator locations offices branches`;
    const searchResults = await searchWebForQuery(searchQuery);

    if (searchResults.snippets.length > 0) {
      fetchedPages.push(`--- GOOGLE / WEB SEARCH SNIPPETS FOR "${searchQuery}" ---\n${searchResults.snippets.join('\n')}`);
    }

    // Resolve target website URL if missing
    if (!resolvedWebsiteUrl && searchResults.urls.length > 0) {
      const mainDomain = searchResults.urls.find((u) => !u.includes('facebook.com') && !u.includes('linkedin.com') && !u.includes('yellowpages.com.au'));
      if (mainDomain) {
        resolvedWebsiteUrl = mainDomain;
      }
    }

    let targetUrl = resolvedWebsiteUrl;
    if (!targetUrl && coreName) {
      const clean = coreName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.length > 2) {
        targetUrl = `https://www.${clean}.com.au`;
      }
    }

    if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    // --- STEP 2: Deep Crawler - Crawl Homepage & Location/Office Subpages ---
    if (targetUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(targetUrl, {
          signal: controller.signal as any,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const html = await res.text();
          const homepageText = cleanHtmlText(html);
          fetchedPages.push(`--- HOMEPAGE / ENTRY PAGE TEXT (${targetUrl}) ---\n${homepageText.substring(0, 8000)}`);

          // Comprehensive subpage link matcher (captures /about/sydney-office, /about/melbourne-office, /contact, /locations, /offices, etc.)
          const linkRegex = /href=["']([^"']*(?:location|store|branch|contact|about|depot|find-us|office|our-offices|where-we-are|sydney|melbourne|brisbane|perth|canberra|darwin|adelaide)[^"']*)["']/gi;
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
            if (/^https?:\/\//i.test(link) && locationLinks.size < 8) {
              locationLinks.add(link);
            }
          }

          // Also include search result URLs that look like store/office locators
          searchResults.urls.forEach((u) => {
            if (/(?:location|store|branch|find-us|contact|office|about)/i.test(u) && locationLinks.size < 10) {
              locationLinks.add(u);
            }
          });

          // Fetch subpages in parallel (up to 8 subpages)
          const subpagePromises = Array.from(locationLinks).map(async (url) => {
            try {
              const subCtrl = new AbortController();
              const subTimeout = setTimeout(() => subCtrl.abort(), 8000);
              const subRes = await fetch(url, {
                signal: subCtrl.signal as any,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
              });
              clearTimeout(subTimeout);
              if (subRes.ok) {
                const subHtml = await subRes.text();
                const text = cleanHtmlText(subHtml);
                return `--- STORE LOCATOR / BRANCH SUBPAGE (${url}) ---\n${text.substring(0, 7000)}`;
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

    // --- STEP 3: Hunter.io API Integration ---
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
              const org = hData?.data?.organization || coreName;
              const city = hData?.data?.city;
              const state = hData?.data?.state;
              const street = hData?.data?.street;
              const postalCode = hData?.data?.postal_code;
              const phone = hData?.data?.phone_number;
              const email = hData?.data?.email;

              if (city || state || street) {
                hunterBranches.push({
                  name: `${org} Head Office / Primary Site`,
                  street: street || undefined,
                  suburb: city || 'Australia',
                  state: state || 'NSW',
                  postcode: postalCode || undefined,
                  fullAddress: [street, city, state, postalCode, 'Australia'].filter(Boolean).join(', '),
                  phone: phone || undefined,
                  email: email || undefined,
                  source: 'Hunter.io',
                });
              }

              // Also check Hunter emails for location-specific titles/departments
              if (Array.isArray(hData?.data?.emails)) {
                hData.data.emails.forEach((emp: any) => {
                  const pos = (emp.position || emp.department || '').toLowerCase();
                  if (/(sydney|melbourne|brisbane|perth|adelaide|canberra|darwin|hobart|gold coast|newcastle|geelong)/i.test(pos)) {
                    const matchedCity = pos.match(/(sydney|melbourne|brisbane|perth|adelaide|canberra|darwin|hobart|gold coast|newcastle|geelong)/i)?.[0];
                    if (matchedCity) {
                      const cityName = matchedCity.charAt(0).toUpperCase() + matchedCity.slice(1);
                      hunterBranches.push({
                        name: `${org} ${cityName} Branch (${emp.position || 'Contact'})`,
                        suburb: cityName,
                        state: 'AU',
                        fullAddress: `${cityName}, Australia`,
                        email: emp.value,
                        phone: emp.phone_number,
                        source: 'Hunter.io',
                      });
                    }
                  }
                });
              }
            }
          }
        }
      } catch (hunterErr) {
        console.warn('Hunter.io fetch warning:', hunterErr);
      }
    }

    const combinedContent = fetchedPages.join('\n\n');

    if (!combinedContent || combinedContent.length < 50) {
      return {
        companyName,
        websiteUrl: targetUrl || websiteUrl,
        companySummary: `No detailed web search text found for ${companyName}.`,
        branches: hunterBranches,
      };
    }

    // --- STEP 4: GenAI Parsing for All Australian Branch Locations ---
    const truncatedText = combinedContent.substring(0, 26000);
    const { output } = await discoverBranchesPrompt({
      companyName,
      websiteUrl: targetUrl || websiteUrl,
      siteContent: truncatedText,
    });

    const aiBranches = (output?.branches || []).map((b) => ({
      ...b,
      source: 'AI / Web Search',
    }));

    // Combine Hunter and AI branches, deduplicate by suburb/address
    const allBranches = [...aiBranches, ...hunterBranches];
    const uniqueBranches = allBranches.filter(
      (b, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            (t.fullAddress && b.fullAddress && t.fullAddress.toLowerCase() === b.fullAddress.toLowerCase()) ||
            (t.suburb && b.suburb && t.suburb.toLowerCase() === b.suburb.toLowerCase() && t.state && b.state && t.state.toLowerCase() === b.state.toLowerCase())
        )
    );

    return {
      companyName,
      websiteUrl: targetUrl || websiteUrl,
      companySummary: output?.companySummary || `Discovered ${uniqueBranches.length} branch locations across Australia from web search & Hunter.io.`,
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

export async function findCompanyWebsite(companyName: string) {
  try {
    const coreName = companyName.split(' - ')[0].trim();
    const query = `${coreName} Australia official website`;
    const searchResults = await searchWebForQuery(query);

    let foundUrl = '';
    if (searchResults.urls.length > 0) {
      foundUrl = searchResults.urls.find(
        (u) =>
          !u.includes('facebook.com') &&
          !u.includes('linkedin.com') &&
          !u.includes('yellowpages.com.au') &&
          !u.includes('wikipedia.org') &&
          !u.includes('dnb.com') &&
          !u.includes('bloomberg.com')
      ) || searchResults.urls[0];
    }

    if (!foundUrl && coreName) {
      const clean = coreName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.length > 2) {
        foundUrl = `https://www.${clean}.com.au`;
      }
    }

    return { success: true, websiteUrl: foundUrl };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}
