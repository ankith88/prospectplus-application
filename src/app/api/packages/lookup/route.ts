import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

function formatToDDMMYYYY(dateVal: string | number | Date) {
  if (!dateVal) return 'Unknown';
  try {
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return 'Unknown';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
  } catch (e) {
    return 'Unknown';
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('id')?.trim();

  if (!identifier) {
    return NextResponse.json({ error: 'Missing package identifier' }, { status: 400 });
  }

  try {
    const db = getFirestore(adminApp);
    const packagesRef = db.collection('packages');
    
    // Search by code (barcode), order_number, or connote_number
    const byCode = await packagesRef.where('code', '==', identifier).limit(1).get();
    const byOrder = await packagesRef.where('order_number', '==', identifier).limit(1).get();
    const byConnote = await packagesRef.where('connote_numbers', 'array-contains', identifier).limit(1).get();
    
    let pkgDoc = byCode.docs[0];
    if (!pkgDoc) {
      pkgDoc = byOrder.docs[0];
    }
    if (!pkgDoc) {
      pkgDoc = byConnote.docs[0];
    }
    
    if (!pkgDoc) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }
    
    const pkg = pkgDoc.data();
    const barcode = pkg.code || identifier;

    // 1. Fetch real-time status from Protechly API
    let realTimeStatus = pkg.real_time_status ? {
      status: pkg.real_time_status.status || 'Unknown',
      delivered: !!pkg.real_time_status.delivered,
      estimated_delivery_date: pkg.real_time_status.estimated_delivery_date || null,
      last_location: pkg.real_time_status.last_location || null,
      updated_at: pkg.real_time_status.updated_at || new Date().toISOString()
    } : {
      status: 'Unknown',
      delivered: false,
      estimated_delivery_date: null,
      last_location: null,
      updated_at: new Date().toISOString()
    };

    try {
      const protechlyUrl = `https://mpns.protechly.com/track?barcode=${barcode}`;
      const protechlyRes = await fetch(protechlyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj'
        }
      });
      if (protechlyRes.ok) {
        const resData = await protechlyRes.json();
        if (resData && resData.last_status) {
          const event = resData.last_status.event || '';
          realTimeStatus = {
            status: event.charAt(0).toUpperCase() + event.slice(1),
            delivered: event.toLowerCase() === 'delivered',
            estimated_delivery_date: resData.estimated_delivery_date || null,
            last_location: resData.last_status.note || null,
            updated_at: resData.last_status.time ? new Date(resData.last_status.time).toISOString() : new Date().toISOString()
          };
        }
      }
    } catch (e) {
      console.error('Error fetching Protechly status:', e);
    }
    
    // 2. Fetch partner locations and operators to enrich scans
    const partnerLocationsSnap = await db.collection('partner_locations').get();
    const partnerLocationMap: Record<string, any> = {};
    partnerLocationsSnap.forEach(doc => {
      const data = doc.data();
      partnerLocationMap[String(data.internalId || doc.id)] = data;
    });

    const operatorsSnap = await db.collection('operators').get();
    const operatorMap: Record<string, string> = {};
    operatorsSnap.forEach(doc => {
      const op = doc.data();
      const name = `${op.givenNames || ''} ${op.surname || ''}`.trim();
      operatorMap[doc.id] = name;
    });

    // Enrich each scan
    const enrichedScans = (pkg.scans || []).map((s: any) => {
      const opName = s.operator_ns_id ? (operatorMap[String(s.operator_ns_id)] || `Operator ${s.operator_ns_id}`) : 'Unassigned';
      const locName = s.depot_id ? (partnerLocationMap[String(s.depot_id)]?.name || `Depot ${s.depot_id}`) : 'Unknown';
      
      const partnerDoc = s.depot_id ? partnerLocationMap[String(s.depot_id)] : null;
      const locAddress = partnerDoc ? [
        partnerDoc.Address1,
        partnerDoc.address2,
        partnerDoc.suburb,
        partnerDoc.state,
        partnerDoc.postCode
      ].filter(Boolean).join(', ') : '';

      return {
        ...s,
        operatorName: opName,
        partnerLocationName: locName,
        partnerLocationAddress: locAddress,
        formattedTime: s.updated_at ? new Date(s.updated_at).toLocaleString() : 'N/A'
      };
    });

    // Determine latest scan
    let latestScan = enrichedScans[enrichedScans.length - 1];
    if (enrichedScans.length > 0) {
      latestScan = enrichedScans.reduce((latest: any, current: any) => {
        return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
      }, enrichedScans[0]);
    }
    
    // Find customer details
    let customerNsId = null;
    if (pkg.scans && pkg.scans.length > 0) {
      const scanWithNsId = pkg.scans.find((s: any) => s.customer_ns_id);
      if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id;
    }
    
    let customerName = 'Unknown';
    let franchisee = 'Unknown';
    let customerContactName = '';
    let customerEmail = '';
    let customerPhone = '';
    let customerAccountNumber = '';
    let customerTier = 'Standard';
    let franchiseeMobile = '';
    let franchiseeMainContact = '';
    let companyId = '';

    let companyContacts: any[] = [];

    if (customerNsId) {
      let companyDoc = null;
      const companySnap = await db.collection('companies').where('internalid', '==', String(customerNsId)).limit(1).get();
      if (!companySnap.empty) {
        companyDoc = companySnap.docs[0];
      } else {
        const companySnapInt = await db.collection('companies').where('internalid', '==', parseInt(customerNsId)).limit(1).get();
        if (!companySnapInt.empty) {
          companyDoc = companySnapInt.docs[0];
        }
      }

      if (companyDoc) {
        companyId = companyDoc.id;
        const compData = companyDoc.data();
        customerName = compData.companyName || 'Unknown';
        franchisee = compData.franchisee || 'Unknown';
        customerAccountNumber = compData.customerEntityId || compData.entityId || String(customerNsId);
        customerTier = compData.customerTier || compData.tier || 'Standard';

        // Fetch contacts subcollection
        const contactsSnap = await companyDoc.ref.collection('contacts').get();
        if (!contactsSnap.empty) {
          companyContacts = contactsSnap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || '',
              email: data.email || '',
              phone: data.phone || '',
              isPrimary: !!data.isPrimary,
              title: data.title || data.role || ''
            };
          });

          let contact = contactsSnap.docs.find(d => d.data().isPrimary)?.data();
          if (!contact) {
            contact = contactsSnap.docs[0].data();
          }
          if (contact) {
            customerContactName = contact.name || '';
            customerEmail = contact.email || '';
            customerPhone = contact.phone || '';
          }
        }
      }
    }

    // Fetch franchisee details
    if (franchisee && franchisee !== 'Unknown') {
      const franchiseeSnap = await db.collection('franchisees').where('name', '==', franchisee).limit(1).get();
      if (!franchiseeSnap.empty) {
        const fData = franchiseeSnap.docs[0].data();
        franchiseeMainContact = fData.mainContact || '';
        franchiseeMobile = fData.mobile || '';
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

    // Query other open tickets linked to this customer account number
    const openTickets: any[] = [];
    if (customerAccountNumber) {
      const ticketsRef = db.collection('tickets');
      const openTicketsSnap = await ticketsRef
        .where('customerAccountNumber', '==', customerAccountNumber)
        .where('status', '==', 'Open')
        .get();
        
      openTicketsSnap.forEach(t => {
        const td = t.data();
        openTickets.push({
          id: t.id,
          ticketNumber: td.ticketNumber || t.id,
          enquiryType: td.enquiryType || 'Other',
          createdAt: td.createdAt ? (td.createdAt.toDate ? td.createdAt.toDate().toISOString() : td.createdAt) : null,
          priority: td.priority || 'Standard'
        });
      });
    }

    return NextResponse.json({
      customerName,
      franchisee,
      operatorDetails: operatorDetails || 'Unassigned',
      scanDetails: scanDetailsText,
      senderDetails: {
        name: customerName,
        address: 'N/A',
      },
      receiverDetails: {
        name: latestScan?.receiver_name || 'Unknown',
        address: receiverAddress || 'Unknown',
      },
      trackingHistory: pkg.scans?.map((s: any) => `${s.scan_type} - ${new Date(s.updated_at).toLocaleString()}`) || [],
      currentStatus: realTimeStatus.status || pkg.real_time_status?.status || latestScan?.scan_type || 'Unknown',
      
      // New enriched fields
      customerDetails: {
        contactName: customerContactName,
        company: customerName,
        accountNumber: customerAccountNumber,
        tier: customerTier,
        email: customerEmail,
        phone: customerPhone,
        companyId: companyId,
        contacts: companyContacts
      },
      receiverFullDetails: {
        name: latestScan?.receiver_name || 'Unknown',
        address: [latestScan?.address1, latestScan?.address2, latestScan?.receiver_suburb, latestScan?.state, latestScan?.post_code].filter(Boolean).join(', '),
        email: latestScan?.email || '',
        phone: latestScan?.phone || '',
      },
      trackingData: {
        currentStatus: realTimeStatus.status || pkg.real_time_status?.status || latestScan?.scan_type || 'Unknown',
        statusUpdatedAt: realTimeStatus.updated_at ? formatToDDMMYYYY(realTimeStatus.updated_at) : 'Unknown',
        statusUpdatedAtRaw: realTimeStatus.updated_at || null,
        lastScan: latestScan ? `${latestScan.scan_type} at ${latestScan.partnerLocationName || 'Unknown'}` : 'Unknown',
        lastMovement: latestScan?.updated_at ? formatToDDMMYYYY(latestScan.updated_at) : 'Unknown',
        lastMovementRaw: latestScan?.updated_at || null,
        currentDepot: latestScan?.partnerLocationName || 'Unknown',
        eta: realTimeStatus.estimated_delivery_date || 'Unknown',
        pod: realTimeStatus.delivered ? 'Delivered' : 'Not yet available',
        sender: `${customerName}, ${franchisee}`,
        receiver: latestScan ? `${latestScan.receiver_name || 'Unknown'}, ${receiverAddress}` : 'Unknown',
        serviceType: pkg.service_type || 'MailPlus Premium',
        lodgementHub: latestScan?.partnerLocationName || 'Unknown',
        hubAddress: latestScan?.partnerLocationAddress || 'Unknown',
        lodgingDriver: franchiseeMainContact ? `${franchiseeMainContact} — MP Franchisee ${franchisee}` : franchisee,
        franchiseeContact: franchiseeMobile || 'Unknown',
      },
      realTimeStatus,
      enrichedScans,
      openTickets,
      packageInfo: {
        code: pkg.code || identifier,
        description: pkg.description || 'N/A',
        weight: pkg.weight || 'N/A',
        dimensions: pkg.dimensions && pkg.dimensions !== 'N/A' 
          ? pkg.dimensions 
          : (pkg.length || pkg.width || pkg.height)
            ? `${pkg.length || 0}x${pkg.width || 0}x${pkg.height || 0} cm`
            : 'N/A',
        orderNumber: pkg.order_number || 'N/A',
        connoteNumber: pkg.connote_number || (pkg.scans && pkg.scans.length > 0 ? pkg.scans[pkg.scans.length - 1].connote_number : 'N/A'),
        serviceType: pkg.service_type || 'N/A',
        createdAt: pkg.created_at || null,
        updatedAt: pkg.updated_at || null,
      }
    });

  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json({ error: 'Failed to lookup package' }, { status: 500 });
  }
}
