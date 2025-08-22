
'use server';

/**
 * @fileoverview API route to handle webhooks from AirCall.
 * This file is now deprecated. The logic has been moved to a dynamic route
 * at /api/aircall/webhook/[secret]/route.ts to provide a more reliable
 * security mechanism than signature validation.
 */

import { NextResponse } from 'next/server';

/**
 * @deprecated This webhook is no longer in use.
 * Please use the new endpoint: /api/aircall/webhook/[secret]
 */
export async function POST() {
  console.warn('Deprecated webhook endpoint was called. Please update AirCall settings.');
  return new NextResponse('This webhook is deprecated. Please use the new URL with a secret token.', { status: 410 });
}
