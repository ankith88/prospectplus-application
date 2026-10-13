import { SocialIntelligence } from '@/lib/types';
import { searchExa } from './exa-discovery';
import { runCliCommand } from './runner';

/**
 * Scan social presence (Instagram, Facebook) and detect customer parcel delivery sentiments
 */
export async function getSocialIntelligence(
  companyName: string,
  websiteUrl?: string
): Promise<SocialIntelligence> {
  const result: SocialIntelligence = {
    scannedAt: new Date().toISOString(),
    shippingSentiment: 'Neutral',
    deliveryComplaints: [],
  };

  // 1. Search for Instagram and Facebook profiles
  const socialQuery = `"${companyName}" (site:instagram.com OR site:facebook.com) Australia`;
  const socialProfiles = await searchExa(socialQuery, 4);

  for (const p of socialProfiles) {
    if (p.url.includes('instagram.com/')) {
      if (!result.instagramUrl) {
        result.instagramUrl = p.url;
        const handleMatch = p.url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
        if (handleMatch && handleMatch[1] && !['p', 'reel', 'stories', 'explore'].includes(handleMatch[1])) {
          result.instagramHandle = `@${handleMatch[1]}`;
        }
      }
    } else if (p.url.includes('facebook.com/')) {
      if (!result.facebookUrl) {
        result.facebookUrl = p.url;
      }
    }

    // Try extracting follower count from snippet
    const followerMatch = p.snippet.match(/([0-9.]+[kKmM]?)\s*(?:followers|likes)/i);
    if (followerMatch && !result.followersCount) {
      result.followersCount = followerMatch[0];
    }
  }

  // 2. Search for parcel delivery sentiment & carrier complaints
  const sentimentQuery = `"${companyName}" (shipping OR delivery OR delay OR "Australia Post" OR lost OR parcel OR package) (site:productreview.com.au OR site:reddit.com OR site:trustpilot.com OR site:facebook.com)`;
  const sentimentResults = await searchExa(sentimentQuery, 4);

  const complaints: string[] = [];
  for (const s of sentimentResults) {
    if (!s.snippet) continue;
    const lower = s.snippet.toLowerCase();
    const isNegative =
      /(?:delay|delayed|lost|waiting\s*weeks?|never\s*arrived|poor\s*delivery|awful\s*shipping|terrible\s*courier|auspost\s*issue|slow\s*delivery|damaged)/i.test(
        lower
      );
    if (isNegative) {
      // Extract a clean quote
      const cleanSnippet = s.snippet.replace(/\n+/g, ' ').slice(0, 220);
      complaints.push(cleanSnippet);
    }
  }

  if (complaints.length > 0) {
    result.shippingSentiment = 'Negative / Delivery Complaints Detected';
    result.deliveryComplaints = complaints.slice(0, 3);
  } else {
    result.shippingSentiment = 'Positive';
  }

  // Build summary
  const parts: string[] = [];
  if (result.instagramHandle) {
    parts.push(`Instagram: ${result.instagramHandle} (${result.followersCount || 'Active'})`);
  }
  if (result.facebookUrl) {
    parts.push(`Facebook Page active`);
  }
  if (result.deliveryComplaints && result.deliveryComplaints.length > 0) {
    parts.push(
      `Delivery Pain Points: Detected ${result.deliveryComplaints.length} customer reports citing shipping delays with current carriers.`
    );
  } else {
    parts.push('Logistics Sentiment: No acute delivery backlogs detected in public sentiment.');
  }

  result.summary = parts.join(' | ');

  return result;
}

/**
 * Optional OpenCLI live profile inspection if daemon and browser bridge extension are running
 */
export async function inspectInstagramViaOpenCli(handle: string): Promise<any | null> {
  const cleanHandle = handle.replace(/^@/, '');
  try {
    const res = await runCliCommand('opencli', ['instagram', 'profile', cleanHandle, '-f', 'json'], {
      timeoutMs: 8000,
    });
    if (res.code === 0 && res.stdout) {
      try {
        return JSON.parse(res.stdout);
      } catch {
        return res.stdout;
      }
    }
  } catch {}
  return null;
}
