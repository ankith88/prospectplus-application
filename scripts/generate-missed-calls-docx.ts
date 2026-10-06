import fs from 'fs';
import path from 'path';
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
  ShadingType,
} from 'docx';

const NAVY = '095C7B';
const DARK_SLATE = '1E293B';
const LIGHT_BG = 'F8FAFC';
const ACCENT_BLUE = '0284C7';
const GREEN = '16A34A';
const RED = 'DC2626';
const AMBER = 'D97706';
const BORDER_GREY = 'E2E8F0';

function createHeading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32, // 16pt
        color: NAVY,
        font: 'Calibri',
      }),
    ],
  });
}

function createHeading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26, // 13pt
        color: DARK_SLATE,
        font: 'Calibri',
      }),
    ],
  });
}

function createHeading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22, // 11pt
        color: ACCENT_BLUE,
        font: 'Calibri',
      }),
    ],
  });
}

function createParagraph(text: string, options?: { bold?: boolean; italic?: boolean; color?: string }): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        italics: options?.italic,
        color: options?.color || DARK_SLATE,
        size: 22, // 11pt
        font: 'Calibri',
      }),
    ],
  });
}

function createBullet(title: string, desc: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 260 },
    children: [
      new TextRun({
        text: `${title}: `,
        bold: true,
        color: DARK_SLATE,
        size: 22,
        font: 'Calibri',
      }),
      new TextRun({
        text: desc,
        color: DARK_SLATE,
        size: 22,
        font: 'Calibri',
      }),
    ],
  });
}

function createCalloutBox(title: string, text: string, borderColor: string = NAVY, bgColor: string = 'F0F9FF'): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      left: { style: BorderStyle.SINGLE, size: 24, color: borderColor },
      right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 22,
                    color: NAVY,
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                    size: 20,
                    color: DARK_SLATE,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createStyledTable(headers: string[], rows: string[][]): Table {
  const tableRows: TableRow[] = [];

  // Header Row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map((h) =>
        new TableCell({
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: h,
                  bold: true,
                  color: 'FFFFFF',
                  size: 20,
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        })
      ),
    })
  );

  // Data Rows
  rows.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    tableRows.push(
      new TableRow({
        children: row.map((cellText) =>
          new TableCell({
            shading: { fill: isEven ? 'FFFFFF' : LIGHT_BG, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GREY },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GREY },
              left: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GREY },
              right: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GREY },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellText,
                    size: 19,
                    color: DARK_SLATE,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          })
        ),
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

