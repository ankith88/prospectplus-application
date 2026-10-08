'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { industryCategories } from '@/lib/constants';
import { findSimilarSignedCustomers } from '@/services/similar-customers';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const BranchLocationSchema = z.object({
  locationName: z.string().optional().describe(`Branch, store, showroom, warehouse, clinic, or regional office name.`),
  street: z.string().optional().describe(`Street address if available.`),
  suburb: z.string().optional().describe(`Suburb or locality name (e.g. 'Richmond', 'Parramatta', 'Fortitude Valley', 'Fremantle').`),
  state: z.string().optional().describe(`Australian state code (e.g. 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT').`),
  postcode: z.string().optional().describe(`Australian 4-digit postcode (e.g. '3000', '2000', '4006').`),
  phone: z.string().optional().describe(`Direct phone number for this branch if available.`),
  isHeadOffice: z.boolean().optional().describe(`True if this location is marked as the Head Office / Primary HQ.`),
  notes: z.string().optional().describe(`Operational role of this location (e.g. 'Retail Store', 'Warehouse / Distribution Hub', 'Showroom & Click & Collect').`),
});

const LeadEnrichmentOutputSchema = z.object({
  industryCategory: z.string().describe(`The best matching industry category from the exact provided master list. Must match one of the allowed categories.`),
  industrySubCategory: z.string().describe(`A specific, detailed sub-industry or niche description (e.g. 'Artisan Specialty Coffee & Roasted Beans', 'Adult Lingerie, Costumes & Novelties', 'Industrial Fasteners & Tool Supplies').`),
  hasParcelShipping: z.boolean().describe(`True if the business physically ships or dispatches parcels, goods, satchels, or freight. False if pure digital/intangible service.`),
  hasMultipleBranches: z.boolean().describe(`True if the company operates multiple physical branches, stores, showrooms, warehouses, clinics, or office locations across Australia. False if single site.`),
  totalBranchCount: z.number().optional().describe(`Estimated total number of Australian physical locations/branches found.`),
  branchLocations: z.array(BranchLocationSchema).optional().describe(`Structured list of all identified Australian branch, store, showroom, or warehouse locations with suburb, state, and postcode details.`),
  shipperEvidence: z.string().describe(`Verbatim quotes or direct evidence extracted from the website regarding parcel shipping, delivery rates, checkout shipping terms, dispatch times, carriers used, or order cutoff times.`),
  lodgementEvidence: z.string().describe(`Evidence of warehouse location, retail counter dispatch, daily courier collection, or post office lodgement.`),
  shopifyDetected: z.string().describe(`'Yes' if Shopify is detected, 'WooCommerce' / 'Magento' / 'BigCommerce' / 'Custom' if another platform is detected, or 'No'.`),
  xeroDetected: z.string().describe(`'Yes' or 'No'.`),
  apRelationship: z.string().describe(`Details of any current Australia Post, StarTrack, Aramex, Sendle, Toll, or courier relationships detected.`),
  prospectSummary: z.string().describe(`A clear, 2-3 sentence executive summary of what the company does, sells, and their shipping/logistics profile.`),
  suggestedProduct: z.string().describe(`The most relevant MailPlus service for them (e.g. 'Shipmate / Express Parcels (Sub-5kg)', 'Scheduled Daily Courier Pickup', 'B2B Parcel Delivery', 'PO Box Mail & Banking Collection').`),
  suggestedOpener: z.string().describe(`A personalized, high-converting cold call phone opener tailored to this exact business, referencing their industry, shipping volume, and social proof of similar clients.`),
  suggestedPersonalisation: z.string().describe(`Key talking points and value drivers to build instant rapport on the sales call.`),
});

const LeadEnrichmentInputSchema = z.object({
  leadId: z.string(),
  companyName: z.string(),
  websiteUrl: z.string().optional(),
  address: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  initialNotes: z.string().optional(),
  franchiseeName: z.string().optional(),
});

/**
 * Helper to fetch a URL safely with a timeout.
 */
async function fetchPageText(url: string): Promise<string> {
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal as any,
    });
    clearTimeout(timeout);

    if (!response.ok) return '';
    const html = await response.text();

    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    return '';
  }
}

