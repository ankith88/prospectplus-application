import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Lead } from '@/lib/types';

const db = getFirestore(adminApp);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    let existingLead: Lead | null = null;
    let leadId = id;

    // 1. Try fetching directly by document ID
    const leadSnap = await db.collection('leads').doc(id).get();
    if (leadSnap.exists) {
      existingLead = { id: leadSnap.id, ...leadSnap.data() } as Lead;
      leadId = leadSnap.id;
    }

    // 2. Fallback: Search by netsuiteId if doc ID didn't match
    if (!existingLead) {
      const qNs = await db.collection('leads').where('netsuiteId', '==', id).limit(1).get();
      if (!qNs.empty) {
        const leadDoc = qNs.docs[0];
        existingLead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
        leadId = leadDoc.id;
      }
    }

    if (!existingLead) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Determine primary contact details
    const contacts = (existingLead.contacts || []) as any[];
    const primaryContact = contacts.find((c: any) => c.isPrimary) || contacts[0] || {};

    const publicCompany = {
      id: leadId,
      prospectPlusId: (existingLead as any).prospectPlusId || (existingLead as any).prospectplusId || (existingLead as any).prospect_plus_id || leadId,
      companyName: existingLead.companyName || 'Valued Customer',
      netsuiteId: (existingLead as any).netsuiteId || '',
      abn: existingLead.abn || (existingLead as any).abnNumber || (existingLead as any).abn_number || '',
      contactName: primaryContact.name || (existingLead as any).contactName || '',
      contactEmail: primaryContact.email || existingLead.customerServiceEmail || '',
      contactPhone: primaryContact.phone || existingLead.customerPhone || '',
      services: existingLead.services || [],
    };

    return NextResponse.json({ company: publicCompany });
  } catch (error) {
    console.error('[Public Company API Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
