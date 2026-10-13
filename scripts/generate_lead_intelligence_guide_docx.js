const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Header,
  Footer,
  ShadingType,
  PageNumber,
  ImageRun,
} = require('docx');

async function generateDocx() {
  const PRIMARY_COLOR = '095C7B'; // MailPlus Deep Navy
  const SECONDARY_COLOR = '0284C7'; // Sky Blue Accent
  const DARK_TEXT = '1E293B'; // Slate 800
  const MUTED_TEXT = '64748B'; // Slate 500
  const BG_LIGHT = 'F8FAFC'; // Slate 50
  const BORDER_COLOR = 'CBD5E1'; // Slate 300
  const HIGHLIGHT_BG = 'F0FDF4'; // Mint Light Green
  const EMERALD_DARK = '065F46';

  const cleanBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
  };

  const tableHeaderCell = (text, widthPercent) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 80, right: 80 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: true,
              color: 'FFFFFF',
              size: 16,
            }),
          ],
        }),
      ],
    });

  const tableBodyCell = (text, widthPercent, isBold = false, bg = 'FFFFFF', fontSize = 15) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { fill: bg, type: ShadingType.CLEAR },
      borders: cleanBorders,
      margins: { top: 70, bottom: 70, left: 80, right: 80 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isBold,
              size: fontSize,
              color: DARK_TEXT,
            }),
          ],
        }),
      ],
    });

  // Read images
  const imgHubHeader = fs.readFileSync(path.join(__dirname, '../docs/images/hub_header_new.png'));
  const imgSynthesizedOverview = fs.readFileSync(path.join(__dirname, '../docs/images/synthesized_overview.png'));
  const imgDecisionMakerCard = fs.readFileSync(path.join(__dirname, '../docs/images/decision_maker_card_new.png'));
  const imgDualIntelSignals = fs.readFileSync(path.join(__dirname, '../docs/images/dual_intel_signals.png'));
  const imgExecutiveSummary = fs.readFileSync(path.join(__dirname, '../docs/images/executive_summary_and_opener.png'));
  const imgAiWebsiteScrape = fs.readFileSync(path.join(__dirname, '../docs/images/ai_website_scrape.png'));
  const imgIndustryApSignals = fs.readFileSync(path.join(__dirname, '../docs/images/industry_and_ap_signals.png'));
  const imgBranchFootprint = fs.readFileSync(path.join(__dirname, '../docs/images/branch_footprint_locations.png'));

  const fieldsData = [
    ['1', 'Enriched (AI) Badge', 'Hub Header', 'discoveryData.lastEnriched', 'AI Crawler', '✓ Enriched (AI)', 'Confirms website crawl and industry classification are complete.'],
    ['2', 'Agent Reach (Live) Badge', 'Hub Header', 'agentReachDossier.generatedAt', 'Agent Reach', '✓ Agent Reach (Live)', 'Confirms live web logistics and LinkedIn search are active.'],
    ['3', 'Primary Decision Maker', 'Overview & Decision Makers', 'agentReachDossier.decisionMakers[0]', 'LinkedIn Index', 'Kerrie Nelson — General Manager', 'Reps know exactly who runs company operations before dialing.'],
    ['4', 'Match Confidence', 'Overview & Decision Makers', 'candidate.confidence', 'LinkedIn Index', 'Primary Decision Maker / High Match', 'Prioritizes operational signatories over administrative staff.'],
    ['5', 'LinkedIn Direct URL', 'Overview & Decision Makers', 'candidate.linkedinUrl', 'LinkedIn Index', 'linkedin.com/in/...', '1-click external link to view employment background and mutuals.'],
    ['6', 'Suggested Call Opener', 'Synthesized Overview', 'agentReachDossier.enrichment.suggestedOpener', 'Gemini Synthesis', 'Personalized pitch mentioning 9 sites & daily parcel pickup', 'High-credibility conversation hook tailored to shipping setup.'],
    ['7', 'Suggested Product', 'Synthesized Overview', 'discoveryData.suggestedProduct', 'Gemini Synthesis', 'Scheduled Daily Courier Pickup / Shipmate Express Parcels', 'The exact core MailPlus offering to quote and pitch on initial call.'],
    ['8', 'Suggested Personalisation', 'Synthesized Overview', 'discoveryData.suggestedPersonalisation', 'Gemini Synthesis', 'Multi-warehouse pickup (Epping & Burleigh Heads) + Shopify setup', 'Actionable guidance on pitching daily driver care and sub-5kg satchels.'],
    ['9', 'Executive Prospect Summary', 'Synthesized Overview', 'discoveryData.prospectSummary', 'Gemini Flash', 'Fast-growing women\'s fashion retailer with 9 sites and dual warehouse hubs', 'Gives reps commercial context on products, volume, and logistics.'],
    ['10', 'Social Proof Match', 'Synthesized Overview', 'similarCustomers', 'CRM Matcher', '4 similar signed clients in CRM', 'Enables reps to drop familiar local client names during the call.'],
    ['11', 'Detected Parcel Carriers', 'Agent Reach & Overview', 'logisticsSignals.carrierDetected', 'Exa Web Discovery', 'Australia Post, StarTrack, Sendle', 'Identifies incumbent courier contract to prepare rate comparisons.'],
    ['12', 'Daily Dispatch Cutoff', 'Agent Reach & Overview', 'logisticsSignals.cutoffTimes', 'Exa Web Discovery', '2:00 PM AEST', 'Reps pitch later afternoon pickup times to extend selling window.'],
    ['13', 'Verified Web Domain', 'Agent Reach & Overview', 'agentReachDossier.verifiedDomain', 'Exa Domain Engine', 'proudpoppyclothing.com.au', 'Clean canonical domain verified against corporate business registers.'],
    ['14', 'Verified Parcel Shipper', 'AI Scrape & Overview', 'discoveryData.parcelShippingStatus', 'AI Crawler', '✓ Verified Shipper', 'Validates that prospect ships physical parcels and is courier-eligible.'],
    ['15', 'AI Shipping Summary', 'Agent Reach Tab', 'logisticsSignals.shippingSummary', 'Gemini Flash', '4-bullet executive brief of shipping policy', 'Replaces walls of raw text with an executive brief in 5 seconds.'],
    ['16', 'Raw Source Citations', 'Agent Reach (Drawer)', 'logisticsSignals.rawSnippets', 'Exa Search', 'Excerpts from shipping & return terms', 'Auditable evidence if reps need to verify exact legal/return terms.'],
    ['17', 'Industry Category', 'AI Scrape & Overview', 'discoveryData.industryCategory', 'AI Crawler', 'RETAIL - CLOTHING FASHION', 'Categorizes business vertical for targeted sales campaigns.'],
    ['18', 'Industry Sub-Category', 'AI Scrape & Overview', 'discoveryData.industrySubCategory', 'AI Crawler', 'Women\'s Fashion Clothing & Accessories (Sizes 6-30)', 'Granular vertical classification for precision pitch framing.'],
    ['19', 'eCommerce Cart Tech', 'AI Scrape & Overview', 'discoveryData.ecommercePlatform', 'AI Crawler / Exa', 'Shopify', 'Verifies compatibility with free MailPlus ShipMate shipping app.'],
    ['20', 'Xero Accounting Detected', 'AI Scrape & Overview', 'discoveryData.xeroDetected', 'AI Crawler', 'No / Yes', 'Verifies automated invoicing and paperless billing compatibility.'],
    ['21', 'Australia Post (AP) Signal', 'AI Scrape Tab', 'discoveryData.apRelationshipSignal', 'AI Crawler', 'Uses various services; implied postal return labels', 'Arms reps with intelligence on current postal dependence and pain.'],
    ['22', 'Physical Branch Network', 'AI Scrape & Footprint', 'discoveryData.branches', 'AI Crawler', '9 locations across NSW, QLD, VIC with addresses', 'Identifies warehouse distribution centers vs retail stores for collection.'],
    ['23', 'PO Box & Postal Addresses', 'AI Scrape Tab', 'discoveryData.postalAddresses', 'AI Crawler', 'Corporate PO Boxes and Locked Bags', 'Target for MailPlus daily postal collection and GPO lodge runs.'],
    ['24', 'Permanent CRM Contact', 'Contacts Tab & Header', 'contacts[]', '1-Click Sync', 'Permanent CRM contact record', 'Saves contact with name, title, and LinkedIn URL for auto-dialing.'],
    ['25', 'Social Handles & Followers', 'Social & Sentiment Tab', 'discoveryData.socialIntelligence', 'Social Indexer', '@proudpoppyclothing on Instagram', 'Indicator of online brand popularity, consumer engagement, and volume.'],
    ['26', 'Shipping Sentiment Rating', 'Social & Sentiment Tab', 'discoveryData.socialIntelligence.shippingSentiment', 'Social Monitor', 'Negative / Delivery Complaints Detected', 'Flags whether current carrier is failing customers with delays.'],
    ['27', 'Competitor Delivery Issues', 'Social & Sentiment Tab', 'discoveryData.socialIntelligence.deliveryComplaints', 'Social Monitor', 'Mentions of lost parcels or delays with AusPost/Aramex', 'Reps position dedicated MailPlus franchise driver care as solution.'],
  ];

  const fieldRows = fieldsData.map((row, index) => {
    const bg = index % 2 === 0 ? 'FFFFFF' : BG_LIGHT;
    return new TableRow({
      children: [
        tableBodyCell(row[0], 5, true, bg, 14),
        tableBodyCell(row[1], 16, true, bg, 14),
        tableBodyCell(row[2], 14, false, bg, 14),
        tableBodyCell(row[3], 17, false, bg, 13),
        tableBodyCell(row[4], 12, false, bg, 14),
        tableBodyCell(row[5], 16, false, bg, 14),
        tableBodyCell(row[6], 20, false, bg, 14),
      ],
    });
  });

  const masterFieldsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          tableHeaderCell('#', 5),
          tableHeaderCell('Field Label', 16),
          tableHeaderCell('UI Location', 14),
          tableHeaderCell('CRM Property Path', 17),
          tableHeaderCell('Data Source', 12),
          tableHeaderCell('Example Value', 16),
          tableHeaderCell('Sales Rep Utility & Strategy', 20),
        ],
      }),
      ...fieldRows,
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'ProspectPlus | Lead Intelligence & Reach Hub Operational Guide',
                    size: 16,
                    color: MUTED_TEXT,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.SPACE_BETWEEN,
                children: [
                  new TextRun({
                    text: 'CONFIDENTIAL — FOR SALES MANAGEMENT & LEADERSHIP ONLY',
                    size: 14,
                    color: MUTED_TEXT,
                  }),
                  new TextRun({
                    children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                    size: 14,
                    color: MUTED_TEXT,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: 'ProspectPlus Lead Intelligence & Enrichment Guide',
                bold: true,
                size: 44,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'A Comprehensive Operational Manual for Sales Managers & Executive Leadership',
                size: 24,
                bold: true,
                color: SECONDARY_COLOR,
              }),
            ],
          }),

          // Section 1
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: '1. Executive Summary & Commercial Objective',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'The ',
                size: 20,
              }),
              new TextRun({
                text: 'Lead Intelligence & Reach Hub',
                bold: true,
                size: 20,
                color: PRIMARY_COLOR,
              }),
              new TextRun({
                text: ' in ProspectPlus is an enterprise-grade automated sales intelligence engine. It combines deep AI Website Crawling with live Agent Reach web and LinkedIn indexing to give sales representatives a complete 360-degree commercial and operational snapshot of any prospective business in under 10 seconds.',
                size: 20,
              }),
            ],
          }),

          // Strategic benefits callouts
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Zero Manual Pre-Call Research: ', bold: true, size: 20 }),
              new TextRun({ text: 'Reps spend 100% of their prep time pitching rather than combing corporate websites, LinkedIn profiles, and business directories.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Accurate Logistics & Dispatch Footprint: ', bold: true, size: 20 }),
              new TextRun({ text: 'Instantly identifies incumbent couriers (e.g. Australia Post, StarTrack, Sendle), daily order cutoff times, return policies, and warehouse dispatch hubs.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Direct Access to Operational Decision Makers: ', bold: true, size: 20 }),
              new TextRun({ text: 'Surfaces Logistics, Warehouse, and Operations managers from LinkedIn with 1-click addition to permanent CRM contacts.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: '• ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Competitive Pain-Point Leverage: ', bold: true, size: 20 }),
              new TextRun({ text: 'Detects and flags public delivery complaints with competitor couriers, arming reps with immediate conversion hooks.', size: 20 }),
            ],
          }),

          // Section 2
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: '2. Visual Tour: Where Enriched Data Lives',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'Enriched intelligence is housed inside the ',
                size: 20,
              }),
              new TextRun({
                text: 'Discovery',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: ' tab on each lead record (`/leads/[leadId]`). The screenshots below reflect the updated production UI with streamlined action buttons, high-contrast contact creation, and interactive logistics footprints.',
                size: 20,
              }),
            ],
          }),

          // Image 1: Hub Header
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: 'Screenshot 1: Hub Header & Consolidated Action Triggers',
                bold: true,
                size: 22,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new ImageRun({
                data: imgHubHeader,
                transformation: { width: 520, height: 55 },
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({ text: '1. [✨ Run Complete Intel (AI + Agent Reach)] (Dark Teal): ', bold: true, size: 18, color: PRIMARY_COLOR }),
              new TextRun({ text: 'The master enrichment trigger executing website crawl and live web/LinkedIn indexing in parallel in 5–8 seconds.\n', size: 18 }),
              new TextRun({ text: '2. [👥 Decision Makers (6)] (Light Slate): ', bold: true, size: 18, color: SECONDARY_COLOR }),
              new TextRun({ text: 'Dedicated shortcut opening the LinkedIn operational candidate directory and contact creation modal.', size: 18 }),
            ],
          }),

          // Image 2: Synthesized Overview
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: 'Screenshot 2: Synthesized Overview (The 30-Second Pre-Call Screen)',
                bold: true,
                size: 22,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new ImageRun({
                data: imgSynthesizedOverview,
                transformation: { width: 520, height: 517 },
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'The default landing view synthesizes the lead into actionable selling elements: Top Decision Maker banner, Dual-Source comparison grid, Executive Prospect Summary, Suggested Product & Opener, and Suggested Personalisation.',
                size: 18,
                color: DARK_TEXT,
              }),
            ],
          }),

          // Image 3: Decision Maker Card
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: 'Screenshot 3: Primary Decision Maker & 1-Click CRM Contact Creation',
                bold: true,
                size: 22,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new ImageRun({
                data: imgDecisionMakerCard,
                transformation: { width: 520, height: 38 },
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'Features the primary operational executive (e.g. Kerrie Nelson — General Manager), [LinkedIn ↗] verification link, and the high-contrast [+ Add to Contacts] dark teal button that immediately creates a permanent CRM contact record.',
                size: 18,
                color: DARK_TEXT,
              }),
            ],
          }),

          // Image 4: Dual Intel Signals
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: 'Screenshot 4: Dual Intelligence Comparison Grid (AI Scrape vs. Agent Reach)',
                bold: true,
                size: 22,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new ImageRun({
                data: imgDualIntelSignals,
                transformation: { width: 520, height: 139 },
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'Juxtaposes website crawl data (Industry category, Shopify platform, 9 Australian sites, Verified Shipper badge) with live Agent Reach web signals (Verified domain, carrier detected, cutoff time, 6 LinkedIn profiles, and Instagram handle).',
                size: 18,
                color: DARK_TEXT,
              }),
            ],
          }),

          // Image 5: Executive Summary & Opener
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: 'Screenshot 5: Executive Prospect Summary, Suggested Product & AI Call Opener',
                bold: true,
                size: 22,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new ImageRun({
                data: imgExecutiveSummary,
                transformation: { width: 520, height: 245 },
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'Equips reps with an executive business summary, the exact core product to pitch (Scheduled Daily Courier Pickup / Shipmate Express Parcels), a word-for-word cold call opener, and warehouse collection talking points.',
                size: 18,
                color: DARK_TEXT,
              }),
            ],
          }),

          // Image 6 & 7: AI Scrape & Branch Footprint
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: 'Screenshot 6: AI Website Scrape — Classification, eCommerce & AP Relationship',
                bold: true,
                size: 22,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new ImageRun({
                data: imgIndustryApSignals,
                transformation: { width: 520, height: 158 },
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'Reveals the classified vertical (RETAIL - CLOTHING FASHION), verified shipper status, eCommerce cart (Shopify), and Australia Post relationship signals regarding outbound deliveries and return labels.',
                size: 18,
                color: DARK_TEXT,
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: 'Screenshot 7: Australian Branch Footprint & Locations Directory',
                bold: true,
                size: 22,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new ImageRun({
                data: imgBranchFootprint,
                transformation: { width: 520, height: 254 },
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Interactive directory of all 9 physical locations across Australia with state-by-state filtering (NSW, QLD, VIC) and differentiation between distribution warehouses (Burleigh Heads) and retail storefronts.',
                size: 18,
                color: DARK_TEXT,
              }),
            ],
          }),

          // Section 3: Master Fields Table
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: '3. Complete Enriched Fields Reference Directory (27 Fields)',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: 'The table below details every data element captured during enrichment, its exact location in the UI, internal CRM property path, origin source, and strategic sales value:',
                size: 20,
              }),
            ],
          }),
          masterFieldsTable,

          // Section 4: LinkedIn Deep Dive
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 280, after: 120 },
            children: [
              new TextRun({
                text: '4. Deep Dive: Finding Contacts from LinkedIn',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Finding the right operational person is the single highest-value step in outbound B2B courier sales. The Hub completely automates this workflow:',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '1. Targeted Operational Roles: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Queries live LinkedIn indexes targeting Logistics Managers, Dispatch Coordinators, Warehouse Supervisors, Operations Directors, and Managing Directors.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '2. Primary Decision Maker Scoring: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'The scoring algorithm flags operational budget holders with Primary Decision Maker and High Match badges, eliminating rep confusion.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '3. 1-Click Permanent CRM Sync: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Clicking [+ Add to Contacts] immediately persists the contact into the lead\'s Contacts tab with full name, job title, and LinkedIn URL. The button switches to [✓ In Contacts] to prevent duplicates.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: '4. Direct LinkedIn Verification: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'The [LinkedIn ↗] button enables reps to instantly open the profile in a new tab to view past career history and mutual connections.', size: 20 }),
            ],
          }),

          // Section 5: Social Footprint & Sentiment
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: '5. Deep Dive: Social Footprint & Courier Sentiment Tracking',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'The Social & Sentiment module provides sales reps with high-impact intelligence wedges against competitor carriers:',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• Volume Sizing via Social Following: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Detects Instagram, Facebook, and LinkedIn handles (e.g. @proudpoppyclothing). High follower volume signals substantial daily parcel dispatches and satchel demand.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• Delivery Sentiment Classification: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Scans public customer feedback and categorizes sentiment into Positive, Neutral, or Negative / Delivery Complaints Detected.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: '• Surfacing Competitor Courier Failures: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Flags consumer complaints regarding lost parcels or delayed deliveries with Australia Post, StarTrack, or Aramex. Reps pitch MailPlus\'s dedicated afternoon driver pickups and direct phone support as the permanent cure.', size: 20 }),
            ],
          }),

          // Section 6: Operating Workflows
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: '6. How Leads Can Be Enriched (3 Operating Workflows)',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Method 1 — 1-Click from Lead Profile: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Open lead profile -> Discovery tab -> Click [✨ Run Complete Intel (AI + Agent Reach)]. Runs in 5–8 seconds.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Method 2 — Targeted Decision Maker Discovery: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Click [👥 Decision Makers (6)] in the header to open the candidate discovery modal and add key personnel into contacts.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Method 3 — Batch Enrichment from Outbound Leads Table: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Select multiple leads in the leads table -> Click "Enrich with AI" in the action bar to enrich in the background.', size: 20 }),
            ],
          }),

          // Section 7: 30-Second Pre-Call Routine
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: '7. The 30-Second Pre-Call Routine for Sales Reps',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '1. Open Discovery Tab: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Land on the Synthesized Overview screen.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '2. Check Detected Carriers & Cutoff: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Identify who they currently ship with and when daily dispatch closes.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '3. Identify Primary Decision Maker: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Note Kerrie Nelson (General Manager) and click "+ Add to Contacts".', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '4. Scan Executive Summary & Locations: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Note dual warehouses in Epping and Burleigh Heads and 9 physical locations.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: '5. Read Suggested Opener & Dial: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Deliver the high-converting opener customized to their business model and parcel volume.', size: 20 }),
            ],
          }),

          // Section 8: Technical Architecture
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: '8. Technical Architecture, Security & Secret Management',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• Neural Web Search: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Powered by Exa API for semantic discovery across Australian registries, courier policies, and LinkedIn.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• Generative AI Synthesis: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Google Gemini Flash via Genkit produces deterministic, scannable summaries and cold call openers.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• Firestore Caching: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'Intelligence dossiers are cached under discoveryData.agentReachDossier for instant repeat loads at zero cost.', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: '• Enterprise Security: ', bold: true, color: PRIMARY_COLOR, size: 20 }),
              new TextRun({ text: 'All credentials (EXA_API_KEY, GEMINI_API_KEY) are encrypted in Google Cloud Secret Manager on Firebase App Hosting.', size: 20 }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, '../docs/ProspectPlus_Lead_Enrichment_and_Intelligence_Guide.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Successfully generated Word docx with new screenshots and field table at:', outPath);
}

generateDocx().catch((err) => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
