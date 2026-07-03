import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');
  const API_KEY = process.env.PROSPECTPLUS_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';

  if (apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { postcode, city } = await req.json();

    if (!postcode || !city) {
      return NextResponse.json({ error: 'postcode and city are required' }, { status: 400 });
    }

    const zipTrimmed = postcode.trim();
    const cityTrimmed = city.trim().toUpperCase();

    const matchedFranchiseeIds: string[] = [];
    const matchedFranchiseeNames: string[] = [];

    const franchiseesRef = collection(firestore, 'franchisees');
    const franchiseesSnap = await getDocs(franchiseesRef);

    franchiseesSnap.docs.forEach(doc => {
      const data = doc.data();
      const territories = data.territoryJson || [];
      const matches = territories.some((t: any) => t.post_code === zipTrimmed && (t.suburbs || '').toUpperCase() === cityTrimmed);
      if (matches) {
        matchedFranchiseeIds.push(data.internalId || doc.id);
        matchedFranchiseeNames.push(data.name || data.franchiseeName || doc.id);
      }
    });

    const serviceable = matchedFranchiseeIds.length > 0;

    return NextResponse.json({
      serviceable,
      franchisees: matchedFranchiseeNames,
      franchiseeIds: matchedFranchiseeIds,
      count: matchedFranchiseeIds.length
    });
  } catch (error: any) {
    console.error('Error checking territory:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
