import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leadId, contactId, accountManagerAssigned } = body;

    if (!leadId || typeof leadId !== 'string' || leadId.trim() === '') {
      return NextResponse.json({ error: 'Missing or invalid parameter: leadId must be a non-empty string' }, { status: 400 });
    }

    if (contactId !== undefined && contactId !== null && (typeof contactId !== 'string' || contactId.trim() === '')) {
      return NextResponse.json({ error: 'Invalid parameter: contactId must be a non-empty string or null' }, { status: 400 });
    }

    if (accountManagerAssigned !== undefined && accountManagerAssigned !== null && (typeof accountManagerAssigned !== 'string' || accountManagerAssigned.trim() === '')) {
      return NextResponse.json({ error: 'Invalid parameter: accountManagerAssigned must be a non-empty string or null' }, { status: 400 });
    }

    const db = adminApp.firestore();
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const bookingUrlId = randomUUID();
    const updateData: Record<string, any> = {
      bookingUrlId
    };

    if (contactId !== undefined) {
      updateData.bookingContactId = contactId;
    }

    if (accountManagerAssigned !== undefined) {
      updateData.accountManagerAssigned = accountManagerAssigned;
    }

    await leadRef.update(updateData);

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prospectplus.com.au';
    const bookingUrl = `${origin}/book/${bookingUrlId}`;

    return NextResponse.json({
      success: true,
      leadId,
      bookingUrlId,
      bookingUrl,
      contactId: contactId || null,
      accountManagerAssigned: accountManagerAssigned || leadSnap.data()?.accountManagerAssigned || null
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
