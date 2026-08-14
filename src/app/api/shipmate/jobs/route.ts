import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { findLeadByIdOrInternalId } from '@/lib/lead-lookup';

const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    // 1. API Key Authentication
    const configuredApiKey = process.env.SHIPMATE_API_KEY || process.env.PROSPECTPLUS_API_KEY;
    const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (configuredApiKey && apiKeyHeader !== configuredApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    // 2. Parse Request Body
    const body = await req.json().catch(() => ({}));
    console.log('[ShipMate Job API] Incoming Job Payload:', body);

    const customerId = body.customerId ?? body.customer_id ?? body.leadId ?? body.companyId;
    const dateCreated = body.dateCreated ?? body.date_created ?? body.createdDate ?? body.createdAt;
    const dateScheduled = body.dateScheduled ?? body.date_scheduled ?? body.scheduledDate ?? body.scheduledFor ?? body.jobDate;
    const jobId = body.jobId ?? body.job_id ?? body.id;

    // 3. Payload Field Validation
    const missingFields: string[] = [];
    if (!customerId) missingFields.push('customerId');
    if (!dateCreated) missingFields.push('dateCreated');
    if (!dateScheduled) missingFields.push('dateScheduled');
    if (!jobId) missingFields.push('jobId');

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required payload parameters: ${missingFields.join(', ')}`,
          requiredPayload: {
            customerId: 'Customer ID / Company ID / Lead ID to link job to',
            dateCreated: 'Date job was created (e.g. YYYY-MM-DD or ISO string)',
            dateScheduled: 'Date the job is scheduled for (e.g. YYYY-MM-DD or ISO string)',
            jobId: 'Unique ShipMate Job ID'
          }
        },
        { status: 400 }
      );
    }

    // 4. Find Lead / Company Document in Firestore
    const match = await findLeadByIdOrInternalId(String(customerId));
    if (!match) {
      return NextResponse.json(
        {
          error: `Customer/Lead not found matching customerId '${customerId}'`,
          customerId
        },
        { status: 404 }
      );
    }

    const { lead, leadId, collectionName } = match;
    const parentRef = db.collection(collectionName).doc(leadId);
    const jobDocRef = parentRef.collection('shipMateJobs').doc(String(jobId));

    const jobSnap = await jobDocRef.get();
    const isNewJob = !jobSnap.exists;

    // 5. Store / Update Job Details in shipMateJobs subcollection
    const jobPayload = {
      jobId: String(jobId),
      customerId: String(customerId),
      dateCreated: String(dateCreated),
      dateScheduled: String(dateScheduled),
      status: body.status || 'created',
      platform: 'ShipMate',
      rawPayload: body,
      updatedAt: FieldValue.serverTimestamp(),
      ...(isNewJob ? { createdAt: FieldValue.serverTimestamp() } : {})
    };

    await jobDocRef.set(jobPayload, { merge: true });

    // 6. Update Parent Document Metadata
    const parentUpdates: Record<string, any> = {
      hasShipMateJob: true,
      lastShipMateJobCreatedAt: String(dateCreated),
      lastShipMateJobScheduledDate: String(dateScheduled),
      updatedAt: FieldValue.serverTimestamp()
    };

    if (isNewJob) {
      parentUpdates.shipMateJobCount = FieldValue.increment(1);
      if (!lead.hasCreatedJob) {
        parentUpdates.hasCreatedJob = true;
        parentUpdates.firstJobCreatedAt = String(dateCreated);
      }
    }

    await parentRef.update(parentUpdates);

    // 7. Record Activity Entry
    const activityRef = parentRef.collection('activity');
    await activityRef.add({
      type: 'Update',
      date: new Date().toISOString(),
      notes: `ShipMate Job ${jobId} created. Date Created: ${dateCreated}, Scheduled Date: ${dateScheduled}.`,
      author: 'ShipMate API Integration'
    });

    // 8. Success Response
    return NextResponse.json(
      {
        success: true,
        message: 'ShipMate job recorded successfully',
        data: {
          jobId: String(jobId),
          customerId: String(customerId),
          dateCreated: String(dateCreated),
          dateScheduled: String(dateScheduled),
          linkedCollection: collectionName,
          linkedDocId: leadId
        }
      },
      { status: isNewJob ? 201 : 200 }
    );
  } catch (error: any) {
    console.error('[ShipMate Job API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'ShipMate Job Creation API',
    method: 'POST',
    description: 'Endpoint to record job creation events from the ShipMate platform.',
    requiredPayload: {
      customerId: 'string (Customer ID, Lead ID, Company ID, or NetSuite Internal ID)',
      dateCreated: 'string (ISO date or YYYY-MM-DD)',
      dateScheduled: 'string (ISO date or YYYY-MM-DD)',
      jobId: 'string (Unique ShipMate Job ID)'
    },
    authentication: 'Header x-api-key: <API_KEY> or Authorization: Bearer <API_KEY>'
  });
}
