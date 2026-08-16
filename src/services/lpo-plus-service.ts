import { adminDb } from '@/services/firebase-server';

export interface LpoPlusProvisionPayload {
  netsuiteId: string;
  lpoName: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  address1?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: string | number;
  longitude?: string | number;
  ampoRate?: number | string;
  pmpoRate?: number | string;
  packageRate?: number | string;
  additionalBagRate?: number | string;
  territorySuburbs?: any[];
}

/**
 * Provisions an LPO.Plus account in Firestore and sends the Welcome to LPO.PLUS onboarding email.
 * Derived from NetSuite script mp_ss2.0_sync_lpo_to_firebase.js.
 */
export async function provisionLpoPlusAccount(payload: LpoPlusProvisionPayload): Promise<{ success: boolean; message: string }> {
  try {
    const {
      netsuiteId,
      lpoName,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      address1 = '',
      street = '',
      city = '',
      state = '',
      zip = '',
      latitude = '',
      longitude = '',
      ampoRate = '0',
      pmpoRate = '0',
      packageRate = '0',
      additionalBagRate = '0',
      territorySuburbs = []
    } = payload;

    if (!netsuiteId || !contactEmail) {
      return { success: false, message: 'netsuiteId and contactEmail are required for LPO.Plus provisioning.' };
    }

    console.log(`[LPO.Plus Provisioning] Provisioning account for LPO #${netsuiteId} (${lpoName}) for contact ${contactEmail}...`);

    // 1. Create or Update User Document in 'users' collection
    const userDocId = `lpo-user-${netsuiteId}`;
    await adminDb.collection('users').doc(userDocId).set({
      first_name: contactFirstName || 'LPO',
      last_name: contactLastName || 'Contact',
      email: contactEmail,
      phone: contactPhone || '',
      lpo_id: String(netsuiteId),
      role: 'admin',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Create or Update LPO Document in 'lpo' collection
    await adminDb.collection('lpo').doc(String(netsuiteId)).set({
      lpo_id: String(netsuiteId),
      name: lpoName,
      address1: address1,
      street: street,
      city: city,
      Location: city,
      state: state,
      zip: zip,
      latitude: String(latitude || ''),
      longitude: String(longitude || ''),
      franchiseeTerritoryJSON: territorySuburbs,
      lpoServiceAMPORate: String(ampoRate),
      lpoServicePMPORate: String(pmpoRate),
      lpoServiceAMPOPMPORate: String(packageRate),
      lpoServiceAdditionalLPOBagRate: String(additionalBagRate),
      provisionedAt: new Date().toISOString()
    }, { merge: true });

    // 3. Send "Welcome to LPO.PLUS" Email
    const year = new Date().getFullYear();
    const emailToLPOSubject = "Welcome to LPO.PLUS";
    const emailToLPOBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    .email-container { font-family: 'Fraunces', serif, sans-serif; max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05); border:1px solid #f0f0f0; }
    .header { background-color:#095c7b; padding:40px 20px; text-align:center; }
    .header h1 { color:#ffffff; margin:0; font-size:24px; font-weight:300; letter-spacing:1px; }
    .header span { color:#EAF044; font-weight:bold; }
    .content { padding:40px 30px; color:#333333; line-height:1.6; }
    .greeting { font-size:18px; margin-bottom:20px; color:#095c7b; font-weight:bold; }
    .instruction-box { background-color:#f8fafb; border-radius:8px; padding:25px; margin:30px 0; border-left:4px solid #EAF044; }
    .button-container { text-align:center; margin:40px 0; }
    .btn-primary { background-color:#095c7b; color:#ffffff; padding:16px 32px; text-decoration:none; font-weight:bold; border-radius:8px; display:inline-block; text-transform:uppercase; }
    .footer { background-color:#f4f7f8; padding:30px; text-align:center; font-size:12px; color:#999; }
    .footer p { margin:5px 0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header"><h1>lpo<span>.plus</span></h1></div>
    <div class="content">
      <div class="greeting">Welcome to lpo.<i>plus</i></div>
      <p>Hello ${contactFirstName || 'LPO Partner'},</p>
      <p>Your access to the <b>lpo.<i>plus</i></b> logistics management suite has been successfully provisioned. You can now manage your manifests, job requests, and client communications all in one place.</p>
      <div class="instruction-box">
        <p style="margin-top:0;color:#095c7b;font-weight:600;">First-Time Login Instructions:</p>
        <p>To ensure your account is secure, please follow these steps for your initial sign-in:</p>
        <ol style="padding-left:20px;">
          <li>Click the <strong>Sign In</strong> button below.</li>
          <li>On the login screen, click the <strong>"Forgot Password"</strong> link.</li>
          <li>Enter your email address (<code>${contactEmail}</code>) to receive a secure password reset link.</li>
          <li>Follow the prompts to set your new permanent password.</li>
        </ol>
      </div>
      <div class="button-container">
        <a href="https://lpo.plus/signin" class="btn-primary">Sign In to LPO.PLUS</a>
      </div>
      <p>If you have any trouble accessing your account, please contact Kerry O'Neill for assistance.</p>
      <div class="footer">
        <p><strong>lpo.plus</strong> | Local logistics, made simple.</p>
        <p>Powered by MailPlus Australia</p>
        <p style="margin-top:15px;">&copy; ${year} lpo.plus. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const emailPayload = {
      to: contactEmail,
      cc: ["michael.mcdaid@mailplus.com.au", "kerry.oneill@mailplus.com.au"],
      subject: emailToLPOSubject,
      html: emailToLPOBody
    };

    try {
      const emailRes = await fetch("https://sendemailfromnetsuite-65tt2ndmpq-uc.a.run.app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "f7d8c2e1b0a943ef8215d6c7b8a90123fe456789abcd0123456789abcdef0123"
        },
        body: JSON.stringify(emailPayload)
      });
      if (emailRes.ok) {
        console.log(`[LPO.Plus Provisioning] Welcome email successfully dispatched to ${contactEmail}`);
      } else {
        console.warn(`[LPO.Plus Provisioning] Welcome email status ${emailRes.status}`);
      }
    } catch (emailErr) {
      console.error("[LPO.Plus Provisioning Error] Failed to send welcome email:", emailErr);
    }

    return {
      success: true,
      message: `LPO.Plus account provisioned for LPO #${netsuiteId}.`
    };
  } catch (error: any) {
    console.error("[LPO.Plus Provisioning Error] Exception:", error);
    return {
      success: false,
      message: error.message || 'Failed to provision LPO.Plus account.'
    };
  }
}
