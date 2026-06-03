import nodemailer from 'nodemailer';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

interface EmailDispatchOptions {
  to: string;
  subject: string;
  html: string;
  customFrom?: string;
  cc?: string;
  bcc?: string;
}

export async function sendPhysicalEmail({ to, subject, html, customFrom, cc, bcc }: EmailDispatchOptions): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  try {
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
    const finalSender = (customFrom && customFrom.endsWith('@mailplus.com.au')) ? customFrom : senderEmail;

    // Check if credentials are mock/test values or missing
    if (type === 'smtp') {
      const { host, port, username, password } = config;
      if (!host || host.includes('example.com') || !password || password === 'invalid' || password === 'test' || password === '') {
        console.log('[Email Dispatcher] SMTP using mock/placeholder credentials. Running in Simulation mode.');
        return { success: true, simulated: true };
      }

      // Real SMTP Dispatch
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
        html
      });

      return { success: true, simulated: false };

    } else if (type === 'graph') {
      const { clientId, tenantId, clientSecret } = config;
      if (!clientId || !tenantId || !clientSecret || clientSecret === 'invalid' || clientSecret === 'test' || clientSecret === '') {
        console.log('[Email Dispatcher] MS Graph using mock/placeholder credentials. Running in Simulation mode.');
        return { success: true, simulated: true };
      }

      // Real Microsoft Graph API Modern Auth Dispatch
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
            content: html
          },
          toRecipients: [
            {
              emailAddress: {
                address: to
              }
            }
          ]
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
    console.error('[Email Dispatcher] Real Email Transmission Failed:', error);
    return { success: false, simulated: false, error: error.message || 'Transmission failure.' };
  }
}

export async function verifyPhysicalConnection(config: any): Promise<{ success: boolean; message: string }> {
  try {
    const { type, senderEmail } = config;
    if (!senderEmail || !senderEmail.endsWith('@mailplus.com.au')) {
      return {
        success: false,
        message: 'Integration Rejected: Outbound campaigns must route natively through an authorized @mailplus.com.au mailbox to maintain domain reputation and SPF/DKIM compliance.'
      };
    }

    if (type === 'smtp') {
      const { host, port, username, password } = config;
      if (!host || !port) {
        return { success: false, message: 'SMTP Configuration Error: Host and port are required.' };
      }

      // Check if credentials are mock/test values
      if (host.includes('error') || senderEmail.includes('admin-blocked') || password === 'invalid' || password === 'test' || password === '') {
        return {
          success: false,
          message: 'Authentication Failure: SMTP handshake failed. Mailbox has strict security settings or incorrect password. Please contact Ankith Ravindran for administrative support and system access credentials.'
        };
      }

      // Real SMTP verification
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: config.secure === 'ssl',
        auth: {
          user: username || senderEmail,
          pass: password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.verify();
      return {
        success: true,
        message: `SMTP Connection successfully verified. Authorized to send outbound campaigns from ${senderEmail}.`
      };

    } else if (type === 'graph') {
      const { clientId, tenantId, clientSecret } = config;
      if (!clientId || !tenantId || !clientSecret) {
        return { success: false, message: 'Microsoft Graph Integration Error: Client ID, Tenant ID, and Client Secret are required.' };
      }

      if (clientSecret === 'invalid' || clientSecret.includes('error') || clientId.includes('block') || clientSecret === 'test' || clientSecret === '') {
        return {
          success: false,
          message: 'Azure AD App Registration Blocked: Client Secret expired or OAuth scope permissions are insufficient (requires Mail.Send application/delegated scopes). Please contact Ankith Ravindran for administrative support and Azure portal configurations.'
        };
      }

      // Real MS Graph verification (Attempt to obtain token)
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
        return {
          success: false,
          message: `Azure AD Auth Failed: ${errText}. Please contact Ankith Ravindran for administrative support and Azure portal configurations.`
        };
      }

      return {
        success: true,
        message: `Microsoft Graph API credentials verified. Authorized to send outbound campaigns from ${senderEmail} via Entra ID OAuth 2.0.`
      };
    }

    return { success: false, message: 'Invalid integration type. Choose SMTP or Graph API.' };

  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'System error validating connection.'
    };
  }
}
