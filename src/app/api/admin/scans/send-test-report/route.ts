import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, date } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients list is required' }, { status: 400 });
    }

    const db = getFirestore(adminApp);

    const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    let dateString: string;
    if (date) {
      const [y, m, d] = date.split("-");
      dateString = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    } else {
      const now = new Date();
      now.setDate(now.getDate() - 1); // Yesterday
      const parts = sydneyFormatter.formatToParts(now);
      const day = parts.find(p => p.type === 'day')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const year = parts.find(p => p.type === 'year')?.value;
      dateString = `${day}-${month}-${year}`;
    }

    // Fetch all packages synced on this date
    const snapshot = await db.collection("packages")
      .where("sync_date", "==", dateString)
      .get();

    const packages = snapshot.docs.map(doc => doc.data());

    // Filter packages: must have at least one scan with type "Lodgement" or "Pickup" (case-insensitive)
    const filteredPackages = packages.filter(pkg => {
      return pkg.scans?.some((scan: any) => {
        const type = scan.scan_type?.toLowerCase() || "";
        return type === "lodgement" || type === "pickup";
      });
    });

    // Report 1: Unique package count based on delivery speed
    const speedCounts: Record<string, number> = {};

    // Report 2: Unique Package count per customer / per franchisee / per delivery speed
    const groupCounts: Record<string, number> = {};

    filteredPackages.forEach(pkg => {
      // Determine delivery speed
      let speed = "Unknown";
      const targetScan = pkg.scans?.find((s: any) => {
        const type = s.scan_type?.toLowerCase() || "";
        return (type === "lodgement" || type === "pickup") && s.delivery_speed;
      });

      if (targetScan) {
        speed = targetScan.delivery_speed;
      } else {
        const anySpeed = pkg.scans?.find((s: any) => s.delivery_speed);
        if (anySpeed) {
          speed = anySpeed.delivery_speed;
        }
      }

      // Normalize speed string
      if (speed && typeof speed === "string") {
        speed = speed.trim();
        speed = speed.charAt(0).toUpperCase() + speed.slice(1).toLowerCase();
      } else {
        speed = "Unknown";
      }

      // Increment speed counts
      speedCounts[speed] = (speedCounts[speed] || 0) + 1;

      // Increment grouped counts
      const customer = pkg.customer_name || "Unlinked Customer";
      const franchisee = pkg.franchisee_name || "Unassigned Franchisee";
      const groupKey = `${franchisee}||${customer}||${speed}`;
      groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
    });

    // Calculate total count per customer to sort by highest customer volume
    const customerTotals: Record<string, number> = {};
    Object.entries(groupCounts).forEach(([key, count]) => {
      const [, customer] = key.split("||");
      customerTotals[customer] = (customerTotals[customer] || 0) + (count as number);
    });

    const speedReport = Object.entries(speedCounts).map(([speed, count]) => ({
      speed,
      count
    })).sort((a, b) => (b.count as number) - (a.count as number));

    const groupReport = Object.entries(groupCounts).map(([key, count]) => {
      const [franchisee, customer, speed] = key.split("||");
      return { franchisee, customer, speed, count };
    }).sort((a, b) => {
      const totalA = customerTotals[a.customer] || 0;
      const totalB = customerTotals[b.customer] || 0;

      // 1. Sort by customer's total barcode count descending
      if (totalB !== totalA) {
        return totalB - totalA;
      }
      // 2. Sort by customer name alphabetically to keep same customer grouped
      const cComp = a.customer.localeCompare(b.customer);
      if (cComp !== 0) return cComp;

      // 3. Sort by delivery speed
      return a.speed.localeCompare(b.speed);
    });

    // Construct Email HTML template adhering to outbound email templates rules
    const speedRowsHtml = speedReport.length > 0
      ? speedReport.map(r => `
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 10px 12px; font-size: 14px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.speed}</strong></td>
            <td align="right" style="padding: 10px 12px; font-size: 14px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
          </tr>`).join("")
      : `<tr><td colspan="2" style="padding: 15px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No speed data recorded.</td></tr>`;

    const groupRowsHtml = groupReport.length > 0
      ? groupReport.map(r => `
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${r.franchisee}</td>
            <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${r.customer}</td>
            <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.speed}</strong></td>
            <td align="right" style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
          </tr>`).join("")
      : `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No detailed barcode data recorded.</td></tr>`;

    const emailHtml = `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Daily Barcodes Report</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f7f8; -webkit-text-size-adjust: 100%;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
      <tr>
        <td align="center">
          <table align="center" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; border-collapse: separate;">
            <!-- Banner Logo -->
            <tr>
              <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
                <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
              </td>
            </tr>
            <!-- Body Content -->
            <tr>
              <td style="padding: 30px 25px; background-color: #ffffff;">
                <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Barcodes Sync Report (Test Email)</h2>
                <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                  This is a manually triggered test email showing the consolidated summary of package barcodes synced yesterday (<strong>${dateString}</strong>) that contain <strong>Lodgement</strong> or <strong>Pickup</strong> scans.
                </p>
                
                <div style="margin-bottom: 25px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #095c7b; border-radius: 4px;">
                  <p style="margin: 0; font-size: 13px; color: #475569; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                    Total Synced Packages with Lodgement/Pickup: <strong style="color: #095c7b; font-size: 15px;">${filteredPackages.length}</strong>
                  </p>
                </div>
  
                <!-- Report 1: Unique count based on delivery speed -->
                <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Unique Packages by Delivery Speed</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                  <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                      <th align="left" style="padding: 8px 12px; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Delivery Speed</th>
                      <th align="right" style="padding: 8px 12px; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Package Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${speedRowsHtml}
                  </tbody>
                </table>
  
                <!-- Report 2: Unique count per customer / franchisee / delivery speed -->
                <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Detailed Breakdown</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Franchisee</th>
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Customer</th>
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Speed</th>
                      <th align="right" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${groupRowsHtml}
                  </tbody>
                </table>
              </td>
            </tr>
            <!-- Standardized Legal Brand Footer -->
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

    // Dispatch email
    const toStr = recipients.join(", ");
    let fromAddress = 'ankith.ravindran@mailplus.com.au';
    try {
      const configDoc = await db.collection('settings').doc('daily_barcodes_report').get();
      if (configDoc.exists) {
        fromAddress = configDoc.data()?.fromAddress || fromAddress;
      }
    } catch (dbErr) {
      console.warn('Failed to load daily_barcodes_report settings:', dbErr);
    }

    const result = await sendPhysicalEmail({
      to: toStr,
      subject: `Daily Barcodes Report (Test) - ${dateString}`,
      html: emailHtml,
      customFrom: fromAddress
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to transmit email' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Daily report successfully generated and sent to ${toStr}. ${result.simulated ? '(Simulated Mode)' : ''}`,
      totalPackages: filteredPackages.length,
      speedReport,
      groupReport
    });

  } catch (error: any) {
    console.error('Error generating daily barcode test report:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate test report' }, { status: 500 });
  }
}
