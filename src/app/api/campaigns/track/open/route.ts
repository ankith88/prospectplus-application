import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

// 1x1 transparent pixel PNG data
const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('id');

    if (!deliveryId) {
      return new Response(TRANSPARENT_PIXEL, {
        headers: { 'Content-Type': 'image/png' },
      });
    }

    const deliveryRef = db.collection('campaign_deliveries').doc(deliveryId);
    const deliveryDoc = await deliveryRef.get();

    if (deliveryDoc.exists) {
      const data = deliveryDoc.data();
      const campaignId = data?.campaignId;
      const openedAt = data?.openedAt || [];

      // Only increment and log if this is the first open, or track subsequent opens in arrays
      const now = new Date().toISOString();
      const isFirstOpen = openedAt.length === 0;

      await deliveryRef.update({
        openedAt: FieldValue.arrayUnion(now)
      });

      if (isFirstOpen && campaignId) {
        // Increment global campaign open counts
        const campaignRef = db.collection('marketing_campaigns').doc(campaignId);
        await campaignRef.update({
          'metrics.opened': FieldValue.increment(1)
        });
      }
    }

    return new Response(TRANSPARENT_PIXEL, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error tracking open pixel:', error);
    return new Response(TRANSPARENT_PIXEL, {
      headers: { 'Content-Type': 'image/png' },
    });
  }
}
