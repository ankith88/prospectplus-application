import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { Lead, ServiceSelection } from '@/lib/types';
import { sendCSRequestNotificationEmail } from '@/lib/cancellation-email';
import { findLeadByIdOrInternalId } from '@/lib/lead-lookup';

const db = getFirestore(adminApp);

const AttachmentSchema = z.object({
  name: z.string().optional().default('Attachment'),
  url: z.string().optional().default(''),
  size: z.union([z.number(), z.string()]).optional().nullable(),
  type: z.string().optional().nullable(),
  uploadedAt: z.string().optional().nullable(),
}).passthrough();

const CSRequestSchema = z.object({
  requestType: z.enum(['change_of_service', 'cancellation']),
  leadId: z.any().transform(v => (v !== undefined && v !== null ? String(v) : undefined)).optional(),
  prospectPlusId: z.any().transform(v => (v !== undefined && v !== null ? String(v) : undefined)).optional(),
  netsuiteId: z.any().transform(v => (v !== undefined && v !== null ? String(v) : undefined)).optional(),
  companyName: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable().or(z.literal('')),
  contactPhone: z.any().transform(v => (v !== undefined && v !== null ? String(v) : undefined)).optional(),
  contactName: z.string().optional().nullable(),
  requestedBy: z.string().optional().nullable(),
  capturedBy: z.string().optional().nullable(),
  
  // Change of Service specific fields
  serviceChangeCategories: z.array(z.string()).optional().nullable(),
  requestedServices: z.array(z.any()).optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  
  // Cancellation specific fields
  cancellationTheme: z.string().optional().nullable(),
  cancellationThemeId: z.string().optional().nullable(),
  cancellationWhy: z.string().optional().nullable(),
  cancellationWhyId: z.string().optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  cancellationReasonId: z.string().optional().nullable(),
  cancellationDate: z.string().optional().nullable(),
  trueServiceCancellationDate: z.string().optional().nullable(),

  attachments: z.array(AttachmentSchema).optional().nullable(),
  notes: z.string().optional().nullable(),
  processedBy: z.string().optional().nullable(),
}).passthrough();

