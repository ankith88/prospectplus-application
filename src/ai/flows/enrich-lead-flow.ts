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

const LinkedEcommerceEntitySchema = z.object({
  entityName: z.string().describe(`Name of the sister brand, separate online storefront, parent holding company, subsidiary, or fulfilment entity (e.g. 'Patch & Purr', 'Animals Asia Online Shop', 'InvoCare Pet Care').`),
  websiteUrl: z.string().optional().describe(`Direct URL to the external shop, sister site, subdomain, or partner domain (e.g. 'https://shop.animalsasia.org', 'https://patchandpurr.com.au').`),
  relationshipType: z.enum(['Sister Company', 'Separate Storefront', 'Parent Entity', 'Subsidiary', '3PL / Fulfilment Partner', 'Other']).describe(`Relationship to the primary lead business.`),
  dispatchRole: z.string().optional().describe(`Clear description of physical goods or products sold/dispatched through this entity (e.g. 'Sells and dispatches pet memorial products, urns, and keepsake merchandise', 'Dispatches official calendars, gifts, and pet accessories').`),
  isPrimaryShipper: z.boolean().optional().describe(`True if this entity is the one actually responsible for packing and dispatching physical parcels.`),
  notes: z.string().optional().describe(`Any additional context on how operations, order intake, or shipping are divided between the main company and this entity.`),
});

const LeadEnrichmentOutputSchema = z.object({
  industryCategory: z.string().describe(`The best matching industry category from the exact provided master list. Must match one of the allowed categories.`),
  industrySubCategory: z.string().describe(`A specific, detailed sub-industry or niche description (e.g. 'Animal Welfare Charity & Pet Merchandise Store', 'Pet Cremation & Memorial Keepsakes', 'Artisan Specialty Coffee & Roasted Beans', 'Industrial Fasteners & Tool Supplies').`),
  hasParcelShipping: z.boolean().describe(`True if the business physically ships or dispatches parcels, goods, satchels, or freight (either directly or via sister company / separate store). False if pure digital/intangible service.`),
  hasMultipleBranches: z.boolean().describe(`True if the company operates multiple physical branches, stores, showrooms, warehouses, clinics, or office locations across Australia. False if single site.`),
  totalBranchCount: z.number().optional().describe(`Estimated total number of Australian physical locations/branches found.`),
  branchLocations: z.array(BranchLocationSchema).optional().describe(`Structured list of all identified Australian branch, store, showroom, or warehouse locations with suburb, state, and postcode details.`),
  hasSeparateEcommerceEntity: z.boolean().optional().describe(`True if this business sells or dispatches physical products through a separate ecommerce website, sister brand, parent entity, or distinct fulfilment partner rather than directly on their main informational site.`),
  linkedEcommerceEntities: z.array(LinkedEcommerceEntitySchema).optional().describe(`List of all linked ecommerce storefronts, sister brands, subsidiaries, parent entities, or fulfilment partners discovered.`),
  mainEntityRole: z.string().optional().describe(`The operational role of the primary company (e.g. 'Main Non-Profit / Charity Advocacy', 'Veterinary & Pet Cremation Service Operations', 'Holding Company / Corporate HQ').`),
  fulfilmentModel: z.string().optional().describe(`Summary of how physical products are fulfilled and dispatched (e.g. 'Dispatches merchandise via separate subdomain store (shop.animalsasia.org)', 'Memorial products and urns fulfilled via sister brand Patch & Purr', 'Direct in-house warehouse dispatch').`),
  shipperEvidence: z.string().describe(`Verbatim quotes or direct evidence extracted from the website regarding parcel shipping, delivery rates, checkout shipping terms, dispatch times, carriers used, or order cutoff times.`),
  lodgementEvidence: z.string().describe(`Evidence of warehouse location, retail counter dispatch, daily courier collection, or post office lodgement.`),
  shopifyDetected: z.string().describe(`Accurate eCommerce platform name if identified: 'Shopify', 'WooCommerce', 'BigCommerce', 'Magento', 'Squarespace', 'Wix', 'Custom', or 'No'. Note: ONLY use 'Custom' if an actual working proprietary cart/checkout with real products exists. Use 'No' if there is no shopping cart.`),
  xeroDetected: z.string().describe(`'Yes' or 'No'.`),
  apRelationship: z.string().describe(`Details of any current Australia Post, StarTrack, Aramex, Sendle, Toll, or courier relationships detected.`),
  prospectSummary: z.string().describe(`A clear, 2-3 sentence executive summary of what the company does, sells, and their shipping/logistics profile (including separate storefronts/sister brands if applicable).`),
  suggestedProduct: z.string().describe(`The most relevant MailPlus service for them (e.g. 'Shipmate / Express Parcels (Sub-5kg)', 'Scheduled Daily Courier Pickup', 'B2B Parcel Delivery', 'PO Box Mail & Banking Collection').`),
  suggestedOpener: z.string().describe(`A personalized, high-converting cold call phone opener tailored to this exact business, referencing their industry, shipping volume, fulfillment setup, and social proof of similar clients.`),
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
  industryCategory: z.string().optional(),
  industrySubCategory: z.string().optional(),
});

