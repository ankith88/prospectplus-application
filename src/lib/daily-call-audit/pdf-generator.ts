import { jsPDF } from 'jspdf';
import type { DailyAuditReportData } from './types';

/**
 * Generates an executive 5-page landscape PDF presentation deck matching the MailPlus 2026 Daily Briefing format.
 */
export function generateDailyAuditPDF(report: DailyAuditReportData): Buffer {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;

  // Theme Colors
  const primaryNavy = '#095c7b';
  const headerBg = '#f1f5f9';
  const tableBorder = '#cbd5e1';
  const textDark = '#1e293b';
  const textMuted = '#64748b';
  const greenBadge = '#16a34a';
  const redBadge = '#dc2626';
  const amberBadge = '#d97706';

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

  function drawFooter(pageNum: number, totalPages: number) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted);
    doc.text('MailPlus Australia · Daily SDR & AM Performance Audit · Confidential', margin, pageHeight - 16);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 50, pageHeight - 16);
  }

  // ==========================================
  // PAGE 1: Executive 5-Question Daily Briefing (Slide 1)
  // ==========================================
  doc.setFillColor(primaryNavy);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryNavy);
  doc.text(report.title || `MailPlus Daily SDR Performance Audit — ${report.dateFormatted}`, margin, 32);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted);
  const subtitleP1 = `${headlineStats.totalSdrDials} Total Dials across ${headlineStats.totalUniqueLeads || 'all'} Unique Leads (${repBreakdownStr}) · ${headlineStats.totalConversationsAnalysed} Conversations (45s+)`;
  doc.text(subtitleP1, margin, 46);

  // 5-Question Table
  let currentY = 58;
  const qColWidths = [150, 410, contentWidth - 560];
  const qColX = [
    margin,
    margin + qColWidths[0],
    margin + qColWidths[0] + qColWidths[1]
  ];

  doc.setFillColor(primaryNavy);
  doc.rect(margin, currentY, contentWidth, 18, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#ffffff');
  doc.text('Question', qColX[0] + 6, currentY + 12);
  doc.text('Today’s Answer', qColX[1] + 6, currentY + 12);
  doc.text('Evidence & Citations', qColX[2] + 6, currentY + 12);

  currentY += 18;

  const qRowHeight = (pageHeight - currentY - 145) / (executiveQuestions.length || 5);

  executiveQuestions.forEach((q, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    doc.setFillColor(rowBg);
    doc.rect(margin, currentY, contentWidth, qRowHeight, 'F');
    doc.setDrawColor(tableBorder);
    doc.rect(margin, currentY, contentWidth, qRowHeight, 'S');

    // Question
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryNavy);
    doc.text(q.questionTitle, qColX[0] + 6, currentY + 14);

    // Answer
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark);
    const ansLines = doc.splitTextToSize(q.answer, qColWidths[1] - 12);
    doc.text(ansLines.slice(0, 5), qColX[1] + 6, currentY + 12);

    // Evidence
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textMuted);
    const evLines = doc.splitTextToSize(q.evidence, qColWidths[2] - 12);
    doc.text(evLines.slice(0, 4), qColX[2] + 6, currentY + 12);

    currentY += qRowHeight;
  });

  currentY += 10;

  // Tomorrow's Pipeline Diary Box
  doc.setFillColor('#f8fafc');
  doc.rect(margin, currentY, contentWidth, pageHeight - currentY - 26, 'F');
  doc.setDrawColor(tableBorder);
  doc.rect(margin, currentY, contentWidth, pageHeight - currentY - 26, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryNavy);
  doc.text('📅 TOMORROW’S DIARY & ACTION WATCH LIST (FROM THE PIPELINE VIEW)', margin + 10, currentY + 14);

  let diaryY = currentY + 28;
  tomorrowDiary.slice(0, 5).forEach(d => {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark);
    doc.text(`• ${d.time || 'Schedule'}: ${d.title}`, margin + 12, diaryY);

    if (d.details) {
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(textMuted);
      doc.text(`— ${d.details}`, margin + 180, diaryY);
    }
    diaryY += 12;
  });

  drawFooter(1, 5);

  // ==========================================
  // PAGE 2: SDR Seat Register & Floor Benchmarks (Slide 2 & 4)
  // ==========================================
  doc.addPage();
  doc.setFillColor(primaryNavy);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryNavy);
  doc.text('SDR Seat Register & Floor Benchmarks vs The Bar', margin, 32);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted);
  doc.text('Individual rep daily activity and floor progress against permanent standards', margin, 46);

  // Seat Register Table
  currentY = 56;
  const rosterColWidths = [110, 48, 62, 72, 72, 80, 60, 60, contentWidth - 564];
  const rosterX = [
    margin,
    margin + rosterColWidths[0],
    margin + rosterColWidths[0] + rosterColWidths[1],
    margin + rosterColWidths[0] + rosterColWidths[1] + rosterColWidths[2],
    margin + rosterColWidths[0] + rosterColWidths[1] + rosterColWidths[2] + rosterColWidths[3],
    margin + rosterColWidths[0] + rosterColWidths[1] + rosterColWidths[2] + rosterColWidths[3] + rosterColWidths[4],
    margin + rosterColWidths[0] + rosterColWidths[1] + rosterColWidths[2] + rosterColWidths[3] + rosterColWidths[4] + rosterColWidths[5],
    margin + rosterColWidths[0] + rosterColWidths[1] + rosterColWidths[2] + rosterColWidths[3] + rosterColWidths[4] + rosterColWidths[5] + rosterColWidths[6],
    margin + rosterColWidths[0] + rosterColWidths[1] + rosterColWidths[2] + rosterColWidths[3] + rosterColWidths[4] + rosterColWidths[5] + rosterColWidths[6] + rosterColWidths[7]
  ];

  doc.setFillColor(primaryNavy);
  doc.rect(margin, currentY, contentWidth, 16, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor('#ffffff');
  doc.text('SDR Rep', rosterX[0] + 4, currentY + 11);
  doc.text('Dials', rosterX[1] + 4, currentY + 11);
  doc.text('Unique Leads', rosterX[2] + 4, currentY + 11);
  doc.text('First Call', rosterX[3] + 4, currentY + 11);
  doc.text('Last Call', rosterX[4] + 4, currentY + 11);
  doc.text('Phone Window', rosterX[5] + 4, currentY + 11);
  doc.text('45s+ Convs', rosterX[6] + 4, currentY + 11);
  doc.text('Dials/Conv', rosterX[7] + 4, currentY + 11);
  doc.text('5-Free / Fork Taken', rosterX[8] + 4, currentY + 11);

  currentY += 16;

  sdrRosterMetrics.forEach((r, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    doc.setFillColor(rowBg);
    doc.rect(margin, currentY, contentWidth, 14, 'F');
    doc.setDrawColor(tableBorder);
    doc.rect(margin, currentY, contentWidth, 14, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(primaryNavy);
    doc.text(r.repName, rosterX[0] + 4, currentY + 10);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(textDark);
    doc.text(String(r.dials), rosterX[1] + 4, currentY + 10);
    doc.text(String(r.uniqueLeadsCount ?? 'N/A'), rosterX[2] + 4, currentY + 10);
    doc.text(r.firstCallTime || 'N/A', rosterX[3] + 4, currentY + 10);
    doc.text(r.lastCallTime || 'N/A', rosterX[4] + 4, currentY + 10);
    doc.text(r.hoursOnPhone || 'N/A', rosterX[5] + 4, currentY + 10);
    doc.text(String(r.conversations45sPlus), rosterX[6] + 4, currentY + 10);
    doc.text(String(r.dialsPerConversation), rosterX[7] + 4, currentY + 10);

    const fiveFreeText = (r.fiveFreeOpportunitiesTaken > 0 || r.fiveFreeOpportunitiesMissed > 0)
      ? `${r.fiveFreeOpportunitiesTaken} taken (${r.fiveFreeOpportunitiesMissed} missed)`
      : '—';
    doc.text(`${fiveFreeText} · ${r.fullCardsCompleted || 0} full cards`, rosterX[8] + 4, currentY + 10);

    currentY += 14;
  });

  currentY += 16;

  // Benchmarks Table (Slide 4)
  const benchColWidths = [190, 260, 230, contentWidth - 680];
  const benchX = [
    margin,
    margin + benchColWidths[0],
    margin + benchColWidths[0] + benchColWidths[1],
    margin + benchColWidths[0] + benchColWidths[1] + benchColWidths[2]
  ];

  doc.setFillColor(primaryNavy);
  doc.rect(margin, currentY, contentWidth, 16, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor('#ffffff');
  doc.text('Behaviour Tracked', benchX[0] + 6, currentY + 11);
  doc.text('Where We Are (Nightly Update)', benchX[1] + 6, currentY + 11);
  doc.text('The Target Bar', benchX[2] + 6, currentY + 11);
  doc.text('Status', benchX[3] + 6, currentY + 11);

  currentY += 16;
  const benchRowH = (pageHeight - currentY - 26) / (benchmarks.length || 9);

  benchmarks.forEach((b, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    doc.setFillColor(rowBg);
    doc.rect(margin, currentY, contentWidth, benchRowH, 'F');
    doc.setDrawColor(tableBorder);
    doc.rect(margin, currentY, contentWidth, benchRowH, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryNavy);
    doc.text(b.behaviour, benchX[0] + 6, currentY + 12);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textDark);
    const whereLines = doc.splitTextToSize(b.whereWeAre, benchColWidths[1] - 12);
    doc.text(whereLines.slice(0, 3), benchX[1] + 6, currentY + 10);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textMuted);
    const barLines = doc.splitTextToSize(b.bar, benchColWidths[2] - 12);
    doc.text(barLines.slice(0, 3), benchX[2] + 6, currentY + 10);

    // Status Badge
    let statusColor = greenBadge;
    let statusText = 'Installed';
    if (b.statusLevel === 'amber') {
      statusColor = amberBadge;
      statusText = 'Installing';
    } else if (b.statusLevel === 'red') {
      statusColor = redBadge;
      statusText = 'Not Started';
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(statusColor);
    doc.text(`● ${statusText}`, benchX[3] + 6, currentY + 12);

    currentY += benchRowH;
  });

  drawFooter(2, 5);

  // ==========================================
  // PAGE 3: The 11 SDR Standards Scorecard (Slide 3)
  // ==========================================
  doc.addPage();
  doc.setFillColor(primaryNavy);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryNavy);
  doc.text('What the SDRs Are Measured On — 11 Core Performance Standards', margin, 32);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted);
  doc.text('The comprehensive coaching rubric behind daily and weekly reporting', margin, 46);

  currentY = 56;
  const colWidths = [140, 290, 85, 262];
  const colX = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ];

  doc.setFillColor(headerBg);
  doc.rect(margin, currentY, contentWidth, 16, 'F');
  doc.setDrawColor(tableBorder);
  doc.rect(margin, currentY, contentWidth, 16, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark);
  doc.text('Measure (1–11)', colX[0] + 6, currentY + 11);
  doc.text('Today Performance & Findings', colX[1] + 6, currentY + 11);
  doc.text('Status', colX[2] + 6, currentY + 11);
  doc.text('Evidence (Lead Name, Prospect+ ID, Call ID)', colX[3] + 6, currentY + 11);

  currentY += 16;
  const rowH11 = (pageHeight - currentY - 26) / (scorecard.length || 11);

  scorecard.forEach((row, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    doc.setFillColor(rowBg);
    doc.rect(margin, currentY, contentWidth, rowH11, 'F');
    doc.setDrawColor(tableBorder);
    doc.rect(margin, currentY, contentWidth, rowH11, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryNavy);
    doc.text(row.targetTitle, colX[0] + 6, currentY + 10);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted);
    const descLines = doc.splitTextToSize(row.targetDescription, colWidths[0] - 12);
    doc.text(descLines.slice(0, 2), colX[0] + 6, currentY + 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textDark);
    const sumLines = doc.splitTextToSize(row.todaySummary, colWidths[1] - 12);
    doc.text(sumLines.slice(0, 3), colX[1] + 6, currentY + 11);

    const isYes = row.isMet || row.metStatusText.toUpperCase().includes('MET');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(isYes ? greenBadge : redBadge);
    doc.text(row.metStatusText, colX[2] + 6, currentY + 12);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted);
    const evText = row.evidenceCallIds.length > 0 ? row.evidenceCallIds.join('\n') : '—';
    const evLines = doc.splitTextToSize(evText, colWidths[3] - 12);
    doc.text(evLines.slice(0, 3), colX[3] + 6, currentY + 10);

    currentY += rowH11;
  });

  drawFooter(3, 5);

  // ==========================================
  // PAGE 4: The Fork Framework & 3b Call Card + 3c Matrix (Slide 5 + 3b + 3c)
  // ==========================================
  doc.addPage();
  doc.setFillColor(primaryNavy);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryNavy);
  doc.text('The Fork Framework, Call Card Lines & Retention Matrix', margin, 32);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted);
  doc.text('The single decision on every call + day-by-day drill retention curve', margin, 46);

  // The Fork Box
  currentY = 56;
  doc.setFillColor('#f1f5f9');
  doc.rect(margin, currentY, contentWidth, 54, 'F');
  doc.setDrawColor('#cbd5e1');
  doc.rect(margin, currentY, contentWidth, 54, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryNavy);
  doc.text('🍴 THE FORK: "How are you going about it — does someone collect, or do you take them yourselves?"', margin + 8, currentY + 12);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor('#0f766e');
  doc.text('SERVICE FORK (Pay for pickup / Post Office runs):', margin + 8, currentY + 24);
  doc.setFont('Helvetica', 'italic');
  doc.setTextColor(textDark);
  doc.text('"Since you’re already paying to have them collected — your first 5 collections are free, no obligation."', margin + 8, currentY + 34);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor('#0369a1');
  doc.text('PRODUCT FORK (Consigning via carrier / account / platform):', margin + 410, currentY + 24);
  doc.setFont('Helvetica', 'italic');
  doc.setTextColor(textDark);
  doc.text('"Worth ten minutes to see if ShipMate beats that on price & service for the same parcels?" — book it.', margin + 410, currentY + 34);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted);
  doc.text('Proof: Alex raised ShipMate on product signal (4184422626) -> set-time booking tomorrow 11am.', margin + 8, currentY + 46);

  currentY += 62;

  // 3b Call Card Lines Table
  const cardColW = [200, 110, 80, contentWidth - 390];
  const cardX = [
    margin,
    margin + cardColW[0],
    margin + cardColW[0] + cardColW[1],
    margin + cardColW[0] + cardColW[1] + cardColW[2]
  ];

  doc.setFillColor(primaryNavy);
  doc.rect(margin, currentY, contentWidth, 16, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor('#ffffff');
  doc.text('Call Card Line (Verbatim)', cardX[0] + 6, currentY + 11);
  doc.text('Prescribed Verbatim Words', cardX[1] + 6, currentY + 11);
  doc.text('Compliance', cardX[2] + 6, currentY + 11);
  doc.text('Floor Tape Example Citation', cardX[3] + 6, currentY + 11);

  currentY += 16;
  callCardLines.forEach((c, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    doc.setFillColor(rowBg);
    doc.rect(margin, currentY, contentWidth, 24, 'F');
    doc.setDrawColor(tableBorder);
    doc.rect(margin, currentY, contentWidth, 24, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryNavy);
    doc.text(c.lineName, cardX[0] + 6, currentY + 14);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted);
    const presLines = doc.splitTextToSize(c.prescribedWords, cardColW[1] - 12);
    doc.text(presLines.slice(0, 2), cardX[1] + 6, currentY + 10);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(c.status.includes('Habit') || c.status.includes('Target') ? greenBadge : amberBadge);
    doc.text(c.complianceRateOrCount, cardX[2] + 6, currentY + 14);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textDark);
    const exLines = doc.splitTextToSize(c.liveEvidenceExample, cardColW[3] - 12);
    doc.text(exLines.slice(0, 2), cardX[3] + 6, currentY + 10);

    currentY += 24;
  });

  currentY += 12;

  // 3c Day-by-Day Table
  const dayColW = [220, 42, 42, 42, 42, 42, contentWidth - 430];
  const dayX = [
    margin,
    margin + dayColW[0],
    margin + dayColW[0] + dayColW[1],
    margin + dayColW[0] + dayColW[1] + dayColW[2],
    margin + dayColW[0] + dayColW[1] + dayColW[2] + dayColW[3],
    margin + dayColW[0] + dayColW[1] + dayColW[2] + dayColW[3] + dayColW[4],
    margin + dayColW[0] + dayColW[1] + dayColW[2] + dayColW[3] + dayColW[4] + dayColW[5]
  ];

  doc.setFillColor(primaryNavy);
  doc.rect(margin, currentY, contentWidth, 16, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor('#ffffff');
  doc.text('Measure Tracked', dayX[0] + 6, currentY + 11);
  doc.text('Mon', dayX[1] + 6, currentY + 11);
  doc.text('Tue', dayX[2] + 6, currentY + 11);
  doc.text('Wed', dayX[3] + 6, currentY + 11);
  doc.text('Thu', dayX[4] + 6, currentY + 11);
  doc.text('Fri', dayX[5] + 6, currentY + 11);
  doc.text('Coaching Read', dayX[6] + 6, currentY + 11);

  currentY += 16;
  dayByDayTrends.forEach((t, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    doc.setFillColor(rowBg);
    doc.rect(margin, currentY, contentWidth, 16, 'F');
    doc.setDrawColor(tableBorder);
    doc.rect(margin, currentY, contentWidth, 16, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(primaryNavy);
    doc.text(t.measure, dayX[0] + 6, currentY + 11);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(textDark);
    doc.text(t.mon, dayX[1] + 6, currentY + 11);
    doc.text(t.tue, dayX[2] + 6, currentY + 11);
    doc.text(t.wed, dayX[3] + 6, currentY + 11);
    doc.text(t.thu, dayX[4] + 6, currentY + 11);
    doc.text(t.fri, dayX[5] + 6, currentY + 11);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted);
    const readLines = doc.splitTextToSize(t.read, dayColW[6] - 12);
    doc.text(readLines.slice(0, 1), dayX[6] + 6, currentY + 11);

    currentY += 16;
  });

  currentY += 10;

  // Leadership Playbook
  doc.setFillColor('#eff6ff');
  doc.rect(margin, currentY, contentWidth, pageHeight - currentY - 26, 'F');
  doc.setDrawColor(primaryNavy);
  doc.rect(margin, currentY, contentWidth, pageHeight - currentY - 26, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryNavy);
  doc.text('💡 LEADERSHIP PLAYBOOK (SEAN’S 9AM DRILL SYNTHESIS):', margin + 8, currentY + 12);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textDark);
  const playLines = doc.splitTextToSize(narrative.actionableInsightForLeadership || 'Every behaviour on this floor rises the morning it is drilled and decays within two days when the drill moves on — except the opener, which was repeated every day for two weeks and is now permanent. Sean’s 9am session runs the SAME full card every morning until behaviours hold above target without prompting.', contentWidth - 16);
  doc.text(playLines.slice(0, 4), margin + 8, currentY + 24);

  drawFooter(4, 5);

  // ==========================================
  // PAGE 5: Account Manager Handshake (Slide 6)
  // ==========================================
  doc.addPage();
  doc.setFillColor(primaryNavy);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryNavy);
  doc.text('What the Account Managers Are Measured On — The Handshake', margin, 32);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted);
  doc.text('The other side of the handshake — so nothing sits in the void between SDR and AM teams', margin, 46);

  currentY = 56;
  const amColW = [180, 450, contentWidth - 630];
  const amX = [
    margin,
    margin + amColW[0],
    margin + amColW[0] + amColW[1]
  ];

  doc.setFillColor(primaryNavy);
  doc.rect(margin, currentY, contentWidth, 16, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor('#ffffff');
  doc.text('AM Standard (1–6)', amX[0] + 6, currentY + 11);
  doc.text('How It’s Counted & Verification', amX[1] + 6, currentY + 11);
  doc.text('Status & Evidence', amX[2] + 6, currentY + 11);

  currentY += 16;
  const amRowH = (pageHeight - currentY - 80) / (amScorecard.length || 6);

  amScorecard.forEach((m, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    doc.setFillColor(rowBg);
    doc.rect(margin, currentY, contentWidth, amRowH, 'F');
    doc.setDrawColor(tableBorder);
    doc.rect(margin, currentY, contentWidth, amRowH, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryNavy);
    doc.text(m.title, amX[0] + 6, currentY + 12);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textDark);
    const descLines = doc.splitTextToSize(m.description, amColW[1] - 12);
    doc.text(descLines.slice(0, 3), amX[1] + 6, currentY + 11);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(m.isMet ? greenBadge : amberBadge);
    doc.text(m.isMet ? 'MET' : 'TRACKING', amX[2] + 6, currentY + 12);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted);
    const statLines = doc.splitTextToSize(m.todayStatus, amColW[2] - 12);
    doc.text(statLines.slice(0, 2), amX[2] + 6, currentY + 22);

    currentY += amRowH;
  });

  currentY += 12;

  // AM Hygiene Callout
  doc.setFillColor('#f8fafc');
  doc.rect(margin, currentY, contentWidth, pageHeight - currentY - 26, 'F');
  doc.setDrawColor(tableBorder);
  doc.rect(margin, currentY, contentWidth, pageHeight - currentY - 26, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryNavy);
  doc.text('AM PIPELINE SOURCE OF TRUTH & OPERATIONAL DISCIPLINE:', margin + 8, currentY + 12);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted);
  doc.text('Source of truth for all AM metrics: the AM pipeline view (appointments, no-shows, quotes out) read each Friday and Monday alongside recordings. Handovers must never sit in the void — actioned within 2 business days.', margin + 8, currentY + 24);

  drawFooter(5, 5);

  return Buffer.from(doc.output('arraybuffer'));
}
