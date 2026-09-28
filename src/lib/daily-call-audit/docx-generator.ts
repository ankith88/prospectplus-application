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
 * Generates an executive Word (.docx) document matching the MailPlus 2026 Daily Briefing format.
 */
export async function generateDailyAuditDOCX(report: DailyAuditReportData): Promise<Buffer> {
  const primaryNavy = '095C7B';
  const lightGreyBg = 'F4F7F8';
  const greenText = '16A34A';
  const redText = 'DC2626';
  const amberText = 'D97706';

  const executiveQuestions = report.executiveQuestions || [];
  const tomorrowDiary = report.tomorrowDiary || [];
  const benchmarks = report.benchmarks || [];
  const sdrRosterMetrics = report.sdrRosterMetrics || [];
  const scorecard = report.scorecard || [];
  const callCardLines = report.callCardLines || [];
  const dayByDayTrends = report.dayByDayTrends || [];
  const amScorecard = report.amScorecard || [];
  const headlineStats = report.headlineStats || { totalSdrDials: 0, repDialsBreakdown: [], totalConversationsAnalysed: 0, sources: '' };
  const narrative = report.narrative || { whatWentRight: '', theUncomfortableOne: '', actionableInsightForLeadership: '' };

  const repBreakdownStr = sdrRosterMetrics
    .map(r => `${r.repName}: ${r.dials} dials (${r.uniqueLeadsCount ? `${r.uniqueLeadsCount} leads, ` : ''}${r.hoursOnPhone || 'active'})`)
    .join(' · ');

  const subtitle = `${headlineStats.totalSdrDials} Total Dials across ${headlineStats.totalUniqueLeads || 'all'} Unique Leads (${repBreakdownStr}) · ${headlineStats.totalConversationsAnalysed} SDR Conversations Analysed (45s+)`;

  // 1. Executive 5-Question Table
  const eqHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Question', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Today’s Answer', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Evidence & Citations', bold: true, color: 'FFFFFF', size: 18 })] })]
      })
    ]
  });

  const eqRows = executiveQuestions.map((q, idx) => {
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: q.questionTitle, bold: true, color: primaryNavy, size: 18 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: q.answer, size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: q.evidence, italics: true, color: '64748B', size: 16 })] })]
        })
      ]
    });
  });

  const executiveQuestionsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [eqHeaderRow, ...eqRows]
  });

  // 2. SDR Seat Register Table
  const rosterHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'SDR Rep', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 9, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Dials', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Unique Leads', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 11, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'First Call', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 11, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Last Call', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 13, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Hours on Phone', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: '45s+ Convs', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Dials/Conv', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 11, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: '5-Free / Fork', bold: true, color: 'FFFFFF', size: 18 })] })]
      })
    ]
  });

  const rosterRows = sdrRosterMetrics.map((r, idx) => {
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    const fiveFreeText = (r.fiveFreeOpportunitiesTaken > 0 || r.fiveFreeOpportunitiesMissed > 0)
      ? `${r.fiveFreeOpportunitiesTaken} taken (${r.fiveFreeOpportunitiesMissed} missed)`
      : '—';

    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: r.repName, bold: true, color: primaryNavy, size: 18 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: String(r.dials), size: 18 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: String(r.uniqueLeadsCount ?? 'N/A'), size: 18 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: r.firstCallTime || 'N/A', size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: r.lastCallTime || 'N/A', size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: r.hoursOnPhone || 'N/A', size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: String(r.conversations45sPlus), size: 18 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: String(r.dialsPerConversation), size: 18 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: fiveFreeText, size: 17 })] })]
        })
      ]
    });
  });

  const seatRegisterTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [rosterHeaderRow, ...rosterRows]
  });

  // 3. Benchmarks Table (Slide 4)
  const benchHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Behaviour', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 36, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Where We Are', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 36, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'The Target Bar', bold: true, color: 'FFFFFF', size: 18 })] })]
      })
    ]
  });

  const benchRows = benchmarks.map((b, idx) => {
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: b.behaviour, bold: true, color: primaryNavy, size: 18 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: b.whereWeAre, size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: b.bar, size: 17 })] })]
        })
      ]
    });
  });

  const benchmarksTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [benchHeaderRow, ...benchRows]
  });

  // 4. 11 SDR Standards Scorecard Table
  const scoreHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Measure (1–11)', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 55, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Today Performance & Citations', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, color: 'FFFFFF', size: 18 })] })]
      })
    ]
  });

  const scoreRows = scorecard.map((row, idx) => {
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    const isYes = row.isMet || row.metStatusText.toUpperCase().includes('MET');

    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({ children: [new TextRun({ text: row.targetTitle, bold: true, color: primaryNavy, size: 18 })] }),
            new Paragraph({ children: [new TextRun({ text: row.targetDescription, italics: true, color: '64748B', size: 15 })] })
          ]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({ children: [new TextRun({ text: row.todaySummary, size: 17 })] }),
            ...(row.evidenceCallIds.length > 0
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Evidence: ', bold: true, color: primaryNavy, size: 16 }),
                      new TextRun({ text: row.evidenceCallIds.join(' · '), color: '334155', size: 16 })
                    ]
                  })
                ]
              : [])
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
    rows: [scoreHeaderRow, ...scoreRows]
  });

  // 5. 3b Call Card Verbatim Lines Table
  const callCardHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Call Card Line', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Compliance', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Live Floor Tape Evidence', bold: true, color: 'FFFFFF', size: 18 })] })]
      })
    ]
  });

  const callCardRows = callCardLines.map((line, idx) => {
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({ children: [new TextRun({ text: line.lineName, bold: true, color: primaryNavy, size: 18 })] }),
            new Paragraph({ children: [new TextRun({ text: line.prescribedWords, italics: true, color: '64748B', size: 15 })] })
          ]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: line.complianceRateOrCount, bold: true, color: primaryNavy, size: 18 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: line.liveEvidenceExample, size: 17 })] })]
        })
      ]
    });
  });

  const callCardTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [callCardHeaderRow, ...callCardRows]
  });

  // 6. 3c Day-by-Day Matrix Table
  const dayHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Measure Tracked', bold: true, color: 'FFFFFF', size: 17 })] })]
      }),
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Mon', bold: true, color: 'FFFFFF', size: 17 })] })]
      }),
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Tue', bold: true, color: 'FFFFFF', size: 17 })] })]
      }),
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Wed', bold: true, color: 'FFFFFF', size: 17 })] })]
      }),
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Thu', bold: true, color: 'FFFFFF', size: 17 })] })]
      }),
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Fri', bold: true, color: 'FFFFFF', size: 17 })] })]
      }),
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Coaching Read', bold: true, color: 'FFFFFF', size: 17 })] })]
      })
    ]
  });

  const dayRows = dayByDayTrends.map((t, idx) => {
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: t.measure, bold: true, color: primaryNavy, size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: t.mon, size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: t.tue, size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: t.wed, size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: t.thu, size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: t.fri, size: 17 })] })]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: t.read, size: 16, color: '475569' })] })]
        })
      ]
    });
  });

  const dayByDayTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [dayHeaderRow, ...dayRows]
  });

  // 7. AM Scorecard Table (Slide 6)
  const amHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'AM Measure', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'How It’s Counted & Verification', bold: true, color: 'FFFFFF', size: 18 })] })]
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        shading: { fill: primaryNavy, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, color: 'FFFFFF', size: 18 })] })]
      })
    ]
  });

  const amRows = amScorecard.map((m, idx) => {
    const rowBg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    return new TableRow({
      children: [
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({ children: [new TextRun({ text: m.title, bold: true, color: primaryNavy, size: 18 })] })
          ]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({ children: [new TextRun({ text: m.description, size: 17 })] }),
            new Paragraph({ children: [new TextRun({ text: `Current Status: ${m.todayStatus}`, italics: true, color: '64748B', size: 16 })] })
          ]
        }),
        new TableCell({
          shading: { fill: rowBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: m.isMet ? 'MET' : 'TRACKING',
                  bold: true,
                  color: m.isMet ? greenText : amberText,
                  size: 17
                })
              ]
            })
          ]
        })
      ]
    });
  });

  const amScorecardTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [amHeaderRow, ...amRows]
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: report.title || `MailPlus Daily SDR Performance Audit — ${report.dateFormatted}`,
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph({
            children: [new TextRun({ text: subtitle, color: '64748B', size: 19 })]
          }),
          new Paragraph({ text: '' }),

          // Section 1: Executive 5 Questions
          new Paragraph({ text: '1. Executive 5-Question Daily Briefing', heading: HeadingLevel.HEADING_2 }),
          executiveQuestionsTable,
          new Paragraph({ text: '' }),

          // Tomorrow's Diary
          new Paragraph({ text: '📅 Tomorrow’s Pipeline Diary & Action Watch List', heading: HeadingLevel.HEADING_3 }),
          ...tomorrowDiary.map(d => new Paragraph({
            children: [
              new TextRun({ text: `• ${d.time || 'Schedule'}: `, bold: true, color: primaryNavy }),
              new TextRun({ text: d.title, bold: true }),
              new TextRun({ text: d.details ? ` — ${d.details}` : '', color: '475569' })
            ]
          })),
          new Paragraph({ text: '' }),

          // Section 2: Seat Register Table
          new Paragraph({ text: '2. SDR Seat Register & Floor Activity', heading: HeadingLevel.HEADING_2 }),
          seatRegisterTable,
          new Paragraph({ text: '' }),

          // Section 3: Benchmarks Table
          new Paragraph({ text: '3. Floor Benchmarks (Where We Are vs The Bar)', heading: HeadingLevel.HEADING_2 }),
          benchmarksTable,
          new Paragraph({ text: '' }),

          // Section 4: Scorecard Table
          new Paragraph({ text: '4. The 11 SDR Core Measures Scorecard', heading: HeadingLevel.HEADING_2 }),
          scorecardTable,
          new Paragraph({ text: '' }),

          // Section 5: The Fork & Call Card Lines
          new Paragraph({ text: '5. The Fork Framework & Verbatim Call Card Lines', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun({ text: 'The Decision: ', bold: true, color: primaryNavy }),
              new TextRun({ text: '"How are you going about it — does someone collect, or do you take them yourselves?"\n', italics: true }),
              new TextRun({ text: '• Service Fork: ', bold: true, color: '0F766E' }),
              new TextRun({ text: '"Since you’re already paying to have them collected — your first 5 collections are free, no obligation."\n' }),
              new TextRun({ text: '• Product Fork: ', bold: true, color: '0369A1' }),
              new TextRun({ text: '"Worth ten minutes to see if ShipMate beats that on price and service for the same parcels?" — book it.' })
            ]
          }),
          new Paragraph({ text: '' }),
          callCardTable,
          new Paragraph({ text: '' }),

          // Section 6: Retention Matrix & Playbook
          new Paragraph({ text: '6. What is Measured Daily — Retention & Decay Matrix', heading: HeadingLevel.HEADING_2 }),
          dayByDayTable,
          new Paragraph({ text: '' }),
          new Paragraph({ text: '💡 Leadership Actionable Insight (The Floor Playbook)', heading: HeadingLevel.HEADING_3 }),
          new Paragraph({
            children: [
              new TextRun({
                text: narrative.actionableInsightForLeadership || 'Every behaviour on this floor rises the morning it is drilled and decays within two days when the drill moves on — except the opener, which was repeated every day for two weeks and is now permanent. Sean’s 9am session runs the SAME full card every morning until behaviours hold above target without prompting.',
                color: '1E3A8A'
              })
            ]
          }),
          new Paragraph({ text: '' }),

          // Section 7: AM Handshake
          new Paragraph({ text: '7. What the Account Managers Are Measured On (The Handshake)', heading: HeadingLevel.HEADING_2 }),
          amScorecardTable,
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Source of Truth: ', bold: true, color: primaryNavy }),
              new TextRun({ text: 'The AM pipeline view (appointments, no-shows, quotes out) read each Friday and Monday alongside recordings. Handovers must never sit in the void — actioned within 2 business days.', color: '64748B' })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBuffer(doc);
}