/**
 * Scrapes the lead's website across homepage and key subpages (branches, stores, locations, shipping, delivery, contact).
 */
async function crawlLeadWebsite(baseUrl: string): Promise<{ text: string; shopifyDetected: string }> {
  let cleanBase = baseUrl.trim();
  if (!/^https?:\/\//i.test(cleanBase)) {
    cleanBase = 'https://' + cleanBase;
  }
  cleanBase = cleanBase.replace(/\/+$/, '');

  const paths = [
    '',
    '/locations',
    '/stores',
    '/find-us',
    '/our-stores',
    '/store-locator',
    '/branches',
    '/contact',
    '/contact-us',
    '/about',
    '/about-us',
    '/shipping',
    '/shipping-policy',
    '/delivery',
    '/delivery-information',
    '/faq',
    '/returns',
  ];
  let aggregatedText = '';
  let shopifyDetected = 'No';

  for (const path of paths) {
    const target = `${cleanBase}${path}`;
    const pageText = await fetchPageText(target);
    if (pageText) {
      if (/shopify/i.test(pageText) || /cdn\.shopify\.com/i.test(pageText)) {
        shopifyDetected = 'Yes';
      }
      aggregatedText += `\n--- PAGE: ${path || 'HOMEPAGE'} ---\n` + pageText.substring(0, 3500);
    }
  }

  return {
    text: aggregatedText.substring(0, 18000),
    shopifyDetected,
  };
}