interface ScrapeResult {
  text: string;
  detectedPlatform: string;
  discoveredLinks: string[];
  internalLinks: string[];
}

/**
 * Helper to fetch a URL safely with a timeout and extract text, platform signals, outbound links, and internal navigation links.
 */
async function fetchPage(url: string, baseDomain: string): Promise<ScrapeResult> {
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

    if (!response.ok) return { text: '', detectedPlatform: 'No', discoveredLinks: [], internalLinks: [] };
    const html = await response.text();

    // 1. Platform Detection in HTML
    let detectedPlatform = 'No';
    if (/cdn\.shopify\.com/i.test(html) || /myshopify\.com/i.test(html) || /Shopify\.theme/i.test(html) || /window\.Shopify/i.test(html)) {
      detectedPlatform = 'Shopify';
    } else if (/wp-content\/plugins\/woocommerce/i.test(html) || /class="[^"]*woocommerce/i.test(html) || /woocommerce-cart/i.test(html)) {
      detectedPlatform = 'WooCommerce';
    } else if (/cdn11\.bigcommerce\.com/i.test(html) || /data-bigcommerce/i.test(html)) {
      detectedPlatform = 'BigCommerce';
    } else if (/mage\/cookies/i.test(html) || /varien\/js/i.test(html) || /Magento/i.test(html)) {
      detectedPlatform = 'Magento';
    } else if (/static1\.squarespace\.com/i.test(html) || /squarespace-commerce/i.test(html)) {
      detectedPlatform = 'Squarespace';
    } else if (/wixstatic\.com/i.test(html) || /wix-warmup-data/i.test(html)) {
      detectedPlatform = 'Wix';
    }

    // 2. Discover Outbound & Subdomain Storefront / Sister Brand Links and Internal Location Links
    const discoveredLinks: string[] = [];
    const internalLinks: string[] = [];
    const hrefRegex = /href=["']([^"'#\s>]+)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      let linkUrl = match[1].trim();
      if (/^(javascript:|mailto:|tel:|#)/i.test(linkUrl)) continue;

      if (linkUrl.startsWith('//')) {
        linkUrl = 'https:' + linkUrl;
      }

      // External / Sister Brand / Storefront links
      if (/^https?:\/\//i.test(linkUrl)) {
        const isShopSignal = /(shop\.|store\.|merch\.|patchandpurr|invocare|petangel|buy|cart|order-online|\/shop|\/store|\/products|\/collections)/i.test(linkUrl);
        if (isShopSignal && !discoveredLinks.includes(linkUrl) && discoveredLinks.length < 15) {
          discoveredLinks.push(linkUrl);
        }
      }

      // Internal location/contact links
      const isLocationSignal = /(pages\/|contact|location|store|branch|warehouse|find-us|stockist|about)/i.test(linkUrl);
      if (isLocationSignal) {
        if (linkUrl.startsWith('/')) {
          if (!internalLinks.includes(linkUrl)) internalLinks.push(linkUrl);
        } else if (baseDomain && linkUrl.includes(baseDomain)) {
          try {
            const parsed = new URL(linkUrl);
            const pathOnly = parsed.pathname;
            if (!internalLinks.includes(pathOnly)) internalLinks.push(pathOnly);
          } catch (e) {}
        }
      }
    }

    // 3. Clean Text
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { text, detectedPlatform, discoveredLinks, internalLinks };
  } catch (error) {
    return { text: '', detectedPlatform: 'No', discoveredLinks: [], internalLinks: [] };
  }
}

