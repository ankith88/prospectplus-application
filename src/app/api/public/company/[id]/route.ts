import { NextResponse } from 'next/server';
import { findLeadByIdOrInternalId } from '@/lib/lead-lookup';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const result = await findLeadByIdOrInternalId(id);

    if (!result) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const existingLead = result.lead;
    const leadId = result.leadId;

    // Determine primary contact details
    const contacts = (existingLead.contacts || []) as any[];
    const primaryContact = contacts.find((c: any) => c.isPrimary) || contacts[0] || {};

    const publicCompany = {
      id: leadId,
      prospectPlusId: (existingLead as any).prospectPlusId || (existingLead as any).prospectplusId || (existingLead as any).prospect_plus_id || leadId,
      companyName: existingLead.companyName || 'Valued Customer',
      netsuiteId: (existingLead as any).netsuiteId || (existingLead as any).internalid || (existingLead as any).internalId || '',
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
