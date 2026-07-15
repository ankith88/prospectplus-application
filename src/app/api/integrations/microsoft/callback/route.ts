import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/services/microsoft-graph';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const amId = searchParams.get('state'); // We passed amId in the state parameter
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code || !amId) {
    return NextResponse.json({ error: 'Missing code or state (amId)' }, { status: 400 });
  }

  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:9002';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const redirectUri = `${protocol}://${host}/api/integrations/microsoft/callback`;

    const tokens = await exchangeCodeForTokens(code, redirectUri);

    const db = getFirestore(adminApp);
    const userRef = db.collection('users').doc(amId);
    await userRef.update({
      microsoftAccessToken: tokens.access_token,
      microsoftRefreshToken: tokens.refresh_token,
      microsoftTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    });

    // Register real-time change notifications webhook subscription for user's personal mailbox
    try {
      const { subscribeToUserMailbox } = await import('@/services/microsoft-webhook');
      await subscribeToUserMailbox(amId);
    } catch (subErr) {
      console.error('[Microsoft Callback] Failed to register webhook subscription:', subErr);
    }

    // Redirect to the settings page with a success query param
    return NextResponse.redirect(new URL('/account-manager/settings?success=calendar_connected', req.url));
  } catch (err: any) {
    console.error('Error during token exchange:', err);
    return NextResponse.json({ 
      error: 'Failed to connect calendar', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}
