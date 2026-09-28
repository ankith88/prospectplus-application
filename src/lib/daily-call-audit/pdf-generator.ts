import { jsPDF } from 'jspdf';
import type { DailyAuditReportData } from './types';

/**
 * Generates an executive 2-page landscape PDF presentation matching 2026-09-25-daily-update.pptx
 */
export function generateDailyAuditPDF(report: DailyAuditReportData): Buffer {
  // A4 Landscape dimensions in points: width = 841.89, height = 595.28
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryNavy = '#095c7b';
  const headerBg = '#f4f7f8';
  const tableBorder = '#cbd5e1';
  const textDark = '#1e293b';
  const textMuted = '#64748b';
  const greenBadge = '#16a34a';
  const redBadge = '#dc2626';

  // ==========================================
  // PAGE 1: Daily Target Scorecard & Narrative
  // ==========================================

  // Top Accent Bar
  doc.setFillColor(primaryNavy);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryNavy);
  doc.text(report.title || `J2 daily — ${report.dateFormatted}`, margin, 38);

  // Sub-header metrics
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(textMuted);
  const repBreakdownStr = report.headlineStats.repDialsBreakdown
    .map(r => `${r.repName} ${r.dials}${r.note ? ` (${r.note})` : ''}`)
    .join(', ');
  const subtitle = `${report.headlineStats.totalSdrDials} SDR dials (${repBreakdownStr}) · ${report.headlineStats.totalConversationsAnalysed} SDR conversations analysed · sources: ${report.headlineStats.sources}`;
  doc.text(subtitle, margin, 53);

  // Table Headers: Daily Target | Today | Met? | Evidence
  let currentY = 72;
  const colWidths = [150, 310, 100, 210];
  const colX = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ];

  // Header row background
  doc.setFillColor(headerBg);
  doc.rect(margin, currentY, contentWidth, 20, 'F');
  doc.setDrawColor(tableBorder);
  doc.setLineWidth(0.75);
  doc.rect(margin, currentY, contentWidth, 20, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark);
  doc.text('Daily target', colX[0] + 6, currentY + 13);
  doc.text('Today', colX[1] + 6, currentY + 13);
  doc.text('Met?', colX[2] + 6, currentY + 13);
  doc.text('Evidence & Lead IDs', colX[3] + 6, currentY + 13);

  currentY += 20;

  // Scorecard Rows
  const maxTableHeight = 240;
  const rowHeight = maxTableHeight / (report.scorecard.length || 4);

  report.scorecard.forEach((row, idx) => {
    // Zebra striping
    if (idx % 2 === 1) {
      doc.setFillColor('#f8fafc');
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(tableBorder);
    doc.rect(margin, currentY, contentWidth, rowHeight, 'S');

    // Vertical column borders
    doc.line(colX[1], currentY, colX[1], currentY + rowHeight);
    doc.line(colX[2], currentY, colX[2], currentY + rowHeight);
    doc.line(colX[3], currentY, colX[3], currentY + rowHeight);

    // Target Column
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryNavy);
    const targetLines = doc.splitTextToSize(row.targetTitle, colWidths[0] - 12);
    doc.text(targetLines, colX[0] + 6, currentY + 14);

    // Today Summary Column
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark);
    const todayLines = doc.splitTextToSize(row.todaySummary, colWidths[1] - 12);
    doc.text(todayLines.slice(0, 5), colX[1] + 6, currentY + 12);

    // Met Status Pill
    const isYes = row.isMet || row.metStatusText.toUpperCase().includes('YES');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(isYes ? greenBadge : redBadge);
    const metLines = doc.splitTextToSize(row.metStatusText, colWidths[2] - 12);
    doc.text(metLines, colX[2] + 6, currentY + 14);

    // Evidence Column (with Lead Name & Prospect+ ID)
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(textDark);
    const evidenceText = row.evidenceCallIds.length > 0
      ? row.evidenceCallIds.join('\n')
      : '(No calls flagged)';
    const evidenceLines = doc.splitTextToSize(evidenceText, colWidths[3] - 12);
    doc.text(evidenceLines.slice(0, 6), colX[3] + 6, currentY + 11);

    currentY += rowHeight;
  });

  // Executive Narrative Boxes
  currentY += 16;
  const narrativeCardWidth = (contentWidth - 14) / 2;
  const narrativeCardHeight = 160;

  // Left Box: What went right
  doc.setFillColor('#f0fdf4'); // light green bg
  doc.roundedRect(margin, currentY, narrativeCardWidth, narrativeCardHeight, 6, 6, 'F');
  doc.setDrawColor('#bbf7d0');
  doc.roundedRect(margin, currentY, narrativeCardWidth, narrativeCardHeight, 6, 6, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor('#166534');
  doc.text('What went right.', margin + 12, currentY + 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#1f2937');
  const rightLines = doc.splitTextToSize(report.narrative.whatWentRight, narrativeCardWidth - 24);
  doc.text(rightLines.slice(0, 10), margin + 12, currentY + 36);

  // Right Box: The uncomfortable one
  const rightBoxX = margin + narrativeCardWidth + 14;
  doc.setFillColor('#fffbeb'); // light amber bg
  doc.roundedRect(rightBoxX, currentY, narrativeCardWidth, narrativeCardHeight, 6, 6, 'F');
  doc.setDrawColor('#fef08a');
  doc.roundedRect(rightBoxX, currentY, narrativeCardWidth, narrativeCardHeight, 6, 6, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor('#9a3412');
  doc.text('The uncomfortable one.', rightBoxX + 12, currentY + 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#1f2937');
  const uncomfLines = doc.splitTextToSize(report.narrative.theUncomfortableOne, narrativeCardWidth - 24);
  doc.text(uncomfLines.slice(0, 10), rightBoxX + 12, currentY + 36);

  // Page 1 Footer
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted);
  doc.text('1', pageWidth - margin - 10, pageHeight - 16);

  // ==========================================
  // PAGE 2: Tracked Lists & AM Day in Brief
  // ==========================================
  doc.addPage('a4', 'landscape');

  // Top Accent Bar
  doc.setFillColor(primaryNavy);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Page 2 Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryNavy);
  doc.text(`Tracked lists — ${report.dateFormatted}`, margin, 38);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(textMuted);
  doc.text(`Source: today’s recordings + Prospect+ calls export · week totals in review`, margin, 53);

  // Tracked Lists Table
  let page2Y = 72;
  const p2ColWidths = [220, contentWidth - 220];
  const p2ColX = [margin, margin + p2ColWidths[0]];

  doc.setFillColor(headerBg);
  doc.rect(margin, page2Y, contentWidth, 20, 'F');
  doc.setDrawColor(tableBorder);
  doc.rect(margin, page2Y, contentWidth, 20, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark);
  doc.text('Commitment', p2ColX[0] + 8, page2Y + 13);
  doc.text('Status at day close', p2ColX[1] + 8, page2Y + 13);

  page2Y += 20;
  const p2RowHeight = 44;

  report.trackedLists.forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor('#f8fafc');
      doc.rect(margin, page2Y, contentWidth, p2RowHeight, 'F');
    }
    doc.setDrawColor(tableBorder);
    doc.rect(margin, page2Y, contentWidth, p2RowHeight, 'S');
    doc.line(p2ColX[1], page2Y, p2ColX[1], page2Y + p2RowHeight);

    // Commitment
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryNavy);
    const commLines = doc.splitTextToSize(item.commitment, p2ColWidths[0] - 16);
    doc.text(commLines, p2ColX[0] + 8, page2Y + 16);

    // Status
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark);
    const statLines = doc.splitTextToSize(item.status + (item.details ? ` ${item.details}` : ''), p2ColWidths[1] - 16);
    doc.text(statLines.slice(0, 3), p2ColX[1] + 8, page2Y + 14);

    page2Y += p2RowHeight;
  });

  // AM Day in Brief Card
  page2Y += 16;
  const amCardHeight = 110;
  doc.setFillColor('#f8fafc');
  doc.roundedRect(margin, page2Y, contentWidth, amCardHeight, 6, 6, 'F');
  doc.setDrawColor(tableBorder);
  doc.roundedRect(margin, page2Y, contentWidth, amCardHeight, 6, 6, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryNavy);
  doc.text('AM day in brief:', margin + 12, page2Y + 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark);
  const amSummaryText = report.amDayInBrief.summary || report.amDayInBrief.reps.map(r => `${r.repName}: ${r.dialsCount} dials - ${r.summary}`).join(' · ');
  const amLines = doc.splitTextToSize(amSummaryText, contentWidth - 24);
  doc.text(amLines.slice(0, 6), margin + 12, page2Y + 36);

  // Page 2 Footer
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted);
  doc.text('2', pageWidth - margin - 10, pageHeight - 16);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
