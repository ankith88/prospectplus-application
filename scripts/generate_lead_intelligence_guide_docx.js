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
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: true,
              color: 'FFFFFF',
              size: 20,
            }),
          ],
        }),
      ],
    });

  const tableBodyCell = (text, widthPercent, isBold = false, bg = 'FFFFFF') =>
    new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { fill: bg, type: ShadingType.CLEAR },
      borders: cleanBorders,
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isBold,
              size: 19,
              color: DARK_TEXT,
            }),
          ],
        }),
      ],
    });

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
            spacing: { line: 276, before: 100, after: 100 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
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
            spacing: { before: 0, after: 80 },
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
            spacing: { before: 0, after: 300 },
            children: [
              new TextRun({
                text: 'Operational Manual for Sales Managers & Executive Leadership',
                italics: true,
                size: 24,
                color: MUTED_TEXT,
              }),
            ],
          }),

          // Section 1
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: '1. Executive Summary & Objective',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The Lead Intelligence & Reach Hub in ProspectPlus is an enterprise sales enrichment system that combines automated AI website crawling with live Agent Reach web and LinkedIn search. In under 10 seconds, it provides sales representatives with an auditable commercial profile, identified parcel carriers, warehouse dispatch cutoff times, and direct LinkedIn decision makers.',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Key Benefits for Sales Leadership:',
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: 'Zero Manual Pre-Call Research: ',
                bold: true,
              }),
              new TextRun(
                'Reps spend 100% of their prep time pitching rather than combing corporate websites, LinkedIn, and registers.'
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: 'Accurate Courier & Dispatch Footprint: ',
                bold: true,
              }),
              new TextRun(
                'Identifies whether the prospect ships with Australia Post, StarTrack, Sendle, or Aramex, their order cutoff times, and return policies.'
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: 'Direct Access to Decision Makers: ',
                bold: true,
              }),
              new TextRun(
                'Indexed LinkedIn profiles of Logistics, Warehouse, and Operations managers with 1-click addition to CRM contacts.'
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: 'Competitor Delivery Delays: ',
                bold: true,
              }),
              new TextRun(
                'Flags public complaints regarding delays with competitor carriers to give sales reps immediate pain-point leverage.'
              ),
            ],
          }),

          // Section 2
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '2. Where It Is Located on the Lead Profile Page',
                bold: true,
                size: 28,
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
                ' tab. The Lead Intelligence & Reach Hub is prominently positioned at the very top of this tab.'
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                'Top Action Buttons (Header):\n• [Run Complete Intel (AI + Agent Reach)]: Primary action that triggers both website crawling and live web/LinkedIn intelligence simultaneously.\n• [Decision Makers ({count})]: Opens the modal to review indexed operational personnel and add them to CRM contacts.'
              ),
            ],
          }),

          // Section 3
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '3. How Leads Can Be Enriched (3 Workflows)',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  tableHeaderCell('Workflow', 25),
                  tableHeaderCell('Location & Action', 35),
                  tableHeaderCell('Outcome', 40),
                ],
              }),
              new TableRow({
                children: [
                  tableBodyCell('1-Click Direct Intel', 25, true),
                  tableBodyCell('Lead Profile -> Discovery tab -> Click "Run Complete Intel"', 35),
                  tableBodyCell('Crawls website + indexes carriers, cutoff times, and LinkedIn in 5-8 seconds.', 40),
                ],
              }),
              new TableRow({
                children: [
                  tableBodyCell('Batch Bulk Enrichment', 25, true),
                  tableBodyCell('Outbound Leads Table -> Check rows -> Click "Enrich with AI"', 35),
                  tableBodyCell('Runs asynchronous bulk crawling and live intelligence across all selected leads.', 40),
                ],
              }),
              new TableRow({
                children: [
                  tableBodyCell('Decision Maker Finder', 25, true),
                  tableBodyCell('Hub Header -> Click "Decision Makers ({count})"', 35),
                  tableBodyCell('Dedicated LinkedIn search to discover and sync key managers directly into contacts.', 40),
                ],
              }),
            ],
          }),

          // Section 4
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '4. What Information Is Captured (5 Specialized Views)',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),

          // Tab 1
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: 'View 1: Synthesized Overview (Dual-Source Snapshot)',
                bold: true,
                size: 24,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                '• Top Decision Maker Callout: Displays the most relevant logistics contact, job title, and 1-click "Add to Contacts" button.\n• Dual-Source Grid: Side-by-side audit comparing website scrape data vs. live Agent Reach web signals.\n• Suggested Opener: Tailored cold-call opening line referencing their actual warehouse location, cutoff window, or carrier.\n• Sales Talking Points: 3-4 commercial angles tailored for MailPlus express satchels and driver afternoon collections.\n• Social Proof Matching: Identifies similar signed MailPlus clients in the same industry category and suburb.'
              ),
            ],
          }),

          // Tab 2
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: 'View 2: Agent Reach Signals (Live Logistics & Courier Evidence)',
                bold: true,
                size: 24,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                '• Detected Parcel Carriers: E.g., Australia Post, StarTrack, Sendle, Aramex, Toll, TNT/FedEx, DHL.\n• Daily Dispatch Cutoff: Explicit same-day dispatch cutoff times (e.g. 2:00 PM).\n• AI Shipping Policy & Carrier Summary: Gemini synthesizes complex return and shipping policies into 4 clear bullets (Dispatch & Warehousing, Carriers & Delivery, Returns & Exchanges, and MailPlus Sales Angle).\n• Collapsible Source Drawer: Raw source citations from live search preserved in an expandable drawer for auditability.'
              ),
            ],
          }),

          // Tab 3
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: 'View 3: AI Website Scrape (Storefront Footprint & Branches)',
                bold: true,
                size: 24,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                '• Classified Industry: Categorized by primary and secondary industry vertical.\n• Storefront & Tech Stack: Detects cart platforms (Shopify, WooCommerce, BigCommerce, Magento) and accounting tools (Xero, MYOB) compatible with MailPlus ShipMate.\n• Physical Branch Footprint: State-by-state list of physical stores and distribution centers with street address and phone.\n• PO Box & Postal Locations: Maps corporate PO Box addresses for MailPlus daily postal run services.'
              ),
            ],
          }),

          // Tab 4
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: 'View 4: Decision Makers (LinkedIn Index)',
                bold: true,
                size: 24,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                '• Target Operational Roles: Logistics Managers, Warehouse Managers, Operations Directors, and Founders.\n• High Match Indicator: Badges highlight prime signatories.\n• One-Click Contact Sync: "+ Add to Contacts" button directly creates a verified CRM contact record.'
              ),
            ],
          }),

          // Tab 5
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: 'View 5: Social & Sentiment (Reputation & Courier Pain Points)',
                bold: true,
                size: 24,
                color: SECONDARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                '• Shipping Sentiment Rating: Positive, Neutral, or Negative.\n• Competitor Delay Alerts: Surfaces public customer feedback citing parcel delivery delays or lost boxes with competitor couriers.'
              ),
            ],
          }),

          // Section 5
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '5. Sales Rep Best Practice Routine (30-Second Pre-Call)',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                '1. Open Discovery Tab: Review the Lead Intelligence & Reach Hub.\n2. Note Detected Carriers & Cutoff: Identify existing courier contracts and turnaround windows.\n3. Identify Decision Maker: Confirm the contact name and click "+ Add to Contacts" if not yet saved.\n4. Read AI Shipping Summary: Note warehouse locations and return policies.\n5. Deliver Tailored Call Opener: Confident, specific conversation starter referencing their actual logistics setup.'
              ),
            ],
          }),

          // Section 6
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 120 },
            children: [
              new TextRun({
                text: '6. Security & Infrastructure',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                '• Model Architecture: Powered by Google Gemini Flash on Genkit for rapid, cost-effective inference.\n• Live Search: Neural web search via Exa API.\n• Caching: All intelligence dossiers are persisted in Firestore to avoid redundant API consumption on repeat visits.\n• Secret Management: API keys are securely managed via Google Cloud Secret Manager on Firebase App Hosting.'
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
  console.log('Successfully generated Word docx at:', outPath);
}

generateDocx().catch(console.error);
