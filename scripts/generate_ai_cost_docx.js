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
  const PRIMARY_COLOR = '095C7B'; // MailPlus Deep Navy/Teal
  const SECONDARY_COLOR = '0284C7'; // Sky Blue Accent
  const DARK_TEXT = '1E293B'; // Slate 800
  const MUTED_TEXT = '64748B'; // Slate 500
  const BG_LIGHT = 'F8FAFC'; // Slate 50
  const BORDER_COLOR = 'CBD5E1'; // Slate 300
  const HIGHLIGHT_BG = 'F0FDF4'; // Mint Light Green

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
            spacing: { line: 276, before: 120, after: 120 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'ProspectPlus | AI Lead Enrichment Cost & Infrastructure Guide',
                    font: 'Arial',
                    size: 18,
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
                    text: 'Strictly Confidential — MailPlus Management',
                    font: 'Arial',
                    size: 16,
                    color: MUTED_TEXT,
                  }),
                  new TextRun({
                    children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                    font: 'Arial',
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
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: 'AI Lead Enrichment Cost Analysis & Infrastructure Guide',
                bold: true,
                size: 38,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { after: 180 },
          }),

          // Metadata Callout Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: BG_LIGHT },
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 24, color: PRIMARY_COLOR },
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    margins: { top: 140, bottom: 140, left: 180, right: 180 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Target Audience: ', bold: true, size: 19 }),
                          new TextRun({ text: 'Executive Management & Operations Leadership\n', size: 19 }),
                          new TextRun({ text: 'System: ', bold: true, size: 19 }),
                          new TextRun({ text: 'ProspectPlus Outbound Lead Engine\n', size: 19 }),
                          new TextRun({ text: 'Version: ', bold: true, size: 19 }),
                          new TextRun({ text: '1.1 (Updated with Dedicated Exa Account & GCP Secret Manager)\n', size: 19 }),
                          new TextRun({ text: 'Date: ', bold: true, size: 19 }),
                          new TextRun({ text: 'October 14, 2026\n', size: 19 }),
                          new TextRun({ text: 'Special Audit: ', bold: true, size: 19 }),
                          new TextRun({ text: 'Batch enrichment run of 3,000 leads on October 12, 2026', size: 19 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // 1. Executive Summary
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '1. Executive Summary', bold: true, size: 28, color: PRIMARY_COLOR })],
            spacing: { before: 240, after: 120 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                'This report details the technical architecture, operating expenses, and future cost models for the AI Lead Enrichment and Web Scraping engine in ProspectPlus, including the 3,000 leads processed on October 12, 2026, and the dedicated Exa search account setup.'
              ),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({ text: 'Key Findings:\n', bold: true }),
              new TextRun({ text: '• October 12 Batch Run (3,000 Leads): ', bold: true }),
              new TextRun('Total cost incurred was '),
              new TextRun({ text: '$2.61 USD (approx. $4.06 AUD)', bold: true, color: '047857' }),
              new TextRun(' across the entire cohort ('),
              new TextRun({ text: 'less than one-tenth of a cent per lead', bold: true }),
              new TextRun('). Exa search cost for this run was '),
              new TextRun({ text: '$0.00', bold: true }),
              new TextRun(' (Exa live search was introduced on Oct 14).\n'),

              new TextRun({ text: '• Exa Account & Secret Manager Setup: ', bold: true }),
              new TextRun('A dedicated MailPlus Exa API key has been provisioned and secured in '),
              new TextRun({ text: 'Google Cloud Secret Manager', bold: true }),
              new TextRun('. It is injected at cloud container runtime — '),
              new TextRun({ text: 'zero API keys or secrets are exposed or pushed to GitHub', bold: true }),
              new TextRun('. The account includes '),
              new TextRun({ text: '$10 USD / month recurring free credits (~1,500 - 2,000 free searches/mo)', bold: true }),
              new TextRun(' with a dedicated '),
              new TextRun({ text: '10 QPS (600 requests/min)', bold: true }),
              new TextRun(' throughput limit.\n'),

              new TextRun({ text: '• Commercial Vendor Comparison: ', bold: true }),
              new TextRun('Commercial B2B data providers (Apollo, ZoomInfo, Clay) charge $0.20 – $1.00+ per enriched lead, which would have cost '),
              new TextRun({ text: '$600 to $3,000+ AUD', bold: true, color: 'B91C1C' }),
              new TextRun(' for 3,000 leads. ProspectPlus delivered custom MailPlus logistics intel for under $5 AUD (99.5% savings).\n'),

              new TextRun({ text: '• Zero Recurring Costs: ', bold: true }),
              new TextRun('All enriched data is stored permanently in Firestore. Reviewing, filtering, or dialling leads makes zero API calls.'),
            ],
          }),

          // 2. Cost Audit Table for 3k leads
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '2. Cost Audit: 3,000 Leads Batch Run (October 12, 2026)', bold: true, size: 28, color: PRIMARY_COLOR })],
            spacing: { before: 280, after: 140 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Component / Service', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Usage Details', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Unit Rate', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Total (USD / AUD)', bold: true, color: 'FFFFFF' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Website Direct Scraping', bold: true })] })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '3,000 target domain HTTP requests + sitemap probing' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: 'Direct Server Fetch' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$0.00 / $0.00' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Google Gemini 2.5 Flash (Input)', bold: true })] })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '~24M tokens (avg. 8k tokens per lead)' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$0.075 / 1M tokens' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$1.80 USD ($2.80 AUD)' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Google Gemini 2.5 Flash (Output)', bold: true })] })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '~2.7M tokens (structured JSON extraction)' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$0.30 / 1M tokens' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$0.81 USD ($1.26 AUD)' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Exa Semantic Search', bold: true })] })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '0 requests (Exa live search added Oct 14)' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: 'Dedicated Account' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$0.00 / $0.00' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Firestore Database Writes', bold: true })] })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '6,000 writes (lead update + activity history)' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: 'Within 20k/day Free Quota' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$0.00 / $0.00' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: HIGHLIGHT_BG },
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL AUDITED COST', bold: true, color: '047857' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: HIGHLIGHT_BG },
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: '3,000 Enriched Leads', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: HIGHLIGHT_BG },
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: '< $0.001 / lead', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: HIGHLIGHT_BG },
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: '$2.61 USD ($4.06 AUD)', bold: true, color: '047857' })] })],
                  }),
                ],
              }),
            ],
          }),

          // 3. Exa Account & Secret Management Architecture
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '3. Exa Semantic Search: Account & Security Architecture', bold: true, size: 28, color: PRIMARY_COLOR })],
            spacing: { before: 280, after: 140 },
          }),

          new Paragraph({
            children: [
              new TextRun({ text: '• Account Provisioning & Billing: ', bold: true }),
              new TextRun('Exa powers the Agent Reach layer (domain lookup, live carrier dispatch policy detection, and LinkedIn decision-maker extraction). The account is registered to MailPlus and provides '),
              new TextRun({ text: '$10.00 USD in free credits every month ', bold: true }),
              new TextRun('(~1,500 to 2,000 free searches/month). Beyond free credits, billing is pay-as-you-go at ~$5 per 1,000 searches (~$0.005/search).\n'),

              new TextRun({ text: '• Dedicated Rate Limits: ', bold: true }),
              new TextRun('The registered API key unlocks a dedicated throughput limit of '),
              new TextRun({ text: '10 Queries Per Second (600 requests/min) ', bold: true }),
              new TextRun('and up to 50 active parallel agent tasks. Because ProspectPlus processes batch leads in controlled pools of 3 to 6 concurrent requests (~1–2 QPS), the application runs at '),
              new TextRun({ text: '10% to 20% of the account ceiling', bold: true }),
              new TextRun(', completely preventing dropped requests or throttling.\n'),

              new TextRun({ text: '• Secret Manager & Zero-Exposure Security: ', bold: true }),
              new TextRun('The Exa API key is stored in '),
              new TextRun({ text: 'Google Cloud Secret Manager (projects/mailplus-outbound-leads-crm/secrets/EXA_API_KEY)', bold: true }),
              new TextRun(' with IAM access granted only to the App Hosting backend service account. In local development, it is loaded from .env.local (strictly git-ignored). '),
              new TextRun({ text: 'No secrets or API keys are ever committed to GitHub or exposed in frontend code.', bold: true }),
            ],
          }),

          // 4. Future Projections Table
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '4. Future Projections & Budget Forecast', bold: true, size: 28, color: PRIMARY_COLOR })],
            spacing: { before: 280, after: 140 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Monthly Volume', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Standard AI (Gemini)', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Unified Intel (+ Exa Search)', bold: true, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Commercial Alternatives', bold: true, color: 'FFFFFF' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '500 leads / month' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '$0.00 (Free Quota)' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '$0.00 (Covered by $10 Free Tier)' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '$150 – $400 AUD' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '1,000 leads / month' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '~$1.55 AUD' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '~$2.50 AUD (Covered by Free Tier)' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '$300 – $800 AUD' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '3,000 leads / month' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '~$4.65 AUD' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '~$45.00 – $65.00 AUD' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '$900 – $2,400 AUD' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '10,000 leads / month' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '~$15.50 AUD' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '~$220.00 AUD' })] }),
                  new TableCell({ borders: cleanBorders, children: [new Paragraph({ text: '$3,000 – $8,000 AUD' })] }),
                ],
              }),
            ],
          }),

          // 5. Cost Safeguards
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '5. Built-in Cost Safeguards', bold: true, size: 28, color: PRIMARY_COLOR })],
            spacing: { before: 280, after: 140 },
          }),

          new Paragraph({
            children: [
              new TextRun({ text: '1. Permanent Database Caching: ', bold: true }),
              new TextRun('Leads are never re-queried unless an admin explicitly clicks re-enrich.\n'),
              new TextRun({ text: '2. Decoupled Actions: ', bold: true }),
              new TextRun('Live web intelligence and LinkedIn decision-maker discovery can be triggered separately so search credits are only used where needed.\n'),
              new TextRun({ text: '3. Regulated Concurrency Workers: ', bold: true }),
              new TextRun('Batch jobs process in pools of 3 to 6 concurrent requests, guaranteeing the system never breaches provider rate limits or triggers surge fees.\n'),
              new TextRun({ text: '4. Graceful Fallbacks: ', bold: true }),
              new TextRun('If an external semantic search or reader is unavailable, the system automatically falls back to raw HTML parsing without failing the batch job.'),
            ],
          }),

          // 6. Conclusion
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '6. Conclusion & Recommendation', bold: true, size: 28, color: PRIMARY_COLOR })],
            spacing: { before: 280, after: 140 },
          }),

          new Paragraph({
            children: [
              new TextRun(
                'The AI Lead Enrichment infrastructure delivers outstanding ROI. The 3,000 leads processed on October 12 incurred approximately $4.00 AUD total in token and compute costs, delivering custom logistics intelligence, verified branches, and targeted openers at a 99.5% savings relative to commercial enterprise vendors. With the newly connected Exa account in Google Secret Manager, the team gains real-time carrier intelligence and LinkedIn contacts while retaining rock-solid security and predictable, sub-cent unit costs.'
              ),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '../docs/ProspectPlus_AI_Enrichment_Cost_Analysis.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document successfully generated at: ${outputPath}`);
}

generateDocx().catch((err) => {
  console.error('Error generating document:', err);
  process.exit(1);
});
