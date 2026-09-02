import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/services/firebase-server';
import { disableLpoPlusAccount } from '@/services/lpo-plus-service';

export async function POST(request: NextRequest) {
  try {
    const { lpoLeadId, lossReason, updatedBy } = await request.json();

    if (!lpoLeadId) {
      return NextResponse.json({ success: false, error: 'lpoLeadId is required' }, { status: 400 });
    }

    // 1. Fetch lpo_leads document
    const lpoDocRef = adminDb.collection('lpo_leads').doc(lpoLeadId);
    const lpoSnap = await lpoDocRef.get();
    if (!lpoSnap.exists) {
      return NextResponse.json({ success: false, error: 'LPO lead not found' }, { status: 404 });
    }

    const lpoData = lpoSnap.data() || {};
    const lpoName = lpoData.lpoName || lpoData.companyName || 'LPO Lead';
    const contactName = lpoData.contactFirstName 
      ? `${lpoData.contactFirstName} ${lpoData.contactLastName || ''}`.trim() 
      : (lpoData.customerName || lpoData.contactName || 'N/A');
    const contactEmail = lpoData.contactEmail || lpoData.email || lpoData.customerEmail || '';
    const netSuiteId = lpoData.netsuiteId || lpoData.lpoId || lpoData.createdParentLeadId || lpoLeadId;

    // Update lpo_leads status to 'Lost'
    await lpoDocRef.update({
      status: 'Lost',
      lpoPlusStatus: 'Disabled',
      lossReason: lossReason || 'Marked as Lost in LPO Leads module',
      updatedAt: new Date().toISOString()
    });

    // Add activity log to lpo_leads
    await lpoDocRef.collection('activity').add({
      type: 'StatusChange',
      notes: `Status updated to "Lost"${lossReason ? `: ${lossReason}` : ''}`,
      author: updatedBy || 'System User',
      createdAt: new Date().toISOString()
    });

    // 2. Identify primary target lead / company in ProspectPlus CRM
    const targetLeadId = lpoData.linkedLeadId || lpoData.createdParentLeadId || lpoData.parentLeadId;
    const leadIdsToUpdate = new Set<string>();
    if (targetLeadId) leadIdsToUpdate.add(targetLeadId);

    const qLpoLeadsMatch = await adminDb.collection('leads').where('linkedLpoLeadId', '==', lpoLeadId).get();
    qLpoLeadsMatch.docs.forEach(d => leadIdsToUpdate.add(d.id));

    const qLpoCompMatch = await adminDb.collection('companies').where('linkedLpoLeadId', '==', lpoLeadId).get();
    qLpoCompMatch.docs.forEach(d => leadIdsToUpdate.add(d.id));

    // Update all matching lead and company documents to 'Lost'
    const nowIso = new Date().toISOString();
    const authorName = updatedBy || 'System User';

    for (const leadId of Array.from(leadIdsToUpdate)) {
      // Check leads collection
      const leadRef = adminDb.collection('leads').doc(leadId);
      const leadSnap = await leadRef.get();
      if (leadSnap.exists) {
        await leadRef.update({
          status: 'Lost',
          customerStatus: 'Lost',
          scfStatus: 'Cancelled',
          lpoPlusStatus: 'Disabled',
          updatedAt: nowIso
        });
        await leadRef.collection('activity').add({
          type: 'Update',
          notes: `Status updated to Lost (LPO Lead "${lpoName}" was marked as Lost).`,
          author: authorName,
          date: nowIso
        });
      }

      // Check companies collection
      const compRef = adminDb.collection('companies').doc(leadId);
      const compSnap = await compRef.get();
      if (compSnap.exists) {
        await compRef.update({
          status: 'Lost Customer',
          customerStatus: 'Lost Customer',
          lpoPlusStatus: 'Disabled',
          updatedAt: nowIso
        });
        await compRef.collection('activity').add({
          type: 'Update',
          notes: `Status updated to Lost (LPO Lead "${lpoName}" was marked as Lost).`,
          author: authorName,
          date: nowIso
        });
      }
    }

    // 3. Disable LPO.Plus account in lpoconnect DB
    if (netSuiteId || targetLeadId || contactEmail) {
      await disableLpoPlusAccount(netSuiteId || targetLeadId || lpoLeadId, contactEmail);
    }

    // 4. Send Email Notification to fiona.harrison@mailplus.com.au (CC: michael.mcdaid@mailplus.com.au)
    const dateTimeStr = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
    const emailSubject = `LPO Lead Marked as Lost - ${lpoName}`;

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f8; padding: 20px 0;">
    <tr>
      <td align="center">
        <table align="center" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; color: #2d3748; line-height: 1.6; font-size: 14px;">
              <h2 style="margin: 0 0 16px; color: #c53030; font-size: 20px; font-weight: 700;">
                Notice: LPO Lead Marked as Lost
              </h2>
              <p style="margin: 0 0 16px; font-size: 14px; color: #4a5568;">
                The LPO lead detailed below has been updated to <strong>Lost</strong> status in ProspectPlus CRM. All linked parent/child lead records have also been marked as Lost, and any active LPO.Plus account access has been disabled.
              </p>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td>
                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="140" style="font-weight: 700; color: #742a2a; font-size: 13px;">LPO Name:</td>
                        <td style="color: #2d3748; font-weight: 600; font-size: 13px;">${lpoName}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 700; color: #742a2a; font-size: 13px;">LPO Lead ID:</td>
                        <td style="color: #2d3748; font-size: 13px;">${lpoLeadId}</td>
                      </tr>
                      ${netSuiteId ? `
                      <tr>
                        <td style="font-weight: 700; color: #742a2a; font-size: 13px;">NetSuite ID:</td>
                        <td style="color: #2d3748; font-size: 13px;">${netSuiteId}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="font-weight: 700; color: #742a2a; font-size: 13px;">Contact Name:</td>
                        <td style="color: #2d3748; font-size: 13px;">${contactName || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 700; color: #742a2a; font-size: 13px;">Contact Email:</td>
                        <td style="color: #2d3748; font-size: 13px;">${contactEmail || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 700; color: #742a2a; font-size: 13px;">Marked Lost By:</td>
                        <td style="color: #2d3748; font-size: 13px;">${authorName}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 700; color: #742a2a; font-size: 13px;">Date &amp; Time:</td>
                        <td style="color: #2d3748; font-size: 13px;">${dateTimeStr} (Sydney Time)</td>
                      </tr>
                      ${lossReason ? `
                      <tr>
                        <td style="font-weight: 700; color: #742a2a; font-size: 13px;">Loss Reason / Notes:</td>
                        <td style="color: #c53030; font-weight: 600; font-size: 13px;">${lossReason}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; font-size: 12px; color: #718096;">
                This is an automated notification from MailPlus Outbound Leads CRM.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await fetch("https://sendemailfromnetsuite-65tt2ndmpq-uc.a.run.app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "f7d8c2e1b0a943ef8215d6c7b8a90123fe456789abcd0123456789abcdef0123"
        },
        body: JSON.stringify({
          to: "fiona.harrison@mailplus.com.au",
          cc: ["michael.mcdaid@mailplus.com.au"],
          subject: emailSubject,
          html: emailHtml
        })
      });
      console.log(`[LPO Lead Lost Email] Dispatched to fiona.harrison@mailplus.com.au and michael.mcdaid@mailplus.com.au`);
    } catch (emailErr) {
      console.error(`[LPO Lead Lost Email Error]`, emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `LPO Lead marked as Lost. Updated ${leadIdsToUpdate.size} linked lead/company record(s). Disabled LPO.Plus access & sent email notification to Fiona & Michael.`
    });

  } catch (error: any) {
    console.error('[API /api/lpo-leads/mark-lost Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process LPO lead loss' },
      { status: 500 }
    );
  }
}