const enrichLeadPrompt = ai.definePrompt({
  name: 'enrichLeadPrompt',
  input: {
    schema: z.object({
      companyName: z.string(),
      websiteUrl: z.string().optional(),
      address: z.string().optional(),
      suburb: z.string().optional(),
      state: z.string().optional(),
      siteContent: z.string().optional(),
      allowedIndustries: z.array(z.string()),
      similarCustomersSummary: z.string().optional(),
      initialNotes: z.string().optional(),
      franchiseeName: z.string().optional(),
    }),
  },
  output: { schema: LeadEnrichmentOutputSchema },
  prompt: `You are an elite B2B Sales & Logistics Intelligence Agent for MailPlus Australia (a national parcel delivery, express courier, and daily business logistics company).
Your task is to analyze the company details and extracted website content to perform deep lead enrichment.

### COMPANY INFORMATION:
- Company Name: {{companyName}}
- Website URL: {{websiteUrl}}
- Location: {{address}}, {{suburb}} {{state}}
- Franchisee Territory: {{franchiseeName}}
- Existing Notes: {{initialNotes}}

### SIMILAR SIGNED MAILPLUS CUSTOMERS (FOR SOCIAL PROOF):
{{similarCustomersSummary}}

### ALLOWED INDUSTRY CATEGORIES:
You MUST choose the single closest matching industry from this exact list:
{{#each allowedIndustries}}
- {{this}}
{{/each}}

### EXTRACTED WEBSITE & SHIPPING CONTENT:
"""
{{{siteContent}}}
"""

### INSTRUCTIONS:
1. **Industry Classification**:
   - Choose the best matching **industryCategory** from the ALLOWED list above.
   - **CRITICAL RULE - PRIORITISE MERCHANDISE & ECOMMERCE OVER ORGANIZATIONAL STRUCTURE**:
     - If an organisation, foundation, non-profit, trust, club, or charity sells physical merchandise or operates an eCommerce store (e.g. pet merchandise, clothing, gifts, calendars, accessories), you MUST classify them under their specific merchandise/retail vertical (e.g. 'B2C - PET PRODUCTS', 'RETAIL - PET ITEMS', 'B2C – GIFTS', 'RETAIL - GIFTS', 'B2C – CLOTHING & FASHION', 'RETAIL TRADE') rather than 'OTHER SERVICES' or 'ADMINISTRATIVE AND SUPPORT SERVICES'.
     - NEVER select 'OTHER SERVICES' if the company sells, ships, or manufactures any physical product that maps to a specific B2C, RETAIL, WHOLESALE, or MANUFACTURING category.
   - Generate a specific, descriptive **industrySubCategory** (e.g. 'Animal Welfare Charity & Pet Merchandise Store', 'Online Adult Lingerie & Novelties Retailer', 'Specialty Artisan Coffee Beans & Brewing Gear', 'Industrial Fasteners & Tool Supplies').

2. **Australian Branch & Multi-Location Detection**:
   - Analyze whether the company operates multiple physical branches, retail stores, showrooms, warehouses, clinics, or regional offices across Australia (**hasMultipleBranches**).
   - If they have multiple locations (or additional branches beyond their primary address):
     - Set **hasMultipleBranches** to \`true\`.
     - Set **totalBranchCount** to the estimated total number of Australian locations found.
     - In **branchLocations**, extract each identified Australian location with structured fields:
       - \`locationName\`: Store / Branch / Hub name (e.g. 'Melbourne CBD Store', 'Brisbane DC', 'Parramatta Showroom').
       - \`street\`: Street address if available.
       - \`suburb\`: Suburb name (e.g. 'Surry Hills', 'Richmond', 'Fortitude Valley', 'Subiaco').
       - \`state\`: Standard Australian state code ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT').
       - \`postcode\`: 4-digit Australian postcode if listed.
       - \`phone\`: Direct phone number for this location if available.
       - \`isHeadOffice\`: True if noted as the primary HQ / Head Office.
       - \`notes\`: Operational type or summary (e.g. 'Flagship Store', 'Distribution Centre', 'Regional Office').
   - If they only operate from a single location or single headquarters, set **hasMultipleBranches** to \`false\`, set **totalBranchCount** to 1, and include the primary location in **branchLocations** or leave empty.

3. **Parcel Shipping & Shipper Evidence**:
   - Determine if the company ships physical goods/parcels/satchels (**hasParcelShipping**).
   - In **shipperEvidence**, quote exact terms, postage rates, delivery timeframes, free shipping thresholds, or courier carriers found on their site.
   - In **lodgementEvidence**, note warehouse location, dispatch location, or counter lodgement details.

4. **eCommerce & Carrier Signals**:
   - Detect **shopifyDetected** ('Yes', 'WooCommerce', 'BigCommerce', 'Magento', or 'No').
   - Identify **apRelationship** (e.g. Australia Post, StarTrack, Toll, Sendle, Aramex).

5. **Prospect Summary**:
   - Provide a 2-3 sentence overview of what they sell, their geographical footprint, and their logistics profile.

6. **Cold Call Opener (Crucial!)**:
   - Craft a natural, high-converting cold call phone opener for a sales dialer.
   - Structure:
     a. Natural intro ("Hi [Contact Name], it's [Name] from MailPlus...")
     b. Observation of their specific products / dispatch model / multi-location presence if relevant.
     c. Social proof mentioning our experience with similar businesses (use the provided similar customers if applicable).
     d. Low-friction hook asking about their daily dispatch cutoff or pickup routine.

7. **Suggested Personalisation**:
   - 2-3 targeted talking points explaining how MailPlus saves them time (e.g. daily guaranteed 4pm pickup from their door, flat-rate express satchels, multi-site consolidation, Shopify order sync).
`,
});

