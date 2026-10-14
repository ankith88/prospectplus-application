import { SocialIntelligence } from '@/lib/types';
import { searchExa, cleanCompanyName } from './exa-discovery';
import { runCliCommand } from './runner';

/**
 * Scan social presence (Instagram, Facebook) and detect customer parcel delivery sentiments
 */
export async function getSocialIntelligence(
  companyName: string,
  websiteUrl?: string
): Promise<SocialIntelligence> {
  const cleanName = cleanCompanyName(companyName) || companyName.trim();
  const result: SocialIntelligence = {
    scannedAt: new Date().toISOString(),
    shippingSentiment: 'Neutral',
    deliveryComplaints: [],
  };

  // 1. Direct website scrape for official social links (instant, authoritative)
  if (websiteUrl) {
    try {
      const targetUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
      const resp = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(4000) : undefined,
      });
      if (resp.ok) {
        const html = await resp.text();

        // Extract Instagram
        const instaMatches = html.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/gi);
        for (const m of instaMatches) {
          const handle = m[1]?.toLowerCase();
          if (handle && !['p', 'reel', 'stories', 'explore', 'about', 'legal', 'directory'].includes(handle)) {
            result.instagramUrl = `https://www.instagram.com/${m[1]}`;
            result.instagramHandle = `@${m[1]}`;
            break;
          }
        }

        // Extract Facebook
        const fbMatches = html.matchAll(/https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]+)/gi);
        for (const m of fbMatches) {
          const handle = m[1]?.toLowerCase();
          if (handle && !['sharer', 'share', 'groups', 'dialog', 'policies', 'tr'].includes(handle)) {
            result.facebookUrl = `https://www.facebook.com/${m[1]}`;
            break;
          }
        }
      }
    } catch (err: any) {
      // Non-fatal, continue to search
    }
  }

  // 2. Search for Instagram and Facebook profiles via Exa if either is still missing
  if (!result.instagramHandle || !result.facebookUrl) {
    const socialQuery = `"${cleanName}" (instagram OR facebook) Australia`;
    const socialProfiles = await searchExa(socialQuery, 4);

    for (const p of socialProfiles) {
      const combinedText = `${p.url} ${p.snippet}`;

      // Check URL and snippet for Instagram
      if (!result.instagramHandle) {
        const instaMatch = combinedText.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i);
        if (instaMatch && instaMatch[1]) {
          const handle = instaMatch[1].toLowerCase();
          if (!['p', 'reel', 'stories', 'explore', 'about', 'legal'].includes(handle)) {
            result.instagramUrl = `https://www.instagram.com/${instaMatch[1]}`;
            result.instagramHandle = `@${instaMatch[1]}`;
          }
        }
      }

      // Check URL and snippet for Facebook
      if (!result.facebookUrl) {
        const fbMatch = combinedText.match(/(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]+)/i);
        if (fbMatch && fbMatch[1]) {
          const handle = fbMatch[1].toLowerCase();
          if (!['sharer', 'share', 'groups', 'dialog', 'policies'].includes(handle)) {
            result.facebookUrl = `https://www.facebook.com/${fbMatch[1]}`;
          }
        }
      }

      // Try extracting follower count from snippet
      const followerMatch = p.snippet.match(/([0-9.]+[kKmM]?)\s*(?:followers|likes)/i);
      if (followerMatch && !result.followersCount) {
        result.followersCount = followerMatch[0];
      }
    }
  }

  // 3. Search for parcel delivery sentiment & carrier complaints
  const sentimentQuery = `"${cleanName}" (shipping OR delivery OR delay OR "Australia Post" OR lost OR parcel OR package) (site:productreview.com.au OR site:reddit.com OR site:trustpilot.com OR site:facebook.com)`;
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
