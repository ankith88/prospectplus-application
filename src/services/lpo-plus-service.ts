import { Firestore as GoogleFirestore } from '@google-cloud/firestore';

export interface LpoPlusProvisionPayload {
  netsuiteId: string;
  lpoName: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  defaultPassword?: string;
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

// Dedicated Firestore instance targeting project mp-lpo-connect, database lpoconnect
function getLpoConnectDb() {
  return new GoogleFirestore({
    projectId: 'mp-lpo-connect',
    databaseId: 'lpoconnect',
  });
}

/**
 * Provisions an LPO.Plus account in Firebase Auth and lpoconnect Firestore database.
 * Derived from NetSuite script mp_ss2.0_sync_lpo_to_firebase.js.
 */
export async function provisionLpoPlusAccount(payload: LpoPlusProvisionPayload): Promise<{ success: boolean; authId?: string; message: string }> {
  try {
    const lpoConnectDb = getLpoConnectDb();
    const {
      netsuiteId,
      lpoName,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      defaultPassword = 'MailPlus2026!',
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

    // 1. Create Authenticated User in Firebase Auth via Identity Toolkit API
    let authID = '';
    try {
      const authResponse = await fetch(
        "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyDklo95QYbj4PGZeKAqRBBzCfFKc9CFoXs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: contactEmail,
            password: defaultPassword,
            returnSecureToken: true
          })
        }
      );

      const authData = await authResponse.json();

      if (authResponse.ok && authData.localId) {
        authID = authData.localId;
        console.log(`[LPO.Plus Auth] Successfully created Authenticated User UID: ${authID}`);
      } else if (authData?.error?.message === 'EMAIL_EXISTS') {
        console.warn(`[LPO.Plus Auth] User with email ${contactEmail} already exists. Searching existing user document...`);
        const userSnap = await lpoConnectDb.collection('users').where('email', '==', contactEmail).limit(1).get();
        if (!userSnap.empty) {
          authID = userSnap.docs[0].id;
        } else {
          // Fallback deterministic document ID if auth exists but user doc missing
          authID = `user-${netsuiteId}`;
        }
      } else {
        console.error(`[LPO.Plus Auth Error] ${JSON.stringify(authData)}`);
        authID = `user-${netsuiteId}`;
      }
    } catch (authErr) {
      console.error("[LPO.Plus Auth Exception]", authErr);
      authID = `user-${netsuiteId}`;
    }

