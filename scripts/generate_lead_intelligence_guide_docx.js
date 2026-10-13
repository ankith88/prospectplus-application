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
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: true,
              color: 'FFFFFF',
              size: 18,
            }),
          ],
        }),
      ],
    });

  const tableBodyCell = (text, widthPercent, isBold = false, bg = 'FFFFFF', fontSize = 17) =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { fill: bg, type: ShadingType.CLEAR },
      borders: cleanBorders,
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
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
  const imgActionButtons = fs.readFileSync(path.join(__dirname, '../docs/images/action_buttons.png'));
  const imgSynthesizedOverview = fs.readFileSync(path.join(__dirname, '../docs/images/synthesized_overview.png'));
  const imgAgentReachSignals = fs.readFileSync(path.join(__dirname, '../docs/images/agent_reach_signals.png'));
  const imgDecisionMakers = fs.readFileSync(path.join(__dirname, '../docs/images/decision_makers_linkedin.png'));

  const fieldsData = [
    ['1', 'Enriched (AI) Badge', 'Hub Header', 'discoveryData.lastEnriched', 'AI Crawler', '✓ Enriched (AI)', 'Confirms website crawl and classification are complete.'],
    ['2', 'Agent Reach (Live) Badge', 'Hub Header', 'agentReachDossier.generatedAt', 'Agent Reach', '✓ Agent Reach (Live)', 'Confirms live web logistics and LinkedIn search are active.'],
    ['3', 'Top Decision Maker', 'Synthesized Overview', 'agentReachDossier.decisionMakers[0]', 'LinkedIn Index', 'Kerrie Nelson - General Manager', 'Reps know exactly who runs company operations before dialing.'],
    ['4', 'Match Confidence', 'Overview & Decision Makers', 'candidate.confidence', 'LinkedIn Index', 'High Match', 'Distinguishes key operational signatories from general staff.'],
    ['5', 'Suggested Call Opener', 'Synthesized Overview', 'agentReachDossier.enrichment.suggestedOpener', 'Gemini Synthesis', 'Personalized pitch mentioning carrier & cutoff', 'High-credibility conversation hook tailored to shipping setup.'],
    ['6', 'Sales Talking Points', 'Overview & Agent Reach', 'agentReachDossier.enrichment.talkingPoints', 'Gemini Synthesis', '3-4 tailored commercial hooks', 'Concrete value propositions for MailPlus driver pickups & satchels.'],
    ['7', 'Social Proof Match', 'Synthesized Overview', 'similarCustomers', 'CRM Matcher', '4 signed clients in same industry/suburb', 'Enables reps to drop familiar local brand names during the call.'],
    ['8', 'Detected Parcel Carriers', 'Agent Reach & Overview', 'logisticsSignals.carrierDetected', 'Exa Web Discovery', 'Australia Post, StarTrack, Sendle', 'Identifies incumbent courier contract to prepare rate comparisons.'],
    ['9', 'Daily Dispatch Cutoff', 'Agent Reach & Overview', 'logisticsSignals.cutoffTimes', 'Exa Web Discovery', '2:00 PM AEST', 'Reps pitch later afternoon pickup times to extend selling window.'],
    ['10', 'Verified Web Domain', 'Agent Reach & Overview', 'agentReachDossier.verifiedDomain', 'Exa Domain Engine', 'proudpoppyclothing.com.au', 'Clean canonical domain verified from corporate registrations.'],
    ['11', 'AI Shipping Summary', 'Agent Reach Tab', 'logisticsSignals.shippingSummary', 'Gemini Flash', '4-bullet executive brief of shipping policy', 'Replaces walls of raw text with an executive brief in 5 seconds.'],
    ['12', 'Raw Source Citations', 'Agent Reach (Collapsible)', 'logisticsSignals.rawSnippets', 'Exa Search', 'Excerpts from shipping & return terms', 'Auditable evidence if reps need to verify exact legal/return terms.'],
    ['13', 'Industry Category', 'AI Website Scrape & Overview', 'discoveryData.industryCategory', 'AI Crawler', 'Retail & Consumer Goods', 'Categorizes business vertical for targeted campaigns.'],
    ['14', 'Industry Sub-Category', 'AI Website Scrape & Overview', 'discoveryData.industrySubCategory', 'AI Crawler', 'Women\'s Apparel & Accessories', 'Granular vertical classification for precision pitch framing.'],
    ['15', 'eCommerce Cart Tech', 'AI Website Scrape & Overview', 'discoveryData.ecommercePlatform', 'AI Crawler / Exa', 'Shopify, WooCommerce, BigCommerce', 'Verifies compatibility with free MailPlus ShipMate app.'],
    ['16', 'Accounting Software', 'AI Website Scrape & Overview', 'discoveryData.xeroDetected', 'AI Crawler', 'Xero, MYOB', 'Verifies automated invoicing and paperless billing compatibility.'],
    ['17', 'Physical Branch Network', 'AI Website Scrape Tab', 'discoveryData.branches', 'AI Crawler', 'State-by-state list with address & phone', 'Identifies multi-location footprint for multi-site contracts.'],
    ['18', 'PO Box & Postal Addrs', 'AI Website Scrape Tab', 'discoveryData.postalAddresses', 'AI Crawler', 'Corporate PO Boxes & Locked Bags', 'Prime target for MailPlus daily postal collection & GPO runs.'],
    ['19', 'Company Description', 'AI Website Scrape & Overview', 'discoveryData.prospectSummary', 'AI Crawler', 'Summary of products & catalog', 'Provides reps with instant commercial context on products.'],
    ['20', 'Target Audience & Prop', 'AI Website Scrape Tab', 'companyInsights[0].targetAudience', 'AI Crawler', 'Demographics & brand promise', 'Helps reps align pitch tone (boutique, fast-growth, industrial).'],
    ['21', 'Fulfillment Model', 'AI Website Scrape Tab', 'discoveryData.fulfilmentModel', 'AI Crawler', 'In-house warehouse vs 3PL', 'Determines if pitch targets internal warehouse or 3PL manager.'],
    ['22', 'Sister Companies', 'AI Website Scrape Tab', 'discoveryData.linkedEntities', 'AI Crawler', 'Affiliated brands & subsidiaries', 'Uncovers multi-brand cross-selling opportunities.'],
    ['23', 'LinkedIn Profiles', 'Decision Makers Tab', 'decisionMakerCandidates[]', 'LinkedIn Index', 'Name, title, department, URL', 'Bypasses gatekeepers directly to operational heads.'],
    ['24', 'Permanent CRM Contact', 'Contacts Tab & Header', 'contacts[]', '1-Click Sync', 'Synced contact record in lead directory', 'Saves contact permanently for dialing and email cadences.'],
    ['25', 'Social Follower Count', 'Social & Sentiment Tab', 'socialIntelligence.followers', 'Social Indexer', 'Instagram, Facebook, LinkedIn metrics', 'Indicator of online brand popularity and parcel order volume.'],
    ['26', 'Shipping Sentiment', 'Social & Sentiment Tab', 'socialIntelligence.shippingSentiment', 'Social Monitor', 'Negative / Delivery Complaints Detected', 'Flags whether current carrier is failing customers.'],
    ['27', 'Competitor Complaints', 'Social & Sentiment Tab', 'socialIntelligence.deliveryComplaints', 'Social Monitor', 'Specific customer reviews citing delays/loss', 'Position MailPlus dedicated driver care as direct solution.'],
  ];

  const fieldRows = fieldsData.map((row, idx) =>
    new TableRow({
      children: [
        tableBodyCell(row[0], 4, true, idx % 2 === 0 ? 'FFFFFF' : BG_LIGHT, 15),
        tableBodyCell(row[1], 18, true, idx % 2 === 0 ? 'FFFFFF' : BG_LIGHT, 15),
        tableBodyCell(row[2], 14, false, idx % 2 === 0 ? 'FFFFFF' : BG_LIGHT, 14),
        tableBodyCell(row[3], 18, false, idx % 2 === 0 ? 'FFFFFF' : BG_LIGHT, 13),
        tableBodyCell(row[4], 12, false, idx % 2 === 0 ? 'FFFFFF' : BG_LIGHT, 14),
        tableBodyCell(row[5], 16, false, idx % 2 === 0 ? 'FFFFFF' : BG_LIGHT, 14),
        tableBodyCell(row[6], 18, false, idx % 2 === 0 ? 'FFFFFF' : BG_LIGHT, 14),
      ],
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
            color: DARK_TEXT,
          },
          paragraph: {
            spacing: { line: 276, before: 90, after: 90 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'MailPlus Outbound Leads CRM  |  Lead Intelligence & Enrichment Guide',
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
                    text: 'Confidential - For Internal Sales Leadership Use Only',
                    size: 16,
                    color: MUTED_TEXT,
                  }),
                  new TextRun({
                    text: '    Page ',
                    size: 16,
                    color: MUTED_TEXT,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
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
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({
                text: 'ProspectPlus Lead Intelligence & Enrichment Guide',
                bold: true,
                size: 40,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 240 },
            children: [
              new TextRun({
                text: 'Operational Manual & Field Reference for Sales Managers & Leadership',
                italics: true,
                size: 22,
                color: MUTED_TEXT,
              }),
            ],
          }),

          // Section 1: Executive Summary
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: '1. Executive Summary & Objective',
                bold: true,
                size: 26,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                'The Lead Intelligence & Reach Hub in ProspectPlus combines automated AI website crawling with live Agent Reach web and LinkedIn discovery. In under 10 seconds, it equips sales representatives with an auditable commercial profile, identified parcel carriers, order cutoff times, return policies, and direct LinkedIn decision makers.'
              ),
            ],
          }),

          // Section 2: Visual Tour with Screenshots
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 100 },
            children: [
              new TextRun({
                text: '2. Visual Tour: Where Enriched Data Lives',
                bold: true,
                size: 26,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                'To view enriched data for any company in ProspectPlus, open the lead record and select the '
              ),
              new TextRun({ text: '"Discovery"', bold: true }),
              new TextRun(
                ' tab. The Lead Intelligence & Reach Hub is positioned prominently at the top of this tab.'
              ),
            ],
          }),

          // Screenshot 1: Action Buttons
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: 'Hub Header & Primary Actions:',
                bold: true,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imgActionButtons,
                transformation: { width: 320, height: 81 },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 140 },
            children: [
              new TextRun({
                text: 'Figure 1: Consolidated Header Actions - [Run Complete Intel (AI + Agent Reach)] and [Decision Makers]',
                italics: true,
                size: 16,
                color: MUTED_TEXT,
              }),
            ],
          }),

          // Screenshot 2: Synthesized Overview
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: 'View 1: Synthesized Overview (The 30-Second Pre-Call Screen):',
                bold: true,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imgSynthesizedOverview,
                transformation: { width: 520, height: 447 },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 140 },
            children: [
              new TextRun({
                text: 'Figure 2: Synthesized Overview with Dual-Source Verification, Top Decision Maker, and Call Opener',
                italics: true,
                size: 16,
                color: MUTED_TEXT,
              }),
            ],
          }),

          // Screenshot 3: Agent Reach Signals
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: 'View 2: Agent Reach Signals & AI Shipping Policy Summary:',
                bold: true,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imgAgentReachSignals,
                transformation: { width: 520, height: 399 },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 140 },
            children: [
              new TextRun({
                text: 'Figure 3: Live Logistics Evidence, Order Cutoff Times, and AI Synthesized Shipping Summary',
                italics: true,
                size: 16,
                color: MUTED_TEXT,
              }),
            ],
          }),

          // Screenshot 4: Decision Makers
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: 'View 4: Key Decision Makers (LinkedIn Real-Time Index):',
                bold: true,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imgDecisionMakers,
                transformation: { width: 520, height: 206 },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 140 },
            children: [
              new TextRun({
                text: 'Figure 4: Key Operational Decision Makers with High Match Badges and 1-Click "Add to Contacts"',
                italics: true,
                size: 16,
                color: MUTED_TEXT,
              }),
            ],
          }),

          // Section 3: Master Fields Table
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 100 },
            children: [
              new TextRun({
                text: '3. Master Directory: Complete Field-by-Field Reference',
                bold: true,
                size: 26,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                'The table below details all 27 enriched fields captured across the system, their UI location, data source, internal CRM property path, and sales utility:'
              ),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  tableHeaderCell('#', 4),
                  tableHeaderCell('Display Label', 18),
                  tableHeaderCell('Location', 14),
                  tableHeaderCell('CRM Property Path', 18),
                  tableHeaderCell('Source', 12),
                  tableHeaderCell('Example Value', 16),
                  tableHeaderCell('Sales Utility', 18),
                ],
              }),
              ...fieldRows,
            ],
          }),

          // Section 4: Deep Dive LinkedIn
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 100 },
            children: [
              new TextRun({
                text: '4. Deep Dive: Finding Contacts from LinkedIn',
                bold: true,
                size: 26,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                'Identifying operational signatories is crucial for outbound sales success. The Hub automates LinkedIn discovery through the following capabilities:\n\n' +
                '• Targeted Operational Roles: Specifically targets Logistics Managers, Warehouse Supervisors, Supply Chain Directors, Operations Managers, and Managing Directors/Founders.\n' +
                '• High Match Confidence Badge: The scoring algorithm evaluates role seniority and shipping budget control. Operational heads receive a prominent "High Match" tag.\n' +
                '• Direct Profile Verification: Clicking the external link icon [↗] opens their live LinkedIn profile in a new tab for rapid pre-call research.\n' +
                '• 1-Click CRM Contact Creation: Reps click "+ Add to Contacts" to instantly save the candidate into the permanent CRM "Contacts" tab of the Lead Profile. The button updates immediately to "[✓ In Contacts]".\n' +
                '• On-Demand Re-Scanning: If a business recently hired a new supply chain head, clicking "Re-scan LinkedIn" refreshes candidate profiles.'
              ),
            ],
          }),

          // Section 5: Deep Dive Social & Sentiment
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 100 },
            children: [
              new TextRun({
                text: '5. Deep Dive: Social Footprint & Courier Sentiment Tracking',
                bold: true,
                size: 26,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                'The Social & Sentiment tab surfaces vital brand volume indicators and competitive pain points:\n\n' +
                '• Brand Scale Indicators: Detects Instagram, Facebook, and LinkedIn follower counts. Brands with 25,000+ followers typically dispatch high weekly satchel volumes.\n' +
                '• Sentiment Rating: Classifies customer delivery sentiment as Positive, Neutral, or "Negative / Delivery Complaints Detected".\n' +
                '• Surfacing Competitor Courier Failures: Specifically extracts customer complaints citing delivery delays, damaged packages, or missing satchels handled by Australia Post, StarTrack, or other carriers.\n' +
                '• Sales Strategy Wedge: Sales reps use these public delivery failures as an opening pitch: offering MailPlus dedicated afternoon driver pickups and direct local phone support so clients avoid customer churn.'
              ),
            ],
          }),

          // Section 6: Pre-call routine
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 100 },
            children: [
              new TextRun({
                text: '6. The 30-Second Pre-Call Routine for Sales Reps',
                bold: true,
                size: 26,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                '1. Open Discovery Tab: View the Lead Intelligence & Reach Hub.\n' +
                '2. Check Detected Carriers & Cutoff: Identify existing courier contracts and turnaround windows.\n' +
                '3. Identify Decision Maker: Confirm the contact name and click "+ Add to Contacts" if not yet saved.\n' +
                '4. Scan AI Shipping Summary: Note warehouse locations, return terms, and shipping fees.\n' +
                '5. Read Suggested Opener & Dial: Initiate a warm, credible, high-converting call.'
              ),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, '../docs/ProspectPlus_Lead_Enrichment_and_Intelligence_Guide.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Successfully generated Word docx with screenshots and master field table at:', outPath);
}

generateDocx().catch(console.error);
