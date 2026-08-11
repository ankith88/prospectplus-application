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
  specificPageUrl: z.string().optional().describe("Specific location or subpage URL if discovered."),
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
  prompt: `You are an expert enterprise research agent specializing in Australian company footprints and multi-site branch discovery.
Your job is to analyze the extracted web pages, location hub pages, "Global Coverage" / "Asia Pacific" sections, office directories, store locators, and Hunter.io records for "{{companyName}}" (Main Website: {{websiteUrl}}) and extract ALL branch locations, offices, warehouses, depots, or retail store locations across Australia.

Instructions:
1. Examine all scraped pages, global coverage sections (e.g. "Asia Pacific", "Australasia", "Australia"), navigation menus, footer links, and office subpages.
2. In regional sections like "Asia Pacific" or "Global Coverage", carefully identify ALL locations situated in Australia (such as Sydney, Melbourne, Brisbane, Perth, Adelaide, Canberra, Darwin, Hobart, Gold Coast, Newcastle, Geelong, Townsville, Sunshine Coast, Parramatta, Fortitude Valley, Brookfield Place, etc.).
   CRITICAL: Filter OUT and EXCLUDE non-Australian locations (e.g., Hong Kong, Shanghai, Shenzhen, Singapore, London, New York, Tokyo, Dubai). ONLY extract Australian locations.
3. Extract EVERY single Australian branch, city office, warehouse, or depot location found. Include all locations even if only the city/suburb name or building name is mentioned (e.g. "Brisbane Office", "Melbourne Office", "Perth Office", "Sydney Office"). Never omit or discard an office location.
4. For each location, extract:
   - Branch name or title (e.g. "{{companyName}} - Sydney", "{{companyName}} Brisbane Office", "{{companyName}} Melbourne")
   - Street address (e.g., "Level 34, 555 Collins Street" or "36 Warry Street, Fortitude Valley" or "Level 15, Brookfield Place - Tower 2, 123 St Georges Terrace")
   - Suburb/City (in Australia)
   - State (MUST use valid Australian state code: NSW, VIC, QLD, WA, SA, TAS, ACT, NT)
   - Postcode (4 digits if available, e.g. 4006, 3000, 6000, 2000)
   - Full formatted address string (e.g. "Level 10, 126 Phillip Street, Sydney NSW 2000 Australia")
   - Direct Phone number / Email for that specific location (if available)

Scraped Content & Search Results:
"""
{{{siteContent}}}
"""
`,
});

function extractMainWebsiteUrl(urlStr?: string): string {
  if (!urlStr) return '';
  let cleanUrl = urlStr.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }
  try {
    const parsed = new URL(cleanUrl);
    return `${parsed.protocol}//${parsed.hostname}/`;
  } catch (e) {
    return urlStr;
  }
}

function cleanHtmlText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article)>/gi, '\n')
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<td[^>]*>/gi, ' \t ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

async function searchWebForQuery(query: string): Promise<{ snippets: string[]; urls: string[] }> {
  const snippets: string[] = [];
  const urls: string[] = [];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  // Channel A: DuckDuckGo HTML Search
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 7000);

    const res = await fetch(ddgUrl, {
      signal: ctrl.signal as any,
      headers,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      if (!html.includes('anomaly.js') && !html.includes('challenge-form')) {
        const cleaned = cleanHtmlText(html);
        if (cleaned.length > 80) snippets.push(cleaned.substring(0, 7000));

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
    }
  } catch (err) {
    console.warn(`DDG search warning for query "${query}":`, err);
  }

  // Channel B: Bing Search Fallback/Supplement
  try {
    const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    const bCtrl = new AbortController();
    const bTimeout = setTimeout(() => bCtrl.abort(), 7000);

    const bRes = await fetch(bingUrl, {
      signal: bCtrl.signal as any,
      headers,
    });
    clearTimeout(bTimeout);

    if (bRes.ok) {
      const bHtml = await bRes.text();
      const bCleaned = cleanHtmlText(bHtml);
      if (bCleaned.length > 80) snippets.push(bCleaned.substring(0, 7000));

      const bUrlRegex = /<h2[^>]*><a[^>]*href="(https?:\/\/[^"]+)"/gi;
      let bMatch;
      while ((bMatch = bUrlRegex.exec(bHtml)) !== null) {
        const u = bMatch[1];
        if (u && !u.includes('bing.com') && !u.includes('microsoft.com')) {
          urls.push(u);
        }
      }
    }
  } catch (err) {
    console.warn(`Bing search warning for query "${query}":`, err);
  }

  return { snippets, urls: Array.from(new Set(urls)) };
}

