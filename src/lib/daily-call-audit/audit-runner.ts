import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { fetchAndAggregateDayCalls } from './transcript-fetcher';
import { analyzeDailyCalls } from './ai-analyzer';
import { generateDailyAuditPDF } from './pdf-generator';
import { generateDailyAuditDOCX } from './docx-generator';
import { generateDailyAuditEmailHTML } from './email-template';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import * as fs from 'fs';
import * as path from 'path';

const db = getFirestore(adminApp);

export interface RunDailyCallAuditOptions {
  date?: string; // YYYY-MM-DD or DD-MM-YYYY
  recipients?: string[];
  fromAddress?: string;
  skipEmail?: boolean;
}

export async function runDailyCallAudit(options: RunDailyCallAuditOptions = {}) {
  const sydneyFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  });

  let targetDate = new Date();
  let dateString: string;
  let targetStart: Date;
  let targetEnd: Date;
  let dateFormatted: string;

  if (options.date) {
    if (options.date.includes('-') && options.date.split('-')[0].length === 4) {
      // YYYY-MM-DD
      const [y, m, d] = options.date.split('-');
      targetDate = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
      dateString = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      targetStart = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
      targetEnd = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
    } else {
      // DD-MM-YYYY
      const [d, m, y] = options.date.split('-');
      targetDate = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
      dateString = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      targetStart = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
      targetEnd = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
    }
  } else {
    // Default to today
    const parts = sydneyFormatter.formatToParts(targetDate);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    dateString = `${day}-${month}-${year}`;
    targetStart = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
    targetEnd = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
  }

  const longDateFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    dateStyle: 'full'
  });
  dateFormatted = longDateFormatter.format(targetDate);

  console.log(`[Daily Audit Runner] Starting audit for ${dateFormatted} (${dateString})...`);

  // Step 1: Pre-fetch missing transcripts and aggregate all calls for the day
  const calls = await fetchAndAggregateDayCalls(targetStart, targetEnd);

  // Step 2: Run Gemini Evaluation & Coaching Rubric
  const reportData = await analyzeDailyCalls(dateFormatted, dateString, calls);

  // Step 3: Generate Executive PDF (2-page landscape)
  const pdfBuffer = generateDailyAuditPDF(reportData);

  // Step 4: Generate Word (.docx) Document
  const docxBuffer = await generateDailyAuditDOCX(reportData);

  // Step 5: Save files to temporary local storage for email attachment / download serving
  const outDir = path.join(process.cwd(), 'tmp', 'reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const pdfFileName = `${dateString}-daily-call-audit.pdf`;
  const docxFileName = `${dateString}-daily-call-audit.docx`;
  const pdfFilePath = path.join(outDir, pdfFileName);
  const docxFilePath = path.join(outDir, docxFileName);

  fs.writeFileSync(pdfFilePath, pdfBuffer);
  fs.writeFileSync(docxFilePath, docxBuffer);

  // Save audit record to Firestore
  const auditDocId = `daily_audit_${dateString}`;
  await db.collection('daily_call_audits').doc(auditDocId).set({
    dateString,
    dateFormatted,
    reportData,
    callsCount: calls.length,
    generatedAt: new Date().toISOString(),
    pdfFileName,
    docxFileName
  }, { merge: true });

  // Step 6: Dispatch Email
  let emailResult: any = { skipped: true };
  if (!options.skipEmail) {
    let recipients = options.recipients || [];
    if (recipients.length === 0) {
      // Lookup configured recipients from settings (or fallback to report_configs)
      const settingsSnap = await db.collection('settings').doc('daily_call_audit_report').get();
      if (settingsSnap.exists && settingsSnap.data()?.recipients?.length) {
        recipients = settingsSnap.data()!.recipients;
      } else {
        const configSnap = await db.collection('report_configs').doc('daily_call_audit_report').get();
        if (configSnap.exists && configSnap.data()?.recipients?.length) {
          recipients = configSnap.data()!.recipients;
        } else {
          recipients = ['ankith.ravindran@mailplus.com.au'];
        }
      }
    }

    const emailHtml = generateDailyAuditEmailHTML(reportData);

    emailResult = await sendPhysicalEmail({
      to: recipients.join(', '),
      subject: `Daily Call Audit & Transcript Performance — ${dateFormatted}`,
      html: emailHtml,
      customFrom: options.fromAddress || 'ankith.ravindran@mailplus.com.au',
      attachments: [
        {
          name: pdfFileName,
          url: `file://${pdfFilePath}`
        },
        {
          name: docxFileName,
          url: `file://${docxFilePath}`
        }
      ]
    });
  }

  return {
    success: true,
    dateString,
    dateFormatted,
    callsCount: calls.length,
    reportData,
    emailResult,
    files: {
      pdf: pdfFileName,
      docx: docxFileName
    }
  };
}
