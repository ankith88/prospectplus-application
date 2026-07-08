import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { generateEmailDraft } from '@/ai/flows/generate-email-draft';

const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    const { leadId, customInstruction } = await req.json();
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Missing leadId' }, { status: 400 });
    }

    // 1. Fetch Lead
    const leadRef = db.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const leadData = leadSnap.data()!;
    const leadProfile = `
      Company Name: ${leadData.companyName || 'Unknown'}
      Current CRM Status: ${leadData.status || 'New'}
      Industry: ${leadData.industryCategory || 'Unknown'}
      Description: ${leadData.companyDescription || 'No description available.'}
      Assigned Rep: ${leadData.dialerAssigned || leadData.salesRepAssigned || 'Unassigned'}
    `;

    // 2. Fetch Emails
    const emailsRef = db.collection('leads').doc(leadId).collection('emails');
    const q = emailsRef.orderBy('sentAt', 'desc').limit(5);
    const emailsSnap = await q.get();

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

    // 3. Generate Draft
    const draftText = await generateEmailDraft({
      leadProfile,
      emailHistory,
      customInstruction,
    });

    return NextResponse.json({ success: true, draft: draftText });
  } catch (error: any) {
    console.error('Error generating email draft:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
