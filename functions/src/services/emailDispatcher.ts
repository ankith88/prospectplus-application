import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import fetch = require('node-fetch');

interface EmailDispatchOptions {
  to: string;
  subject: string;
  html: string;
  customFrom?: string;
  cc?: string;
  bcc?: string;
  leadId?: string;
  prospectPlusId?: string;
}

function extractCleanEmail(toField: string): string {
  const match = toField.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim().toLowerCase();
  }
  return toField.split(',')[0].trim().toLowerCase();
}

function isInternalRecipient(toField: string): boolean {
  if (!toField) return false;
  const parts = toField.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>/);
    const email = match ? match[1].trim().toLowerCase() : part.trim().toLowerCase();
    if (email && !email.endsWith('@mailplus.com.au')) {
      return false;
    }
  }
  return true;
}

export async function sendAutomatedEmail({ to, subject, html, customFrom, cc, bcc, leadId, prospectPlusId }: EmailDispatchOptions): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  try {
    const db = admin.firestore();
    const configSnap = await db.collection('outlook_integrations').doc('active_config').get();
    if (!configSnap.exists) {
      console.warn('[Email Dispatcher] No active config found. Defaulting to simulation mode.');
      return { success: true, simulated: true };
    }

    const config = configSnap.data();
    if (!config) {
      return { success: true, simulated: true };
    }

    const { type, senderEmail } = config;
    
    // Determine the actual active sender to route from
    const finalSender = (customFrom && customFrom.endsWith('@mailplus.com.au')) ? customFrom : (senderEmail || 'tracking@mailplus.com.au');

    // Resolve prospectPlusId
    let finalProspectPlusId = prospectPlusId;
    if (!finalProspectPlusId) {
      try {
        if (leadId) {
          const leadSnap = await db.collection('leads').doc(leadId).get();
          if (leadSnap.exists) {
            finalProspectPlusId = leadSnap.data()?.prospectPlusId;
          }
        } else {
          const cleanEmail = extractCleanEmail(to);
          if (cleanEmail) {
            const contactsSnap = await db.collectionGroup('contacts').where('email', '==', cleanEmail).limit(1).get();
            if (!contactsSnap.empty) {
              const leadRef = contactsSnap.docs[0].ref.parent.parent;
              if (leadRef) {
                const leadSnap = await leadRef.get();
                if (leadSnap.exists) {
                  finalProspectPlusId = leadSnap.data()?.prospectPlusId;
                }
              }
            }
          }
        }
      } catch (lookupErr) {
        console.error('[Email Dispatcher] Error looking up prospectPlusId:', lookupErr);
      }
    }

    let updatedHtml = html;
    if (finalProspectPlusId && !isInternalRecipient(to)) {
      const idBadge = `<div class="prospectplus-id-badge" style="float: right; font-size: 10px; color: #a0aec0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 5px 10px; text-align: right; user-select: all;">ID: ${finalProspectPlusId}</div><div style="clear: both;"></div>`;
      const bodyIndex = html.toLowerCase().indexOf('<body');
      if (bodyIndex !== -1) {
        const bodyTagEnd = html.indexOf('>', bodyIndex);
        if (bodyTagEnd !== -1) {
          updatedHtml = html.slice(0, bodyTagEnd + 1) + '\n' + idBadge + html.slice(bodyTagEnd + 1);
        } else {
          updatedHtml = idBadge + html;
        }
      } else {
        updatedHtml = idBadge + html;
      }
    }

    if (type === 'smtp') {
      const { host, port, username, password } = config;
      if (!host || host.includes('example.com') || !password || password === 'invalid' || password === 'test' || password === '') {
        console.log('[Email Dispatcher] SMTP using mock/placeholder credentials. Running in Simulation mode.');
        return { success: true, simulated: true };
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
        to,
        cc,
        bcc,
        subject,
        html: updatedHtml
      });

      return { success: true, simulated: false };

    } else if (type === 'graph') {
      const { clientId, tenantId, clientSecret } = config;
      if (!clientId || !tenantId || !clientSecret || clientSecret === 'invalid' || clientSecret === 'test' || clientSecret === '') {
        console.log('[Email Dispatcher] MS Graph using mock/placeholder credentials. Running in Simulation mode.');
        return { success: true, simulated: true };
      }

      // Azure AD Auth client credentials flow
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

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Azure AD Auth Failed: ${errText}`);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${finalSender}/sendMail`;
      const mailPayload: any = {
        message: {
          subject,
          body: {
            contentType: 'HTML',
            content: updatedHtml
          },
          toRecipients: to.split(',').map(e => ({ emailAddress: { address: e.trim() } }))
        },
        saveToSentItems: 'true'
      };

      if (cc) {
        mailPayload.message.ccRecipients = cc.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
      }
      if (bcc) {
        mailPayload.message.bccRecipients = bcc.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
      }

      const graphRes = await fetch(sendMailUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mailPayload)
      });

      if (!graphRes.ok) {
        const errText = await graphRes.text();
        throw new Error(`Microsoft Graph API Failed: ${errText}`);
      }

      return { success: true, simulated: false };
    }

    return { success: true, simulated: true };

  } catch (error: any) {
    console.error('[Email Dispatcher] Email Transmission Failed:', error);
    return { success: false, simulated: false, error: error.message || 'Transmission failure.' };
  }
}