function calculateServicesMRR(services: ServiceSelection[]): number {
  if (!services || !Array.isArray(services)) return 0;
  let mrr = 0;
  for (const s of services) {
    if (!s) continue;
    const rateNum = typeof s.rate === 'number' ? s.rate : parseFloat(String(s.rate || 0));
    if (!rateNum || isNaN(rateNum)) continue;
    if (s.frequency === 'Adhoc') {
      mrr += rateNum * 1;
    } else if (Array.isArray(s.frequency)) {
      const days = s.frequency.length;
      if (days > 0) mrr += rateNum * days * 4.33;
    } else if (typeof s.frequency === 'string') {
      const freqStr = String(s.frequency);
      const match = freqStr.match(/\d+/);
      const days = match ? parseInt(match[0], 10) : 5;
      mrr += rateNum * days * 4.33;
    }
  }
  return Math.round(mrr * 100) / 100;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CSRequestSchema.parse(body);

    const lookupId = validated.leadId || validated.netsuiteId || validated.prospectPlusId;
    let leadId = lookupId || '';
    let existingLead: Lead | null = null;
    let collectionName: 'companies' | 'leads' = 'leads';

    if (lookupId) {
      const result = await findLeadByIdOrInternalId(lookupId);
      if (result) {
        existingLead = result.lead;
        leadId = result.leadId;
        collectionName = result.collectionName;
      }
    }

    // Lookup by companyName as fallback if lookupId failed
    if (!existingLead && validated.companyName) {
      const compSnap = await db.collection('companies').where('companyName', '==', validated.companyName).limit(1).get();
      if (!compSnap.empty) {
        const leadDoc = compSnap.docs[0];
        existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
        leadId = leadDoc.id;
        collectionName = 'companies';
      } else {
        const leadSnap = await db.collection('leads').where('companyName', '==', validated.companyName).limit(1).get();
        if (!leadSnap.empty) {
          const leadDoc = leadSnap.docs[0];
          existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
          leadId = leadDoc.id;
          collectionName = 'leads';
        }
      }
    }

    const requestedDate = new Date().toISOString();
    const companyName = validated.companyName || existingLead?.companyName || 'Unknown Company';
    const prospectPlusId = validated.prospectPlusId || (existingLead as any)?.prospectPlusId || (existingLead as any)?.prospectplusId || (existingLead as any)?.prospect_plus_id || leadId;
    const originalServices = existingLead?.services || [];
    const originalMRR = calculateServicesMRR(originalServices);
    const isCancellation = validated.requestType === 'cancellation';

    // Clean attachments to avoid any unsupported undefined fields in Firestore
    const rawAttachments = validated.attachments || [];
    const attachments = rawAttachments.map(att => {
      const item: any = {
        name: att.name || 'Attachment',
        url: att.url || '',
      };
      if (att.size !== undefined && att.size !== null) item.size = Number(att.size) || 0;
      if (att.type) item.type = String(att.type);
      if (att.uploadedAt) item.uploadedAt = String(att.uploadedAt);
      return item;
    });

    let rawRequestedServices = validated.requestedServices;
    if (!rawRequestedServices && !isCancellation) {
      rawRequestedServices = originalServices;
    }

    // Clean services list for Firestore
    const cleanServices = (list: any[]) => {
      if (!list || !Array.isArray(list)) return [];
      return list.map(s => {
        if (!s) return null;
        const res: any = {
          name: s.name || '',
          frequency: s.frequency || 'Adhoc',
        };
        const rateNum = typeof s.rate === 'number' ? s.rate : parseFloat(String(s.rate || 0));
        if (!isNaN(rateNum)) res.rate = rateNum;
        if (s.quantity !== undefined && s.quantity !== null) res.quantity = Number(s.quantity) || 1;
        if (s.id) res.id = String(s.id);
        if (s.startDate) res.startDate = String(s.startDate);
        return res;
      }).filter(Boolean);
    };

    const cleanRequestedServices = cleanServices(rawRequestedServices || []);
    const cleanOriginalServices = cleanServices(originalServices || []);

    // 4. Update Document in correct collection (companies or leads)
    if (leadId) {
      const targetDocRef = db.collection(collectionName).doc(leadId);
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

      // Safe update with set({ merge: true }) so it never fails with NOT_FOUND
      await targetDocRef.set(updateData, { merge: true });
    }

    // 5. Add document to cs_requests collection
    const csRequestsRef = db.collection('cs_requests');
    const csReqDoc = await csRequestsRef.add({
      source: 'public_portal',
      requestType: validated.requestType,
      leadId,
      prospectPlusId,
      netsuiteId: validated.netsuiteId || (existingLead as any)?.netsuiteId || '',
      companyName,
      contactName: validated.contactName || '',
      requestedBy: validated.requestedBy || validated.contactName || '',
      capturedBy: validated.capturedBy || validated.processedBy || 'Customer Portal',
      contactEmail: validated.contactEmail || '',
      contactPhone: validated.contactPhone || '',
      requestedDate,
      
      // Change of service fields
      serviceChangeCategories: validated.serviceChangeCategories || [],
      requestedServices: cleanRequestedServices,
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
      originalServices: cleanOriginalServices,
      originalMRR,
      processedBy: validated.processedBy || validated.capturedBy || 'Customer Online Portal',
      collectionName,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 6. If cancellation, mirror into 'cancellations' collection for backward compatibility
    let cancellationId = '';
    if (isCancellation) {
      const cancelRef = db.collection('cancellations');
      const cancelDoc = await cancelRef.add({
        source: 'public_portal',
        leadId,
        prospectPlusId,
        netsuiteId: validated.netsuiteId || (existingLead as any)?.netsuiteId || '',
        companyName,
        contactName: validated.contactName || '',
        requestedBy: validated.requestedBy || validated.contactName || '',
        capturedBy: validated.capturedBy || validated.processedBy || 'Customer Portal',
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
        processedBy: validated.processedBy || validated.capturedBy || 'Customer Online Portal',
        status: 'Pending',
        originalServices: cleanOriginalServices,
        collectionName,
        createdAt: FieldValue.serverTimestamp(),
      });
      cancellationId = cancelDoc.id;
    }

    // 7. Add entry to company or lead profile activity subcollection
    if (leadId) {
      const activityRef = db.collection(collectionName).doc(leadId).collection('activity');
      const attachInfo = attachments.length > 0 ? `\nAttachments (${attachments.length}): ${attachments.map(a => a.name).join(', ')}` : '';
      const extContactStr = validated.requestedBy || validated.contactName || 'N/A';
      const intStaffStr = validated.capturedBy || validated.processedBy || 'Customer Portal';
      const activityNote = isCancellation
        ? `Cancellation request received via Service Portal.\nPerson Requesting (External): ${extContactStr}\nCaptured By (Internal): ${intStaffStr}\nReason: ${validated.cancellationReason || 'N/A'}\nNotes: ${validated.notes || 'None'}\nRequested Stop Date: ${validated.cancellationDate || 'N/A'}${attachInfo}`
        : `Change of Service request received via Service Portal.\nPerson Requesting (External): ${extContactStr}\nCaptured By (Internal): ${intStaffStr}\nCategories: ${(validated.serviceChangeCategories || []).join(', ') || 'N/A'}\nEffective Date: ${validated.effectiveDate || 'N/A'}\nNotes: ${validated.notes || 'None'}${attachInfo}`;

      await activityRef.add({
        type: 'Update',
        date: requestedDate,
        notes: activityNote,
        author: intStaffStr,
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
        requestedBy: validated.requestedBy || validated.contactName || '',
        capturedBy: validated.capturedBy || validated.processedBy || 'Internal Staff / Customer Portal',
        contactEmail: validated.contactEmail || '',
        contactPhone: validated.contactPhone || '',
        serviceChangeCategories: validated.serviceChangeCategories || [],
        requestedServices: cleanRequestedServices,
        effectiveDate: validated.effectiveDate || requestedDate.split('T')[0],
        cancellationTheme: validated.cancellationTheme || 'Customer Portal Request',
        cancellationWhy: validated.cancellationWhy || '',
        cancellationReason: validated.cancellationReason || 'Other',
        cancellationNotes: validated.notes || '',
        cancellationDate: validated.cancellationDate || requestedDate.split('T')[0],
        trueServiceCancellationDate: validated.trueServiceCancellationDate || validated.cancellationDate || requestedDate.split('T')[0],
        attachments,
        notes: validated.notes || '',
        processedBy: validated.capturedBy || validated.processedBy || 'Internal Staff / Customer Portal',
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

  } catch (error: any) {
    const isZodError = error instanceof z.ZodError || error?.name === 'ZodError';
    if (isZodError) {
      const errDetails = error.errors || [];
      const errorMsg = 'Validation failed: ' + errDetails.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error('[CS Requests API Validation Error]:', errorMsg, errDetails);
      return NextResponse.json({
        success: false,
        error: errorMsg,
        details: errDetails
      }, { status: 400 });
    }

    console.error('[CS Requests API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 });
  }
}

