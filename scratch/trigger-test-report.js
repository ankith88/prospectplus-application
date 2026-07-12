const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
// Use global fetch (built-in in Node 18+)

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function runTestReport() {
  const recipients = ["ankith.ravindran@mailplus.com.au"];
  console.log("Starting daily barcode test report dispatch...");

  // Calculate yesterday's date in Sydney time
  const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const now = new Date();
  now.setDate(now.getDate() - 1); // Yesterday

  const parts = sydneyFormatter.formatToParts(now);
  const day = parts.find(p => p.type === 'day')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;

  const dateString = `${day}-${month}-${year}`;
  console.log(`Aggregating for date: ${dateString}`);

  // Fetch all packages synced on this date
  const snapshot = await db.collection("packages")
    .where("sync_date", "==", dateString)
    .get();

  const packages = snapshot.docs.map(doc => doc.data());
  console.log(`Found ${packages.length} raw packages.`);

  const filteredPackages = packages.filter(pkg => {
    return pkg.scans?.some((scan) => {
      const type = scan.scan_type?.toLowerCase() || "";
      return type === "lodgement" || type === "pickup";
    });
  });

  console.log(`Filtered down to ${filteredPackages.length} packages with Lodgement/Pickup scans.`);

  const speedCounts = {};
  const groupCounts = {};

  filteredPackages.forEach(pkg => {
    let speed = "Unknown";
    const targetScan = pkg.scans?.find((s) => {
      const type = s.scan_type?.toLowerCase() || "";
      return (type === "lodgement" || type === "pickup") && s.delivery_speed;
    });

    if (targetScan) {
      speed = targetScan.delivery_speed;
    } else {
      const anySpeed = pkg.scans?.find((s) => s.delivery_speed);
      if (anySpeed) {
        speed = anySpeed.delivery_speed;
      }
    }

    if (speed && typeof speed === "string") {
      speed = speed.trim();
      speed = speed.charAt(0).toUpperCase() + speed.slice(1).toLowerCase();
    } else {
      speed = "Unknown";
    }

    speedCounts[speed] = (speedCounts[speed] || 0) + 1;

    const customer = pkg.customer_name || "Unlinked Customer";
    const franchisee = pkg.franchisee_name || "Unassigned Franchisee";
    const groupKey = `${franchisee}||${customer}||${speed}`;
    groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
  });

  // Calculate total count per customer to sort by highest customer volume
  const customerTotals = {};
  Object.entries(groupCounts).forEach(([key, count]) => {
    const [, customer] = key.split("||");
    customerTotals[customer] = (customerTotals[customer] || 0) + count;
  });

  const speedReport = Object.entries(speedCounts).map(([speed, count]) => ({
    speed,
    count
  })).sort((a, b) => b.count - a.count);

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
              <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Barcodes Sync Report</h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Here is the consolidated daily summary of package barcodes synced yesterday (<strong>${dateString}</strong>) that contain <strong>Lodgement</strong> or <strong>Pickup</strong> scans.
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
          <!-- Footer -->
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

  // Fetch Outlook/SMTP active configuration
  const configSnap = await db.collection('outlook_integrations').doc('active_config').get();
  if (!configSnap.exists) {
    console.log("No outlook configuration found. Defaulting to simulation log.");
    console.log(emailHtml);
    return;
  }

  const config = configSnap.data();
  const { type, senderEmail } = config;
  const finalSender = senderEmail || 'tracking@mailplus.com.au';

  if (type === 'smtp') {
    const { host, port, username, password } = config;
    if (!host || host.includes('example.com') || !password || password === 'invalid' || password === 'test' || password === '') {
      console.log('Simulation Mode: SMTP active, but placeholders used. Email content:');
      console.log(emailHtml);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || '587', 10),
      secure: config.secure === 'ssl',
      auth: {
        user: username || senderEmail,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: `"${config.senderName || 'MailPlus Outbound'}" <${finalSender}>`,
      to: recipients.join(', '),
      subject: `Daily Barcodes Report - ${dateString}`,
      html: emailHtml
    });
    console.log("Email sent successfully via SMTP.");

  } else if (type === 'graph') {
    const { clientId, tenantId, clientSecret } = config;
    if (!clientId || !tenantId || !clientSecret || clientSecret === 'invalid' || clientSecret === 'test' || clientSecret === '') {
      console.log('Simulation Mode: MS Graph active, but placeholders used. Email content:');
      console.log(emailHtml);
      return;
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default'
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${finalSender}/sendMail`;
    const mailPayload = {
      message: {
        subject: `Daily Barcodes Report - ${dateString}`,
        body: {
          contentType: 'HTML',
          content: emailHtml
        },
        toRecipients: recipients.map(e => ({ emailAddress: { address: e } }))
      },
      saveToSentItems: 'true'
    };

    const graphRes = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mailPayload)
    });

    if (graphRes.ok) {
      console.log("Email sent successfully via MS Graph.");
    } else {
      console.error("Failed to send via Graph API:", await graphRes.text());
    }
  } else {
    console.log("Email simulation mode. Email content:");
    console.log(emailHtml);
  }
}

runTestReport().catch(console.error);
