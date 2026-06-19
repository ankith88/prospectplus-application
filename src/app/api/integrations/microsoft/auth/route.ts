import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/services/microsoft-graph';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const amId = searchParams.get('amId');

  if (!amId) {
    return NextResponse.json({ error: 'amId is required' }, { status: 400 });
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:9002';
  const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = `${protocol}://${host}/api/integrations/microsoft/callback`;

  const authUrl = getAuthUrl(amId, redirectUri);
  return NextResponse.redirect(authUrl);
}
