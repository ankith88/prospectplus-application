import { NextRequest } from 'next/server';
import { firestore as db } from '../../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const leadId = url.searchParams.get('l');
  const campaignId = url.searchParams.get('c');

  if (leadId) {
    try {
      const logsRef = collection(db, 'InteractionLogs');
      await addDoc(logsRef, {
        leadId,
        type: 'email-open',
        timestamp: serverTimestamp(),
        metadata: {
          campaignId,
          userAgent: req.headers.get('user-agent'),
          ip: req.headers.get('x-forwarded-for') || 'unknown',
        }
      });
    } catch (e) {
      console.error('Failed to log email open', e);
    }
  }

  // Return a 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  
  return new Response(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    }
  });
}
