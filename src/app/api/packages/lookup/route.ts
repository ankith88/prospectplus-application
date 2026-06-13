import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('id');

  if (!identifier) {
    return NextResponse.json({ error: 'Missing package identifier' }, { status: 400 });
  }

  try {
    const db = getFirestore(adminApp);
    const packagesRef = db.collection('packages');
    
    // Search by code (barcode) or order_number
    const byCode = await packagesRef.where('code', '==', identifier).limit(1).get();
    const byOrder = await packagesRef.where('order_number', '==', identifier).limit(1).get();
    
    let pkgDoc = byCode.docs[0];
    if (!pkgDoc) {
      pkgDoc = byOrder.docs[0];
    }
    
    if (!pkgDoc) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }
    
    const pkg = pkgDoc.data();
    
    // Determine latest scan
    let latestScan = pkg.scans?.[pkg.scans.length - 1];
    if (pkg.scans && pkg.scans.length > 0) {
      latestScan = pkg.scans.reduce((latest: any, current: any) => {
        return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
      }, pkg.scans[0]);
    }
    
    // Find customer details
    let customerNsId = null;
    if (pkg.scans && pkg.scans.length > 0) {
      const scanWithNsId = pkg.scans.find((s: any) => s.customer_ns_id);
      if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id;
    }
    
    let customerName = null;
    let franchisee = null;
    if (customerNsId) {
      const companySnap = await db.collection('companies').where('internalid', '==', String(customerNsId)).limit(1).get();
      if (!companySnap.empty) {
        customerName = companySnap.docs[0].data().companyName;
        franchisee = companySnap.docs[0].data().franchisee;
      } else {
        // Fallback to integer check if string didn't match
        const companySnapInt = await db.collection('companies').where('internalid', '==', parseInt(customerNsId)).limit(1).get();
        if (!companySnapInt.empty) {
          customerName = companySnapInt.docs[0].data().companyName;
          franchisee = companySnapInt.docs[0].data().franchisee;
        }
      }
    }
    
    // Find operator details
    let operatorNsId = pkg.operator_ns_id;
    if (!operatorNsId && pkg.scans && pkg.scans.length > 0) {
      const scanWithOpNsId = pkg.scans.find((s: any) => s.operator_ns_id);
      if (scanWithOpNsId) operatorNsId = scanWithOpNsId.operator_ns_id;
    }
    
    let operatorDetails = null;
    if (operatorNsId) {
      const operatorDoc = await db.collection('operators').doc(String(operatorNsId)).get();
      if (operatorDoc.exists) {
        const op = operatorDoc.data() as any;
        operatorDetails = `${op.givenNames || ''} ${op.surname || ''}`.trim();
        if (op.contactPhone) operatorDetails += ` (${op.contactPhone})`;
      }
    }

    // Format response
    const scanDetailsText = latestScan 
      ? `${latestScan.scan_type} at ${new Date(latestScan.updated_at).toLocaleString()}` 
      : 'No scans recorded';

    const receiverAddress = [
      latestScan?.receiver_suburb, 
      latestScan?.state, 
      latestScan?.post_code
    ].filter(Boolean).join(', ');

    return NextResponse.json({
      customerName: customerName || 'Unknown',
      franchisee: franchisee || 'Unknown',
      operatorDetails: operatorDetails || 'Unassigned',
      scanDetails: scanDetailsText,
      senderDetails: {
        name: 'Check CRM / External System',
        address: 'N/A',
      },
      receiverDetails: {
        name: latestScan?.receiver_name || 'Unknown',
        address: receiverAddress || 'Unknown',
      },
      trackingHistory: pkg.scans?.map((s: any) => `${s.scan_type} - ${new Date(s.updated_at).toLocaleString()}`) || [],
      currentStatus: pkg.real_time_status?.status || latestScan?.scan_type || 'Unknown'
    });

  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json({ error: 'Failed to lookup package' }, { status: 500 });
  }
}
