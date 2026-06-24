import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const db = getFirestore(adminApp);
    
    // 1. Determine "yesterday" in AET
    const timezone = 'Australia/Sydney';
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const formatter = new Intl.DateTimeFormat('en-AU', { 
      timeZone: timezone, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    
    const expectedYesterdayStr = formatter.format(yesterday); // "DD/MM/YYYY"

    // 2. Fetch packages (since we can't easily query nested arrays in Firestore)
    const packagesSnap = await db.collection('packages').get();
    
    // 3. Fetch partner locations for depot names
    const partnerLocationsSnap = await db.collection('partner_locations').get();
    const partnerLocationMap: Record<string, string> = {};
    partnerLocationsSnap.forEach(doc => {
      const data = doc.data();
      if (data.internalId || doc.id) {
        partnerLocationMap[String(data.internalId || doc.id)] = data.name || 'Unknown Location';
      }
    });

    // 4. Process packages to find those lodged yesterday
    const depotCounts: Record<string, Set<string>> = {};

    packagesSnap.forEach(doc => {
      const pkg = doc.data();
      const code = pkg.code;
      if (!code || !pkg.scans || !Array.isArray(pkg.scans) || pkg.scans.length === 0) return;

      // Get the latest scan
      const latestScan = pkg.scans.reduce((latest: any, current: any) => {
        return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
      }, pkg.scans[0]);

      if (latestScan.depot_id && latestScan.updated_at) {
        const scanDate = new Date(latestScan.updated_at);
        const scanDateStr = formatter.format(scanDate);
        
        if (scanDateStr === expectedYesterdayStr) {
          const depotId = String(latestScan.depot_id);
          if (!depotCounts[depotId]) {
            depotCounts[depotId] = new Set();
          }
          depotCounts[depotId].add(code);
        }
      }
    });

    // 5. Filter depots with > 100 barcodes and prepare email data
    const emailRows: string[] = [];
    let hasAlerts = false;

    for (const [depotId, barcodes] of Object.entries(depotCounts)) {
      if (barcodes.size > 100) {
        hasAlerts = true;
        const depotName = partnerLocationMap[depotId] || `Depot ${depotId}`;
        emailRows.push(`
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 500;">${depotName} (${depotId})</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4f46e5; font-weight: 600;">${barcodes.size}</td>
          </tr>
        `);
      }
    }

    if (hasAlerts) {
      const emailHtml = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">High Lodgement Alert</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">Depot Lodgement Summary for ${expectedYesterdayStr}</p>
          </div>
          <div style="padding: 32px 24px; background-color: #ffffff;">
            <p style="color: #334155; font-size: 16px; line-height: 1.5; margin-top: 0;">Hello Team,</p>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">The following depots have exceeded 100 lodged barcodes for the previous day:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Depot Name</th>
                  <th style="text-align: left; padding: 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Lodged Barcodes</th>
                </tr>
              </thead>
              <tbody>
                ${emailRows.join('')}
              </tbody>
            </table>
            
            <div style="margin-top: 32px; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px;">
              <p style="color: #166534; font-size: 14px; margin: 0;">
                <strong>Action Required:</strong> Please ensure resources are properly allocated to manage these high volumes.
              </p>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Automated message from MailPlus Outbound CRM</p>
          </div>
        </div>
      `;

      await sendPhysicalEmail({
        to: 'michael.mcdaid@mailplus.com.au, dispatcher@mailplus.com.au, ankith.ravindran@mailplus.com.au',
        subject: `High Depot Lodgement Alert - ${expectedYesterdayStr}`,
        html: emailHtml,
        customFrom: 'ankith.ravindran@mailplus.com.au'
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: hasAlerts ? 'Alerts sent' : 'No depots exceeded 100 lodgements',
      dateAnalyzed: expectedYesterdayStr
    });

  } catch (error: any) {
    console.error('Error in depot lodgements job:', error);
    return NextResponse.json({ error: 'Failed to process lodgements' }, { status: 500 });
  }
}
