import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, limit, doc, getDoc } from 'firebase/firestore';
import { ai } from '@/ai/genkit';

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json();
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Missing leadId' }, { status: 400 });
    }

    // 1. Fetch emails
    const emailsRef = collection(firestore, 'leads', leadId, 'emails');
    const q = query(emailsRef, orderBy('sentAt', 'desc'), limit(10));
    const emailsSnap = await getDocs(q);

    if (emailsSnap.empty) {
      return NextResponse.json({ success: true, summary: 'No email history found for this lead.' });
    }

    const emails = emailsSnap.docs.map((d) => {
      const data = d.data();
      return `From: ${data.sender} | To: ${data.recipient} | Date: ${data.sentAt}\nSubject: ${data.subject}\nBody: ${data.bodyHtml}\n---`;
    });

    const threadText = emails.reverse().join('\n');

    // 2. Generate summary
    const response = await ai.generate({
      prompt: `Summarize the following email exchange with a lead in a short, bulleted list of key points. Highlight any objections, questions, or action items. Keep the summary under 120 words.
      
      Email Thread:
      ${threadText}`,
    });

    return NextResponse.json({ success: true, summary: response.text });
  } catch (error: any) {
    console.error('Error generating email summary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
