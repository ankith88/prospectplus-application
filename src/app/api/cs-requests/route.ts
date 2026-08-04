import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { Lead, ServiceSelection } from '@/lib/types';
import { sendCSRequestNotificationEmail } from '@/lib/cancellation-email';

const db = getFirestore(adminApp);

const AttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
  uploadedAt: z.string().optional(),
});

const CSRequestSchema = z.object({
  requestType: z.enum(['change_of_service', 'cancellation']),
  leadId: z.string().optional(),
  prospectPlusId: z.string().optional(),
  netsuiteId: z.string().optional(),
  companyName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  contactName: z.string().optional(),
  
  // Change of Service specific fields
  serviceChangeCategories: z.array(z.string()).optional(),
  requestedServices: z.array(z.any()).optional(),
  effectiveDate: z.string().optional(),
  
  // Cancellation specific fields
  cancellationTheme: z.string().optional(),
  cancellationWhy: z.string().optional(),
  cancellationReason: z.string().optional(),
  cancellationDate: z.string().optional(),
  trueServiceCancellationDate: z.string().optional(),

  attachments: z.array(AttachmentSchema).optional(),
  notes: z.string().optional(),
  processedBy: z.string().optional(),
});

function calculateServicesMRR(services: ServiceSelection[]): number {
  if (!services || !Array.isArray(services)) return 0;
  let mrr = 0;
  for (const s of services) {
    if (!s.rate) continue;
    if (s.frequency === 'Adhoc') {
      mrr += s.rate * 1;
    } else if (Array.isArray(s.frequency)) {
      const days = s.frequency.length;
      if (days > 0) mrr += s.rate * days * 4.33;
    } else if (typeof s.frequency === 'string') {
      const freqStr = String(s.frequency);
      const match = freqStr.match(/\d+/);
      const days = match ? parseInt(match[0], 10) : 5;
      mrr += s.rate * days * 4.33;
    }
  }
  return Math.round(mrr * 100) / 100;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CSRequestSchema.parse(body);

    const lookupId = validated.leadId || validated.netsuiteId;
    let leadId = lookupId || '';
    let existingLead: Lead | null = null;

    // 1. Lookup by document ID
    if (lookupId) {
      const leadSnap = await db.collection('leads').doc(lookupId).get();
      if (leadSnap.exists) {
        existingLead = { id: leadSnap.id, ...leadSnap.data() } as Lead;
        leadId = leadSnap.id;
      }
    }

    // 2. Lookup by netsuiteId
    if (!existingLead && validated.netsuiteId) {
      const qNs = await db.collection('leads').where('netsuiteId', '==', validated.netsuiteId).limit(1).get();
      if (!qNs.empty) {
        const leadDoc = qNs.docs[0];
        existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
        leadId = leadDoc.id;
      }
    }

    // 3. Lookup by companyName
    if (!existingLead && validated.companyName) {
      const companySnap = await db.collection('leads').where('companyName', '==', validated.companyName).limit(1).get();
      if (!companySnap.empty) {
        const leadDoc = companySnap.docs[0];
        existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
        leadId = leadDoc.id;
      }
    }

    const requestedDate = new Date().toISOString();
    const companyName = validated.companyName || existingLead?.companyName || 'Unknown Company';
    const prospectPlusId = validated.prospectPlusId || (existingLead as any)?.prospectPlusId || (existingLead as any)?.prospectplusId || (existingLead as any)?.prospect_plus_id || leadId;
    const originalServices = existingLead?.services || [];
    const originalMRR = calculateServicesMRR(originalServices);
    const isCancellation = validated.requestType === 'cancellation';
    const attachments = validated.attachments || [];

    let requestedServices = validated.requestedServices;
    if (!requestedServices && !isCancellation) {
      requestedServices = originalServices;
    }

    // 4. Update Lead in leads collection
    if (existingLead && leadId) {
      const leadRef = db.collection('leads').doc(leadId);
      const updateData: any = {
        bucket: 'customer_success',
        ...(isCancellation ? {
          customerStatus: 'Cancellation Requested',
          cancellationRequested: true,
          cancellationReason: validated.cancellationReason || 'Other',
          cancellationTheme: validated.cancellationTheme || 'Customer Portal Request',
          cancellationWhy: validated.cancellationWhy || '',
          cancellationNotes: validated.notes || '',
          cancellationdate: validated.cancellationDate || requestedDate.split('T')[0],
          cancellationCategory: 'External Request',
        } : {
          customerStatus: 'Service Change Requested',
          serviceChangeRequested: true,
          lastServiceChangeRequestDate: requestedDate,
        })
      };

      if (attachments.length > 0) {
        updateData.attachments = FieldValue.arrayUnion(...attachments);
      }

      await leadRef.update(updateData);
    }

    // 5. Add document to cs_requests collection
    const csRequestsRef = db.collection('cs_requests');
    const csReqDoc = await csRequestsRef.add({
      requestType: validated.requestType,
      leadId,
      prospectPlusId,
      netsuiteId: validated.netsuiteId || (existingLead as any)?.netsuiteId || '',
      companyName,
      contactName: validated.contactName || '',
      contactEmail: validated.contactEmail || '',
      contactPhone: validated.contactPhone || '',
      requestedDate,
      
      // Change of service fields
      serviceChangeCategories: validated.serviceChangeCategories || [],
      requestedServices: requestedServices || [],
      effectiveDate: validated.effectiveDate || requestedDate.split('T')[0],
      
      // Cancellation fields
      cancellationTheme: validated.cancellationTheme || 'Customer Portal Request',
      cancellationWhy: validated.cancellationWhy || '',
      cancellationReason: validated.cancellationReason || 'Other',
      cancellationDate: validated.cancellationDate || requestedDate.split('T')[0],
      trueServiceCancellationDate: validated.trueServiceCancellationDate || validated.cancellationDate || requestedDate.split('T')[0],
      
      attachments,
      notes: validated.notes || '',
      status: 'Pending',
      originalServices,
      originalMRR,
      processedBy: validated.processedBy || 'Customer Online Portal',
      createdAt: FieldValue.serverTimestamp(),
    });

    // 6. If cancellation, mirror into 'cancellations' collection for backward compatibility
    let cancellationId = '';
    if (isCancellation) {
      const cancelRef = db.collection('cancellations');
      const cancelDoc = await cancelRef.add({
        leadId,
        prospectPlusId,
        netsuiteId: validated.netsuiteId || (existingLead as any)?.netsuiteId || '',
        companyName,
        contactName: validated.contactName || '',
        contactEmail: validated.contactEmail || '',
        contactPhone: validated.contactPhone || '',
        requestedDate,
        cancellationDate: validated.cancellationDate || requestedDate.split('T')[0],
        trueServiceCancellationDate: validated.trueServiceCancellationDate || validated.cancellationDate || requestedDate.split('T')[0],
        cancellationTheme: validated.cancellationTheme || 'Customer Portal Request',
        cancellationWhy: validated.cancellationWhy || '',
        cancellationReason: validated.cancellationReason || 'Other',
        cancellationNotes: validated.notes || '',
        attachments,
        processedBy: validated.processedBy || 'Customer Online Portal',
        status: 'Pending',
        originalServices,
        createdAt: FieldValue.serverTimestamp(),
      });
      cancellationId = cancelDoc.id;
    }

    // 7. Add entry to lead profile activity subcollection
    if (leadId) {
      const activityRef = db.collection('leads').doc(leadId).collection('activity');
      const attachInfo = attachments.length > 0 ? `\nAttachments (${attachments.length}): ${attachments.map(a => a.name).join(', ')}` : '';
      const activityNote = isCancellation
        ? `Cancellation request received via Public Customer Portal.\nReason: ${validated.cancellationReason || 'N/A'}\nNotes: ${validated.notes || 'None'}\nRequested Stop Date: ${validated.cancellationDate || 'N/A'}${attachInfo}`
        : `Change of Service request received via Public Customer Portal.\nCategories: ${(validated.serviceChangeCategories || []).join(', ') || 'N/A'}\nEffective Date: ${validated.effectiveDate || 'N/A'}\nNotes: ${validated.notes || 'None'}${attachInfo}`;

      await activityRef.add({
        type: 'Update',
        date: requestedDate,
        notes: activityNote,
        author: 'Customer Online Portal',
        syncedWithNetSuite: false
      });
    }

    // 8. Dispatch notification email to Sarah & Alexandra
    try {
      await sendCSRequestNotificationEmail({
        requestType: validated.requestType,
        leadId,
        prospectPlusId,
        netsuiteId: validated.netsuiteId || (existingLead as any)?.netsuiteId || '',
        companyName,
        contactName: validated.contactName || '',
        contactEmail: validated.contactEmail || '',
        contactPhone: validated.contactPhone || '',
        serviceChangeCategories: validated.serviceChangeCategories || [],
        requestedServices: requestedServices || [],
        effectiveDate: validated.effectiveDate || requestedDate.split('T')[0],
        cancellationTheme: validated.cancellationTheme || 'Customer Portal Request',
        cancellationWhy: validated.cancellationWhy || '',
        cancellationReason: validated.cancellationReason || 'Other',
        cancellationNotes: validated.notes || '',
        cancellationDate: validated.cancellationDate || requestedDate.split('T')[0],
        trueServiceCancellationDate: validated.trueServiceCancellationDate || validated.cancellationDate || requestedDate.split('T')[0],
        attachments,
        notes: validated.notes || '',
        processedBy: 'Customer Online Portal',
      });
    } catch (emailErr) {
      console.error('[CS Requests API] Error sending email notification:', emailErr);
    }

    return NextResponse.json({
      success: true,
      requestId: csReqDoc.id,
      cancellationId,
      leadId,
      message: `${isCancellation ? 'Cancellation' : 'Change of Service'} request submitted successfully`
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }

    console.error('[CS Requests API Error]:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
