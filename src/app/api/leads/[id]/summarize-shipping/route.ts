import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { summarizeShippingEvidence } from '@/services/agent-reach/lead-dossier';

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
    const dossier = leadData.discoveryData?.agentReachDossier;

    let rawSnippets: string[] = dossier?.logisticsSignals?.rawSnippets || [];

    // Allow overriding or passing snippets from client
    try {
      const body = await req.json();
      if (Array.isArray(body?.rawSnippets) && body.rawSnippets.length > 0) {
        rawSnippets = body.rawSnippets;
      }
    } catch {}

    if (!rawSnippets || rawSnippets.length === 0) {
      return NextResponse.json(
        { error: 'No shipping snippets available to summarize' },
        { status: 400 }
      );
    }

    const summary = await summarizeShippingEvidence(companyName, rawSnippets);

    if (!summary) {
      return NextResponse.json(
        { error: 'Failed to generate shipping summary from evidence' },
        { status: 500 }
      );
    }

    // Save to Firestore under logisticsSignals.shippingSummary
    await leadRef.update({
      'discoveryData.agentReachDossier.logisticsSignals.shippingSummary': summary,
    });

    return NextResponse.json({
      success: true,
      summary,
      message: `Generated AI shipping summary for ${companyName}.`,
    });
  } catch (error: any) {
    console.error('Error generating shipping summary:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
