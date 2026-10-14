import { DecisionMakerCandidate } from '@/lib/types';

/**
 * Extracts and sanitizes clean domain from a URL or raw domain string
 */
export function extractCleanDomain(urlOrDomain?: string): string | null {
  if (!urlOrDomain) return null;
  let d = urlOrDomain.trim().toLowerCase();

  // Strip protocol
  d = d.replace(/^https?:\/\//i, '');
  // Strip www.
  d = d.replace(/^www\./i, '');
  // Strip path, query, hash
  d = d.split('/')[0].split('?')[0].split('#')[0];
  // Strip port
  d = d.split(':')[0];

  // Exclude common generic/social portals
  const ignored = [
    'linkedin.com',
    'facebook.com',
    'instagram.com',
    'google.com',
    'twitter.com',
    'x.com',
    'youtube.com',
    'yellowpages.com.au',
    'truelocal.com.au',
    'whitepages.com.au',
  ];
  if (ignored.some((ign) => d === ign || d.endsWith('.' + ign))) {
    return null;
  }

  return d.includes('.') ? d : null;
}

/**
 * Split a person's name into clean first and last names
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName
    .replace(/[^\w\s'-]/g, '')
    .trim()
    .split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

/**
 * Enriches LinkedIn Decision Maker candidates with verified business emails and direct phone numbers
 * using Hunter.io Domain Search and Email Finder APIs.
 */
export async function enrichCandidatesWithHunter(
  candidates: DecisionMakerCandidate[],
  domainOrUrl?: string
): Promise<DecisionMakerCandidate[]> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return candidates;
  }

  const domain = extractCleanDomain(domainOrUrl);
  if (!domain) {
    return candidates;
  }

  try {
    // -------------------------------------------------------------
    // Step 1: Hunter Domain Search (1 credit for the whole company domain)
    // -------------------------------------------------------------
    const domainSearchUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(
      domain
    )}&api_key=${apiKey}&type=personal`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout

    let domainEmails: any[] = [];
    try {
      const res = await fetch(domainSearchUrl, { signal: controller.signal as any });
      if (res.ok) {
        const json = await res.json();
        domainEmails = json?.data?.emails || [];
      } else {
        console.warn(`[Hunter Domain Search] HTTP ${res.status} for domain ${domain}`);
      }
    } catch (err: any) {
      console.warn(`[Hunter Domain Search] Error querying domain ${domain}:`, err.message || err);
    } finally {
      clearTimeout(timeout);
    }

    // Match domain search results with candidate list
    for (const candidate of candidates) {
      const { firstName, lastName } = splitName(candidate.name);
      if (!firstName) continue;

      const fLower = firstName.toLowerCase();
      const lLower = lastName.toLowerCase();

      // Check if Hunter has this person in domain results
      const match = domainEmails.find((e: any) => {
        const eFirst = (e.first_name || '').toLowerCase().trim();
        const eLast = (e.last_name || '').toLowerCase().trim();
        const eVal = (e.value || '').toLowerCase().trim();

        // Exact first + last match
        if (eFirst && eLast && eFirst === fLower && eLast === lLower) return true;

        // Email address contains both first and last name
        if (lLower.length >= 3 && eVal.includes(lLower) && eVal.includes(fLower)) return true;

        // LinkedIn profile match if returned by Hunter
        if (
          candidate.linkedinUrl &&
          e.linkedin &&
          candidate.linkedinUrl.toLowerCase().includes(e.linkedin.toLowerCase().replace(/^https?:\/\/[^/]+\//, ''))
        ) {
          return true;
        }

        return false;
      });

      if (match) {
        candidate.email = match.value;
        candidate.emailScore = typeof match.confidence === 'number' ? match.confidence : match.verification?.score || 90;
        if (match.phone_number) {
          candidate.phone = match.phone_number;
        }
        candidate.hunterEnriched = true;
      }
    }

    // -------------------------------------------------------------
    // Step 2: For top priority candidates still missing an email,
    // query Hunter's Email Finder API specifically (max 2 top candidates)
    // -------------------------------------------------------------
    const unmatchedTopCandidates = candidates
      .filter((c) => !c.email && c.confidence === 'High')
      .slice(0, 2);

    for (const candidate of unmatchedTopCandidates) {
      const { firstName, lastName } = splitName(candidate.name);
      if (!firstName || !lastName || lastName.length < 2) continue;

      try {
        const finderController = new AbortController();
        const finderTimeout = setTimeout(() => finderController.abort(), 6000);

        const finderUrl = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(
          domain
        )}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`;

        try {
          const finderRes = await fetch(finderUrl, { signal: finderController.signal as any });
          if (finderRes.ok) {
            const finderJson = await finderRes.json();
            const data = finderJson?.data;
            if (data?.email) {
              candidate.email = data.email;
              candidate.emailScore = typeof data.score === 'number' ? data.score : 85;
              if (data.phone_number) {
                candidate.phone = data.phone_number;
              }
              candidate.hunterEnriched = true;
            }
          }
        } finally {
          clearTimeout(finderTimeout);
        }
      } catch (err: any) {
        console.warn(`[Hunter Email Finder] Lookup error for ${candidate.name} @ ${domain}:`, err.message || err);
      }
    }
  } catch (err: any) {
    console.error(`[Hunter Enrichment] Unexpected error for domain ${domain}:`, err);
  }

  return candidates;
}
