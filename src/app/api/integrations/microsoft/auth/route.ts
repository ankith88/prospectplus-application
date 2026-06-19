import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/services/microsoft-graph';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const amId = searchParams.get('amId');

  if (!amId) {
    return NextResponse.json({ error: 'amId is required' }, { status: 400 });
  }

  const authUrl = getAuthUrl(amId);
  return NextResponse.redirect(authUrl);
}