export const enrichLeadFlow = ai.defineFlow(
  {
    name: 'enrichLeadFlow',
    inputSchema: LeadEnrichmentInputSchema,
    outputSchema: LeadEnrichmentOutputSchema.extend({
      similarSignedCustomers: z.array(z.any()).optional(),
    }),
  },
  async (input) => {
    let siteText = '';
    let autoDetectedShopify = 'No';

    // 1. If website URL is available, crawl it
    if (input.websiteUrl && input.websiteUrl.trim() !== '') {
      const crawlRes = await crawlLeadWebsite(input.websiteUrl);
      siteText = crawlRes.text;
      autoDetectedShopify = crawlRes.shopifyDetected;
    }

    // 2. Fetch similar signed customers from the `companies` collection
    const similarCustomers = await findSimilarSignedCustomers({
      franchiseeName: input.franchiseeName,
      state: input.state,
      suburb: input.suburb,
      limitCount: 3,
    });

    let similarCustomersSummary = 'None currently matched in database.';
    if (similarCustomers.length > 0) {
      similarCustomersSummary = similarCustomers
        .map(c => `- ${c.companyName} (${c.industryCategory || 'Retail/Commercial'}, Suburb: ${c.suburb || 'N/A'}, Franchisee: ${c.franchiseeName || 'N/A'})`)
        .join('\n');
    }

    // 3. Prompt Gemini AI for enrichment
    const { output } = await enrichLeadPrompt({
      companyName: input.companyName,
      websiteUrl: input.websiteUrl || 'No website provided',
      address: input.address || '',
      suburb: input.suburb || '',
      state: input.state || '',
      siteContent: siteText || 'No website content available. Please infer based on company name, location, and industry.',
      allowedIndustries: industryCategories,
      similarCustomersSummary,
      initialNotes: input.initialNotes || '',
      franchiseeName: input.franchiseeName || '',
    });

    if (!output) {
      throw new Error('AI failed to generate lead enrichment.');
    }

    // If web crawl detected Shopify, ensure output captures it
    if (autoDetectedShopify === 'Yes' && output.shopifyDetected === 'No') {
      output.shopifyDetected = 'Yes';
    }

    return {
      ...output,
      similarSignedCustomers: similarCustomers,
    };
  }
);

/**
 * Server Action to enrich a lead by lead ID and save all results to Firestore.
 */
export async function enrichLeadAction(leadId: string) {
  try {
    const db = getFirestore(adminApp);
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return { success: false, error: `Lead ${leadId} not found in database.` };
    }

    const leadData = leadSnap.data() || {};
    const companyName = leadData.companyName || leadData.name || 'Company';
    const websiteUrl = leadData.websiteUrl || leadData.website || '';
    const address = leadData.address?.street || leadData.street || '';
    const suburb = leadData.address?.city || leadData.city || leadData.address?.suburb || leadData.suburb || '';
    const state = leadData.address?.state || leadData.state || '';
    const postcode = leadData.address?.zip || leadData.zip || leadData.postcode || '';
    const franchiseeName = leadData.franchiseeName || leadData.franchisee || '';
    const initialNotes = leadData.initialNotes || leadData.prospectSummary || '';

    // Run AI Flow
    const enrichment = await enrichLeadFlow({
      leadId,
      companyName,
      websiteUrl,
      address,
      suburb,
      state,
      postcode,
      initialNotes,
      franchiseeName,
    });

    // Save enriched fields directly to Firestore
    const updatePayload: Record<string, any> = {
      industryCategory: enrichment.industryCategory,
      industrySubCategory: enrichment.industrySubCategory,
      shipperEvidence: enrichment.shipperEvidence,
      lodgementEvidence: enrichment.lodgementEvidence,
      shopifyDetected: enrichment.shopifyDetected,
      xeroDetected: enrichment.xeroDetected,
      apRelationship: enrichment.apRelationship,
      prospectSummary: enrichment.prospectSummary,
      suggestedProduct: enrichment.suggestedProduct,
      suggestedOpener: enrichment.suggestedOpener,
      suggestedPersonalisation: enrichment.suggestedPersonalisation,
      similarSignedCustomers: enrichment.similarSignedCustomers || [],
      hasMultipleBranches: Boolean(enrichment.hasMultipleBranches),
      totalBranchCount: enrichment.totalBranchCount !== undefined ? enrichment.totalBranchCount : (enrichment.branchLocations?.length || (enrichment.hasMultipleBranches ? 2 : 1)),
      branchLocations: enrichment.branchLocations || [],
      isAiEnriched: true,
      enrichedAt: new Date().toISOString(),
      enrichedBy: 'AI Lead Intelligence Agent',
    };

    if (enrichment.hasParcelShipping !== undefined) {
      updatePayload.hasParcelShipping = enrichment.hasParcelShipping;
    }

    await leadRef.update(updatePayload);

    return {
      success: true,
      data: {
        ...enrichment,
        leadId,
      },
    };
  } catch (error: any) {
    console.error(`Error enriching lead ${leadId}:`, error);
    return { success: false, error: error.message || String(error) };
  }
}
