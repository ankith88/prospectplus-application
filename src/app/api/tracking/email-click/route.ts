import { NextRequest, NextResponse } from 'next/server';
import { firestore as db } from '../../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const leadId = url.searchParams.get('l');
  const targetUrl = url.searchParams.get('u');
  const campaignId = url.searchParams.get('c');

  if (!targetUrl) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (leadId) {
    try {
      const logsRef = collection(db, 'InteractionLogs');
      await addDoc(logsRef, {
        leadId,
        type: 'email-click',
        timestamp: serverTimestamp(),
        metadata: {
          campaignId,
          targetUrl,
          userAgent: req.headers.get('user-agent'),
          ip: req.headers.get('x-forwarded-for') || 'unknown',
        }
      });
    } catch (e) {
      console.error('Failed to log email click', e);
    }
  }

  return NextResponse.redirect(targetUrl);
}
