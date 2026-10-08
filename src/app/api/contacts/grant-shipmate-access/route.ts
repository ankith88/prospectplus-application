import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      parentId,
      parentType = 'companies',
      contactId,
      customerNsId,
      firstName,
      lastName,
      email,
      phone,
      userName,
      userEmail,
    } = body;

    if (!parentId || !contactId) {
      return NextResponse.json(
        { error: 'Missing required parameters: parentId and contactId are mandatory.' },
        { status: 400 }
      );
    }

    const collectionName = parentType === 'leads' ? 'leads' : 'companies';
    const parentRef = db.collection(collectionName).doc(parentId);
    const contactRef = parentRef.collection('contacts').doc(contactId);

    const [parentSnap, contactSnap] = await Promise.all([
      parentRef.get(),
      contactRef.get(),
    ]);

    const parentData = parentSnap.exists ? parentSnap.data() : null;
    const contactData = contactSnap.exists ? contactSnap.data() : null;

    const rawEmail = email || contactData?.email || '';
    const cleanEmail = rawEmail.trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json(
        { error: 'Contact does not have a valid email address.' },
        { status: 400 }
      );
    }

    // Resolve Customer NetSuite Internal ID
    const rawCustId =
      customerNsId ||
      parentData?.internalid ||
      parentData?.internalId ||
      parentData?.netsuiteId ||
      parentData?.customerEntityId ||
      parentId;
    const cleanCustomerNsId = String(rawCustId).trim();

    // Resolve First Name and Last Name
    const fullName = (contactData?.name || '').trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const defaultFirst = nameParts[0] || 'Staff';
    const defaultLast = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-';

    const cleanFirstName = (firstName || contactData?.firstName || defaultFirst).trim() || 'Staff';
    const cleanLastName = (lastName || contactData?.lastName || defaultLast).trim() || '-';
    const cleanPhone = (phone || contactData?.phone || parentData?.phone || parentData?.customerPhone || '').trim();

    const apiHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj',
    };

    // Step 1: Pre-flight existence check against Protechly API
    const checkURL = 'https://mpns.protechly.com/outbound_emails?email=' + encodeURIComponent(cleanEmail);
    let emailSubjects: any[] = [];
    let checkSuccess = false;

    try {
      const checkRes = await fetch(checkURL, { headers: apiHeaders });
      if (checkRes.ok) {
        const resData = await checkRes.json();
        if (Array.isArray(resData)) {
          emailSubjects = resData;
          checkSuccess = true;
        }
      } else {
        console.warn(`[grant-shipmate-access] outbound_emails returned status ${checkRes.status}`);
      }
    } catch (checkErr) {
      console.warn('[grant-shipmate-access] Failed pre-check outbound_emails call:', checkErr);
    }

    const createPasswordEmailSent = emailSubjects.some(item =>
      [
        'Create Your ShipMate Password Now',
        'Your MailPlus shipping portal is now ready for you to set up.',
      ].includes(item?.subject)
    );

    const accountActivated = emailSubjects.some(item =>
      typeof item?.subject === 'string' && item.subject.includes('Welcome to your MailPlus Shipping Portal.')
    );

    const emailAlreadyExists = checkSuccess && emailSubjects.length > 0;

    // Step 2: Create New Staff in RTA if the email does not already exist
    if (!emailAlreadyExists) {
      const userJSON = {
        customer_ns_id: cleanCustomerNsId,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        email: cleanEmail,
        phone: cleanPhone,
      };

      const newStaffRes = await fetch('https://mpns.protechly.com/new_staff', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(userJSON),
      });

      if (!newStaffRes.ok) {
        let errBody = '';
        try {
          errBody = await newStaffRes.text();
        } catch {}

        // If Protechly indicates already exists, treat gracefully
        if (!errBody.toLowerCase().includes('already exists')) {
          return NextResponse.json(
            {
              error: `Failed to create staff in ShipMate (Status ${newStaffRes.status}): ${errBody || 'Unknown error'}`,
            },
            { status: 502 }
          );
        }
      }
    }

    // Step 3: Update Firestore Contact document
    let finalShipmateStatus: 'Activated' | 'Password Sent' | 'No Access' = 'Password Sent';
    if (accountActivated) {
      finalShipmateStatus = 'Activated';
    } else {
      finalShipmateStatus = 'Password Sent';
    }

    const nowIso = new Date().toISOString();
    const updateData = {
      accessToShipMate: 'yes' as const,
      accountActivated: accountActivated || false,
      createPasswordEmailSent: true,
      shipmateStatus: finalShipmateStatus,
      shipmateGrantedAt: nowIso,
      shipmateCheckedAt: nowIso,
    };

    if (contactSnap.exists) {
      await contactRef.update(updateData);
    }

    // Step 4: Append activity timeline log
    try {
      const contactDisplayName = contactData?.name || `${cleanFirstName} ${cleanLastName}`.trim();
      const activityRef = parentRef.collection('activity').doc();
      await activityRef.set({
        id: activityRef.id,
        type: 'ShipMate',
        title: 'ShipMate Access Granted',
        description: `ShipMate portal access granted for ${contactDisplayName} (${cleanEmail}).${
          emailAlreadyExists ? ' (Account already existed in RTA)' : ' (Password setup email dispatched)'
        }`,
        timestamp: nowIso,
        createdAt: nowIso,
        author: userName || userEmail || 'System',
        authorEmail: userEmail || '',
        contactId,
        contactName: contactDisplayName,
        contactEmail: cleanEmail,
      });
    } catch (actErr) {
      console.warn('[grant-shipmate-access] Failed to log activity:', actErr);
    }

    return NextResponse.json({
      success: true,
      alreadyExisted: emailAlreadyExists,
      message: emailAlreadyExists
        ? `Contact ${cleanEmail} is already registered in ShipMate. Status synced.`
        : `ShipMate access granted. Password creation email sent to ${cleanEmail}.`,
      ...updateData,
    });
  } catch (error: any) {
    console.error('[grant-shipmate-access API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
