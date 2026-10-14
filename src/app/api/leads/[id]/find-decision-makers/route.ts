import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { findDecisionMakers } from '@/services/agent-reach/linkedin-finder';
import { Contact, DecisionMakerCandidate } from '@/lib/types';

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

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    // Action 1: Add a specific candidate directly to Lead Contacts
    if (body.action === 'add_contact' && body.candidate) {
      const candidate: DecisionMakerCandidate = body.candidate;
      const existingContacts: Contact[] = leadData.contacts || [];

      // Check for duplicate by name or linkedinUrl
      const candName = candidate.name?.trim().toLowerCase();
      const isDuplicate = existingContacts.some(
        (c) =>
          (c?.name && candName && c.name.trim().toLowerCase() === candName) ||
          Boolean(candidate.linkedinUrl && c?.linkedinUrl && c.linkedinUrl === candidate.linkedinUrl)
      );

      if (isDuplicate) {
        return NextResponse.json({
          success: true,
          message: `${candidate.name} is already listed in contacts.`,
          contacts: existingContacts,
        });
      }

      const nameParts = candidate.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const newContact: Contact = {
        id: `ct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: candidate.name,
        firstName,
        lastName,
        title: candidate.title,
        email: candidate.email || '',
        phone: candidate.phone || leadData.customerPhone || leadData.phone || '',
        linkedinUrl: candidate.linkedinUrl,
      };

      const updatedContacts = [...existingContacts, newContact];
      await leadRef.update({
        contacts: updatedContacts,
        contactCount: updatedContacts.length,
        decisionMakerName: candidate.name,
        decisionMakerTitle: candidate.title,
      });

      return NextResponse.json({
        success: true,
        message: `Added ${candidate.name} (${candidate.title}) to Lead Contacts.`,
        contact: newContact,
        contacts: updatedContacts,
      });
    }

    // Action 2: Search for key decision makers via Agent Reach / LinkedIn
    const candidates = await findDecisionMakers(companyName, websiteUrl);

    // Save candidates to lead's discoveryData so they persist
    await leadRef.update({
      'discoveryData.decisionMakerCandidates': candidates,
      ...(candidates.length > 0 && !leadData.decisionMakerName
        ? {
            decisionMakerName: candidates[0].name,
            decisionMakerTitle: candidates[0].title,
          }
        : {}),
    });

    return NextResponse.json({
      success: true,
      data: candidates,
      companyName,
      message: `Found ${candidates.length} key decision makers for ${companyName}.`,
    });
  } catch (error: any) {
    console.error('Error finding decision makers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
