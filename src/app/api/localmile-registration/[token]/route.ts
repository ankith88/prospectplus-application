import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { decryptLeadId } from '@/lib/localmile-security';
import { sendContactToNetSuite } from '@/services/netsuite';
import { initiateLocalMileTrial } from '@/services/netsuite-localmile-proxy';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const leadId = decryptLeadId(resolvedParams.token);

  if (!leadId) {
    return NextResponse.json({ error: 'Invalid or expired registration link.' }, { status: 401 });
  }

  try {
    const leadSnap = await db.collection('leads').doc(leadId).get();
    if (!leadSnap.exists) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    const leadData = leadSnap.data() || {};
    
    // Resolve Account Manager Assigned
    const amName = leadData.accountManagerAssigned || leadData.salesRepAssigned || '';
    let amEmail = 'support@mailplus.com.au';
    let amPhone = '1300 65 65 95';
    let amDisplayName = amName || 'MailPlus Support';

    if (amName) {
      const normalizedAmName = amName.trim().toLowerCase();
      const usersSnap = await db.collection('users').get();
      const matchedUserDoc = usersSnap.docs.find(doc => {
        const data = doc.data() || {};
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
        const displayName = (data.displayName || '').trim().toLowerCase();
        return fullName === normalizedAmName || displayName === normalizedAmName || doc.id.toLowerCase() === normalizedAmName;
      });

      if (matchedUserDoc) {
        const userData = matchedUserDoc.data();
        amEmail = userData.email || amEmail;
        amPhone = userData.mobileNumber || userData.phoneNumber || userData.mobile || userData.phone || amPhone;
        amDisplayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || amName;
      }
    }
    
    // Fetch existing contacts
    const contactsSnap = await db.collection('leads').doc(leadId).collection('contacts').get();
    const contacts = contactsSnap.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || '',
      email: doc.data().email || '',
      phone: doc.data().phone || '',
      isPrimary: !!doc.data().isPrimary,
      accessToLocalMile: doc.data().accessToLocalMile || 'no'
    }));

    return NextResponse.json({
      success: true,
      leadId,
      companyName: leadData.companyName || '',
      prospectPlusId: leadData.prospectPlusId || '',
      customerPhone: leadData.customerPhone || '',
      customerServiceEmail: leadData.customerServiceEmail || '',
      address: leadData.address || {
        street: leadData.street || '',
        city: leadData.city || '',
        state: leadData.state || '',
        zip: leadData.zip || '',
        country: leadData.country || ''
      },
      accountManager: {
        name: amDisplayName,
        email: amEmail,
        phone: amPhone
      },
      contacts
    });

  } catch (error: any) {
    console.error('Error fetching lead registration details:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const leadId = decryptLeadId(resolvedParams.token);

  if (!leadId) {
    return NextResponse.json({ error: 'Invalid or expired registration link.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { companyName, contactId, newContact } = body;

    const leadRef = db.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    const leadData = leadSnap.data() || {};

    // 1. Update companyName if edited
    if (companyName && companyName !== leadData.companyName) {
      await leadRef.update({
        companyName,
        updatedAt: FieldValue.serverTimestamp()
      });
      await leadRef.collection('activity').add({
        type: 'Update',
        date: new Date().toISOString(),
        notes: `Company name updated from '${leadData.companyName}' to '${companyName}' via public registration.`,
        author: 'Public Registration'
      });
    }

    let finalContact: any = null;
    let finalContactId = contactId;

    // Validation: Check if contact already has access to LocalMile
    if (!newContact && contactId) {
      const contactSnap = await leadRef.collection('contacts').doc(contactId).get();
      if (contactSnap.exists && contactSnap.data()?.accessToLocalMile === 'yes') {
        return NextResponse.json({ error: 'This contact already has access to LocalMile.' }, { status: 400 });
      }
    }

    if (newContact) {
      const { email } = newContact;
      if (email) {
        const contactSnap = await leadRef.collection('contacts').where('email', '==', email).get();
        const alreadyHasAccess = contactSnap.docs.some(doc => doc.data().accessToLocalMile === 'yes');
        if (alreadyHasAccess) {
          return NextResponse.json({ error: 'A contact with this email already has access to LocalMile.' }, { status: 400 });
        }
      }
    }

    // 2. Handle Contact selection or creation
    if (newContact) {
      const { firstName, lastName, email, phone, isPrimary } = newContact;
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Call NetSuite contact synchronization scriptlet
      console.log(`[Public Registration] Syncing new contact ${fullName} to NetSuite...`);
      const nsContactRes = await sendContactToNetSuite({
        leadId,
        contact: {
          name: fullName,
          firstName,
          lastName,
          email,
          phone: phone || '',
          title: 'Contact',
          isPrimary: !!isPrimary,
          accessToLocalMile: 'yes'
        } as any
      });

      if (!nsContactRes.success) {
        throw new Error(nsContactRes.message || 'Failed to sync contact to NetSuite.');
      }

      // Query contacts to find the one created by the webhook callback
      let contactSnap = await leadRef.collection('contacts').where('email', '==', email).limit(1).get();
      
      if (contactSnap.empty) {
        // Wait 1.5 seconds for webhook callback to process and retry
        await new Promise(resolve => setTimeout(resolve, 1500));
        contactSnap = await leadRef.collection('contacts').where('email', '==', email).limit(1).get();
      }

      if (!contactSnap.empty) {
        finalContactId = contactSnap.docs[0].id;
        finalContact = { id: finalContactId, ...contactSnap.docs[0].data() };
      } else {
        // Fallback: Create contact locally if callback took too long/failed
        console.log(`[Public Registration] Webhook callback pending. Creating contact locally as fallback.`);
        
        // Enforce single primary contact constraints
        if (isPrimary) {
          const primaryContactsSnap = await leadRef.collection('contacts').where('isPrimary', '==', true).get();
          const batch = db.batch();
          primaryContactsSnap.docs.forEach(docSnap => {
            batch.update(docSnap.ref, { isPrimary: false });
          });
          await batch.commit();
        }

        const newContactRef = await leadRef.collection('contacts').add({
          name: fullName,
          email,
          phone: phone || '',
          title: 'Contact',
          isPrimary: !!isPrimary,
          accessToLocalMile: 'yes',
          syncedWithNetSuite: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        finalContactId = newContactRef.id;
        
        const currentCount = leadData.contactCount || 0;
        await leadRef.update({ contactCount: currentCount + 1 });
        
        await leadRef.collection('activity').add({
          type: 'Update',
          date: new Date().toISOString(),
          notes: `Contact '${fullName}' created locally (sync pending) via public registration.`,
          author: 'Public Registration'
        });

        finalContact = {
          id: finalContactId,
          name: fullName,
          email,
          phone: phone || '',
          isPrimary: !!isPrimary
        };
      }
    } else if (finalContactId) {
      // Fetch selected existing contact
      const contactSnap = await leadRef.collection('contacts').doc(finalContactId).get();
      if (!contactSnap.exists) {
        return NextResponse.json({ error: 'Selected contact not found.' }, { status: 400 });
      }
      finalContact = { id: finalContactId, ...contactSnap.data() };
      
      // Ensure contact has accessToLocalMile set to 'yes'
      await leadRef.collection('contacts').doc(finalContactId).update({
        accessToLocalMile: 'yes',
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    if (!finalContact) {
      return NextResponse.json({ error: 'No contact selected or created.' }, { status: 400 });
    }

    const contactNameParts = (finalContact.name || '').split(' ');
    const contactFirstName = contactNameParts[0] || '';
    const contactLastName = contactNameParts.slice(1).join(' ') || '';

    // 3. Initiate the LocalMile Free Trial in NetSuite
    console.log(`[Public Registration] Initiating LocalMile free trial for lead ${leadId}...`);
    const trialRes = await initiateLocalMileTrial({
      leadId,
      serviceType: 'Adhoc',
      rate: 15,
      contactFirstName,
      contactLastName,
      contactEmail: finalContact.email,
      contactPhone: finalContact.phone,
      userEmail: 'system@mailplus.com.au',
      userName: 'Public Registration Page',
      accountManagerName: leadData.accountManagerAssigned
    });

    if (!trialRes.success) {
      throw new Error(trialRes.message || 'Failed to initiate LocalMile free trial in NetSuite.');
    }

    // 4. Update the contact and lead in Firestore with trial details
    if (trialRes.localMilePlusAuthLink && trialRes.securityCode) {
      await leadRef.collection('contacts').doc(finalContactId).update({
        localMilePlusAuthLink: trialRes.localMilePlusAuthLink,
        securityCode: trialRes.securityCode,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    const isOutbound = leadData.bucket === 'outbound';
    await leadRef.update({
      status: 'LocalMile Opportunity',
      customerStatus: 'LocalMile Opportunity',
      serviceType: 'Adhoc',
      rate: 15,
      localMileTrialsRemaining: 5,
      ...(!isOutbound ? {
        bucket: 'customer_success',
        customerSuccessAssigned: 'Belinda Urbani'
      } : {}),
      updatedAt: FieldValue.serverTimestamp()
    });

    await leadRef.collection('activity').add({
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Initiated LocalMile Trial (Adhoc at $15) via public registration link for ${finalContact.name}`,
      author: 'Public Registration'
    });

    return NextResponse.json({
      success: true,
      message: 'LocalMile Trial registration successful!',
      securityCode: trialRes.securityCode || '',
      localMilePlusAuthLink: trialRes.localMilePlusAuthLink || ''
    });

  } catch (error: any) {
    console.error('Error processing public trial registration:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
