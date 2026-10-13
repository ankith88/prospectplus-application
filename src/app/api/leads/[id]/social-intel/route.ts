import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getSocialIntelligence } from '@/services/agent-reach/social-intelligence';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const leadId = resolvedParams?.id;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const db = getFirestore(adminApp);
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json({ error: `Lead ${leadId} not found` }, { status: 404 });
    }

    const leadData = leadSnap.data() || {};
    const companyName = leadData.companyName || leadData.name || 'Company';
    const websiteUrl = leadData.websiteUrl || leadData.website || '';

    const socialIntel = await getSocialIntelligence(companyName, websiteUrl);

    await leadRef.update({
      'discoveryData.socialIntelligence': socialIntel,
    });

    return NextResponse.json({
      success: true,
      data: socialIntel,
      message: `Scanned social intelligence for ${companyName}.`,
    });
  } catch (error: any) {
    console.error('Error scanning social intelligence:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
