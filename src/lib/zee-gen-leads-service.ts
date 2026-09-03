import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export interface ZeeGenAutoResponseOptions {
  testEmail?: string;
  targetDate?: string; // YYYY-MM-DD or DD-MM-YYYY
  fromAddress?: string;
}

export interface FranchiseeAutoResponseResult {
  franchisee: string;
  leadCount: number;
  recipientEmail: string;
  sent: boolean;
  simulated?: boolean;
  error?: string;
}

export interface ProcessZeeGenAutoResponseResponse {
  success: boolean;
  targetDate: string;
  templateFound: boolean;
  totalFranchiseesWithLeads: number;
  totalLeadsProcessed: number;
  results: FranchiseeAutoResponseResult[];
  error?: string;
}

const DEFAULT_ZEE_GEN_TEMPLATE_BODY = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MailPlus - Zee Gen Leads Auto Response</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 8px !important;
      }
      .content-cell {
        padding: 30px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; -webkit-text-size-adjust: 100%;">

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tbody><tr>
      <td align="center">
        <!-- Inner container table -->
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">

          <!-- 1. Body Text & Content Row -->
          <tbody><tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word; font-family: 'Inter', system-ui, -apple-system, sans-serif;">

              <!-- [START OF EMAIL COPY] -->
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi {{Franchisee.Name}},
              </div>

              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Thank you for entering your own leads into ProspectPlus. We appreciate the time you have put into finding new business in your territory, and we want to make sure you know exactly what happens next.
              </p>

              <p style="margin: 24px 0 12px; font-size: 16px; color: #095c7b; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.4;">
                📋 What happens to your leads
              </p>

              <p style="margin: 0 0 4px; font-size: 15px; color: #2d3748; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                📨 Leads you have not spoken to, or only left a brochure with
              </p>
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                These go into our next monthly batch of leads as a priority for enrichment. At the start of every month we send our leads to our third party partner, J2, who research each business and add the details we need to make successful contact, such as a decision maker's name, phone number and email address. Once enriched, your leads go to the front of the calling queue for qualification by our team.
              </p>

              <p style="margin: 0 0 4px; font-size: 15px; color: #2d3748; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                🔥 Leads you have spoken to and who are expecting a follow up
              </p>
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                If you confirmed you spoke to someone at the business and they are expecting to hear from us, those leads have gone straight to our account managers.
              </p>

              <p style="margin: 0 0 4px; font-size: 15px; color: #2d3748; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                ⏩ How to skip the enrichment queue
              </p>
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                If you want a lead to go directly to the account managers, you need to have actually spoken to the business and entered the correct contact details. That is what allows the team to pick up the conversation where you left off. Leaving a brochure without speaking to anyone does not make a lead hot.
              </p>

              <p style="margin: 0 0 4px; font-size: 15px; color: #2d3748; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                ⚠️ One important note
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Please only mark a lead as spoken to if you have genuinely had a conversation with them. If a lead is marked as spoken to but the business has no memory of it, the team's first call becomes awkward and the lead is far less likely to convert. It is always better to leave a lead for enrichment than to mark it as spoken to when it has not been.
              </p>

              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                💬 If you have any questions about entering leads or what happens after, just reply to this email and we will help.
              </p>

              <p style="margin: 0 0 6px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Kind regards,
              </p>

              <p style="margin: 0; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Aleyna Harnett<br>
                <strong style="font-weight: 700; color: #2d3748;">Lead Generation Manager</strong>
              </p>
              <!-- [END OF EMAIL COPY] -->

            </td>
          </tr>

          <!-- 2. Relocated Navy Banner containing MailPlus Brand Logo Image -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;">
            </td>
          </tr>

          <!-- 3. Legal and Brand Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved. <br>
                If you no longer wish to receive marketing communications, you can&nbsp;
                <a href="{{unsubscribe_link}}" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
              </p>
            </td>
          </tr>

        </tbody></table>
      </td>
    </tr>
  </tbody></table>

</body>
</html>`;

export async function processZeeGenAutoResponse(options: ZeeGenAutoResponseOptions = {}): Promise<ProcessZeeGenAutoResponseResponse> {
  const db = getFirestore(adminApp);

  // 1. Identify Franchisee users from `users` collection
  const usersSnap = await db.collection("users").get();
  const franchiseeUserIds = new Set<string>();
  const franchiseeUserEmails = new Set<string>();
  const franchiseeUserNames = new Set<string>();
  const userMapByEmail = new Map<string, any>();
  const userMapByUid = new Map<string, any>();

  usersSnap.docs.forEach(doc => {
    const u = doc.data() || {};
    userMapByUid.set(doc.id, u);
    if (u.email) {
      userMapByEmail.set(String(u.email).toLowerCase().trim(), u);
    }

    const role = (u.activeRole || u.role || '').toLowerCase().trim();
    const assignedRoles = (u.assignedRoles || []).map((r: any) => String(r).toLowerCase().trim());
    const isFranchisee = role === 'franchisee' || assignedRoles.includes('franchisee');

    if (isFranchisee) {
      franchiseeUserIds.add(doc.id);
      if (u.email) franchiseeUserEmails.add(String(u.email).toLowerCase().trim());
      const dName = u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim();
      if (dName) franchiseeUserNames.add(String(dName).toLowerCase().trim());
    }
  });

  // 2. Format Target Date (AEST / Sydney timezone for yesterday if not provided)
  const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  let dateString: string; // DD-MM-YYYY
  let d: number, m: number, y: number;

  if (options.targetDate) {
    if (options.targetDate.includes('-')) {
      const parts = options.targetDate.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        y = Number(parts[0]);
        m = Number(parts[1]);
        d = Number(parts[2]);
      } else {
        // DD-MM-YYYY
        d = Number(parts[0]);
        m = Number(parts[1]);
        y = Number(parts[2]);
      }
    } else if (options.targetDate.includes('/')) {
      const parts = options.targetDate.split('/');
      d = Number(parts[0]);
      m = Number(parts[1]);
      y = Number(parts[2]);
    } else {
      throw new Error(`Invalid targetDate format: ${options.targetDate}`);
    }
    dateString = `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
  } else {
    const now = new Date();
    now.setDate(now.getDate() - 1); // Yesterday
    const parts = sydneyFormatter.formatToParts(now);
    const dayVal = parts.find(p => p.type === 'day')?.value || '01';
    const monthVal = parts.find(p => p.type === 'month')?.value || '01';
    const yearVal = parts.find(p => p.type === 'year')?.value || '2026';
    dateString = `${dayVal}-${monthVal}-${yearVal}`;
    d = Number(dayVal);
    m = Number(monthVal);
    y = Number(yearVal);
  }

  const targetStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const targetEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
  const dateCreatedString = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // 3. Query leads created yesterday
  const q1 = await db.collection("leads").where("dateCreated", "==", dateCreatedString).get();
  const q2 = await db.collection("leads").where("createdAt", ">=", threeDaysAgo.toISOString()).get();
  const q3 = await db.collection("leads").where("createdAt", ">=", Timestamp.fromDate(threeDaysAgo)).get();
  const q4 = await db.collection("leads").where("isZeeCreated", "==", true).get();

  const allLeadsMap = new Map<string, any>();
  q1.docs.forEach(doc => allLeadsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  q2.docs.forEach(doc => allLeadsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  q3.docs.forEach(doc => allLeadsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  q4.docs.forEach(doc => allLeadsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  const allLeads = Array.from(allLeadsMap.values());

  // Filter for date & franchisee criteria
  const filteredLeads = allLeads.filter(lead => {
    let isDateMatch = false;
    if (lead.dateCreated === dateCreatedString) {
      isDateMatch = true;
    } else if (lead.createdAt) {
      let createdDate: Date;
      if (typeof lead.createdAt.toDate === "function") {
        createdDate = lead.createdAt.toDate();
      } else {
        createdDate = new Date(lead.createdAt);
      }
      if (createdDate >= targetStart && createdDate <= targetEnd) {
        isDateMatch = true;
      }
    } else if (lead.dateLeadEntered) {
      if (lead.dateLeadEntered.includes("/")) {
        const [ld, lm, ly] = lead.dateLeadEntered.split("/");
        if (ld && lm && ly) {
          const enteredDate = new Date(Number(ly), Number(lm) - 1, Number(ld));
          if (enteredDate.getDate() === d && (enteredDate.getMonth() + 1) === m && enteredDate.getFullYear() === y) {
            isDateMatch = true;
          }
        }
      } else {
        const enteredDate = new Date(lead.dateLeadEntered);
        if (!isNaN(enteredDate.getTime()) && enteredDate >= targetStart && enteredDate <= targetEnd) {
          isDateMatch = true;
        }
      }
    }

    if (!isDateMatch) return false;

    if (lead.isZeeCreated === true) return true;

    const createdByRole = String(lead.createdByRole || lead.creatorRole || '').toLowerCase().trim();
    if (createdByRole === 'franchisee') return true;

    const sourceVal = String(lead.source || lead.leadSource || lead.customerSource || '').toLowerCase();
    if (sourceVal.includes('franchisee') || lead.leadSource === '-4') return true;

    const uid = String(lead.createdByUid || '').trim();
    if (uid && franchiseeUserIds.has(uid)) return true;

    const email = String(lead.createdByEmail || lead.creatorEmail || '').toLowerCase().trim();
    if (email && franchiseeUserEmails.has(email)) return true;

    const creatorName = String(lead.createdBy || lead.createdByName || lead.author || lead.creator || '').toLowerCase().trim();
    if (creatorName && (franchiseeUserNames.has(creatorName) || franchiseeUserEmails.has(creatorName))) return true;

    return false;
  });

  // Group leads by Franchisee
  const franchiseeGroups = new Map<string, any[]>();
  filteredLeads.forEach(lead => {
    const franName = (lead.franchisee || lead.franchiseeName || "Unassigned Franchisee").trim();
    if (!franchiseeGroups.has(franName)) {
      franchiseeGroups.set(franName, []);
    }
    franchiseeGroups.get(franName)!.push(lead);
  });

  // 4. Retrieve exact email template "Zee Gen Leads - Auto Response" from marketing_templates
  const templateSnap = await db.collection('marketing_templates')
    .where('name', '==', 'Zee Gen Leads - Auto Response')
    .limit(1)
    .get();

  let rawSubject = "Thanks for adding your leads to ProspectPlus";
  let rawBody = DEFAULT_ZEE_GEN_TEMPLATE_BODY;
  let templateFound = false;

  if (!templateSnap.empty) {
    const templateDoc = templateSnap.docs[0].data();
    templateFound = true;
    if (templateDoc.subject) rawSubject = templateDoc.subject;
    if (templateDoc.body) rawBody = templateDoc.body;
  }

  // 5. Pre-fetch Franchisees collection mapping for recipient emails
  const franchiseesSnap = await db.collection('franchisees').get();
  const franchiseeEmailMap = new Map<string, string>();

  franchiseesSnap.docs.forEach(doc => {
    const data = doc.data() || {};
    const nameKey = String(data.name || '').toLowerCase().trim();
    const email = data.email || data.mainContactEmail || data.contactEmail || '';
    if (nameKey && email) {
      franchiseeEmailMap.set(nameKey, String(email).trim());
    }
    if (doc.id && email) {
      franchiseeEmailMap.set(doc.id.toLowerCase().trim(), String(email).trim());
    }
  });

  const results: FranchiseeAutoResponseResult[] = [];

  // 6. Process each Franchisee group
  for (const [franchiseeName, leads] of franchiseeGroups.entries()) {
    // Determine recipient email
    let recipientEmail = '';

    if (options.testEmail) {
      recipientEmail = options.testEmail.trim();
    } else {
      // Production email resolution for franchisee
      const fNameLower = franchiseeName.toLowerCase().trim();
      recipientEmail = franchiseeEmailMap.get(fNameLower) || '';

      if (!recipientEmail) {
        // Search in users collection for franchisee user matching name or linked franchisee
        for (const [_, u] of userMapByUid.entries()) {
          const userFran = String(u.franchiseeName || u.franchisee || '').toLowerCase().trim();
          if (userFran === fNameLower && u.email) {
            recipientEmail = String(u.email).trim();
            break;
          }
        }
      }

      if (!recipientEmail && leads.length > 0) {
        // Fallback to creator email of the first lead
        const firstLead = leads[0];
        recipientEmail = firstLead.createdByEmail || firstLead.creatorEmail || '';
      }
    }

    if (!recipientEmail) {
      results.push({
        franchisee: franchiseeName,
        leadCount: leads.length,
        recipientEmail: '',
        sent: false,
        error: 'No valid recipient email address found for franchisee',
      });
      continue;
    }

    // Replace placeholders in exact Subject and Body
    let finalSubject = rawSubject
      .replace(/\{\{Franchisee\.Name\}\}/g, franchiseeName)
      .replace(/\{\{franchisee_name\}\}/gi, franchiseeName)
      .replace(/\{\{franchisee\}\}/gi, franchiseeName);

    let finalBody = rawBody
      .replace(/\{\{Franchisee\.Name\}\}/g, franchiseeName)
      .replace(/\{\{franchisee_name\}\}/gi, franchiseeName)
      .replace(/\{\{franchisee\}\}/gi, franchiseeName)
      .replace(/\{\{unsubscribe_link\}\}/g, '#');

    // If testing mode and sending multiple franchisee emails to the same test address, clear distinction in subject
    if (options.testEmail && franchiseeGroups.size > 1) {
      finalSubject = `${rawSubject} (Test - ${franchiseeName})`;
    }

    try {
      const sendResult = await sendPhysicalEmail({
        to: recipientEmail,
        subject: finalSubject,
        html: finalBody,
        customFrom: options.fromAddress || 'ankith.ravindran@mailplus.com.au',
      });

      results.push({
        franchisee: franchiseeName,
        leadCount: leads.length,
        recipientEmail,
        sent: sendResult.success,
        simulated: sendResult.simulated,
        error: sendResult.error,
      });
    } catch (err: any) {
      results.push({
        franchisee: franchiseeName,
        leadCount: leads.length,
        recipientEmail,
        sent: false,
        error: err?.message || 'Failed to dispatch email',
      });
    }
  }

  return {
    success: true,
    targetDate: dateString,
    templateFound,
    totalFranchiseesWithLeads: franchiseeGroups.size,
    totalLeadsProcessed: filteredLeads.length,
    results,
  };
}
