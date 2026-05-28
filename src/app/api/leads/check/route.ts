import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function GET(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const companyName = searchParams.get('companyName');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');

    if (!id && !companyName && !email && !phone) {
      return NextResponse.json(
        { error: 'Please provide id, companyName, email, or phone to check lead existence' },
        { status: 400 }
      );
    }

    if (id) {
      const leadRef = doc(firestore, 'leads', id);
      const leadSnap = await getDoc(leadRef);

      if (leadSnap.exists()) {
        return NextResponse.json({
          exists: true,
          lead: { id: leadSnap.id, ...leadSnap.data() }
        });
      } else {
        return NextResponse.json({ exists: false, message: 'Lead not found' }, { status: 404 });
      }
    }

    // Otherwise query by fields
    const leadsRef = collection(firestore, 'leads');
    let q = query(leadsRef);

    if (companyName) {
      q = query(q, where('companyName', '==', companyName));
    }
    if (email) {
      q = query(q, where('customerServiceEmail', '==', email));
    }
    if (phone) {
      q = query(q, where('customerPhone', '==', phone));
    }

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Return the first match
      const firstLead = querySnapshot.docs[0];
      return NextResponse.json({
        exists: true,
        lead: { id: firstLead.id, ...firstLead.data() }
      });
    } else {
      return NextResponse.json({ exists: false, message: 'Lead not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error checking lead existence via API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
