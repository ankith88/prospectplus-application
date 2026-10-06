import { NextResponse } from 'next/server';
import { checkLocalMileCompanyExists, getLocalMilePlusDb } from '@/lib/localmile-db';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // We expect the frontend to pass the companyId as part of the payload, 
    // or we can extract it if needed. For now, we assume it's in the payload.
    const { companyId, frequency, ...restPayload } = payload;

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'companyId is required' }, { status: 400 });
    }

    const isAdhoc =
      !frequency ||
      (typeof frequency === 'string' && frequency.trim().toLowerCase() === 'adhoc') ||
      (Array.isArray(frequency) && frequency.length === 0);

    if (isAdhoc) {
      console.log(`[Scheduled Jobs API] Company ${companyId} frequency is Adhoc. Skipping scheduled_job creation.`);
      return NextResponse.json({ success: true, message: 'Adhoc frequency does not require scheduled_jobs' });
    }

    // Verify company document exists in LocalMile application database (companies collection) before proceeding
    // Retry up to 5 times (5s) to allow NetSuite background company creation to complete during signup
    const companyExists = await checkLocalMileCompanyExists(companyId, 5, 1000);
    if (!companyExists) {
      console.warn(`[Scheduled Jobs API] Company ${companyId} does not exist in LocalMile application database (companies collection). Aborting scheduled_job creation.`);
      return NextResponse.json({ success: false, message: `Company ${companyId} does not exist in LocalMile application database` }, { status: 400 });
    }

    const localMileApiKey = process.env.LOCALMILE_PLUS_API_KEY || process.env.PROSPECTPLUS_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';

    // Forward the request to the LocalMile Plus Backend with empty parent_id
    const response = await fetch(`https://us-central1-localmile-plus.cloudfunctions.net/api/api/v1/companies/${companyId}/scheduled-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': localMileApiKey
      },
      body: JSON.stringify({
        ...restPayload,
        parentId: '',
        parent_id: ''
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LocalMile Plus API Error:', data);
      return NextResponse.json({ success: false, message: data.message || 'Failed to create scheduled job in LocalMile Plus' }, { status: response.status });
    }

    // Enforce empty parent_id on the scheduled_jobs document
    const createdJobId = data?.data?.id || data?.id;
    if (createdJobId) {
      try {
        const db = getLocalMilePlusDb();
        await db.collection('scheduled_jobs').doc(String(createdJobId)).update({ parent_id: '' });
      } catch (dbErr) {
        console.warn(`[Scheduled Jobs API] Could not enforce empty parent_id on scheduled_job ${createdJobId}:`, dbErr);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Proxy Scheduled Jobs API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let targetId = '';
    let reason = 'Lead marked lost or customer cancelled';
    let deactivatedBy = 'API Caller';

    // Parse URL query params
    const { searchParams } = new URL(request.url);
    const queryCompanyId = searchParams.get('companyId') || searchParams.get('leadId') || searchParams.get('id');
    if (queryCompanyId) targetId = queryCompanyId;
    if (searchParams.get('reason')) reason = searchParams.get('reason')!;
    if (searchParams.get('deactivatedBy')) deactivatedBy = searchParams.get('deactivatedBy')!;

    // Also check request body if provided
    try {
      const body = await request.json();
      if (body.companyId || body.leadId || body.id) {
        targetId = body.companyId || body.leadId || body.id;
      }
      if (body.reason) reason = body.reason;
      if (body.deactivatedBy) deactivatedBy = body.deactivatedBy;
    } catch {
      // Body may be empty in standard DELETE requests
    }

    if (!targetId) {
      return NextResponse.json({ success: false, message: 'companyId or leadId is required.' }, { status: 400 });
    }

    const { deactivateLocalMileScheduledJobs } = await import('@/services/localmile-scheduled-jobs-service');
    const result = await deactivateLocalMileScheduledJobs(targetId, { reason, deactivatedBy });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Scheduled Jobs API DELETE Error]:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

