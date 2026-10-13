import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { generateLeadDossier } from '@/services/agent-reach/lead-dossier';

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
    const suburb = leadData.address?.city || leadData.city || leadData.address?.suburb || leadData.suburb || '';
    const state = leadData.address?.state || leadData.state || '';

    // Run full dossier generator
    const dossier = await generateLeadDossier({
      leadId,
      companyName,
      websiteUrl,
      suburb,
      state,
    });

    // Prepare Firestore update
    const updatePayload: Record<string, any> = {
      'discoveryData.agentReachDossier': dossier,
      'discoveryData.decisionMakerCandidates': dossier.decisionMakers,
      'discoveryData.socialIntelligence': dossier.socialIntelligence,
    };

    // If website was newly discovered, persist it
    if (!websiteUrl && dossier.officialWebsite) {
      updatePayload.websiteUrl = dossier.officialWebsite;
    }

    // If decision maker not set, populate from top candidate
    if (!leadData.decisionMakerName && dossier.decisionMakers.length > 0) {
      updatePayload.decisionMakerName = dossier.decisionMakers[0].name;
      updatePayload.decisionMakerTitle = dossier.decisionMakers[0].title;
    }

    // Update shipper evidence if new carriers detected
    if (dossier.logisticsSignals?.carrierDetected && dossier.logisticsSignals.carrierDetected.length > 0) {
      const carriersStr = dossier.logisticsSignals.carrierDetected.join(', ');
      if (!leadData.apRelationship || leadData.apRelationship === 'Not Detected') {
        updatePayload.apRelationship = `Carriers detected online: ${carriersStr}`;
      }
    }

    await leadRef.update(updatePayload);

    return NextResponse.json({
      success: true,
      data: dossier,
      message: `Deep intelligence dossier generated for ${companyName}.`,
    });
  } catch (error: any) {
    console.error('Error generating deep research dossier:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
