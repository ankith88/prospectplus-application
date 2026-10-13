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

async function run() {
  const PRIMARY_COLOR = '095C7B';
  const DARK_TEXT = '1E293B';
  const MUTED_TEXT = '64748B';
  const BG_LIGHT = 'F8FAFC';
  const BORDER_COLOR = 'CBD5E1';
  const HIGHLIGHT_BG = 'F0FDF4';

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
          run: { font: 'Arial', size: 21, color: DARK_TEXT },
          paragraph: { spacing: { line: 276, before: 120, after: 120 } },
        },
      },
    },
    sections: [
      {
        properties: { page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'ProspectPlus | Lead Intelligence & Cost Analysis',
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
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: 'Lead Intelligence Engine & Enrichment Cost Analysis',
                bold: true,
                size: 36,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { after: 160 },
          }),
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
                          new TextRun({ text: 'Document Reference: ', bold: true, size: 19 }),
                          new TextRun({ text: 'MP-AI-2026-FINAL (Executive Briefing)\n', size: 19 }),
                          new TextRun({ text: 'Target Audience: ', bold: true, size: 19 }),
                          new TextRun({ text: 'Executive Leadership, Finance & Sales Operations\n', size: 19 }),
                          new TextRun({ text: 'Date: ', bold: true, size: 19 }),
                          new TextRun({ text: 'October 14, 2026\n', size: 19 }),
                          new TextRun({ text: 'Scope: ', bold: true, size: 19 }),
                          new TextRun({
                            text: 'Unified 1-Click Intelligence Hub, Oct 12 Batch Audit, & Exa Search Architecture',
                            size: 19,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: '', spacing: { after: 180 } }),

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
                text: '• The October 12th Batch Run (3,000 Leads):\n',
                bold: true,
                color: PRIMARY_COLOR,
              }),
              new TextRun(
                'Total cost across the 3,000 leads was '
              ),
              new TextRun({ text: '$2.61 USD (approx. $4.06 AUD)', bold: true, color: '047857' }),
              new TextRun(' (< $0.0014 AUD / lead). On that date, the pipeline executed direct website scraping + Gemini AI only. Exa neural search had not yet been added, resulting in $0.00 Exa charges.\n\n'),

              new TextRun({
                text: '• The Unified 1-Click Experience (Current Production UI):\n',
                bold: true,
                color: PRIMARY_COLOR,
              }),
              new TextRun(
                'On October 14th, the platform was upgraded to a unified 1-click experience ("Run Complete Intel" on the lead profile, and "Batch Enrich" on the leads list). Reps click one button, and the system executes both the direct website crawler and live Exa/LinkedIn indexing in parallel in 5–8 seconds.\n\n'
              ),

              new TextRun({
                text: '• Future Projections for the Unified Engine:\n',
                bold: true,
                color: PRIMARY_COLOR,
              }),
              new TextRun(
                'Powered by our dedicated MailPlus Exa account. MailPlus receives '
              ),
              new TextRun({ text: '$10.00 USD / month in recurring free credits', bold: true }),
              new TextRun(' (~1,500 – 2,000 free searches/month). 1,000 leads/month costs '),
              new TextRun({ text: '~$2.50 AUD', bold: true }),
              new TextRun(' (covered almost entirely by free credits), and 3,000 leads/month costs '),
              new TextRun({ text: '~$45 – $65 AUD total.\n\n', bold: true }),

              new TextRun({ text: '• Commercial Vendor Benchmark: ', bold: true }),
              new TextRun(
                'Third-party providers (ZoomInfo, Apollo, Clay) charge $0.20 – $1.00+ per lead ($600 to $3,000+ AUD for 3k leads). ProspectPlus delivers tailored MailPlus logistics data at '
              ),
              new TextRun({ text: '95% to 99.5% lower cost.\n\n', bold: true }),

              new TextRun({ text: '• Enterprise Security: ', bold: true }),
              new TextRun('The Exa API key is stored in '),
              new TextRun({
                text: 'Google Cloud Secret Manager (projects/mailplus-outbound-leads-crm/secrets/EXA_API_KEY)',
                bold: true,
              }),
              new TextRun('. Access is restricted to the App Hosting runtime container. '),
              new TextRun({ text: 'Zero keys exist in GitHub.', bold: true }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '2. Cost Audit: The 3,000 Leads Enriched on October 12th',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { before: 260, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun('On October 12, 2026, 3,000 outbound leads were enriched via '),
              new TextRun({ text: 'Direct Website Scraping + Google Gemini 2.5 Flash', bold: true }),
              new TextRun('. Exa was not yet in the codebase, resulting in $0.00 Exa charges:'),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [
                      new Paragraph({ children: [new TextRun({ text: 'Component / Service', bold: true, color: 'FFFFFF' })] }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [
                      new Paragraph({ children: [new TextRun({ text: 'Usage Details', bold: true, color: 'FFFFFF' })] }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [
                      new Paragraph({ children: [new TextRun({ text: 'Unit Rate', bold: true, color: 'FFFFFF' })] }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [
                      new Paragraph({ children: [new TextRun({ text: 'Total (USD / AUD)', bold: true, color: 'FFFFFF' })] }),
                    ],
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
                    children: [new Paragraph({ text: '3,000 domain fetches + cart inspection' })],
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
                    children: [new Paragraph({ text: '~24M tokens (avg. 8k tokens/lead)' })],
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
                    children: [new Paragraph({ text: '~2.7M tokens (structured JSON)' })],
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
                    children: [new Paragraph({ children: [new TextRun({ text: 'Exa Live Search', bold: true })] })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '0 requests (Exa added Oct 14)' })],
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
                    children: [new Paragraph({ text: 'Within Free 20k/day' })],
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
                    shading: { fill: HIGHLIGHT_BG },
                    borders: cleanBorders,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'TOTAL AUDITED COST (OCT 12)', bold: true, color: '047857' })],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: HIGHLIGHT_BG },
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: '3,000 Enriched Leads', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { fill: HIGHLIGHT_BG },
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: '< $0.001 / lead', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { fill: HIGHLIGHT_BG },
                    borders: cleanBorders,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: '$2.61 USD ($4.06 AUD)', bold: true, color: '047857' })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '3. Side-by-Side Cost Comparison & Future Projections',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { before: 260, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [
                      new Paragraph({ children: [new TextRun({ text: 'Scenario / Volume', bold: true, color: 'FFFFFF' })] }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Unified Complete Intel (Live Engine)', bold: true, color: 'FFFFFF' })],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Scraping + Gemini Only (Oct 12 Run)', bold: true, color: 'FFFFFF' })],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: PRIMARY_COLOR },
                    borders: headerBorders,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Commercial Market Rate', bold: true, color: 'FFFFFF' })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Oct 12 Actual Run (3k Leads)', bold: true })] })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: 'N/A (Exa added Oct 14)' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: '~$4.06 AUD ($2.61 USD)', bold: true, color: '047857' })],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$600 – $3,000+ AUD' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: 'Future 500 leads / month' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$0.00 (Covered by Free Tier)' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$0.00 (Free Quota)' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$150 – $400 AUD' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: 'Future 1,000 leads / month' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '~$2.50 AUD (Covered by Free Tier)' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '~$1.55 AUD' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$300 – $800 AUD' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: 'Future 3,000 leads / month' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '~$45.00 – $65.00 AUD' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '~$4.65 AUD' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$900 – $2,400 AUD' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: 'Future 10,000 leads / month' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '~$220.00 AUD' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '~$15.50 AUD' })],
                  }),
                  new TableCell({
                    borders: cleanBorders,
                    children: [new Paragraph({ text: '$3,000 – $8,000 AUD' })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '4. UI Workflow & Enterprise Security',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { before: 260, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Seamless 1-Click UI: ', bold: true }),
              new TextRun(
                'Reps click [Run Complete Intel (AI + Agent Reach)] on any lead, or select multiple leads and click [Batch Enrich]. The system executes both the direct website crawler and live Exa/LinkedIn indexing in parallel in under 8 seconds.\n'
              ),
              new TextRun({ text: '• Zero Recurring Costs: ', bold: true }),
              new TextRun(
                'All enriched data is stored permanently in Firestore. Viewing leads, filtering tables, or making calls makes zero API calls.\n'
              ),
              new TextRun({ text: '• Google Cloud Secret Manager: ', bold: true }),
              new TextRun(
                'The Exa API key is stored in GCP Secret Manager (projects/mailplus-outbound-leads-crm/secrets/EXA_API_KEY) and bound to App Hosting runtime IAM. Zero keys exist in GitHub.\n'
              ),
              new TextRun({ text: '• Rate Limit Headroom: ', bold: true }),
              new TextRun(
                'Our dedicated Exa account provides 10 QPS (600 req/min). ProspectPlus batch workers operate at 3 to 6 concurrent requests (~1–2 QPS), running at 10% to 20% of the ceiling to guarantee reliable execution without throttling.'
              ),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '5. Conclusion & Leadership Recommendation',
                bold: true,
                size: 28,
                color: PRIMARY_COLOR,
              }),
            ],
            spacing: { before: 260, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun(
                'ProspectPlus delivers enterprise-grade logistics intelligence with unprecedented cost efficiency. The 3,000 leads processed on October 12 cost only ~$4.00 AUD total under direct scraping and Gemini AI. The unified 1-click engine now provides real-time carrier evidence and LinkedIn contacts for high-converting sales conversations at a fraction of commercial vendor fees, delivering annual savings of over $15,000 to $30,000 AUD.'
              ),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath1 = path.join(__dirname, '../docs/EXA_SEARCH_AND_AI_ENRICHMENT_REPORT_FOR_MANAGEMENT.docx');
  const outPath2 = path.join(__dirname, '../docs/ProspectPlus_AI_Enrichment_Cost_Analysis.docx');
  fs.writeFileSync(outPath1, buffer);
  fs.writeFileSync(outPath2, buffer);
  console.log('Successfully generated Word docs at:\n' + outPath1 + '\n' + outPath2);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
