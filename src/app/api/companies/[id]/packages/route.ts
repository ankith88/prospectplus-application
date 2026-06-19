import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const companyId = resolvedParams.id;
  try {
    const db = getFirestore(adminApp);
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    const internalid = companyDoc.data()?.internalid;
    if (!internalid) {
       return NextResponse.json({ packages: [] });
    }

    const packagesRef = db.collection('packages');
    const snapshot = await packagesRef.get();
    
    const targetNsId = String(internalid);
    const targetNsIdNum = Number(internalid);
    
    const filteredPackages: any[] = [];
    snapshot.forEach(doc => {
      const pkg = doc.data();
      let match = false;
      if (pkg.scans && pkg.scans.length > 0) {
        match = pkg.scans.some((s: any) => 
          String(s.customer_ns_id) === targetNsId || (!isNaN(targetNsIdNum) && Number(s.customer_ns_id) === targetNsIdNum)
        );
      }
      if (match) {
        filteredPackages.push({
          code: pkg.code,
          order_number: pkg.order_number,
          sync_date: pkg.sync_date,
          scans: pkg.scans,
          real_time_status: pkg.real_time_status
        });
      }
    });

    return NextResponse.json({ packages: filteredPackages });
  } catch (error) {
    console.error('Packages lookup error:', error);
    return NextResponse.json({ error: 'Failed to lookup packages' }, { status: 500 });
  }
}
