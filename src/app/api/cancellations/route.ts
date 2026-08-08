import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { Lead } from '@/lib/types';
import { sendCancellationNotificationEmail } from '@/lib/cancellation-email';

const db = getFirestore(adminApp);

const CancellationSchema = z.object({
  leadId: z.string().optional(),
  netsuiteId: z.string().optional(),
  companyName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  contactName: z.string().optional(),
  requestedBy: z.string().optional(),
  capturedBy: z.string().optional(),
  cancellationTheme: z.string().optional(),
  cancellationWhy: z.string().optional(),
  cancellationReason: z.string().default('Other'),
  cancellationNotes: z.string().optional(),
  cancellationDate: z.string().optional(), // ISO format or YYYY-MM-DD
  trueServiceCancellationDate: z.string().optional(), // ISO format or YYYY-MM-DD
  processedBy: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CancellationSchema.parse(body);

    const lookupId = validated.leadId || validated.netsuiteId;
    let leadId = lookupId;
    let existingLead: Lead | null = null;

    // 1. Lookup by document ID (leadId / netsuiteId)
    if (lookupId) {
      const leadSnap = await db.collection('leads').doc(lookupId).get();
      if (leadSnap.exists) {
        existingLead = { id: leadSnap.id, ...leadSnap.data() } as Lead;
        leadId = leadSnap.id;
      }
    }

    // 2. Lookup by netsuiteId field if not found by doc ID
    if (!existingLead && validated.netsuiteId) {
      const qNs = await db.collection('leads').where('netsuiteId', '==', validated.netsuiteId).limit(1).get();
      if (!qNs.empty) {
        const leadDoc = qNs.docs[0];
        existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
        leadId = leadDoc.id;
      }
    }

    // 3. Lookup by companyName if still not found
    if (!existingLead && validated.companyName) {
      const companySnap = await db.collection('leads').where('companyName', '==', validated.companyName).limit(1).get();
      if (!companySnap.empty) {
        const leadDoc = companySnap.docs[0];
        existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
        leadId = leadDoc.id;
      }
    }

    // 4. Lookup by contactEmail if still not found
    if (!existingLead && validated.contactEmail) {
      const emailSnap = await db.collection('leads').where('customerServiceEmail', '==', validated.contactEmail).limit(1).get();
      if (!emailSnap.empty) {
        const leadDoc = emailSnap.docs[0];
        existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
        leadId = leadDoc.id;
      }
    }

    const requestedDate = new Date().toISOString();
    const cancellationDate = validated.cancellationDate || requestedDate.split('T')[0];
    const trueServiceCancellationDate = validated.trueServiceCancellationDate || cancellationDate;
    const companyName = validated.companyName || existingLead?.companyName || 'Unknown Company';

    let originalServices = existingLead?.services || [];

    if (existingLead && leadId) {
      // Update existing lead status and bucket to customer success / cancellation requested
      const leadRef = db.collection('leads').doc(leadId);
      await leadRef.update({
        bucket: 'customer_success',
        customerStatus: 'Cancellation Requested',
        cancellationRequested: true,
        cancellationReason: validated.cancellationReason,
        cancellationTheme: validated.cancellationTheme || 'NetSuite Request',
        cancellationWhy: validated.cancellationWhy || '',
        cancellationNotes: validated.cancellationNotes || '',
        cancellationdate: cancellationDate,
        cancellationCategory: 'External Request',
        ...(validated.processedBy ? { cancellationProcessedBy: validated.processedBy } : {}),
      });
    } else {
      // Create new lead record in customer_success bucket if not found
      const leadsRef = db.collection('leads');
      const newLeadDoc = await leadsRef.add({
        companyName,
        netsuiteId: validated.netsuiteId || '',
        customerServiceEmail: validated.contactEmail || '',
        customerPhone: validated.contactPhone || '',
        bucket: 'customer_success',
        customerStatus: 'Cancellation Requested',
        cancellationRequested: true,
        cancellationReason: validated.cancellationReason,
        cancellationTheme: validated.cancellationTheme || 'NetSuite Request',
        cancellationWhy: validated.cancellationWhy || '',
        cancellationNotes: validated.cancellationNotes || '',
        cancellationdate: cancellationDate,
        cancellationCategory: 'External Request',
        dateLeadEntered: requestedDate,
        services: [],
        contacts: validated.contactName ? [{
          id: 'primary',
          name: validated.contactName,
          email: validated.contactEmail || '',
          phone: validated.contactPhone || '',
        }] : []
      });
      leadId = newLeadDoc.id;
    }

    // Record the cancellation ticket inside the cancellations collection
    const cancellationsRef = db.collection('cancellations');
    const cancelDoc = await cancellationsRef.add({
      leadId,
      netsuiteId: validated.netsuiteId || (existingLead as any)?.netsuiteId || '',
      companyName,
      contactName: validated.contactName || '',
      requestedBy: validated.requestedBy || validated.contactName || '',
      capturedBy: validated.capturedBy || validated.processedBy || 'NetSuite Integration',
      contactEmail: validated.contactEmail || '',
      contactPhone: validated.contactPhone || '',
      requestedDate,
      cancellationDate,
      trueServiceCancellationDate,
      cancellationTheme: validated.cancellationTheme || 'NetSuite Request',
      cancellationWhy: validated.cancellationWhy || '',
      cancellationReason: validated.cancellationReason,
      cancellationNotes: validated.cancellationNotes || '',
      processedBy: validated.processedBy || validated.capturedBy || 'NetSuite Integration',
      status: 'Pending',
      originalServices,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Log activity in the lead profile activity subcollection
    const activityRef = db.collection('leads').doc(leadId).collection('activity');
    await activityRef.add({
      type: 'Update',
      date: requestedDate,
      notes: `Cancellation request received from NetSuite.\nPerson Requesting (External): ${validated.requestedBy || validated.contactName || 'N/A'}\nCaptured By (Internal): ${validated.capturedBy || validated.processedBy || 'NetSuite Integration'}\nTheme: ${validated.cancellationTheme || 'N/A'}\nReason: ${validated.cancellationReason}\nNotes: ${validated.cancellationNotes || 'None'}\nRequested Stop Date: ${cancellationDate}`,
      author: validated.capturedBy || validated.processedBy ? `NetSuite (${validated.capturedBy || validated.processedBy})` : 'NetSuite Integration',
      syncedWithNetSuite: true
    });

    // Send cancellation notification email to sarah.hart@mailplus.com.au & alexandra.bathman@mailplus.com.au
    try {
      await sendCancellationNotificationEmail({
        leadId,
        netsuiteId: validated.netsuiteId || (existingLead as any)?.netsuiteId || '',
        companyName,
        contactName: validated.contactName || '',
        requestedBy: validated.requestedBy || validated.contactName || '',
        capturedBy: validated.capturedBy || validated.processedBy || 'NetSuite Integration',
        contactEmail: validated.contactEmail || '',
        contactPhone: validated.contactPhone || '',
        cancellationTheme: validated.cancellationTheme || 'NetSuite Request',
        cancellationWhy: validated.cancellationWhy || '',
        cancellationReason: validated.cancellationReason,
        cancellationNotes: validated.cancellationNotes || '',
        cancellationDate,
        trueServiceCancellationDate,
        processedBy: validated.capturedBy || validated.processedBy || 'NetSuite Integration',
      });
    } catch (emailErr) {
      console.error('[Cancellations Route] Error sending cancellation notification email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      cancellationId: cancelDoc.id,
      leadId,
      message: 'Cancellation request processed successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    console.error('Error processing NetSuite cancellation request:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

