import { runCliCommand } from './runner';

export interface ExaSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface LogisticsEvidence {
  rawSnippets: string[];
  carrierDetected: string[];
  dispatchLocations: string[];
  cutoffTimes?: string;
  shippingPoliciesFound: string[];
}

/**
 * Parse raw mcporter Exa output format
 */
export function parseExaOutput(raw: string): ExaSearchResult[] {
  if (!raw) return [];
  const blocks = raw.split(/\n---\n/);
  return blocks
    .map((b) => {
      const titleMatch = b.match(/^Title:\s*(.+)$/m);
      const urlMatch = b.match(/^URL:\s*(.+)$/m);
      const highlightsIndex = b.indexOf('Highlights:');
      const snippet = highlightsIndex !== -1 ? b.slice(highlightsIndex + 11).trim() : '';
      return {
        title: titleMatch ? titleMatch[1].trim() : '',
        url: urlMatch ? urlMatch[1].trim() : '',
        snippet,
      };
    })
    .filter((r) => r.title || r.url);
}

/**
 * Execute an Exa semantic web search via mcporter
 */
export async function searchExa(query: string, numResults: number = 5): Promise<ExaSearchResult[]> {
  try {
    const res = await runCliCommand('mcporter', [
      'call',
      'exa.web_search_exa',
      `query=${query}`,
      `numResults=${numResults}`,
    ]);
    if (res.code !== 0 || !res.stdout) {
      console.warn(`[ExaSearch] Non-zero code or empty stdout for query: "${query}":`, res.stderr);
      return [];
    }
    return parseExaOutput(res.stdout);
  } catch (err: any) {
    console.error(`[ExaSearch] Failed to execute Exa search:`, err);
    return [];
  }
}

const DIRECTORY_DOMAINS = [
  'yellowpages.com.au',
  'whitepages.com.au',
  'truelocal.com.au',
  'facebook.com',
  'linkedin.com',
  'instagram.com',
  'wikipedia.org',
  'dnb.com',
  'zoominfo.com',
  'abr.business.gov.au',
  'asic.gov.au',
  'crunchbase.com',
  'glassdoor.com',
  'seek.com.au',
  'indeed.com',
];

/**
 * Clean company name by stripping common corporate entity suffixes and excess whitespace
 */
export function cleanCompanyName(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\b(pty\.?\s*ltd\.?|pty|ltd\.?|limited|inc\.?|llc|holdings|group)\b/gi, '')
    .replace(/[()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find the official website domain for an Australian business when missing from CRM
 */
export async function searchCompanyWebsite(
  companyName: string,
  suburb?: string,
  state?: string
): Promise<{ url?: string; domain?: string; title?: string }> {
  const cleanName = cleanCompanyName(companyName) || companyName.trim();
  const query = `"${cleanName}" official website ${suburb || ''} ${state || ''} Australia`.trim();
  const results = await searchExa(query, 6);

  for (const item of results) {
    try {
      const parsedUrl = new URL(item.url);
      const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
      const isDirectory = DIRECTORY_DOMAINS.some((dir) => hostname.includes(dir));
      if (!isDirectory) {
        return {
          url: item.url,
          domain: hostname,
          title: item.title,
        };
      }
    } catch {
      continue;
    }
  }

  return {};
}

const COMMON_CARRIERS = [
  { name: 'Australia Post', regex: /australia\s*post|auspost|eparcel|my\s*post/i },
  { name: 'StarTrack', regex: /startrack|star\s*track/i },
  { name: 'Sendle', regex: /sendle/i },
  { name: 'Aramex / Fastway', regex: /aramex|fastway/i },
  { name: 'Toll', regex: /\btoll\b|toll\s*priority|team\s*global\s*exp/i },
  { name: 'TNT / FedEx', regex: /\btnt\b|fedex/i },
  { name: 'CouriersPlease', regex: /couriers\s*please|couriersplease/i },
  { name: 'DHL', regex: /\bdhl\b/i },
];

/**
 * Live search for logistics, shipping policies, carriers, and dispatch hubs
 */
export async function searchLogisticsEvidence(
  companyName: string,
  websiteUrl?: string
): Promise<LogisticsEvidence> {
  const cleanName = cleanCompanyName(companyName) || companyName.trim();
  const rawSnippets: string[] = [];
  const shippingPoliciesFound: string[] = [];
  const dispatchLocations: string[] = [];
  const carrierDetectedSet = new Set<string>();
  let cutoffTimes: string | undefined = undefined;

  let domain = '';
  if (websiteUrl) {
    try {
      const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {}
  }

  const queries = [
    domain
      ? `site:${domain} (shipping policy OR delivery times OR express dispatch OR returns)`
      : `"${cleanName}" shipping policy delivery times Australia`,
    `"${cleanName}" Australia (warehouse OR "distribution centre" OR dispatch OR courier OR pickup)`,
  ];

  for (const q of queries) {
    const results = await searchExa(q, 4);
    for (const r of results) {
      if (r.snippet) {
        rawSnippets.push(r.snippet);

        // Check for carrier mentions
        for (const carrier of COMMON_CARRIERS) {
          if (carrier.regex.test(r.snippet)) {
            carrierDetectedSet.add(carrier.name);
          }
        }

        // Check for cutoff times (e.g., "12pm", "2:00 pm", "same day dispatch")
        const cutoffMatch = r.snippet.match(
          /(?:orders?\s*placed\s*before|cutoff|dispatch(?:ed)?\s*same\s*day\s*if\s*ordered\s*by)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm|a\.m\.|p\.m\.))/i
        );
        if (cutoffMatch && !cutoffTimes) {
          cutoffTimes = cutoffMatch[0];
        }

        // Check for shipping policy snippets
        if (/(?:free\s*shipping|standard\s*delivery|express\s*delivery|flat\s*rate\s*shipping)/i.test(r.snippet)) {
          shippingPoliciesFound.push(r.snippet.slice(0, 200));
        }

        // Check for warehouse locations
        const warehouseMatch = r.snippet.match(
          /(?:warehouse|distribution\s*centre|facility|depot)\s*(?:located\s*in|in|at)\s*([A-Z][a-zA-Z\s]+(?:,\s*[A-Z]{2,3})?)/i
        );
        if (warehouseMatch && !dispatchLocations.includes(warehouseMatch[0])) {
          dispatchLocations.push(warehouseMatch[0]);
        }
      }
    }
  }

  return {
    rawSnippets: rawSnippets.slice(0, 6),
    carrierDetected: Array.from(carrierDetectedSet),
    dispatchLocations,
    cutoffTimes,
    shippingPoliciesFound: Array.from(new Set(shippingPoliciesFound)).slice(0, 3),
  };
}