async function buildDocument() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch margins
          },
        },
        children: [
          // TITLE BLOCK
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'MailPlus ProspectPlus CRM',
                bold: true,
                size: 24,
                color: ACCENT_BLUE,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Inbound & Missed Calls Tracking & Follow-Up Guide',
                bold: true,
                size: 38, // 19pt
                color: NAVY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
            children: [
              new TextRun({
                text: 'Standard Operating Procedure, Activity Tracking & Management Reporting',
                italics: true,
                size: 22,
                color: '64748B',
                font: 'Calibri',
              }),
            ],
          }),

          // EXECUTIVE SUMMARY
          createHeading1('1. Executive Overview & Purpose'),
          createParagraph(
            'This document outlines the standard operating procedure (SOP) and technical reporting framework for managing inbound and missed calls within the MailPlus ProspectPlus application. In high-velocity sales and logistics customer management, unreturned inbound calls represent lost revenue, churn risks, and missed opportunities. ProspectPlus bridges Aircall telephony with CRM intelligence to guarantee complete transparency on every call.'
          ),
          createParagraph(
            'The system tracks three critical data dimensions in real time:'
          ),
          createBullet('Call Attribution', 'Who called, which MailPlus Aircall line was contacted, and which Prospect+ Lead or Company the caller belongs to.'),
          createBullet('Activity Timeline', 'Exact timestamp when the missed call happened compared against when the follow-up callback or CRM action was completed.'),
          createBullet('Management Accountability', 'Live follow-up rates, average callback response times (Time-to-Callback), and automated alerts for unaddressed calls requiring action.'),

          new Paragraph({ spacing: { after: 140 } }),
          createCalloutBox(
            'Core Operating Philosophy: Zero Missed Opportunities',
            'Every missed inbound call must have a recorded follow-up action within the defined SLA window. Whether resolved via a connected callback, an email touchpoint, a CRM activity note, or a manual status classification, ProspectPlus ensures 100% accountability across all team members.'
          ),

          new Paragraph({ spacing: { after: 240 } }),

          // ARCHITECTURE & 3-TIER ENGINE
          createHeading1('2. How Activity & Follow-Up Tracking Works'),
          createParagraph(
            'ProspectPlus does not rely solely on manual checklists. Instead, it utilizes an automated 3-tier detection engine that cross-references telephony data, CRM event streams, and manual agent input.'
          ),

          createHeading2('Tier 1: Automated Outbound Callback Detection (Aircall Sync)'),
          createParagraph(
            'When an inbound call is missed, the system monitors subsequent outbound calls placed from any Aircall user to that caller’s phone number. If an outbound call is detected after the missed call timestamp, ProspectPlus calculates the exact response time and classifies the outcome:'
          ),
          createBullet('🟢 Callback Connected', 'Outbound call was answered with active duration (e.g. "Callback Connected: 2m 45s by Alex Mabuda in 14m").'),
          createBullet('🟡 Callback Attempted', 'Outbound call was placed but unanswered or went to voicemail (e.g. "Callback Attempted: No Answer in 22m by Sarah Hart").'),

          createHeading2('Tier 2: CRM Lead Activity Cross-Referencing'),
          createParagraph(
            'If the incoming phone number is matched to an existing Lead or Company in Prospect+, the engine scans the lead’s activity timeline for any action logged after the call timestamp. This captures:'
          ),
          createBullet('🔵 Email Touchpoints', 'Sent introduction or follow-up email logged via Prospect+ or synced mailbox.'),
          createBullet('🔵 Notes & CRM Calls', 'Manual call notes, voicemails left, or status progress updates logged on the lead profile.'),
          createBullet('🔵 Meetings Scheduled', 'Appointments, onboarding dates, or demonstrations booked for the client.'),

          createHeading2('Tier 3: Manual Resolution & SLA Override'),
          createParagraph(
            'When an action is taken outside automated tracking (e.g., WhatsApp message, internal discussion with Operations, or spam call identification), reps and managers can click "Resolve" directly in the reporting table. This updates the report and logs a permanent audit note to the lead timeline.'
          ),

          new Paragraph({ spacing: { after: 240 } }),

          // 5 FOLLOW-UP CATEGORIES TABLE
          createHeading1('3. Follow-Up Status Categories & Indicators'),
          createParagraph('The following table defines the status indicators visible in the Calls Log and Management KPIs:'),

          createStyledTable(
            ['Status Badge', 'Trigger Condition', 'System Meaning & Impact', 'Next Action Required'],
            [
              [
                '🔴 Action Needed (Unreturned)',
                'Missed call received with no outbound callback or CRM activity recorded.',
                'The caller is waiting for a response. Live elapsed timer counts waiting time.',
                'Rep must click "Call" to dial or "Resolve" to log touchpoint.',
              ],
              [
                '🟢 Callback Connected',
                'Outbound call placed to caller and answered (duration > 0s).',
                'Call successfully returned. Response time in minutes is logged to management KPI.',
                'No further action needed unless follow-up tasks were agreed upon.',
              ],
              [
                '🟡 Callback Attempted',
                'Outbound call placed to caller but not answered / short ring.',
                'Rep attempted to return the call, proving proactive SLA compliance.',
                'Send follow-up email or try calling again later.',
              ],
              [
                '🔵 CRM Activity Logged',
                'Note, email, meeting, or status change logged on matched lead profile after call.',
                'Client was serviced via CRM workflow (e.g., email or account review).',
                'Continue regular lead nurturing lifecycle.',
              ],
              [
                '⚪ Resolved Manually',
                'Rep clicked "Resolve" and categorized reason (e.g. Spam / Left Voicemail / Ops Handled).',
                'Explicit human confirmation that the call does not require further outbound dialing.',
                'Audit logged to lead profile. No further action needed.',
              ],
            ]
          ),

          new Paragraph({ spacing: { after: 280 } }),

          // USER & SALES REP WORKFLOW GUIDE
          createHeading1('4. Sales Rep & Team User Guide'),
          createParagraph(
            'Sales representatives and customer success agents have direct access to their personal call queue under "My Inbound Calls" (as well as the global Inbound Calls report).'
          ),

          createHeading2('Step 1: Open Your Inbound Calls Queue'),
          createParagraph(
            'Navigate to "My Inbound Calls" from the main sidebar navigation. The system automatically filters for phone lines assigned to your user profile.'
          ),

          createHeading2('Step 2: Review Grouped Caller Numbers'),
          createParagraph(
            'By default, calls are consolidated by Inbound Caller Phone Number. Callers with unreturned missed calls (🔴 Action Needed) are prioritized at the top of your list so you always know who to contact first.'
          ),

          createHeading2('Step 3: Check the Activity Timeline'),
          createParagraph(
            'Expand any caller group by clicking the arrow (chevron). Each call row shows a 2-step activity timeline:'
          ),
          createBullet('Step 1 (Call Received)', 'Shows exact date, time, line name, and missed reason (e.g. No Agent Available, Out of Opening Hours).'),
          createBullet('Step 2 (Follow-Up Activity)', 'Shows if and when a callback or lead note was completed, including response time (+18m response). If pending, it shows the live elapsed time (e.g. ⏳ Elapsed: 45m ago).'),

          createHeading2('Step 4: Return Call with 1-Click Dialing'),
          createParagraph(
            'Click the green "Call" button next to the caller phone number to immediately dial via Aircall. When you complete the call, ProspectPlus automatically updates your status to 🟢 Callback Connected.'
          ),

          createHeading2('Step 5: Log Quick Resolution or Lead Notes'),
          createParagraph(
            'If you handled the customer via email, left a voicemail, or identified a spam call, click "Resolve":'
          ),
          createBullet('Resolution Type', 'Select "Outbound Callback Made", "Left Voicemail", "Contacted via Email", "Spam / Wrong Number", or "Handled by Operations".'),
          createBullet('Follow-Up Notes', 'Type what was discussed or agreed upon.'),
          createBullet('Automatic CRM Sync', 'For matched leads, the note is automatically injected into the Lead’s activity feed with your name and timestamp.'),

          createHeading2('Step 6: Convert Unregistered Callers to Leads'),
          createParagraph(
            'If the caller is an unregistered new prospect, click the "+ Lead" button to open the Lead Creation modal with the phone number pre-filled.'
          ),

          new Paragraph({ spacing: { after: 280 } }),

          // MANAGEMENT & LEADERSHIP GUIDE
          createHeading1('5. Management & Leadership Guide'),
          createParagraph(
            'Managers, Team Leads, and Executives can monitor the organization-wide call queue under "Reports > Aircall Missed Calls".'
          ),

          createHeading2('Management KPI Dashboard'),
          createBullet('Follow-Up Rate %', 'Percentage of missed calls that received a callback or CRM action (Target: 85%+).'),
          createBullet('Pending Action Counter', 'Real-time count of unresolved missed calls requiring manager intervention.'),
          createBullet('Avg Response Time (SLA)', 'Average minutes taken by representatives to return missed calls (Target: < 30 mins).'),
          createBullet('In-Hours vs Out-of-Hours Missed', 'Differentiates between operational capacity during opening hours (8:30am - 5:30pm AEST) vs after-hours inquiries.'),

          createHeading2('Line & User Performance Breakdown Table'),
          createParagraph(
            'Click the "Line & User Breakdown" tab to view individual performance across all Aircall numbers:'
          ),
          createBullet('Total Inbound vs Missed', 'Volume of calls routed to each line and percentage of unanswered calls.'),
          createBullet('Follow-Up Rate per Line/User', 'Identifies high-performing reps and lines with backlogs of unreturned calls.'),
          createBullet('Pending Action per Line', 'Pinpoints which specific reps have outstanding customer callbacks.'),

          createHeading2('Visual Analytics & Staffing Optimization'),
          createParagraph(
            'The "Visual Analytics" tab displays hourly distribution charts (AEST) and day-of-week trends. Use these insights to identify peak call hours (e.g. 10:00 AM - 12:00 PM) and allocate phone coverage effectively.'
          ),

          createHeading2('Exporting Data for Executive Briefings'),
          createParagraph(
            'Click "Export CSV" to download a complete audit report containing all call IDs, timestamps, caller numbers, matched lead names, follow-up actions, response times, and rep names for spreadsheet analysis or management meetings.'
          ),

          new Paragraph({ spacing: { after: 280 } }),

          // SLA STANDARDS TABLE
          createHeading1('6. Service Level Agreements (SLAs) & Standards'),
          createParagraph('All team members are expected to adhere to the following MailPlus response standards:'),

          createStyledTable(
            ['Call Type / Scenario', 'Standard Response Window', 'Expected Action', 'Escalation Threshold'],
            [
              [
                'In-Hours Missed Call (Matched Lead)',
                'Within 30 Minutes',
                'Outbound callback via Aircall or email if phone is busy.',
                '> 60 Minutes (Flagged in Morning/Afternoon review)',
              ],
              [
                'In-Hours Missed Call (Unregistered Caller)',
                'Within 45 Minutes',
                'Outbound callback & qualify for Lead creation (+ Lead).',
                '> 90 Minutes',
              ],
              [
                'Out-of-Hours Missed Call (Evenings / Weekends)',
                'By 9:30 AM Next Business Day',
                'Prioritized callback during opening hour queue sweep.',
                '> 10:30 AM Next Business Day',
              ],
              [
                'Voicemail Left by Customer',
                'Within 20 Minutes',
                'Listen to recording in Aircall/CRM and return call with relevant solution.',
                '> 45 Minutes',
              ],
            ]
          ),

          new Paragraph({ spacing: { after: 280 } }),

          // FAQ & TROUBLESHOOTING
          createHeading1('7. Frequently Asked Questions (FAQ)'),
          createParagraph(
            'Q: What happens if a rep calls back from a personal mobile instead of Aircall?',
            { bold: true }
          ),
          createParagraph(
            'A: Outbound calls made outside Aircall cannot be auto-detected by telephony APIs. In this case, the rep should click "Resolve" on the call row, select "Outbound Callback Made", and enter a brief note. This immediately marks the call resolved and logs the activity on the lead.'
          ),

          createParagraph(
            'Q: How are phone numbers matched to existing Prospect+ Leads?',
            { bold: true }
          ),
          createParagraph(
            'A: ProspectPlus normalizes all Australian phone variations (e.g. +61 4XX, 04XX, (02) XXXX, 61XXXXXXXX) across Company Phones, Contact Mobile Numbers, and Alternate Phones. When a match is found, the company name, customer status, contact person, and assigned sales rep are instantly linked.'
          ),

          createParagraph(
            'Q: Does the "Resolve" button update the CRM Lead Profile?',
            { bold: true }
          ),
          createParagraph(
            'A: Yes. Whenever a resolution is submitted for a matched lead, ProspectPlus creates a permanent activity log entry under the lead’s activity timeline visible to all team members.'
          ),

          new Paragraph({ spacing: { after: 240 } }),

          // FOOTER / SIGN-OFF BLOCK
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 60 },
            children: [
              new TextRun({
                text: 'MailPlus Australia · ProspectPlus Intelligence Systems',
                bold: true,
                size: 20,
                color: NAVY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'For system inquiries or process feedback, contact the Operations & Development Team.',
                italics: true,
                size: 18,
                color: '94A3B8',
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const docxPath = path.join(process.cwd(), 'docs', 'ProspectPlus_Missed_Calls_Process_and_Reporting_Guide.docx');
  const publicDocxPath = path.join(process.cwd(), 'public', 'docs', 'ProspectPlus_Missed_Calls_Process_and_Reporting_Guide.docx');

  fs.writeFileSync(docxPath, buffer);
  fs.writeFileSync(publicDocxPath, buffer);

  console.log(`Document created successfully at:\n- ${docxPath}\n- ${publicDocxPath}`);
}

buildDocument().catch(console.error);
