import { AgentReachDossier } from '@/lib/types';
import { searchCompanyWebsite, searchLogisticsEvidence } from './exa-discovery';
import { findDecisionMakers } from './linkedin-finder';
import { getSocialIntelligence } from './social-intelligence';
import { fetchWithJinaReader } from './runner';

export interface LeadDossierInput {
  leadId: string;
  companyName: string;
  websiteUrl?: string;
  suburb?: string;
  state?: string;
}

/**
 * Generate a complete Agent Reach Executive Lead Dossier
 * Combining Domain Discovery, LinkedIn Decision Makers, Logistics Intel, and Social Footprint
 */
export async function generateLeadDossier(input: LeadDossierInput): Promise<AgentReachDossier> {
  const { companyName, suburb, state } = input;
  let websiteUrl = input.websiteUrl;
  let verifiedDomain: string | undefined = undefined;

  // 1. If website is missing, discover it via Exa
  if (!websiteUrl || websiteUrl.trim() === '') {
    try {
      const discovered = await searchCompanyWebsite(companyName, suburb, state);
      if (discovered.url) {
        websiteUrl = discovered.url;
        verifiedDomain = discovered.domain;
      }
    } catch (err) {
      console.warn(`[LeadDossier] searchCompanyWebsite failed for ${companyName}:`, err);
    }
  } else {
    try {
      const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
      verifiedDomain = parsed.hostname.replace(/^www\./, '');
    } catch {}
  }

  // 2. Run parallel research streams with individual safety fallbacks
  const [decisionMakers, logisticsEvidence, socialIntelligence] = await Promise.all([
    findDecisionMakers(companyName, websiteUrl).catch((err) => {
      console.warn(`[LeadDossier] findDecisionMakers error for ${companyName}:`, err);
      return [];
    }),
    searchLogisticsEvidence(companyName, websiteUrl).catch((err) => {
      console.warn(`[LeadDossier] searchLogisticsEvidence error for ${companyName}:`, err);
      return {
        rawSnippets: [],
        carrierDetected: [],
        dispatchLocations: [],
        shippingPoliciesFound: [],
        cutoffTimes: undefined,
      };
    }),
    getSocialIntelligence(companyName, websiteUrl).catch((err) => {
      console.warn(`[LeadDossier] getSocialIntelligence error for ${companyName}:`, err);
      return {
        scannedAt: new Date().toISOString(),
        shippingSentiment: 'Neutral' as const,
        deliveryComplaints: [],
      };
    }),
  ]);

  // 3. Optional Jina Reader check on website if present
  let websiteSummary = '';
  if (websiteUrl) {
    try {
      const md = await fetchWithJinaReader(websiteUrl, 6000);
      if (md && md.length > 50) {
        websiteSummary = md.slice(0, 500).replace(/\n+/g, ' ');
      }
    } catch {}
  }

  // 4. Synthesize AI Shipping Summary from raw snippets if present
  let shippingSummary: string | undefined = undefined;
  if (logisticsEvidence.rawSnippets.length > 0) {
    shippingSummary = await summarizeShippingEvidence(companyName, logisticsEvidence.rawSnippets);
  }

  // 5. Synthesize Agent Reach Enrichment (Separate from AI Enrich)
  const hasShipping =
    logisticsEvidence.carrierDetected.length > 0 ||
    logisticsEvidence.shippingPoliciesFound.length > 0 ||
    Boolean(logisticsEvidence.cutoffTimes);

  let detectedPlatform = 'No';
  const combinedText = `${websiteSummary} ${logisticsEvidence.rawSnippets.join(' ')}`;
  if (/shopify/i.test(combinedText)) detectedPlatform = 'Shopify';
  else if (/woocommerce/i.test(combinedText)) detectedPlatform = 'WooCommerce';
  else if (/bigcommerce/i.test(combinedText)) detectedPlatform = 'BigCommerce';
  else if (/magento/i.test(combinedText)) detectedPlatform = 'Magento';
  else if (/squarespace/i.test(combinedText)) detectedPlatform = 'Squarespace';
  else if (/wix/i.test(combinedText)) detectedPlatform = 'Wix';

  const topPerson = decisionMakers[0];
  const carrierStr = logisticsEvidence.carrierDetected.join(' & ') || 'their current carrier';
  const opener = topPerson
    ? `Hi ${topPerson.name.split(' ')[0]}, it's [Your Name] with MailPlus. I noticed ${companyName} handles daily parcel dispatch using ${carrierStr}${logisticsEvidence.cutoffTimes ? ` with a ${logisticsEvidence.cutoffTimes} cutoff` : ''}—we provide dedicated daily driver pickups and sub-5kg flat-rate satchels for Australian businesses...`
    : `Hi, it's [Your Name] with MailPlus. I'm calling for ${companyName}'s logistics manager—we provide dedicated daily parcel pickups and flat-rate express delivery for businesses sending with ${carrierStr}...`;

  const talkingPoints = [
    `Current Carrier: ${carrierStr} detected online. Position MailPlus's guaranteed daily afternoon driver collection.`,
    logisticsEvidence.cutoffTimes
      ? `Cutoff Window: They advertise ${logisticsEvidence.cutoffTimes}. MailPlus can accommodate late driver pickups.`
      : `Delivery Speed: MailPlus delivers 1-2 business days Australia-wide with 95% overnight metro arrival.`,
    socialIntelligence.shippingSentiment === 'Negative / Delivery Complaints Detected'
      ? `Customer Service Pain Point: Detected customer reports citing delivery delays. Offer dedicated account management and direct local phone support.`
      : `Technology: Free ShipMate platform plugs directly into ${detectedPlatform !== 'No' ? detectedPlatform : 'their eCommerce store'} with no setup fees.`,
  ];

  // 6. Synthesize executive summary
  const summaryParts: string[] = [];
  if (verifiedDomain) {
    summaryParts.push(`Domain: ${verifiedDomain}`);
  }
  if (topPerson) {
    summaryParts.push(`Key Contact: ${topPerson.name} (${topPerson.title})`);
  }
  if (logisticsEvidence.carrierDetected.length > 0) {
    summaryParts.push(`Carriers: ${logisticsEvidence.carrierDetected.join(', ')}`);
  }
  if (logisticsEvidence.cutoffTimes) {
    summaryParts.push(`Cutoff: ${logisticsEvidence.cutoffTimes}`);
  }
  if (socialIntelligence.shippingSentiment === 'Negative / Delivery Complaints Detected') {
    summaryParts.push(`Alert: Public delivery delays noted.`);
  }

  const summary = summaryParts.join(' | ') || `Researched ${companyName} via Agent Reach.`;

  return {
    generatedAt: new Date().toISOString(),
    officialWebsite: websiteUrl,
    verifiedDomain,
    decisionMakers,
    socialIntelligence,
    logisticsSignals: {
      carrierDetected: logisticsEvidence.carrierDetected,
      dispatchLocations: logisticsEvidence.dispatchLocations,
      cutoffTimes: logisticsEvidence.cutoffTimes,
      shippingPoliciesFound: logisticsEvidence.shippingPoliciesFound,
      rawSnippets: logisticsEvidence.rawSnippets,
      shippingSummary,
    },
    enrichment: {
      ecommercePlatform: detectedPlatform !== 'No' ? detectedPlatform : undefined,
      hasParcelShipping: hasShipping,
      logisticsSummary: `Dispatches physical parcels using ${carrierStr}. ${logisticsEvidence.cutoffTimes ? `Cutoff: ${logisticsEvidence.cutoffTimes}. ` : ''}${logisticsEvidence.dispatchLocations.length > 0 ? `Locations: ${logisticsEvidence.dispatchLocations.join(', ')}.` : ''}`,
      suggestedOpener: opener,
      talkingPoints,
    },
    summary,
  };
}

