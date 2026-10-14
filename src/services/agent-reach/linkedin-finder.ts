import { DecisionMakerCandidate } from '@/lib/types';
import { searchExa, cleanCompanyName } from './exa-discovery';
import { runCliCommand } from './runner';
import {
  classifyDepartment,
  determineConfidence,
  enrichCandidatesWithHunter,
} from './hunter-enricher';

export { classifyDepartment, determineConfidence };

/**
 * Clean up person name from LinkedIn title
 */
function parsePersonFromTitle(rawTitle: string): { name: string; title: string } {
  let clean = rawTitle.replace(/\|\s*LinkedIn$/i, '').trim();
  const parts = clean.split(/\s*[-–—]\s*/);
  const name = parts[0]?.trim() || '';
  let role = parts.slice(1).join(' - ').trim();
  if (!role) {
    role = 'Management';
  }
  return { name, title: role };
}

/**
 * Intelligently extract actual executive or operational job title from LinkedIn snippet/highlights
 * when page title only has person name or generic fallback.
 */
export function extractRoleFromSnippet(snippet: string, companyName?: string): string | null {
  if (!snippet) return null;

  // Pattern 1: Heading from markdown: "### Co-Owner - [Proud Poppy Clothing]" or "### Director - Proud Poppy Clothing"
  const mdHeadingMatch = snippet.match(/###\s*(.+?)\s+[-–—]\s+(?:\[([^\]]+)\](?:\([^)]+\))?|([^\n(]+))/);
  if (mdHeadingMatch) {
    const rawRole = mdHeadingMatch[1].trim();
    if (rawRole && !rawRole.toLowerCase().includes('company') && rawRole.length > 2 && rawRole.length < 50) {
      const comp = companyName || mdHeadingMatch[2]?.trim() || mdHeadingMatch[3]?.trim();
      return comp ? `${rawRole} at ${comp}` : rawRole;
    }
  }

  // Pattern 2: "#### E-Commerce Manager (Current)"
  const currentRoleMatch = snippet.match(/####\s*([A-Za-z0-9\s&,/'-]+?)\s*\(Current\)/i);
  if (currentRoleMatch) {
    const rawRole = currentRoleMatch[1].trim();
    if (rawRole && rawRole.length > 2 && rawRole.length < 50) {
      return companyName ? `${rawRole} at ${companyName}` : rawRole;
    }
  }

  // Pattern 3: Top headline line: "Founder & CEO at Proud Poppy Clothing | Online Retail #8 ..."
  const lines = snippet.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 3)) {
    const segment = line.split('|')[0].trim();
    if (
      /(founder|ceo|director|owner|manager|head\b|lead\b|coordinator|supervisor|officer|partner|president|specialist)/i.test(
        segment
      ) &&
      !segment.startsWith('http') &&
      !segment.startsWith('###') &&
      !segment.startsWith('####') &&
      segment.length <= 70
    ) {
      return segment;
    }
  }

  // Pattern 4: Inline regex: "[Role] at [Company]"
  const inlineMatch = snippet.match(
    /\b((?:Founder\s*(?:&\s*CEO)?|Co-Founder|CEO|Managing\s*Director|General\s*Manager|Director|Owner|Co-Owner|Operations\s*Manager|Logistics\s*Manager|Warehouse\s*Manager|Dispatch\s*Manager|Supply\s*Chain\s*Manager|E-Commerce\s*Manager)[\w\s&,/'-]{0,35}?(?:\s+(?:at|@)\s+[A-Za-z0-9\s&'-]+)?)/i
  );
  if (inlineMatch && inlineMatch[1].trim().length > 2) {
    return inlineMatch[1].trim();
  }

  return null;
}

/**
 * Search LinkedIn profiles of key decision makers (Logistics, Warehouse, Operations, Executive)
 * Uses Exa indexing for fast, unblocked results, with MCP support where available.
 */
export async function findDecisionMakers(
  companyName: string,
  websiteUrl?: string
): Promise<DecisionMakerCandidate[]> {
  const cleanName = cleanCompanyName(companyName) || companyName.trim();
  const candidates: DecisionMakerCandidate[] = [];
  const seenUrls = new Set<string>();

  // Primary search: Logistics, Operations, Warehouse, Dispatch leaders
  const query = `site:linkedin.com/in "${cleanName}" (Logistics OR Operations OR Warehouse OR "Supply Chain" OR Dispatch OR "General Manager" OR Director OR Founder OR Owner)`;
  let results = await searchExa(query, 6);

  // Fallback 1: If 0 results, search without strict quotes
  if (results.length === 0) {
    const fallbackQuery = `site:linkedin.com/in ${cleanName} (Logistics OR Operations OR Warehouse OR "Supply Chain" OR Dispatch OR "General Manager" OR Director OR Founder OR Owner)`;
    results = await searchExa(fallbackQuery, 6);
  }

  // Fallback 2: If still 0 results and website is available, search using domain stem
  if (results.length === 0 && websiteUrl) {
    try {
      const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
      const domainStem = parsed.hostname.replace(/^www\./, '').split('.')[0];
      if (domainStem && domainStem.length > 3) {
        const domainQuery = `site:linkedin.com/in "${domainStem}" (Logistics OR Operations OR Warehouse OR "Supply Chain" OR Dispatch OR "General Manager" OR Director OR Founder OR Owner)`;
        results = await searchExa(domainQuery, 6);
      }
    } catch {}
  }

  for (const item of results) {
    if (!item.url || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);

    let { name, title } = parsePersonFromTitle(item.title);
    if (!name || name.length < 2 || name.toLowerCase().includes('linkedin')) continue;

    // If title parsed from the page title is generic ('Management') or matches companyName,
    // intelligently extract the real executive or operational title from item.snippet!
    if (
      !title ||
      title.toLowerCase() === 'management' ||
      (cleanName && title.toLowerCase() === cleanName.toLowerCase()) ||
      title.toLowerCase() === 'australia'
    ) {
      const snippetRole = extractRoleFromSnippet(item.snippet, cleanName);
      if (snippetRole) {
        title = snippetRole;
      }
    }

    const department = classifyDepartment(title);
    const confidence = determineConfidence(title);

    candidates.push({
      name,
      title,
      department,
      linkedinUrl: item.url,
      snippet: item.snippet,
      confidence,
      source: 'LinkedIn (Indexed via Agent Reach)',
    });
  }

  // Enrich candidates with verified business emails, direct phone numbers, and authoritative titles via Hunter.io
  if (candidates.length > 0 && (websiteUrl || cleanName)) {
    try {
      await enrichCandidatesWithHunter(candidates, websiteUrl, cleanName);
    } catch (err: any) {
      console.warn(`[findDecisionMakers] Hunter enrichment non-fatal error for ${cleanName}:`, err.message || err);
    }
  }

  // Sort candidates by High confidence first
  const order = { High: 0, Medium: 1, Low: 2 };
  candidates.sort((a, b) => (order[a.confidence || 'Low'] || 2) - (order[b.confidence || 'Low'] || 2));

  return candidates;
}

/**
 * Optional MCP deep profile lookup if user has authenticated mcp-server-linkedin
 */
export async function getLinkedInProfileViaMcp(username: string): Promise<any | null> {
  try {
    const res = await runCliCommand('mcporter', [
      'call',
      'linkedin.get_person_profile',
      `linkedin_username=${username}`,
    ], { timeoutMs: 8000 });
    if (res.code === 0 && res.stdout) {
      try {
        return JSON.parse(res.stdout);
      } catch {
        return res.stdout;
      }
    }
  } catch {
    // Graceful fallback
  }
  return null;
}
