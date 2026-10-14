import { DecisionMakerCandidate } from '@/lib/types';

/**
 * Classify a person's role into high-value sales departments for MailPlus
 */
export function classifyDepartment(title: string): string {
  const t = title.toLowerCase();
  if (/logistic|supply\s*chain|freight|transport|shipping/i.test(t)) {
    return 'Logistics & Supply Chain';
  }
  if (/warehouse|dispatch|distribution|fulfil|inventory|packing/i.test(t)) {
    return 'Warehouse & Dispatch';
  }
  if (/operat|production|general\s*manager|\bgm\b|branch\s*manager/i.test(t)) {
    return 'Operations & Management';
  }
  if (/founder|owner|ceo|managing\s*director|director|co-founder/i.test(t)) {
    return 'Executive & Ownership';
  }
  return 'General Management';
}

/**
 * Determine relevance confidence for cold calling
 */
export function determineConfidence(title: string): 'High' | 'Medium' | 'Low' {
  const t = title.toLowerCase();
  if (
    /logistic|warehouse|dispatch|supply\s*chain|shipping\s*manager|operations\s*manager|general\s*manager|managing\s*director|\bdirector\b|founder|ceo|owner|co-owner/i.test(
      t
    )
  ) {
    return 'High';
  }
  if (/operations|coordinator|supervisor|manager|lead|e-commerce/i.test(t)) {
    return 'Medium';
  }
  return 'Low';
}

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
 * Synthesizes predicted corporate email from Hunter domain pattern
 */
function synthesizePatternEmail(pattern: string, firstName: string, lastName: string, domain: string): string | null {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
  if (!f) return null;

  if (pattern === '{first}') return `${f}@${domain}`;
  if (pattern === '{first}.{last}') return l ? `${f}.${l}@${domain}` : `${f}@${domain}`;
  if (pattern === '{f}{last}') return l ? `${f[0]}${l}@${domain}` : `${f}@${domain}`;
  if (pattern === '{first}{l}') return l ? `${f}${l[0]}@${domain}` : `${f}@${domain}`;
  if (pattern === '{last}') return l ? `${l}@${domain}` : `${f}@${domain}`;
  return null;
}

/**
 * Enriches LinkedIn Decision Maker candidates with verified business emails, direct phone numbers,
 * and authoritative job titles from Hunter.io.
 */
export async function enrichCandidatesWithHunter(
  candidates: DecisionMakerCandidate[],
  domainOrUrl?: string,
  companyName?: string
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
    let domainPattern: string | undefined = undefined;
    try {
      const res = await fetch(domainSearchUrl, { signal: controller.signal as any });
      if (res.ok) {
        const json = await res.json();
        domainEmails = json?.data?.emails || [];
        domainPattern = json?.data?.pattern;
      } else {
        console.warn(`[Hunter Domain Search] HTTP ${res.status} for domain ${domain}`);
      }
    } catch (err: any) {
      console.warn(`[Hunter Domain Search] Error querying domain ${domain}:`, err.message || err);
    } finally {
      clearTimeout(timeout);
    }

    const matchedHunterEmails = new Set<string>();

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

        // First name exact match if single-word email (e.g. tara@)
        if (eFirst && eFirst === fLower && eVal.startsWith(fLower + '@')) return true;

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
        matchedHunterEmails.add(match.value);
        candidate.email = match.value;
        candidate.emailScore = typeof match.confidence === 'number' ? match.confidence : match.verification?.score || 90;
        if (match.phone_number) {
          candidate.phone = match.phone_number;
        }
        // Correct title using Hunter's verified corporate position if available
        if (match.position && typeof match.position === 'string' && match.position.trim().length > 1) {
          const cleanPosition = match.position.trim();
          candidate.title = companyName ? `${cleanPosition} at ${companyName}` : cleanPosition;
        }
        candidate.department = classifyDepartment(candidate.title);
        candidate.confidence = determineConfidence(candidate.title);
        candidate.hunterEnriched = true;
      }
    }

    // -------------------------------------------------------------
    // Step 2: For top priority candidates still missing an email,
    // query Hunter's Email Finder API specifically, with pattern fallback & verification
    // -------------------------------------------------------------
    const unmatchedTopCandidates = candidates
      .filter((c) => !c.email && (c.confidence === 'High' || c.confidence === 'Medium' || /founder|owner|director|ceo|manager/i.test(c.title)))
      .slice(0, 5);

    for (const candidate of unmatchedTopCandidates) {
      const { firstName, lastName } = splitName(candidate.name);
      if (!firstName || !lastName || lastName.length < 2) continue;

      try {
        let foundEmail: string | null = null;
        let foundScore: number = 85;
        let foundPhone: string | null = null;
        let foundPosition: string | null = null;

        // Option A: Try official Email Finder
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
              foundEmail = data.email;
              foundScore = typeof data.score === 'number' ? data.score : 85;
              if (data.phone_number) foundPhone = data.phone_number;
              if (data.position && typeof data.position === 'string' && data.position.trim().length > 1) {
                foundPosition = data.position.trim();
              }
            }
          }
        } finally {
          clearTimeout(finderTimeout);
        }

        // Option B: If Email Finder didn't match but domain pattern is known, synthesize & verify
        if (!foundEmail && domainPattern) {
          const predictedEmail = synthesizePatternEmail(domainPattern, firstName, lastName, domain);
          if (predictedEmail) {
            const verifyController = new AbortController();
            const verifyTimeout = setTimeout(() => verifyController.abort(), 5000);
            try {
              const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(
                predictedEmail
              )}&api_key=${apiKey}`;
              const verifyRes = await fetch(verifyUrl, { signal: verifyController.signal as any });
              if (verifyRes.ok) {
                const verifyJson = await verifyRes.json();
                const vData = verifyJson?.data;
                if (vData?.status === 'valid' || vData?.result === 'deliverable') {
                  foundEmail = predictedEmail;
                  foundScore = typeof vData.score === 'number' ? vData.score : 90;
                }
              }
            } catch {
            } finally {
              clearTimeout(verifyTimeout);
            }
          }
        }

        if (foundEmail) {
          candidate.email = foundEmail;
          candidate.emailScore = foundScore;
          if (foundPhone) candidate.phone = foundPhone;
          if (foundPosition) {
            candidate.title = companyName ? `${foundPosition} at ${companyName}` : foundPosition;
            candidate.department = classifyDepartment(candidate.title);
            candidate.confidence = determineConfidence(candidate.title);
          }
          candidate.hunterEnriched = true;
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
