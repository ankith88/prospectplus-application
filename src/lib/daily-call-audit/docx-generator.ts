import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  ShadingType
} from 'docx';
import type { DailyAuditReportData } from './types';

/**
 * Generates an executive Word (.docx) document matching the daily call audit report.
 */
export async function generateDailyAuditDOCX(report: DailyAuditReportData): Promise<Buffer> {
  const primaryNavy = '095C7B';
  const lightGreyBg = 'F4F7F8';
  const greenText = '16A34A';
  const redText = 'DC2626';

  const repBreakdownStr = report.headlineStats.repDialsBreakdown
    .map(r => `${r.repName} ${r.dials}${r.note ? ` (${r.note})` : ''}`)
    .join(', ');

  const subtitle = `${report.headlineStats.totalSdrDials} SDR dials (${repBreakdownStr}) · ${report.headlineStats.totalConversationsAnalysed} SDR conversations analysed · sources: ${report.headlineStats.sources}`;

  // Build Scorecard Table Rows
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Daily Target', bold: true, color: 'FFFFFF', size: 20 })]
          })
        ]
      }),
      new TableCell({
        width: { size: 45, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Today', bold: true, color: 'FFFFFF', size: 20 })]
          })
        ]
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Met?', bold: true, color: 'FFFFFF', size: 20 })]
          })
        ]
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Evidence', bold: true, color: 'FFFFFF', size: 20 })]
          })
        ]
      })
    ]
  });

  const scorecardRows = report.scorecard.map((row, idx) => {
    const isYes = row.isMet || row.metStatusText.toUpperCase().includes('YES');
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';

    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [new TextRun({ text: row.targetTitle, bold: true, color: primaryNavy, size: 19 })]
            }),
            new Paragraph({
              children: [new TextRun({ text: row.targetDescription, color: '64748B', size: 16 })]
            })
          ]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [new TextRun({ text: row.todaySummary, size: 18, color: '1E293B' })]
            })
          ]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: row.metStatusText,
                  bold: true,
                  color: isYes ? greenText : redText,
                  size: 18
                })
              ]
            })
          ]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: row.evidenceCallIds.length > 0 ? row.evidenceCallIds.join(', ') : '(None)',
                  color: '64748B',
                  size: 17
                })
              ]
            })
          ]
        })
      ]
    });
  });

  const scorecardTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeaderRow, ...scorecardRows]
  });

  // Build Tracked Lists Table Rows
  const trackedHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Commitment', bold: true, color: 'FFFFFF', size: 20 })]
          })
        ]
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Status at Day Close', bold: true, color: 'FFFFFF', size: 20 })]
          })
        ]
      })
    ]
  });

  const trackedRows = report.trackedLists.map((item, idx) => {
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [new TextRun({ text: item.commitment, bold: true, color: primaryNavy, size: 19 })]
            })
          ]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: item.status, size: 18, color: '1E293B' }),
                item.details ? new TextRun({ text: ` ${item.details}`, color: '64748B', size: 17 }) : new TextRun('')
              ]
            })
          ]
        })
      ]
    });
  });

  const trackedTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [trackedHeaderRow, ...trackedRows]
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: report.title || `J2 Daily — ${report.dateFormatted}`,
                bold: true,
                color: primaryNavy,
                size: 32
              })
            ]
          }),
          // Subtitle
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: subtitle,
                color: '64748B',
                size: 19,
                italics: true
              })
            ]
          }),

          // Section: Scorecard Table
          scorecardTable,

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // Narrative: What went right
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'What Went Right.',
                bold: true,
                color: '166534',
                size: 24
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: report.narrative.whatWentRight,
                size: 20,
                color: '1F2937'
              })
            ]
          }),

          // Narrative: The uncomfortable one
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'The Uncomfortable One.',
                bold: true,
                color: '9A3412',
                size: 24
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 280 },
            children: [
              new TextRun({
                text: report.narrative.theUncomfortableOne,
                size: 20,
                color: '1F2937'
              })
            ]
          }),

          // Section 2: Tracked Lists
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: `Tracked Lists — ${report.dateFormatted}`,
                bold: true,
                color: primaryNavy,
                size: 24
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: 'Source: today’s recordings + Prospect+ calls export',
                color: '64748B',
                size: 18,
                italics: true
              })
            ]
          }),

          trackedTable,

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // AM Day in Brief
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'Account Manager (AM) Day in Brief:',
                bold: true,
                color: primaryNavy,
                size: 24
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: report.amDayInBrief.summary || report.amDayInBrief.reps.map(r => `${r.repName}: ${r.dialsCount} dials - ${r.summary}`).join(' · '),
                size: 20,
                color: '1F2937'
              })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBuffer(doc);
}