    // 2. Create or Update User Document in 'users' collection of lpoconnect DB (Doc ID = authID)
    await lpoConnectDb.collection('users').doc(authID).set({
      first_name: contactFirstName || 'LPO',
      last_name: contactLastName || 'Contact',
      email: contactEmail,
      phone: contactPhone || '',
      lpo_id: String(netsuiteId),
      role: 'admin',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`[LPO.Plus Firestore] Created/updated 'users' document ID: ${authID}`);

    // 3. Formulate territory suburb strings format ("Suburb, STATE Postcode")
    const formattedTerritory: string[] = territorySuburbs.map((sub: any) => {
      if (typeof sub === 'string') return sub;
      const subName = sub.suburbs || sub.suburb || sub.name || '';
      const subState = sub.state || '';
      const subPostcode = sub.post_code || sub.postcode || sub.zip || '';
      return `${subName}, ${subState} ${subPostcode}`.trim();
    });

    // Clean company name (split by " - " if present)
    const cleanLpoName = lpoName.split(' - ')[0].trim();

    // 4. Create or Update LPO Document in 'lpo' collection of lpoconnect DB (Doc ID = netsuiteId)
    const lpoData: Record<string, any> = {
      lpo_id: String(netsuiteId),
      name: cleanLpoName,
      address1: address1,
      street: street,
      city: city,
      Location: city,
      state: state,
      zip: zip,
      latitude: String(latitude || ''),
      longitude: String(longitude || ''),
      franchiseeTerritoryJSON: formattedTerritory,
      lpoServiceAMPORate: String(ampoRate),
      lpoServicePMPORate: String(pmpoRate),
      lpoServiceAMPOPMPORate: String(packageRate),
      lpoServiceAdditionalLPOBagRate: String(additionalBagRate),
      provisionedAt: new Date().toISOString()
    };

    await lpoConnectDb.collection('lpo').doc(String(netsuiteId)).set(lpoData, { merge: true });

    console.log(`[LPO.Plus Firestore] Created/updated 'lpo' document ID: ${netsuiteId}`);

    // 5. Send "Welcome to LPO.PLUS" Email with Default Password
    const year = new Date().getFullYear();
    const emailToLPOSubject = "Welcome to LPO.PLUS";
    const emailToLPOBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    .email-container { font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05); border:1px solid #e2e8f0; }
    .header { background-color:#095c7b; padding:35px 20px; text-align:center; }
    .header h1 { color:#ffffff; margin:0; font-size:24px; font-weight:300; letter-spacing:1px; }
    .header span { color:#EAF044; font-weight:bold; }
    .content { padding:35px 30px; color:#2d3748; line-height:1.6; font-size:14px; }
    .greeting { font-size:18px; margin-bottom:16px; color:#095c7b; font-weight:bold; }
    .credentials-box { background-color:#f8fafb; border-radius:8px; padding:20px; margin:24px 0; border:1px solid #e2e8f0; border-left:4px solid #095c7b; }
    .cred-row { margin-bottom:8px; font-size:14px; }
    .cred-label { font-weight:bold; color:#4a5568; display:inline-block; width:140px; }
    .cred-val { color:#095c7b; font-weight:bold; font-family:monospace; background:#eef6ed; padding:2px 8px; border-radius:4px; }
    .instruction-box { background-color:#fffdf0; border-radius:8px; padding:20px; margin:24px 0; border:1px solid #f6e05e; border-left:4px solid #EAF044; }
    .button-container { text-align:center; margin:30px 0; }
    .btn-primary { background-color:#095c7b; color:#ffffff; padding:14px 28px; text-decoration:none; font-weight:bold; border-radius:8px; display:inline-block; text-transform:uppercase; font-size:14px; letter-spacing:0.5px; }
    .footer { background-color:#f8fafb; padding:25px 20px; text-align:center; border-top:1px solid #edf2f7; font-size:12px; color:#718096; }
    .footer p { margin:4px 0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; max-height: 42px; width: auto;" />
      <h1 style="margin-top:10px; color:#ffffff;">lpo<span style="color:#EAF044;">.plus</span></h1>
    </div>
    <div class="content">
      <div class="greeting">Welcome to lpo.<i>plus</i></div>
      <p>Hello ${contactFirstName || 'LPO Partner'},</p>
      <p>Your access to the <b>lpo.<i>plus</i></b> logistics management suite has been successfully provisioned. You can now manage your manifests, job requests, and client communications all in one place.</p>
      
      <div class="credentials-box">
        <p style="margin-top:0; margin-bottom:12px; color:#095c7b; font-weight:bold; font-size:15px;">Your Account Access Credentials:</p>
        <div class="cred-row"><span class="cred-label">Portal Sign In:</span> <a href="https://lpo.plus/signin" style="color:#095c7b; text-decoration:underline;">https://lpo.plus/signin</a></div>
        <div class="cred-row"><span class="cred-label">Username (Email):</span> <span class="cred-val">${contactEmail}</span></div>
        <div class="cred-row" style="margin-bottom:0;"><span class="cred-label">Default Password:</span> <span class="cred-val">${defaultPassword}</span></div>
      </div>

      <div class="instruction-box">
        <p style="margin-top:0; color:#095c7b; font-weight:bold;">First-Time Sign In Instructions:</p>
        <ol style="padding-left:20px; margin-bottom:0;">
          <li>Click the <strong>Sign In to LPO.PLUS</strong> button below.</li>
          <li>Enter your username (<code>${contactEmail}</code>) and default password (<code>${defaultPassword}</code>).</li>
          <li>Alternatively, click <strong>"Forgot Password"</strong> on the sign-in screen to set a custom password.</li>
        </ol>
      </div>

      <div class="button-container">
        <a href="https://lpo.plus/signin" class="btn-primary">Sign In to LPO.PLUS</a>
      </div>

      <p>If you have any questions or require assistance, please contact Kerry O'Neill or the MailPlus support team.</p>
    </div>
    <div class="footer">
      <p><strong style="color:#4a5568;">MailPlus</strong> | Business logistics, made simple.</p>
      <p>Powered by MailPlus Australia</p>
      <p style="margin-top:12px; font-size:11px; color:#a0aec0;">&copy; ${year} LPO.PLUS. All rights reserved.</p>
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
      authId: authID,
      message: `LPO.Plus account provisioned for LPO #${netsuiteId} with Auth ID ${authID}.`
    };
  } catch (error: any) {
    console.error("[LPO.Plus Provisioning Error] Exception:", error);
    return {
      success: false,
      message: error.message || 'Failed to provision LPO.Plus account.'
    };
  }
}

/**
 * Disables an LPO.Plus account in Firebase Auth and lpoconnect Firestore database when marked as Lost.
 */
export async function disableLpoPlusAccount(netsuiteId: string, contactEmail?: string): Promise<{ success: boolean; message: string }> {
  try {
    const lpoConnectDb = getLpoConnectDb();
    if (!netsuiteId && !contactEmail) {
      return { success: false, message: 'netsuiteId or contactEmail required' };
    }

    console.log(`[LPO.Plus Disable] Disabling LPO.Plus account for LPO ID #${netsuiteId} (${contactEmail || 'No email'})...`);

    let userAuthId = '';
    const userQuerySnaps: any[] = [];

    if (contactEmail) {
      const qEmail = await lpoConnectDb.collection('users').where('email', '==', contactEmail).get();
      qEmail.docs.forEach(d => userQuerySnaps.push(d));
    }
    if (netsuiteId) {
      const qLpo = await lpoConnectDb.collection('users').where('lpo_id', '==', String(netsuiteId)).get();
      qLpo.docs.forEach(d => userQuerySnaps.push(d));
      
      try {
        const docDirect = await lpoConnectDb.collection('users').doc(String(netsuiteId)).get();
        if (docDirect.exists) userQuerySnaps.push(docDirect);
      } catch (e) {}
    }

    const updatedUserDocIds = new Set<string>();
    for (const uDoc of userQuerySnaps) {
      if (!updatedUserDocIds.has(uDoc.id)) {
        updatedUserDocIds.add(uDoc.id);
        userAuthId = uDoc.id;
        await lpoConnectDb.collection('users').doc(uDoc.id).set({
          disabled: true,
          status: 'Disabled',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    }

    if (userAuthId && !userAuthId.startsWith('user-')) {
      try {
        await fetch(
          "https://identitytoolkit.googleapis.com/v1/accounts:update?key=AIzaSyDklo95QYbj4PGZeKAqRBBzCfFKc9CFoXs",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              localId: userAuthId,
              disableUser: true
            })
          }
        );
      } catch (e) {
        console.warn(`[LPO.Plus Auth Disable Warning]`, e);
      }
    }

    if (netsuiteId) {
      try {
        await lpoConnectDb.collection('lpo').doc(String(netsuiteId)).set({
          disabled: true,
          status: 'Lost',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {}
    }

    return {
      success: true,
      message: `LPO.Plus account disabled for #${netsuiteId}`
    };
  } catch (error: any) {
    console.error(`[LPO.Plus Disable Error]`, error);
    return {
      success: false,
      message: error.message || 'Failed to disable LPO.Plus account.'
    };
  }
}
