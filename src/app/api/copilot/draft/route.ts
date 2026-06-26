import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { generateEmailDraft } from '@/ai/flows/generate-email-draft';

export async function POST(req: NextRequest) {
  try {
    const { leadId, customInstruction } = await req.json();
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Missing leadId' }, { status: 400 });
    }

    // 1. Fetch Lead
    const leadRef = doc(firestore, 'leads', leadId);
    const leadSnap = await getDoc(leadRef);
    if (!leadSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const leadData = leadSnap.data();
    const leadProfile = `
      Company Name: ${leadData.companyName || 'Unknown'}
      Current CRM Status: ${leadData.status || 'New'}
      Industry: ${leadData.industryCategory || 'Unknown'}
      Description: ${leadData.companyDescription || 'No description available.'}
      Assigned Rep: ${leadData.dialerAssigned || leadData.salesRepAssigned || 'Unassigned'}
    `;

    // 2. Fetch Emails
    const emailsRef = collection(firestore, 'leads', leadId, 'emails');
    const q = query(emailsRef, orderBy('sentAt', 'desc'), limit(5));
    const emailsSnap = await getDocs(q);

    let emailHistory = 'No previous email exchanges recorded.';
    if (!emailsSnap.empty) {
      emailHistory = emailsSnap.docs
        .map((d) => {
          const data = d.data();
          return `Sender: ${data.sender} | Date: ${data.sentAt}\nSubject: ${data.subject}\nBody: ${data.bodyHtml}\n---`;
        })
        .reverse()
        .join('\n');
    }

    // 3. Call Genkit Flow
    const draft = await generateEmailDraft({
      emailHistory,
      leadProfile,
      customInstruction: customInstruction || 'Please draft a friendly follow-up email.',
    });

    return NextResponse.json({ success: true, draft });
  } catch (error: any) {
    console.error('Error generating draft:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
