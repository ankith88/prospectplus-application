import { DecisionMakerCandidate } from '@/lib/types';
import { searchExa } from './exa-discovery';
import { runCliCommand } from './runner';
import { enrichCandidatesWithHunter } from './hunter-enricher';

/**
 * Classify a person's role into high-value sales departments for MailPlus
 */
function classifyDepartment(title: string): string {
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
function determineConfidence(title: string): 'High' | 'Medium' | 'Low' {
  const t = title.toLowerCase();
  if (
    /logistic|warehouse|dispatch|supply\s*chain|shipping\s*manager|operations\s*manager|general\s*manager|managing\s*director|owner/i.test(
      t
    )
  ) {
    return 'High';
  }
  if (/operations|coordinator|supervisor|director|manager|lead/i.test(t)) {
    return 'Medium';
  }
  return 'Low';
}

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
  // Remove "at <Company>" trailing if repetitive
  return { name, title: role };
}

/**
 * Search LinkedIn profiles of key decision makers (Logistics, Warehouse, Operations, Executive)
 * Uses Exa indexing for fast, unblocked results, with MCP support where available.
 */
export async function findDecisionMakers(
  companyName: string,
  websiteUrl?: string
): Promise<DecisionMakerCandidate[]> {
  const candidates: DecisionMakerCandidate[] = [];
  const seenUrls = new Set<string>();

  // Primary search: Logistics, Operations, Warehouse, Dispatch leaders
  const query = `site:linkedin.com/in "${companyName}" (Logistics OR Operations OR Warehouse OR "Supply Chain" OR Dispatch OR "General Manager" OR Director OR Founder OR Owner)`;
  const results = await searchExa(query, 6);

  for (const item of results) {
    if (!item.url || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);

    const { name, title } = parsePersonFromTitle(item.title);
    if (!name || name.length < 2 || name.toLowerCase().includes('linkedin')) continue;

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

  // Sort candidates by High confidence first
  const order = { High: 0, Medium: 1, Low: 2 };
  candidates.sort((a, b) => (order[a.confidence || 'Low'] || 2) - (order[b.confidence || 'Low'] || 2));

  // Enrich candidates with verified business emails and direct phone numbers via Hunter.io
  if (candidates.length > 0 && websiteUrl) {
    try {
      await enrichCandidatesWithHunter(candidates, websiteUrl);
    } catch (err: any) {
      console.warn(`[findDecisionMakers] Hunter enrichment non-fatal error for ${companyName}:`, err.message || err);
    }
  }

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
