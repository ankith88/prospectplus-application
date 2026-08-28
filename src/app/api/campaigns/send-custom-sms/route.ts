import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendSms } from '@/services/sms-service';
import { replaceTemplatePlaceholders } from '@/lib/template-replacer';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message, leadId, author } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: to, message.' },
        { status: 400 }
      );
    }

    let finalMessage = message;

    if (leadId) {
      try {
        const leadRef = db.collection('leads').doc(leadId);
        const leadDoc = await leadRef.get();
        if (leadDoc.exists) {
          const leadData = leadDoc.data() || {};
          const contactsSnap = await leadRef.collection('contacts').get();
          let primaryContact: any = {};
          if (!contactsSnap.empty) {
            primaryContact = contactsSnap.docs[0].data();
          }

          // Resolve Account Manager info
          const amName = leadData.accountManagerAssigned || leadData.salesRepAssigned || '';
          let amMobile = '';
          let amEmail = '';
          let amCalendly = leadData.salesRepAssignedCalendlyLink || '';
          if (amName) {
            const usersSnap = await db.collection('users').where('displayName', '==', amName).limit(1).get();
            if (!usersSnap.empty) {
              const uData = usersSnap.docs[0].data();
              amMobile = uData.mobileNumber || uData.mobile || uData.phoneNumber || uData.phone || '';
              amEmail = uData.email || '';
              amCalendly = amCalendly || uData.calendlyLink || uData.calendly || '';
            }
          }

          // Resolve Franchisee info
          let franchiseeMainContact = '';
          let franchiseeEmail = '';
          let franchiseeMobile = '';
          if (leadData.franchisee) {
            const franSnap = await db.collection('franchisees').where('name', '==', leadData.franchisee).limit(1).get();
            if (!franSnap.empty) {
              const franData = franSnap.docs[0].data();
              franchiseeMainContact = franData.mainContact || '';
              franchiseeEmail = franData.email || '';
              franchiseeMobile = franData.mobile || '';
            }
          }

          finalMessage = replaceTemplatePlaceholders(message, {
            lead: { ...leadData, id: leadId },
            contact: primaryContact,
            accountManager: { name: amName, mobile: amMobile, email: amEmail, calendly: amCalendly },
            salesRep: amName,
            franchisee: { name: leadData.franchisee || '', mainContact: franchiseeMainContact, email: franchiseeEmail, mobile: franchiseeMobile },
            customLinks: {
              bookingUrlId: leadData.bookingUrlId || '',
              generalBookingUrlId: leadData.generalBookingUrlId || ''
            }
          });
        } else {
          finalMessage = replaceTemplatePlaceholders(message, {});
        }
      } catch (err) {
        console.error('Error in send-custom-sms placeholder resolution:', err);
        finalMessage = replaceTemplatePlaceholders(message, {});
      }
    } else {
      finalMessage = replaceTemplatePlaceholders(message, {});
    }

    const sendResult = await sendSms(to, finalMessage);

    if (!sendResult.success) {
      // If a leadId is provided, optionally log the failure
      if (leadId) {
        try {
          const nowStr = new Date().toISOString();
          const leadRef = db.collection('leads').doc(leadId);
          await leadRef.collection('activity').add({
            type: 'SMS',
            date: nowStr,
            notes: `Custom SMS failed: '${message}'. Error: ${sendResult.message || 'Unknown error'}.`,
            author: author || 'System'
          });
        } catch (logErr) {
          console.error('Failed to log SMS failure to lead:', logErr);
        }
      }

      return NextResponse.json(
        { success: false, message: sendResult.message || 'Failed to dispatch SMS.' },
        { status: 500 }
      );
    }

    // Log to Lead Activity if leadId is provided
    if (leadId) {
      try {
        const nowStr = new Date().toISOString();
        const leadRef = db.collection('leads').doc(leadId);
        await leadRef.collection('activity').add({
          type: 'SMS',
          date: nowStr,
          notes: `Custom SMS sent: '${message}'. Status: Delivered.`,
          author: author || 'System'
        });
      } catch (logErr) {
        console.error('Failed to log SMS success to lead:', logErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'SMS dispatched successfully.'
    });

  } catch (error: any) {
    console.error('Error in send-custom-sms API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error during send.' },
      { status: 500 }
    );
  }
}
