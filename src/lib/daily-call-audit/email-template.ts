import type { DailyAuditReportData } from './types';

/**
 * Generates an executive HTML email body conforming to AGENTS.md formatting rules.
 */
export function generateDailyAuditEmailHTML(report: DailyAuditReportData, downloadPdfUrl?: string, downloadDocxUrl?: string): string {
  const repBreakdownStr = report.headlineStats.repDialsBreakdown
    .map(r => `<strong>${r.repName}</strong>: ${r.dials}${r.note ? ` (${r.note})` : ''}`)
    .join(' &bull; ');

  const scorecardRowsHtml = report.scorecard.map((row, idx) => {
    const isYes = row.isMet || row.metStatusText.toUpperCase().includes('YES');
    const badgeColor = isYes ? '#16a34a' : '#dc2626';
    const badgeBg = isYes ? '#dcfce7' : '#fee2e2';
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

    const evidenceHtml = row.evidenceCallIds.length > 0
      ? `<div style="margin-top: 6px; padding: 4px 8px; background-color: #f1f5f9; border-radius: 4px; font-size: 11px; color: #475569;">
          <strong>Evidence:</strong> ${row.evidenceCallIds.map(e => `<span style="display: block; margin-top: 2px;">• ${e}</span>`).join('')}
         </div>`
      : '';

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #edf2f7;">
        <td style="padding: 12px 10px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 13px; vertical-align: top;">
          <strong style="color: #095c7b; display: block; margin-bottom: 3px;">${row.targetTitle}</strong>
          <span style="color: #64748b; font-size: 11px;">${row.targetDescription}</span>
        </td>
        <td style="padding: 12px 10px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; vertical-align: top; line-height: 1.4;">
          ${row.todaySummary}
          ${evidenceHtml}
        </td>
        <td style="padding: 12px 10px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 11px; vertical-align: top; text-align: center;">
          <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-weight: 700; color: ${badgeColor}; background-color: ${badgeBg};">
            ${row.metStatusText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${report.title || 'Daily Call Performance Report'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; -webkit-text-size-adjust: 100%;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
    <tr>
      <td align="center">
        <table align="center" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; border-collapse: separate;">
          
          <!-- Logo Header Banner -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>

          <!-- Title & Headline Bar -->
          <tr>
            <td style="padding: 24px 24px 16px; background-color: #ffffff;">
              <h1 style="margin: 0 0 6px; font-size: 20px; color: #095c7b; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                ${report.title || `Daily Call & Transcript Audit — ${report.dateFormatted}`}
              </h1>
              <p style="margin: 0 0 16px; font-size: 12px; color: #64748b; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong>${report.headlineStats.totalSdrDials} SDR dials</strong> (${repBreakdownStr}) &bull; 
                <strong>${report.headlineStats.totalConversationsAnalysed} conversations analysed</strong>
              </p>
              <div style="background-color: #f1f5f9; padding: 8px 12px; border-radius: 6px; font-size: 11px; color: #475569; margin-bottom: 20px;">
                📎 <strong>Attached Files:</strong> Full Executive Presentation (<strong>PDF</strong>) &amp; Editable Document (<strong>Word .docx</strong>)
              </div>
            </td>
          </tr>

          <!-- Scorecard Table -->
          <tr>
            <td style="padding: 0 24px 20px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #095c7b; color: #ffffff;">
                    <th align="left" style="padding: 10px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 32%;">Target</th>
                    <th align="left" style="padding: 10px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 48%;">Today</th>
                    <th align="center" style="padding: 10px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; width: 20%;">Met?</th>
                  </tr>
                </thead>
                <tbody>
                  ${scorecardRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Narrative Section -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <!-- What Went Right Card -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 14px 16px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                    <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #166534;">
                      ✅ What went right.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #1f2937; line-height: 1.5;">
                      ${report.narrative.whatWentRight}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- The Uncomfortable One Card -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 1px solid #fef08a; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px 16px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                    <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #9a3412;">
                      ⚠️ The uncomfortable one.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #1f2937; line-height: 1.5;">
                      ${report.narrative.theUncomfortableOne}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Standardized Legal & Brand Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved. <br />
                If you no longer wish to receive marketing communications, you can&nbsp;
                <a href="{{unsubscribe_link}}" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
