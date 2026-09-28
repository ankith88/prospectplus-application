import type { DailyAuditReportData } from './types';

/**
 * Generates an executive HTML email body conforming to AGENTS.md formatting rules.
 */
export function generateDailyAuditEmailHTML(report: DailyAuditReportData, downloadPdfUrl?: string, downloadDocxUrl?: string): string {
  const repBreakdownStr = (report.sdrRosterMetrics || [])
    .map(r => `<strong>${r.repName}</strong>: ${r.dials} dials (${r.uniqueLeadsCount ? `${r.uniqueLeadsCount} leads, ` : ''}${r.hoursOnPhone || 'active'})`)
    .join(' &bull; ');

  // 1. Executive 5-Questions Rows
  const executiveQuestionsRowsHtml = (report.executiveQuestions || []).map((q, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #edf2f7; font-size: 11px;">
        <td style="padding: 10px 8px; vertical-align: top; width: 26%; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          <strong style="color: #095c7b; font-size: 11.5px; display: block;">${q.questionTitle}</strong>
        </td>
        <td style="padding: 10px 8px; vertical-align: top; width: 48%; color: #1e293b; line-height: 1.45; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          ${q.answer}
        </td>
        <td style="padding: 10px 8px; vertical-align: top; width: 26%; color: #475569; font-size: 10px; line-height: 1.35; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          <div style="background-color: #f1f5f9; padding: 6px 8px; border-radius: 4px; border-left: 2px solid #095c7b;">
            ${q.evidence}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Tomorrow's Diary Rows
  const diaryRowsHtml = (report.tomorrowDiary || []).map(d => {
    return `
      <div style="margin-bottom: 4px; font-size: 11px; color: #334155; line-height: 1.4;">
        <span style="display: inline-block; min-width: 65px; font-weight: 700; color: #095c7b;">${d.time || 'Schedule'}:</span>
        <strong>${d.title}</strong> ${d.rep ? `<span style="color: #64748b;">(${d.rep})</span>` : ''}
        ${d.details ? `<span style="color: #475569; font-size: 10.5px;">— ${d.details}</span>` : ''}
      </div>
    `;
  }).join('');

  // 2. Seat Register Rows
  const seatRegisterRowsHtml = (report.sdrRosterMetrics || []).map((r, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    const fiveFreeDisplay = (r.fiveFreeOpportunitiesTaken > 0 || r.fiveFreeOpportunitiesMissed > 0)
      ? `<span style="font-weight: 700; color: ${r.fiveFreeOpportunitiesTaken > 0 ? '#16a34a' : '#d97706'};">${r.fiveFreeOpportunitiesTaken} taken / ${r.fiveFreeOpportunitiesMissed} missed</span>`
      : '<span style="color: #94a3b8;">—</span>';

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #edf2f7; font-size: 11px;">
        <td style="padding: 6px 8px; font-weight: 700; color: #095c7b;">${r.repName}</td>
        <td style="padding: 6px 8px; text-align: center; color: #1e293b; font-weight: 600;">${r.dials}</td>
        <td style="padding: 6px 8px; text-align: center; color: #0f766e; font-weight: 600;">${r.uniqueLeadsCount ?? 'N/A'}</td>
        <td style="padding: 6px 8px; text-align: center; color: #64748b;">${r.hoursOnPhone || 'N/A'}</td>
        <td style="padding: 6px 8px; text-align: center; color: #1e293b;">${r.conversations45sPlus}</td>
        <td style="padding: 6px 8px; text-align: center; color: #64748b;">${r.dialsPerConversation}</td>
        <td style="padding: 6px 8px; text-align: center;">${fiveFreeDisplay}</td>
      </tr>
    `;
  }).join('');

  // 3. Benchmarks Table Rows (Slide 4)
  const benchmarksRowsHtml = (report.benchmarks || []).map((b, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    let pillColor = '#16a34a';
    let pillBg = '#dcfce7';
    let pillLabel = 'Installed';
    if (b.statusLevel === 'amber') {
      pillColor = '#d97706';
      pillBg = '#fef3c7';
      pillLabel = 'Installing';
    } else if (b.statusLevel === 'red') {
      pillColor = '#dc2626';
      pillBg = '#fee2e2';
      pillLabel = 'Not Started';
    }

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #edf2f7; font-size: 11px;">
        <td style="padding: 8px; font-weight: 700; color: #095c7b; vertical-align: top; width: 30%;">
          ${b.behaviour}
        </td>
        <td style="padding: 8px; color: #1e293b; vertical-align: top; width: 35%;">
          <div style="margin-bottom: 4px;">${b.whereWeAre}</div>
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; color: ${pillColor}; background-color: ${pillBg};">
            ● ${pillLabel}
          </span>
        </td>
        <td style="padding: 8px; color: #475569; font-size: 10.5px; vertical-align: top; width: 35%; line-height: 1.35;">
          ${b.bar}
        </td>
      </tr>
    `;
  }).join('');

  // 4. 11 SDR Measures Scorecard Rows
  const scorecardRowsHtml = report.scorecard.map((row, idx) => {
    const isYes = row.isMet || row.metStatusText.toUpperCase().includes('MET');
    const badgeColor = isYes ? '#16a34a' : '#dc2626';
    const badgeBg = isYes ? '#dcfce7' : '#fee2e2';
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

    const evidenceHtml = row.evidenceCallIds.length > 0
      ? `<div style="margin-top: 6px; padding: 6px 8px; background-color: #f1f5f9; border-radius: 4px; font-size: 10.5px; color: #334155; line-height: 1.4;">
          <strong style="color: #095c7b;">Evidence:</strong>
          ${row.evidenceCallIds.map(e => `<div style="margin-top: 2px;">• ${e}</div>`).join('')}
         </div>`
      : '';

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #edf2f7;">
        <td style="padding: 8px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 11.5px; vertical-align: top; width: 28%;">
          <strong style="color: #095c7b; display: block; margin-bottom: 2px;">${row.targetTitle}</strong>
          <span style="color: #64748b; font-size: 9.5px; display: block; line-height: 1.3;">${row.targetDescription}</span>
        </td>
        <td style="padding: 8px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 11px; color: #1e293b; vertical-align: top; line-height: 1.4; width: 54%;">
          ${row.todaySummary}
          ${evidenceHtml}
        </td>
        <td style="padding: 8px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 10.5px; vertical-align: top; text-align: center; width: 18%;">
          <span style="display: inline-block; padding: 3px 6px; border-radius: 6px; font-weight: 700; font-size: 9.5px; color: ${badgeColor}; background-color: ${badgeBg};">
            ${row.metStatusText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  // 5. Call Card Lines Rows
  const callCardRowsHtml = (report.callCardLines || []).map((line, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    const statusColor = line.status.includes('Habit') || line.status.includes('Target') ? '#16a34a' : '#d97706';
    const statusBg = line.status.includes('Habit') || line.status.includes('Target') ? '#dcfce7' : '#fef3c7';

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #edf2f7; font-size: 11px;">
        <td style="padding: 8px; vertical-align: top;">
          <strong style="color: #095c7b; display: block;">${line.lineName}</strong>
          <span style="color: #64748b; font-size: 10px; font-style: italic;">${line.prescribedWords}</span>
        </td>
        <td style="padding: 8px; text-align: center; vertical-align: top;">
          <span style="display: inline-block; padding: 3px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; color: ${statusColor}; background-color: ${statusBg};">
            ${line.complianceRateOrCount}
          </span>
        </td>
        <td style="padding: 8px; color: #334155; font-size: 10px; vertical-align: top;">
          ${line.liveEvidenceExample}
        </td>
      </tr>
    `;
  }).join('');

  // 6. 3c Day-by-Day Trend Rows
  const trendRowsHtml = (report.dayByDayTrends || []).map((row, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #edf2f7; font-size: 10.5px;">
        <td style="padding: 6px 8px; font-weight: 700; color: #095c7b; vertical-align: top;">${row.measure}</td>
        <td style="padding: 6px 4px; text-align: center; color: #1e293b; vertical-align: top;">${row.mon}</td>
        <td style="padding: 6px 4px; text-align: center; color: #1e293b; vertical-align: top;">${row.tue}</td>
        <td style="padding: 6px 4px; text-align: center; color: #1e293b; vertical-align: top;">${row.wed}</td>
        <td style="padding: 6px 4px; text-align: center; color: #1e293b; vertical-align: top;">${row.thu}</td>
        <td style="padding: 6px 4px; text-align: center; color: #1e293b; vertical-align: top; font-weight: 700;">${row.fri}</td>
        <td style="padding: 6px 8px; color: #475569; font-size: 10px; vertical-align: top; line-height: 1.3;">${row.read}</td>
      </tr>
    `;
  }).join('');

  // 7. AM Scorecard Rows (Slide 6)
  const amScorecardRowsHtml = (report.amScorecard || []).map((m, idx) => {
    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    const isYes = m.isMet;
    const badgeColor = isYes ? '#16a34a' : '#d97706';
    const badgeBg = isYes ? '#dcfce7' : '#fef3c7';

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #edf2f7; font-size: 11px;">
        <td style="padding: 8px; vertical-align: top; width: 32%;">
          <strong style="color: #095c7b; display: block;">${m.title}</strong>
          <span style="color: #64748b; font-size: 9.5px; display: block; line-height: 1.3;">${m.description}</span>
        </td>
        <td style="padding: 8px; color: #1e293b; vertical-align: top; width: 48%; line-height: 1.4;">
          ${m.todayStatus}
        </td>
        <td style="padding: 8px; text-align: center; vertical-align: top; width: 20%;">
          <span style="display: inline-block; padding: 3px 6px; border-radius: 4px; font-weight: 700; font-size: 9.5px; color: ${badgeColor}; background-color: ${badgeBg};">
            ${isYes ? 'MET' : 'TRACKING'}
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
  <title>${report.title || 'Daily SDR Call Performance Report'}</title>
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
              <h1 style="margin: 0 0 6px; font-size: 19px; color: #095c7b; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                ${report.title || `MailPlus Daily SDR Performance Audit — ${report.dateFormatted}`}
              </h1>
              <p style="margin: 0 0 14px; font-size: 11px; color: #64748b; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong>${report.headlineStats.totalSdrDials} Total Dials</strong> across <strong>${report.headlineStats.totalUniqueLeads || 'all'} Unique Leads</strong> (${repBreakdownStr}) &bull; 
                <strong>${report.headlineStats.totalConversationsAnalysed} Conversations (45s+)</strong>
              </p>
              <div style="background-color: #f1f5f9; padding: 8px 12px; border-radius: 6px; font-size: 11px; color: #475569; margin-bottom: 16px;">
                📎 <strong>Attached Files:</strong> Full Executive Presentation (<strong>PDF</strong>) &amp; Editable Document (<strong>Word .docx</strong>)
              </div>
            </td>
          </tr>

          <!-- Section 1: Executive 5-Question Briefing (Slide 1) -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <h3 style="margin: 0 0 8px; font-size: 12px; color: #095c7b; text-transform: uppercase; letter-spacing: 0.5px;">1. Executive 5-Question Daily Briefing</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; border-collapse: collapse; margin-bottom: 12px;">
                <thead>
                  <tr style="background-color: #095c7b; color: #ffffff; font-size: 10px; text-transform: uppercase;">
                    <th align="left" style="padding: 6px 8px; width: 26%;">Question</th>
                    <th align="left" style="padding: 6px 8px; width: 48%;">Today’s Answer</th>
                    <th align="left" style="padding: 6px 8px; width: 26%;">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  ${executiveQuestionsRowsHtml}
                </tbody>
              </table>

              <!-- Tomorrow's Pipeline Diary Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
                <h4 style="margin: 0 0 6px; font-size: 11px; color: #095c7b; text-transform: uppercase; letter-spacing: 0.5px;">📅 Tomorrow's Pipeline Diary &amp; Action Watch List</h4>
                ${diaryRowsHtml}
              </div>
            </td>
          </tr>

          <!-- Section 2: Seat Register Mini Table -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <h3 style="margin: 0 0 8px; font-size: 12px; color: #095c7b; text-transform: uppercase; letter-spacing: 0.5px;">2. SDR Seat Register &amp; Floor Activity</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #095c7b; color: #ffffff; font-size: 10px; text-transform: uppercase;">
                    <th align="left" style="padding: 6px 8px;">Rep</th>
                    <th align="center" style="padding: 6px 8px;">Dials</th>
                    <th align="center" style="padding: 6px 8px;">Unique Leads</th>
                    <th align="center" style="padding: 6px 8px;">Hours</th>
                    <th align="center" style="padding: 6px 8px;">45s+ Convs</th>
                    <th align="center" style="padding: 6px 8px;">Dials/Conv</th>
                    <th align="center" style="padding: 6px 8px;">5-Free / Fork</th>
                  </tr>
                </thead>
                <tbody>
                  ${seatRegisterRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Section 3: Floor Benchmarks Table (Slide 4) -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <h3 style="margin: 0 0 8px; font-size: 12px; color: #095c7b; text-transform: uppercase; letter-spacing: 0.5px;">3. Floor Benchmarks (Where We Are vs The Bar)</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #095c7b; color: #ffffff; font-size: 10px; text-transform: uppercase;">
                    <th align="left" style="padding: 6px 8px; width: 30%;">Behaviour</th>
                    <th align="left" style="padding: 6px 8px; width: 35%;">Where We Are (${report.dateFormatted.split(',')[0] || 'Today'})</th>
                    <th align="left" style="padding: 6px 8px; width: 35%;">The Bar</th>
                  </tr>
                </thead>
                <tbody>
                  ${benchmarksRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Section 4: 11 SDR Standards Scorecard -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <h3 style="margin: 0 0 8px; font-size: 12px; color: #095c7b; text-transform: uppercase; letter-spacing: 0.5px;">4. The 11 SDR Core Measures Scorecard</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #095c7b; color: #ffffff; font-size: 10px; text-transform: uppercase;">
                    <th align="left" style="padding: 6px 8px; width: 28%;">Measure</th>
                    <th align="left" style="padding: 6px 8px; width: 54%;">Today's Result &amp; Citations</th>
                    <th align="center" style="padding: 6px 8px; width: 18%;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${scorecardRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Section 5: The Fork Framework & Verbatim Call Card Lines -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <h3 style="margin: 0 0 8px; font-size: 12px; color: #095c7b; text-transform: uppercase; letter-spacing: 0.5px;">5. The Fork Framework &amp; Call Card Lines</h3>
              
              <!-- Fork Box -->
              <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; font-size: 11px; line-height: 1.45;">
                <div style="font-weight: 700; color: #095c7b; margin-bottom: 4px;">🍴 The Fork — The One Decision on Every Call:</div>
                <div style="margin-bottom: 6px; color: #475569;">
                  <em>"How are you going about it — does someone collect, or do you take them yourselves?"</em>
                </div>
                <div style="display: table; width: 100%; font-size: 10.5px;">
                  <div style="display: table-cell; width: 50%; padding-right: 6px; vertical-align: top;">
                    <strong style="color: #0f766e;">SERVICE FORK</strong> (Pay for pickup / Post Office trips):<br />
                    <em>"Since you're already paying for pickup, your first 5 collections are free — no obligation."</em>
                  </div>
                  <div style="display: table-cell; width: 50%; padding-left: 6px; vertical-align: top;">
                    <strong style="color: #0369a1;">PRODUCT FORK</strong> (Carrier / Account / Contract):<br />
                    <em>"Worth 10 minutes to see if ShipMate beats that on price &amp; service for the same parcels?"</em>
                  </div>
                </div>
              </div>

              <!-- Call Card Verbatim Table -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #095c7b; color: #ffffff; font-size: 10px; text-transform: uppercase;">
                    <th align="left" style="padding: 6px 8px; width: 38%;">Call Card Line</th>
                    <th align="center" style="padding: 6px 8px; width: 22%;">Compliance</th>
                    <th align="left" style="padding: 6px 8px; width: 40%;">Live Floor Tape Example</th>
                  </tr>
                </thead>
                <tbody>
                  ${callCardRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Section 6: Day-by-Day Retention Matrix & Playbook -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <h3 style="margin: 0 0 8px; font-size: 12px; color: #095c7b; text-transform: uppercase; letter-spacing: 0.5px;">6. What is Measured Daily — Retention &amp; Decay Matrix</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; border-collapse: collapse; margin-bottom: 12px;">
                <thead>
                  <tr style="background-color: #095c7b; color: #ffffff; font-size: 9.5px; text-transform: uppercase;">
                    <th align="left" style="padding: 6px 6px; width: 30%;">Measure</th>
                    <th align="center" style="padding: 6px 3px; width: 7%;">Mon</th>
                    <th align="center" style="padding: 6px 3px; width: 7%;">Tue</th>
                    <th align="center" style="padding: 6px 3px; width: 7%;">Wed</th>
                    <th align="center" style="padding: 6px 3px; width: 7%;">Thu</th>
                    <th align="center" style="padding: 6px 3px; width: 7%;">Fri</th>
                    <th align="left" style="padding: 6px 6px; width: 35%;">Coaching Read</th>
                  </tr>
                </thead>
                <tbody>
                  ${trendRowsHtml}
                </tbody>
              </table>

              <!-- Leadership Synthesis Playbook Box -->
              <div style="background-color: #eff6ff; border-left: 4px solid #095c7b; border-radius: 0 6px 6px 0; padding: 12px 14px; font-size: 11px; line-height: 1.5; color: #1e3a8a;">
                <strong style="color: #095c7b; font-size: 11.5px; display: block; margin-bottom: 4px;">💡 Leadership Actionable Insight (The Floor Playbook):</strong>
                ${report.narrative.actionableInsightForLeadership || 'Every behaviour on this floor rises the morning it is drilled and decays within two days when the drill moves on — except the opener, which was repeated every day for two weeks and is now permanent. Sean’s 9am session runs the SAME full card every morning until behaviours hold above target without prompting.'}
              </div>
            </td>
          </tr>

          <!-- Section 7: Account Manager Handshake (Slide 6) -->
          <tr>
            <td style="padding: 0 24px 20px;">
              <h3 style="margin: 0 0 8px; font-size: 12px; color: #095c7b; text-transform: uppercase; letter-spacing: 0.5px;">7. What the Account Managers Are Measured On</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #095c7b; color: #ffffff; font-size: 10px; text-transform: uppercase;">
                    <th align="left" style="padding: 6px 8px; width: 32%;">AM Measure</th>
                    <th align="left" style="padding: 6px 8px; width: 48%;">How It's Counted &amp; Current Status</th>
                    <th align="center" style="padding: 6px 8px; width: 20%;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${amScorecardRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Standardized Brand & Legal Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia &bull; Performance &amp; Call Quality Intelligence
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus Australia. All rights reserved. <br />
                Confidential — Internal Sales Management &amp; SDR Coaching Report.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