/**
 * Summarize raw shipping and carrier web search snippets using Gemini
 */
export async function summarizeShippingEvidence(
  companyName: string,
  rawSnippets: string[]
): Promise<string> {
  if (!rawSnippets || rawSnippets.length === 0) return '';
  try {
    const { ai } = await import('@/ai/genkit');
    const prompt = `You are a logistics and parcel supply chain analyst for MailPlus Australia.
Analyze these raw web search snippets regarding ${companyName}'s shipping policy, warehouse dispatch, carriers, and returns.

Raw Web Evidence Snippets:
${rawSnippets.slice(0, 8).join('\n---\n')}

Provide a structured, executive summary in clear bullet points (maximum 120 words total):
- **Dispatch & Warehousing**: Turnaround times (e.g. within 24h), cutoff windows, warehouse/fulfillment hubs.
- **Carriers & Delivery**: Identified shipping partners, express vs standard delivery options, domestic and international shipping.
- **Returns & Exchanges**: Return window (e.g. 30 days), associated fees (e.g. $10 exchange), warehouse drop-off options.
- **Sales Angle**: 1 sentence on the key opportunity for MailPlus (daily driver afternoon collections, flat-rate satchels).

Do not quote raw markdown hashes or reproduce messy code snippets. Be direct, authoritative, and concise.`;

    const response = await ai.generate({ prompt });
    return response.text?.trim() || '';
  } catch (err) {
    console.warn(`[LeadDossier] summarizeShippingEvidence failed for ${companyName}:`, err);
    return '';
  }
}
