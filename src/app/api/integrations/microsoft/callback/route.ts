import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/services/microsoft-graph';
import { firestore as db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

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

    const userRef = doc(db, 'users', amId);
    await updateDoc(userRef, {
      microsoftAccessToken: tokens.access_token,
      microsoftRefreshToken: tokens.refresh_token,
      microsoftTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    });

    // Redirect to the settings page with a success query param
    return NextResponse.redirect(new URL('/account-manager/settings?success=calendar_connected', req.url));
  } catch (err: any) {
    console.error('Error during token exchange:', err);
    return NextResponse.json({ error: 'Failed to connect calendar' }, { status: 500 });
  }
}
