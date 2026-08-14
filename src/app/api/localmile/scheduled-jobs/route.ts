import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // We expect the frontend to pass the companyId as part of the payload, 
    // or we can extract it if needed. For now, we assume it's in the payload.
    const { companyId, ...restPayload } = payload;

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'companyId is required' }, { status: 400 });
    }

    const localMileApiKey = process.env.LOCALMILE_PLUS_API_KEY || process.env.PROSPECTPLUS_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';

    // Forward the request to the LocalMile Plus Backend
    const response = await fetch(`https://us-central1-localmile-plus.cloudfunctions.net/api/api/v1/companies/${companyId}/scheduled-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': localMileApiKey
      },
      body: JSON.stringify(restPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LocalMile Plus API Error:', data);
      return NextResponse.json({ success: false, message: data.message || 'Failed to create scheduled job in LocalMile Plus' }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Proxy Scheduled Jobs API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
