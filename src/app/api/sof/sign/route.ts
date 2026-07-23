import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/services/firebase-server';
import { decryptLeadId } from '@/lib/localmile-security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, leadId: rawLeadId, signatureDataUrl, position, date, signedAt } = body;

    let targetId = rawLeadId;
    if (!targetId && token) {
      targetId = decryptLeadId(token) || token;
    }
    if (token && decryptLeadId(token)) {
      targetId = decryptLeadId(token);
    }

    if (!targetId) {
      return NextResponse.json({ error: 'Lead ID or valid token is required' }, { status: 400 });
    }

    if (!signatureDataUrl || !position) {
      return NextResponse.json({ error: 'Signature and Position are required' }, { status: 400 });
    }

    const sofDetails = {
      signatureDataUrl,
      position: String(position).trim(),
      date: date || new Date().toLocaleDateString('en-AU'),
      signedAt: signedAt || new Date().toISOString(),
    };

    let updated = false;

    // Check leads collection
    const leadRef = adminDb.collection('leads').doc(targetId);
    const leadSnap = await leadRef.get();
    if (leadSnap.exists) {
      await leadRef.update({ sofDetails });
      updated = true;
    }

    // Check companies collection
    const companyRef = adminDb.collection('companies').doc(targetId);
    const companySnap = await companyRef.get();
    if (companySnap.exists) {
      await companyRef.update({ sofDetails });
      updated = true;
    }

    if (!updated) {
      return NextResponse.json({ error: 'Lead or Company record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Standing Order Form signed successfully', sofDetails });
  } catch (error: any) {
    console.error('Error signing SOF:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
