import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('identifier');
  const type = searchParams.get('type'); // 'startrack' or 'tge'
  const packageId = searchParams.get('packageId');

  if (!identifier) {
    return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });
  }

  try {
    let status = 'Unknown';
    let delivered = false;
    let estimated_delivery_date: string | null = null;
    let last_location: string | null = null;

    // Note: 'type' parameter is no longer strictly necessary if Protechly handles all barcodes,
    // but we'll leave it in the signature to avoid breaking client calls.

    let updated_at = new Date().toISOString();
    const apiUrl = `https://mpns.protechly.com/track?barcode=${identifier}`;
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj'
      }
    };

    const response = await fetch(apiUrl, options);
    if (!response.ok) {
      console.warn(`Protechly API call failed for ${identifier} with status: ${response.status}`);
      // Fallback to Unknown if API fails
    } else {
      const responseData: any = await response.json();
      if (responseData && responseData.last_status) {
        const event = responseData.last_status.event || '';
        status = event.charAt(0).toUpperCase() + event.slice(1);
        delivered = event.toLowerCase() === 'delivered';
        last_location = responseData.last_status.note || null;
        if (responseData.last_status.time) {
          updated_at = new Date(responseData.last_status.time).toISOString();
        }
      }
    }

    const responsePayload = {
      status,
      delivered,
      estimated_delivery_date,
      last_location,
      updated_at
    };

    if (packageId) {
      const db = getFirestore(adminApp);
      await db.collection('packages').doc(packageId).set({
        real_time_status: responsePayload
      }, { merge: true });
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error fetching tracking:', error);
    return NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: 500 });
  }
}
