import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';

const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      companyName,
      customerPhone,
      customerServiceEmail,
      websiteUrl,
      industryCategory,
      address,
      contacts,
      inboundDetails
    } = body;

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 });
    }

    // Prepare lead data
    const leadData: any = {
      companyName,
      customerPhone,
      customerServiceEmail,
      websiteUrl,
      industryCategory,
      address: address || {},
      status: 'New',
      customerStatus: 'New',
      bucket: 'inbound',
      fieldSales: false,
      dateLeadEntered: new Date().toISOString(),
      createdAt: serverTimestamp(),
      inboundDetails: {
        ...inboundDetails,
        submittedAt: inboundDetails?.submittedAt || new Date().toISOString()
      }
    };

    // Check for duplicates (Company Name)
    // We always create a new one, but we flag it
    const leadsRef = collection(firestore, 'leads');
    const qName = query(leadsRef, where('companyName', '==', companyName), limit(5));
    const querySnapshotName = await getDocs(qName);
    
    const similarLeads = querySnapshotName.docs.map(doc => doc.id);
    const isDuplicate = similarLeads.length > 0;

    // Add duplicate info
    leadData.isDuplicate = isDuplicate;
    leadData.similarLeads = similarLeads;

    // Create the lead
    const docRef = await addDoc(leadsRef, leadData);

    // Add contacts if provided as sub-collection
    if (contacts && Array.isArray(contacts)) {
      const contactsSubRef = collection(firestore, 'leads', docRef.id, 'contacts');
      for (const contact of contacts) {
        if (contact.name || contact.email) {
          await addDoc(contactsSubRef, {
            ...contact,
            createdAt: serverTimestamp()
          });
        }
      }
    }

    // Log initial activity
    const activityRef = collection(firestore, 'leads', docRef.id, 'activity');
    await addDoc(activityRef, {
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Lead created via Inbound API. Bucket: Inbound.${isDuplicate ? ' [POTENTIAL DUPLICATE DETECTED]' : ''}`,
      author: 'System API'
    });

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      isDuplicate,
      message: isDuplicate ? 'Lead created but flagged as potential duplicate.' : 'Lead created successfully.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating lead via API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
