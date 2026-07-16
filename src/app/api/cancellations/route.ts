import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { Lead } from '@/lib/types';

const db = getFirestore(adminApp);

const CancellationSchema = z.object({
  leadId: z.string().optional(),
  companyName: z.string(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  contactName: z.string().optional(),
  cancellationReason: z.string().default('Other'),
  cancellationDate: z.string(), // ISO format or YYYY-MM-DD
  trueServiceCancellationDate: z.string().optional(), // ISO format or YYYY-MM-DD
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CancellationSchema.parse(body);

    let leadId = validated.leadId;
    let existingLead: Lead | null = null;

    if (leadId) {
      const leadSnap = await db.collection('leads').doc(leadId).get();
      if (leadSnap.exists) {
        existingLead = { id: leadSnap.id, ...leadSnap.data() } as Lead;
      }
    }

    // Try finding by companyName or email if not found by leadId
    if (!existingLead) {
      const leadsRef = db.collection('leads');
      
      // Try companyName exact match
      const qCompany = leadsRef.where('companyName', '==', validated.companyName);
      const companySnap = await qCompany.get();
      if (!companySnap.empty) {
        const leadDoc = companySnap.docs[0];
        existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
        leadId = leadDoc.id;
      } else if (validated.contactEmail) {
        // Try contact email match
        const qEmail = leadsRef.where('customerServiceEmail', '==', validated.contactEmail);
        const emailSnap = await qEmail.get();
        if (!emailSnap.empty) {
          const leadDoc = emailSnap.docs[0];
          existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
          leadId = leadDoc.id;
        }
      }
    }

    const requestedDate = new Date().toISOString();
    const cancellationDate = validated.cancellationDate;
    const trueServiceCancellationDate = validated.trueServiceCancellationDate || cancellationDate;

    let originalServices = existingLead?.services || [];

    if (existingLead && leadId) {
      // Update existing lead status and bucket to customer success / cancellation requested
      const leadRef = db.collection('leads').doc(leadId);
      await leadRef.update({
        bucket: 'customer_success',
        cancellationRequested: true,
        cancellationReason: validated.cancellationReason,
        cancellationdate: cancellationDate,
        cancellationTheme: 'External Request',
        cancellationCategory: 'External Request',
      });
    } else {
      // Create new lead in customer_success bucket
      const leadsRef = db.collection('leads');
      const newLeadDoc = await leadsRef.add({
        companyName: validated.companyName,
        customerServiceEmail: validated.contactEmail || '',
        customerPhone: validated.contactPhone || '',
        bucket: 'customer_success',
        customerStatus: 'Cancellation Requested',
        cancellationRequested: true,
        cancellationReason: validated.cancellationReason,
        cancellationdate: cancellationDate,
        cancellationTheme: 'External Request',
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
      companyName: validated.companyName,
      contactName: validated.contactName || '',
      contactEmail: validated.contactEmail || '',
      contactPhone: validated.contactPhone || '',
      requestedDate,
      cancellationDate,
      trueServiceCancellationDate,
      cancellationReason: validated.cancellationReason,
      status: 'Pending',
      originalServices,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Also log an activity in the lead profile activity subcollection
    const activityRef = db.collection('leads').doc(leadId).collection('activity');
    await activityRef.add({
      type: 'Update',
      date: requestedDate,
      notes: `Cancellation enquiry submitted via External API. Reason: ${validated.cancellationReason}. Requested Stop Date: ${cancellationDate}.`,
      author: 'External API',
      syncedWithNetSuite: false
    });

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
    
    console.error('Error processing cancellation request:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