/**
 * Scrapes the lead's website across homepage and all key subpages (branches, stores, locations, shipping, delivery, contact).
 */
async function crawlLeadWebsite(baseUrl: string): Promise<{ text: string; detectedPlatform: string; discoveredLinks: string[] }> {
  let cleanBase = baseUrl.trim();
  if (!/^https?:\/\//i.test(cleanBase)) {
    cleanBase = 'https://' + cleanBase;
  }
  cleanBase = cleanBase.replace(/\/+$/, '');

  let baseDomain = '';
  try {
    baseDomain = new URL(cleanBase).hostname.replace(/^www\./, '');
  } catch (e) {
    baseDomain = cleanBase;
  }

  const initialPaths = [
    '',
    '/pages/contact',
    '/pages/contact-us',
    '/pages/locations',
    '/pages/our-locations',
    '/pages/stores',
    '/pages/our-stores',
    '/pages/branches',
    '/pages/about',
    '/pages/about-us',
    '/contact',
    '/contact-us',
    '/locations',
    '/stores',
    '/find-us',
    '/our-stores',
    '/store-locator',
    '/branches',
    '/warehouses',
    '/about',
    '/about-us',
    '/shop',
    '/store',
    '/merchandise',
    '/shipping',
    '/shipping-policy',
    '/delivery',
    '/delivery-information',
    '/faq',
    '/returns',
  ];

  const queue = [...initialPaths];
  const visited = new Set<string>();
  let aggregatedText = '';
  let finalPlatform = 'No';
  const allDiscoveredLinks: Set<string> = new Set();

  while (queue.length > 0 && visited.size < 20) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);

    const target = path.startsWith('http') ? path : `${cleanBase}${path}`;
    const pageResult = await fetchPage(target, baseDomain);

    if (pageResult.text) {
      if (pageResult.detectedPlatform !== 'No') {
        finalPlatform = pageResult.detectedPlatform;
      }
      pageResult.discoveredLinks.forEach(l => allDiscoveredLinks.add(l));

      // Add newly discovered internal paths to queue if not visited
      for (const intPath of pageResult.internalLinks) {
        if (!visited.has(intPath) && !queue.includes(intPath) && queue.length < 25) {
          queue.push(intPath);
        }
      }

      aggregatedText += `\n--- PAGE: ${path || 'HOMEPAGE'} ---\n` + pageResult.text.substring(0, 15000);
    }
  }

  return {
    text: aggregatedText.substring(0, 45000),
    detectedPlatform: finalPlatform,
    discoveredLinks: Array.from(allDiscoveredLinks).slice(0, 10),
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
      discoveredLinks: z.string().optional(),
      detectedPlatformSignal: z.string().optional(),
      allowedIndustries: z.array(z.string()),
      similarCustomersSummary: z.string().optional(),
      initialNotes: z.string().optional(),
      franchiseeName: z.string().optional(),
    }),
  },
  output: { schema: LeadEnrichmentOutputSchema },
  prompt: `You are an elite B2B Sales & Logistics Intelligence Agent for MailPlus Australia (a national parcel delivery, express courier, and daily business logistics company).
Your task is to analyze the company details, extracted website content, discovered outbound links, and sister brand relationships to perform deep lead enrichment.

### COMPANY INFORMATION:
- Company Name: {{companyName}}
- Website URL: {{websiteUrl}}
- Location: {{address}}, {{suburb}} {{state}}
- Franchisee Territory: {{franchiseeName}}
- Existing Notes: {{initialNotes}}

### SIMILAR SIGNED MAILPLUS CUSTOMERS (FOR SOCIAL PROOF):
{{similarCustomersSummary}}

### AUTOMATED CRAWLER SIGNALS:
- eCommerce Platform Footprint Detected: {{detectedPlatformSignal}}
- Discovered External Storefront & Outbound Links:
{{discoveredLinks}}

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
     - If an organisation, foundation, non-profit, trust, club, charity, or service company sells physical merchandise or operates an eCommerce store (e.g. pet merchandise, gifts, calendars, memorial urns, clothing, accessories, retail supplies), you MUST classify them under their specific merchandise/retail vertical (e.g. 'B2C - PET PRODUCTS', 'RETAIL - PET ITEMS', 'B2C – GIFTS', 'RETAIL - GIFTS', 'B2C – CLOTHING & FASHION', 'RETAIL TRADE') rather than 'OTHER SERVICES' or 'ADMINISTRATIVE AND SUPPORT SERVICES'.
     - NEVER select 'OTHER SERVICES' if the company sells, ships, or manufactures any physical product that maps to a specific B2C, RETAIL, WHOLESALE, or MANUFACTURING category.
   - Generate a specific, descriptive **industrySubCategory** (e.g. 'Animal Welfare Charity & Pet Merchandise Store', 'Pet Cremation & Memorial Keepsakes', 'Online Adult Lingerie & Novelties Retailer', 'Specialty Artisan Coffee Beans & Brewing Gear', 'Industrial Fasteners & Tool Supplies').

2. **Separate eCommerce Sites, Sister Companies & Fulfilment Arrangements**:
   - Some businesses sell physical products through a separate ecommerce website, subdomain (e.g. \`shop.animalsasia.org\`), sister company, parent entity, or 3PL fulfilment partner rather than their main informational site.
     - *Example 1*: **Animals Asia Foundation** (Main site is an advocacy/charity foundation, but physical merchandise/calendars/gifts are sold via a separate shop subdomain or store).
     - *Example 2*: **Lawnswood Pet Cremations** (Main site is pet cremation/vet services, but memorial merchandise, urns, and keepsake products are dispatched via sister company **Patch & Purr** or parent **InvoCare**).
   - Analyze the website text and discovered links for:
     - Outbound links to external shops, dedicated subdomains (\`shop.\`, \`store.\`, \`merch.\`), or sister brand domains.
     - Mentions of sister companies, parent companies, subsidiaries, or fulfilment partners ("a division of...", "orders fulfilled by...", "shop our sister company...", "partner brand...").
   - If a separate storefront, sister brand, or distinct fulfilment entity is identified:
     - Set **hasSeparateEcommerceEntity** to \`true\`.
     - In **linkedEcommerceEntities**, provide structured details for each identified entity:
       - \`entityName\`: Name of the sister company or storefront (e.g. 'Animals Asia Online Shop', 'Patch & Purr', 'InvoCare Pet Care').
       - \`websiteUrl\`: URL to the shop or sister site if found.
       - \`relationshipType\`: 'Sister Company', 'Separate Storefront', 'Parent Entity', 'Subsidiary', '3PL / Fulfilment Partner', or 'Other'.
       - \`dispatchRole\`: What physical goods this entity sells or ships.
       - \`isPrimaryShipper\`: \`true\` if this entity handles the physical parcel shipping.
       - \`notes\`: Operational context.
     - In **mainEntityRole**, summarize the primary lead's role (e.g. 'Primary Non-Profit / Charity Advocacy', 'Veterinary & Pet Cremation Operations').
     - In **fulfilmentModel**, summarize how products are dispatched (e.g. 'Dispatches merchandise via dedicated online store (shop.animalsasia.org)', 'Physical pet urns and keepsakes dispatched via sister brand (Patch & Purr)', 'Direct in-house warehouse dispatch').
   - If the company dispatches everything in-house directly from their primary site, set **hasSeparateEcommerceEntity** to \`false\`, set **fulfilmentModel** to 'Direct In-House Dispatch', and leave **linkedEcommerceEntities** empty.

3. **Shopify & eCommerce Platform Detection**:
   - Set **shopifyDetected** to the accurate platform name:
     - \`'Shopify'\` if Shopify scripts, cdn.shopify.com, or Shopify theme is detected.
     - \`'WooCommerce'\` if WordPress WooCommerce is detected.
     - \`'BigCommerce'\` if BigCommerce is detected.
     - \`'Magento'\` if Adobe Commerce / Magento is detected.
     - \`'Squarespace'\` if Squarespace commerce is detected.
     - \`'Wix'\` if Wix store is detected.
     - \`'Custom'\` ONLY if a real, functioning bespoke shopping cart or customer ordering portal with physical product checkout is explicitly identified.
     - \`'No'\` if NO shopping cart, eCommerce store, or checkout exists (e.g. pure informational website). NEVER output 'Custom' if no cart exists!

4. **Australian Branch & Multi-Location Footprint**:
   - Analyze whether the company operates multiple physical branches, retail stores, showrooms, warehouses, clinics, or regional offices across Australia (**hasMultipleBranches**).
   - **CRITICAL REQUIREMENT - EXTRACT ALL IDENTIFIED LOCATIONS**:
     - If the website text or footer lists multiple Australian facilities, warehouses, stores, or regional offices (e.g. 'NSW - Northmead', 'NSW - Moorebank', 'VIC - Braeside', 'QLD - Sunnybank Hills', 'SA - Port Adelaide'), you MUST extract **EACH AND EVERY ONE** into the **branchLocations** array!
     - Do NOT output only 1 entry if 5 locations are named in the text. Every single location with an address, suburb, state, or phone must have its own structured entry in **branchLocations**.
   - If they have multiple locations:
     - Set **hasMultipleBranches** to \`true\`.
     - Set **totalBranchCount** to the exact total count of Australian locations found (must match the length of \`branchLocations\`, or total stated locations).
     - In **branchLocations**, extract each identified Australian location with structured fields:
       - \`locationName\`: Store / Branch / Hub name (e.g. 'NSW - Northmead Head Office', 'NSW - Moorebank Warehouse', 'VIC - Braeside Warehouse', 'QLD - Sunnybank Hills DC', 'SA - Port Adelaide Warehouse').
       - \`street\`: Street address (e.g. '157 Briens Rd', '4B Tiber Pl', '372 Lower Dandenong Rd', 'Unit 2, 177 Jackson Rd', '48 Lipson Street').
       - \`suburb\`: Suburb name (e.g. 'Northmead', 'Moorebank', 'Braeside', 'Sunnybank Hills', 'Port Adelaide').
       - \`state\`: Standard Australian state code ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT').
       - \`postcode\`: 4-digit Australian postcode if listed (e.g. '2152', '2170', '3195', '4109', '5015').
       - \`phone\`: Direct phone number for this location if available (e.g. '1800 577 551').
       - \`isHeadOffice\`: True if noted as the primary HQ / Head Office.
       - \`notes\`: Operational type or summary (e.g. 'Head Office & Primary Warehouse', 'Distribution Warehouse').
   - If single location, set **hasMultipleBranches** to \`false\`, set **totalBranchCount** to 1, and include primary location in **branchLocations** or leave empty.

5. **Parcel Shipping & Shipper Evidence**:
   - Determine if the company ships physical goods/parcels/satchels (**hasParcelShipping**) - whether directly or through their sister brand/storefront.
   - In **shipperEvidence**, quote exact terms, postage rates, delivery timeframes, free shipping thresholds, or courier carriers found on their site.
   - In **lodgementEvidence**, note warehouse location, dispatch location, or counter lodgement details.

6. **Prospect Summary**:
   - Provide a 2-3 sentence overview of what they sell, their geographical footprint, their fulfillment setup (including sister brands if applicable), and their logistics profile.

7. **Cold Call Opener (Crucial!)**:
   - Craft a natural, high-converting cold call phone opener for a sales dialer.
   - Structure:
     a. Natural intro ("Hi [Contact Name], it's [Name] from MailPlus...")
     b. Observation of their specific products / dispatch model / sister brand setup / multi-location presence if relevant.
     c. Social proof mentioning our experience with similar businesses (use the provided similar customers if applicable).
     d. Low-friction hook asking about their daily dispatch cutoff or pickup routine.

8. **Suggested Personalisation**:
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
    let autoDetectedPlatform = 'No';
    let discoveredLinksList: string[] = [];

    // 1. If website URL is available, crawl it
    if (input.websiteUrl && input.websiteUrl.trim() !== '') {
      const crawlRes = await crawlLeadWebsite(input.websiteUrl);
      siteText = crawlRes.text;
      autoDetectedPlatform = crawlRes.detectedPlatform;
      discoveredLinksList = crawlRes.discoveredLinks;
    }

    // 2. Initial lookup of similar signed customers based on 2 checks (Industry/Subcategory & Close to lead)
    const initialSimilarCustomers = await findSimilarSignedCustomers({
      industryCategory: input.industryCategory,
      industrySubCategory: input.industrySubCategory,
      franchiseeName: input.franchiseeName,
      state: input.state,
      suburb: input.suburb,
      postcode: input.postcode,
      limitCount: 4,
    });

    let similarCustomersSummary = 'None currently matched in database.';
    if (initialSimilarCustomers.length > 0) {
      similarCustomersSummary = initialSimilarCustomers
        .map(c => `- ${c.companyName} (${c.industryCategory || 'Retail/Commercial'}, Suburb: ${c.suburb || 'N/A'}, Match: ${c.matchReason || 'Social Proof Client'})`)
        .join('\n');
    }

    const discoveredLinksText = discoveredLinksList.length > 0
      ? discoveredLinksList.map(l => `- ${l}`).join('\n')
      : 'None detected in automated crawl.';

    // 3. Prompt Gemini AI for enrichment
    const { output } = await enrichLeadPrompt({
      companyName: input.companyName,
      websiteUrl: input.websiteUrl || 'No website provided',
      address: input.address || '',
      suburb: input.suburb || '',
      state: input.state || '',
      siteContent: siteText || 'No website content available. Please infer based on company name, location, and industry.',
      discoveredLinks: discoveredLinksText,
      detectedPlatformSignal: autoDetectedPlatform !== 'No' ? autoDetectedPlatform : 'No automated platform footprint found in HTML',
      allowedIndustries: industryCategories,
      similarCustomersSummary,
      initialNotes: input.initialNotes || '',
      franchiseeName: input.franchiseeName || '',
    });

    if (!output) {
      throw new Error('AI failed to generate lead enrichment.');
    }

    // If web crawl detected a specific platform and AI output is No or Custom, favor the detected platform
    if (autoDetectedPlatform !== 'No' && (output.shopifyDetected === 'No' || output.shopifyDetected === 'Custom')) {
      output.shopifyDetected = autoDetectedPlatform;
    }

    // 4. Refine similar signed customers using the AI's classified Industry Category & Sub-Category + Location Proximity
    const finalSimilarCustomers = await findSimilarSignedCustomers({
      industryCategory: output.industryCategory || input.industryCategory,
      industrySubCategory: output.industrySubCategory || input.industrySubCategory,
      franchiseeName: input.franchiseeName,
      state: input.state,
      suburb: input.suburb,
      postcode: input.postcode,
      limitCount: 4,
    });

    return {
      ...output,
      similarSignedCustomers: finalSimilarCustomers.length > 0 ? finalSimilarCustomers : initialSimilarCustomers,
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
    const industryCategory = leadData.industryCategory || '';
    const industrySubCategory = leadData.industrySubCategory || '';

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
      industryCategory,
      industrySubCategory,
    });

    // Save enriched fields directly to Firestore
    const updatePayload: Record<string, any> = {
      industryCategory: enrichment.industryCategory,
      industrySubCategory: enrichment.industrySubCategory,
      shipperEvidence: enrichment.shipperEvidence,
      lodgementEvidence: enrichment.lodgementEvidence,
      shopifyDetected: enrichment.shopifyDetected,
      ecommercePlatform: enrichment.shopifyDetected,
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
      hasSeparateEcommerceEntity: Boolean(enrichment.hasSeparateEcommerceEntity),
      linkedEcommerceEntities: enrichment.linkedEcommerceEntities || [],
      mainEntityRole: enrichment.mainEntityRole || '',
      fulfilmentModel: enrichment.fulfilmentModel || '',
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

