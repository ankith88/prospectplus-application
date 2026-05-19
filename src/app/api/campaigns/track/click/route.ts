import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deliveryId = searchParams.get('id');
  const targetUrl = searchParams.get('url');

  const fallbackUrl = '/'; // Default redirect fallback if parsing fails

  if (!deliveryId || !targetUrl) {
    return NextResponse.redirect(new URL(fallbackUrl, request.url));
  }

  try {
    const deliveryRef = db.collection('campaign_deliveries').doc(deliveryId);
    const deliveryDoc = await deliveryRef.get();

    if (deliveryDoc.exists) {
      const data = deliveryDoc.data();
      const campaignId = data?.campaignId;
      const clickedAt = data?.clickedAt || [];

      const now = new Date().toISOString();
      const isFirstClick = clickedAt.length === 0;

      await deliveryRef.update({
        clickedAt: FieldValue.arrayUnion(now)
      });

      if (isFirstClick && campaignId) {
        // Increment global campaign clicks
        const campaignRef = db.collection('marketing_campaigns').doc(campaignId);
        await campaignRef.update({
          'metrics.clicked': FieldValue.increment(1)
        });
      }
    }

    return NextResponse.redirect(new URL(targetUrl));

  } catch (error) {
    console.error('Error tracking click redirect:', error);
    try {
      return NextResponse.redirect(new URL(targetUrl));
    } catch {
      return NextResponse.redirect(new URL(fallbackUrl, request.url));
    }
  }
}