export const discoverCompanyBranchesFlow = ai.defineFlow(
  {
    name: 'discoverCompanyBranchesFlow',
    inputSchema: DiscoverBranchesInputSchema,
    outputSchema: DiscoverBranchesOutputSchema,
  },
  async ({ companyName, websiteUrl, specificPageUrl }) => {
    const fetchedPages: string[] = [];
    const hunterBranches: z.infer<typeof DiscoveredBranchSchema>[] = [];
    let resolvedWebsiteUrl = websiteUrl || specificPageUrl;

    const coreName = companyName.split(' - ')[0].trim();

    // --- STEP 1: Multi-Engine Web Searches for Offices / Store Locators / Global Coverage ---
    const searchQueries = [
      `${coreName} Australia store locator locations offices branches`,
      `"${coreName}" Australia offices Sydney Melbourne Brisbane Perth`,
    ];

    let searchUrls: string[] = [];
    for (const q of searchQueries) {
      const searchRes = await searchWebForQuery(q);
      if (searchRes.snippets.length > 0) {
        fetchedPages.push(`--- WEB SEARCH SNIPPETS FOR "${q}" ---\n${searchRes.snippets.join('\n')}`);
      }
      searchUrls.push(...searchRes.urls);
    }
    searchUrls = Array.from(new Set(searchUrls));

    // Resolve target main website URL if missing
    if (!resolvedWebsiteUrl && searchUrls.length > 0) {
      const mainDomain = searchUrls.find((u) => !u.includes('facebook.com') && !u.includes('linkedin.com') && !u.includes('yellowpages.com.au'));
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

    const mainRootUrl = extractMainWebsiteUrl(targetUrl);
    let domainHost = '';
    try {
      if (mainRootUrl) domainHost = new URL(mainRootUrl).hostname.replace(/^www\./i, '');
    } catch (e) {}

    // Additional targeted domain query if domainHost is known
    if (domainHost) {
      const domainQuery = `site:${domainHost} locations OR offices OR "global coverage" OR "our locations" OR australia OR sydney OR melbourne`;
      const domainRes = await searchWebForQuery(domainQuery);
      if (domainRes.snippets.length > 0) {
        fetchedPages.push(`--- DOMAIN SEARCH SNIPPETS FOR "${domainQuery}" ---\n${domainRes.snippets.join('\n')}`);
      }
      searchUrls.push(...domainRes.urls);
      searchUrls = Array.from(new Set(searchUrls));
    }

    // --- STEP 2: Whole-Website Deep Crawler - Crawl Homepage, Seed URLs & Location Hub Pages ---
    const seedUrlsToFetch = new Set<string>();
    if (mainRootUrl) seedUrlsToFetch.add(mainRootUrl);
    if (targetUrl) seedUrlsToFetch.add(targetUrl);
    if (specificPageUrl) seedUrlsToFetch.add(specificPageUrl);

    // Candidate location hub paths to proactively test on main website root
    if (mainRootUrl) {
      const candidatePaths = [
        'about-us/global-coverage/',
        'about-us/our-locations/',
        'about-us/locations/',
        'global-coverage/',
        'our-locations/',
        'locations/',
        'offices/',
        'our-offices/',
        'where-we-are/',
        'our-network/',
        'contact-us/',
        'contact/',
        'australia/',
        'asia-pacific/',
      ];
      candidatePaths.forEach((p) => seedUrlsToFetch.add(new URL(p, mainRootUrl).href));
    }

    const locationSubpageLinks = new Set<string>();

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // Crawl Seed Pages & extract internal location subpages
    for (const url of Array.from(seedUrlsToFetch)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(url, {
          signal: controller.signal as any,
          headers: fetchHeaders,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const html = await res.text();
          const pageText = cleanHtmlText(html);
          if (pageText.length > 50 && !pageText.includes('Enable JavaScript and cookies to continue')) {
            fetchedPages.push(`--- WEBSITE PAGE TEXT (${url}) ---\n${pageText.substring(0, 8000)}`);
          }

          // Extract location & office links from HTML
          const linkRegex = /href=["']([^"']*(?:location|store|branch|contact|about|depot|find-us|office|our-offices|where-we-are|asia-pacific|australia|sydney|melbourne|brisbane|perth|canberra|darwin|adelaide)[^"']*)["']/gi;
          let match;
          while ((match = linkRegex.exec(html)) !== null) {
            const rawLink = match[1];
            if (!rawLink || rawLink.startsWith('#') || rawLink.startsWith('javascript:')) continue;
            try {
              const resolvedUrl = new URL(rawLink, url).href;
              if (/^https?:\/\//i.test(resolvedUrl) && locationSubpageLinks.size < 15) {
                locationSubpageLinks.add(resolvedUrl);
              }
            } catch (e) {
              continue;
            }
          }
        }
      } catch (err) {
        // Continue crawling remaining seed URLs
      }
    }

    // Include search result URLs that match location keywords
    searchUrls.forEach((u) => {
      if (/(?:location|store|branch|find-us|contact|office|about|global-coverage|asia-pacific|australia)/i.test(u) && locationSubpageLinks.size < 18) {
        locationSubpageLinks.add(u);
      }
    });

    // Crawl discovered location subpages in parallel
    const subpagePromises = Array.from(locationSubpageLinks).map(async (url) => {
      if (seedUrlsToFetch.has(url)) return null;
      try {
        const subCtrl = new AbortController();
        const subTimeout = setTimeout(() => subCtrl.abort(), 6000);
        const subRes = await fetch(url, {
          signal: subCtrl.signal as any,
          headers: fetchHeaders,
        });
        clearTimeout(subTimeout);
        if (subRes.ok) {
          const subHtml = await subRes.text();
          const text = cleanHtmlText(subHtml);
          if (text.length > 50 && !text.includes('Enable JavaScript and cookies to continue')) {
            return `--- STORE LOCATOR / BRANCH SUBPAGE (${url}) ---\n${text.substring(0, 7000)}`;
          }
        }
      } catch (e) {
        // Ignore individual subpage fetch errors
      }
      return null;
    });

    const subpages = await Promise.all(subpagePromises);
    subpages.forEach((p) => p && fetchedPages.push(p));

    // --- STEP 3: Hunter.io API Integration ---
    if (mainRootUrl || targetUrl) {
      try {
        const apiKey = process.env.HUNTER_API_KEY;
        if (apiKey) {
          const targetDomain = mainRootUrl || targetUrl || '';
          const domainMatch = targetDomain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
          if (domainMatch) {
            const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${domainMatch}&api_key=${apiKey}&type=personal`;
            const hCtrl = new AbortController();
            const hTimeout = setTimeout(() => hCtrl.abort(), 6000);
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

              if (Array.isArray(hData?.data?.emails)) {
                hData.data.emails.forEach((emp: any) => {
                  const pos = (emp.position || emp.department || '').toLowerCase();
                  if (/(sydney|melbourne|brisbane|perth|adelaide|canberra|darwin|hobart|gold coast|newcastle)/i.test(pos)) {
                    const matchedCity = pos.match(/(sydney|melbourne|brisbane|perth|adelaide|canberra|darwin|hobart|gold coast|newcastle)/i)?.[0];
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
        websiteUrl: mainRootUrl || targetUrl || websiteUrl,
        companySummary: `No detailed web search text found for ${companyName}.`,
        branches: hunterBranches,
      };
    }

    // --- STEP 4: GenAI Parsing for All Australian Branch Locations ---
    const truncatedText = combinedContent.substring(0, 28000);
    const { output } = await discoverBranchesPrompt({
      companyName,
      websiteUrl: mainRootUrl || targetUrl || websiteUrl,
      siteContent: truncatedText,
    });

    const aiBranches = (output?.branches || []).map((b) => ({
      ...b,
      source: 'AI / Web Search',
    }));

    // Combine Hunter and AI branches, deduplicate by suburb/state/address
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
      websiteUrl: mainRootUrl || targetUrl || websiteUrl,
      companySummary: output?.companySummary || `Discovered ${uniqueBranches.length} branch locations across Australia from web search & site crawler.`,
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

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com',
  'bigpond.com', 'bigpond.net.au', 'optusnet.com.au', 'tpg.com.au', 'iinet.net.au',
  'mail.com', 'zoho.com', 'yandex.com', 'protonmail.com', 'gmx.com'
]);

const IGNORED_DIRECTORY_PATTERNS = [
  /facebook\.com/i, /linkedin\.com/i, /yellowpages/i, /whitepages/i,
  /wikipedia\.org/i, /dnb\.com/i, /bloomberg\.com/i, /business\.gov/i,
  /abr\.business/i, /asic/i, /creditorwatch/i, /ibisworld/i, /truelocal/i,
  /glassdoor/i, /indeed/i, /seek\.com/i, /zoominfo/i, /\/abn\//i, /\/acn\//i,
  /\/companies\//i, /\/directory\//i, /\/registry\//i, /\/company\//i,
  /company-list/i, /opencorporates/i, /businesscheck/i
];

export async function findCompanyWebsite(companyName: string, companyEmail?: string) {
  try {
    // 1. Try extracting domain from companyEmail if provided
    if (companyEmail && companyEmail.includes('@')) {
      const emailDomain = companyEmail.split('@')[1]?.toLowerCase().trim();
      if (emailDomain && !PUBLIC_EMAIL_DOMAINS.has(emailDomain)) {
        const rootUrl = `https://www.${emailDomain.replace(/^www\./i, '')}`;
        return {
          success: true,
          websiteUrl: rootUrl,
          source: 'Email Domain',
        };
      }
    }

    // 2. Clean corporate trust boilerplate from companyName
    let cleanBrandName = companyName
      .split(' - ')[0]
      .replace(/atf/gi, ' ')
      .replace(/trust/gi, ' ')
      .replace(/parent/gi, ' ')
      .replace(/pty/gi, ' ')
      .replace(/ltd/gi, ' ')
      .replace(/limited/gi, ' ')
      .replace(/inc/gi, ' ')
      .replace(/services/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanBrandName) cleanBrandName = companyName;

    // 3. Hunter.io API Domain Search by Company Name
    const apiKey = process.env.HUNTER_API_KEY;
    if (apiKey) {
      const namesToSearch = Array.from(new Set([cleanBrandName, companyName.split(' - ')[0].trim()])).filter(Boolean);
      for (const nameToTry of namesToSearch) {
        try {
          const hUrl = `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(nameToTry)}&api_key=${apiKey}`;
          const hCtrl = new AbortController();
          const hTimeout = setTimeout(() => hCtrl.abort(), 6000);
          const hRes = await fetch(hUrl, { signal: hCtrl.signal as any });
          clearTimeout(hTimeout);
          if (hRes.ok) {
            const hData = (await hRes.json()) as any;
            const domain = hData?.data?.domain;
            if (domain && !PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase())) {
              const rootUrl = `https://www.${domain.replace(/^www\./i, '')}`;
              return {
                success: true,
                websiteUrl: rootUrl,
                source: 'Hunter.io',
              };
            }
          }
        } catch (hErr) {
          console.warn(`Hunter.io domain lookup warning for ${nameToTry}:`, hErr);
        }
      }
    }

    // 4. Multi-Engine Web Search Fallback
    const query = `${cleanBrandName} Australia official website`;
    const searchResults = await searchWebForQuery(query);

    let foundUrl = '';
    if (searchResults.urls.length > 0) {
      foundUrl = searchResults.urls.find((u) => {
        return !IGNORED_DIRECTORY_PATTERNS.some((pattern) => pattern.test(u));
      }) || '';
    }

    if (!foundUrl) {
      const rawName = companyName.split(' - ')[0].trim();
      const rawQuery = `${rawName} official website`;
      const rawResults = await searchWebForQuery(rawQuery);
      if (rawResults.urls.length > 0) {
        foundUrl = rawResults.urls.find((u) => {
          return !IGNORED_DIRECTORY_PATTERNS.some((pattern) => pattern.test(u));
        }) || '';
      }
    }

    if (!foundUrl && cleanBrandName) {
      const clean = cleanBrandName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.length > 2) {
        foundUrl = `https://www.${clean}.com.au`;
      }
    }

    const mainWebsiteUrl = extractMainWebsiteUrl(foundUrl);

    return {
      success: true,
      websiteUrl: mainWebsiteUrl,
      specificPageUrl: foundUrl !== mainWebsiteUrl ? foundUrl : undefined,
      source: 'Web Search',
    };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}
