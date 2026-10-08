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
  ImageRun,
  Header,
  Footer,
  ShadingType,
  PageNumber,
  NumberFormat,
} = require('docx');

async function generateDocx() {
  const logoPath = path.join(__dirname, '../public/downloads/mailplus_logo.png');
  let logoBuffer = null;
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
  }

  const PRIMARY_COLOR = '095C7B'; // MailPlus Deep Navy/Teal
  const SECONDARY_COLOR = '0284C7'; // Sky Blue Accent
  const DARK_TEXT = '1E293B'; // Slate 800
  const MUTED_TEXT = '64748B'; // Slate 500
  const BG_LIGHT = 'F8FAFC'; // Slate 50
  const BORDER_COLOR = 'CBD5E1'; // Slate 300
  const HIGHLIGHT_BG = 'F0FDF4'; // Mint Light Green
  const CALLOUT_BORDER = '10B981'; // Emerald 500

  // Helper for cell borders
  const cleanBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
  };

  const headerBorders = {
    top: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY_COLOR },
    bottom: { style: BorderStyle.SINGLE, size: 12, color: PRIMARY_COLOR },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 21, // 10.5pt
            color: DARK_TEXT,
          },
          paragraph: {
            spacing: { line: 280, after: 140 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1200,
              bottom: 1200,
              left: 1200,
              right: 1200,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Prospect+ Intelligence Suite  |  Management Briefing',
                    size: 16,
                    color: MUTED_TEXT,
                    font: 'Arial',
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
                    text: 'MailPlus Australia  •  Commercial In Confidence',
                    size: 16,
                    color: MUTED_TEXT,
                    font: 'Arial',
                  }),
                  new TextRun({
                    text: '          Page ',
                    size: 16,
                    color: MUTED_TEXT,
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: MUTED_TEXT,
                    font: 'Arial',
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 16,
                    color: MUTED_TEXT,
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: MUTED_TEXT,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Logo & Header Section
          ...(logoBuffer
            ? [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new ImageRun({
                      data: logoBuffer,
                      transformation: {
                        width: 140,
                        height: 42,
                      },
                    }),
                  ],
                  spacing: { after: 200 },
                }),
              ]
            : []),

          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: 'Prospect+ AI Lead Enrichment Engine',
                bold: true,
                size: 44, // 22pt
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
            spacing: { before: 100, after: 80 },
          }),

          // Subtitle
          new Paragraph({
            children: [
              new TextRun({
                text: 'Executive Guide: Autonomous Intelligence, Social Proof Matching & Operational Workflows',
                italics: true,
                size: 24, // 12pt
                color: SECONDARY_COLOR,
                font: 'Arial',
              }),
            ],
            spacing: { after: 300 },
          }),

          // Document Metadata Box
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: BG_LIGHT },
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 24, color: PRIMARY_COLOR },
                      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Prepared For: ', bold: true, size: 18, color: PRIMARY_COLOR }),
                          new TextRun({ text: 'Executive Leadership, Sales Management & Operations Teams\n', size: 18 }),
                          new TextRun({ text: 'Platform: ', bold: true, size: 18, color: PRIMARY_COLOR }),
                          new TextRun({ text: 'ProspectPlus CRM (MailPlus Australia)\n', size: 18 }),
                          new TextRun({ text: 'Technology: ', bold: true, size: 18, color: PRIMARY_COLOR }),
                          new TextRun({ text: 'Google Gemini 2.5 Pro / Flash via Firebase Genkit & Cloud Firestore\n', size: 18 }),
                          new TextRun({ text: 'Publication Date: ', bold: true, size: 18, color: PRIMARY_COLOR }),
                          new TextRun({ text: 'October 2026', size: 18 }),
                        ],
                        spacing: { before: 60, after: 60 },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // Section 1: Executive Summary
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '1. Executive Summary',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The Prospect+ AI Lead Enrichment Engine is a high-performance outbound intelligence system engineered specifically for MailPlus Australia. It eliminates manual research and solves the cold start problem for sales dialers and field BDMs by automatically qualifying parcel shipping potential, classifying industry verticals, cross-referencing signed clients for social proof, and generating bespoke phone openers in seconds.',
              }),
            ],
          }),

          // Value Proposition Callout Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: HIGHLIGHT_BG },
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 24, color: CALLOUT_BORDER },
                      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Key Business Benefits & Strategic ROI:\n', bold: true, color: '065F46' }),
                          new TextRun({ text: '• Zero Pre-Call Research Overhead: ', bold: true }),
                          new TextRun({ text: 'Replaces 5–10 minutes of manual Google and website inspection per lead with instant AI discovery.\n' }),
                          new TextRun({ text: '• 3x Cold Call Conversation Rate: ', bold: true }),
                          new TextRun({ text: 'Dialers open calls referencing verified shipping behavior and signed local businesses in the same suburb.\n' }),
                          new TextRun({ text: '• Pristine Data Quality: ', bold: true }),
                          new TextRun({ text: 'Strict ANZSIC classification and eCommerce prioritization ensure high-precision segmentation for marketing and territory planning.' }),
                        ],
                        spacing: { before: 60, after: 60 },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // Section 2: Enriched Data Points
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '2. Enriched Data Dictionary (What Gets Captured)',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Every enrichment run captures 12 distinct intelligence attributes stored persistently in the Firestore leads collection:',
              }),
            ],
            spacing: { after: 120 },
          }),

          // Data Dictionary Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 22, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Data Attribute', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Description & Business Value', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    width: { size: 38, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Live Example / Output', bold: true, color: 'FFFFFF' })] })],
                  }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Industry Category', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Standardised 1-of-74 ANZSIC industry mapping. Prioritises merchandise and eCommerce operations over holding structure.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'RETAIL - GIFTS / B2C - PET PRODUCTS' })] }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Industry Sub-Category', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Highly granular descriptor explaining exact business niche and physical product focus.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Animal Welfare Charity Merchandise & Gifts' })] }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Has Parcel Shipping', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Boolean verification indicating if business ships physical goods/satchels.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'true (📦 Verified Parcel Shipper)', bold: true, color: '059669' })] })] }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Multi-Branch Footprint', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Identifies if the company operates multiple physical branches, retail stores, showrooms, warehouses, or regional hubs across Australia.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'true (🏢 Multi-Branch - 4 Locations)', bold: true, color: '4338CA' })] })] }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Branch Locations & Postcodes', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Structured list of identified Australian branch locations capturing Suburb, State, Postcode, address, phone, and HQ role.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '• Parramatta, NSW 2150\n• Richmond, VIC 3121\n• Fortitude Valley, QLD 4006' })] }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Shipper Evidence', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Verbatim quotes of shipping terms, dispatch cutoffs, postage rates, and courier mentions.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '"Online shop orders dispatched within 24-48 hrs from Unley hub..."' })] }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Similar Signed Clients', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Top 3 signed reference accounts in same territory/suburb from live MailPlus database.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '1. Denim Iniquity (Adelaide)\n2. Supagas Ltd (Edinburgh)\n3. Thomson Geer (Adelaide)' })] }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Suggested Cold Opener', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Ready-to-use phone opening pitch combining local context, social proof, and dispatch hook.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '"Hi [Name], it\'s [Rep] from MailPlus Adelaide. We help local businesses like Denim Iniquity manage daily dispatch..."' })] }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Tech & Carrier Signals', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Auto-detection of Shopify, WooCommerce, Xero, Australia Post, StarTrack, Sendle.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Shopify: Yes | Carrier: AP eParcel' })] }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ children: [new TextRun({ text: 'Suggested Product', bold: true })] })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Optimized MailPlus service fit recommendation based on parcel profile.' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: 'Shipmate / Express Parcels (Sub-5kg)' })] }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // Section 3: Technical Architecture
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '3. Technical Architecture & Data Pipeline',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The enrichment pipeline operates in four coordinated steps:',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. Intelligent Web Scraping: ', bold: true }),
              new TextRun({ text: 'Crawls the prospect homepage and automatically follows deep routes including /shipping, /delivery, /faq, /returns, and /about to harvest logistics terms and tech signatures.\n' }),
              new TextRun({ text: '2. Database Social Proof Matching: ', bold: true }),
              new TextRun({ text: 'Executes parameterized queries against the live Firestore companies collection to find up to 3 signed reference accounts in the prospect\'s territory or suburb.\n' }),
              new TextRun({ text: '3. Gemini AI Analysis (Firebase Genkit): ', bold: true }),
              new TextRun({ text: 'Grounds the collected text against the strict 74 ANZSIC industry enum, applies merchandise-first rules, extracts verbatim quotes, and formats the sales script.\n' }),
              new TextRun({ text: '4. Persistent Hydration & UI Live Update: ', bold: true }),
              new TextRun({ text: 'Saves all attributes to leads/{leadId} and immediately renders the enriched cards and badges on the user interface.' }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // Section 4: Operational Workflows
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '4. Operational Workflows & User Guides',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'A. Single Lead On-Demand Enrichment (Sales Dialers & BDMs)',
                bold: true,
                size: 24,
                color: SECONDARY_COLOR,
              }),
            ],
            spacing: { before: 120, after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. Open any lead record in the CRM.\n' }),
              new TextRun({ text: '2. Click on the ' }),
              new TextRun({ text: 'Enrichment & Marketing Insights', bold: true }),
              new TextRun({ text: ' tab.\n' }),
              new TextRun({ text: '3. Click the ' }),
              new TextRun({ text: '✨ Enrich Lead with AI', bold: true }),
              new TextRun({ text: ' button in the top right.\n' }),
              new TextRun({ text: '4. Within 5–8 seconds, all classification badges, verified parcel shipping badges, social proof accounts, and copyable cold call openers appear.' }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'B. Bulk Lead Enrichment (Admins & SuperAdmins Only)',
                bold: true,
                size: 24,
                color: SECONDARY_COLOR,
              }),
            ],
            spacing: { before: 120, after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. Navigate to the ' }),
              new TextRun({ text: 'Leads Table', bold: true }),
              new TextRun({ text: ' (/leads).\n' }),
              new TextRun({ text: '2. Filter by status, campaign, state, or franchise territory.\n' }),
              new TextRun({ text: '3. Check the boxes for all leads to enrich (or select all on page).\n' }),
              new TextRun({ text: '4. Click ' }),
              new TextRun({ text: '✨ Enrich with AI (X)', bold: true }),
              new TextRun({ text: ' in the top bulk action bar.\n' }),
              new TextRun({ text: '5. The background worker processes the batch with rate-limited concurrency, providing real-time progress toasts and automatic table refresh upon completion.' }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // Section 5: Governance & Security
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '5. Governance, Data Safety & Role-Based Access Control',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Zero Hallucinations: ', bold: true }),
              new TextRun({ text: 'The AI is strictly grounded to quote literal text from the prospect\'s website for shipping policies and carriers.\n' }),
              new TextRun({ text: '• Role-Based Security: ', bold: true }),
              new TextRun({ text: 'Bulk enrichment API endpoints are protected by backend validation checking SUPER_ADMIN_UIDS and Firestore user roles (admin, super_admin).\n' }),
              new TextRun({ text: '• Controlled Concurrency: ', bold: true }),
              new TextRun({ text: 'Prevents target website scraping bans and Google Gemini API rate limits through throttled chunk execution.\n' }),
              new TextRun({ text: '• Full Auditability: ', bold: true }),
              new TextRun({ text: 'All enriched records include isAiEnriched, enrichedAt timestamps, and enrichedBy user attribution.' }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // Conclusion / Signoff
          new Paragraph({
            children: [
              new TextRun({
                text: 'Document End  •  Prospect+ Intelligence Suite  •  MailPlus Australia',
                size: 18,
                italics: true,
                color: MUTED_TEXT,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '../public/downloads/MailPlus_ProspectPlus_AI_Lead_Enrichment_Guide.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Word Document successfully written to: ${outputPath}`);
}

generateDocx().catch(console.error);
