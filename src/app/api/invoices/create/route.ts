import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { createCustomerInvoiceInNetSuite, CreateCustomerInvoicePayload } from '@/services/netsuite-invoice-proxy';
import { normalizeFrequencyDays } from '@/lib/australian-state-holidays';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      companyId,
      customerId,
      franchiseeId,
      location,
      department,
      customerPo,
      poNumber,
      periodStartDate,
      periodEndDate,
      invoiceDate,
      tranDate,
      invoiceType,
      lines,
      adminFeeRows,
      billingAddress,
      companyAbn,
      requestorUid,
      requestorRole,
      requestorName
    } = body || {};

    const resolvedPoNumber = (customerPo || poNumber || '').trim();

    // 1. Role-based Security Validation (Franchisee Lockout)
    const normalizedRole = String(requestorRole || '').trim().toLowerCase();
    if (normalizedRole === 'franchisee') {
      return NextResponse.json(
        { success: false, error: 'Invoice creation is currently restricted to Administrators and Superadmins.' },
        { status: 403 }
      );
    }

    if (requestorUid) {
      const userDoc = await db.collection('users').doc(requestorUid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const activeRole = String(userData?.activeRole || userData?.role || '').toLowerCase();
        if (activeRole === 'franchisee') {
          return NextResponse.json(
            { success: false, error: 'Invoice creation is currently restricted to Administrators and Superadmins.' },
            { status: 403 }
          );
        }
      }
    }

    // 2. Validate Required Fields
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: companyId' },
        { status: 400 }
      );
    }

    if (!customerId || !franchiseeId) {
      return NextResponse.json(
        { success: false, error: 'Missing required NetSuite customerId or franchiseeId' },
        { status: 400 }
      );
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one invoice line item is required' },
        { status: 400 }
      );
    }

    if (!periodStartDate || !periodEndDate) {
      return NextResponse.json(
        { success: false, error: 'Both periodStartDate and periodEndDate are required (DD/MM/YYYY)' },
        { status: 400 }
      );
    }

    // 3. Dispatch to NetSuite API Proxy
    const netSuitePayload: CreateCustomerInvoicePayload = {
      customerId: String(customerId).trim(),
      franchiseeId: String(franchiseeId).trim(),
      ...(location ? { location: String(location).trim() } : {}),
      ...(department ? { department: String(department).trim() } : {}),
      ...(resolvedPoNumber ? { customerPo: resolvedPoNumber, poNumber: resolvedPoNumber } : {}),
      periodStartDate: String(periodStartDate).trim(),
      periodEndDate: String(periodEndDate).trim(),
      ...(invoiceDate || tranDate ? { invoiceDate: String(invoiceDate || tranDate).trim(), tranDate: String(tranDate || invoiceDate).trim() } : {}),
      ...(invoiceType ? { invoiceType: String(invoiceType).trim() } : {}),
      lines: lines.map((l: any) => ({
        qty: l.qty ?? '1',
        amount: l.amount ?? '0.00',
        itemId: l.itemId ?? '',
        itemName: l.itemName ?? '',
        rate: l.rate ?? '0.00',
        itemDetails: l.itemDetails ?? ''
      })),
      adminFeeRows: Array.isArray(adminFeeRows) ? adminFeeRows : []
    };

    const netSuiteRes = await createCustomerInvoiceInNetSuite(netSuitePayload);

    if (!netSuiteRes.success) {
      return NextResponse.json(
        { success: false, error: netSuiteRes.error || 'NetSuite failed to create customer invoice' },
        { status: 400 }
      );
    }

    const { invoiceId, lpoInvoiceId, invoiceCustomerId, resolvedCustomerId } = netSuiteRes;

    // 4. Resolve Target Company Document in Firestore
    let resolvedCompanyDocId = companyId;
    let companyDocRef = db.collection('companies').doc(companyId);
    let companyDocSnap = await companyDocRef.get();

    if (!companyDocSnap.exists) {
      // Try searching by internalid or customerEntityId
      let querySnap = await db.collection('companies').where('internalid', '==', companyId).limit(1).get();
      if (querySnap.empty && !isNaN(Number(companyId))) {
        querySnap = await db.collection('companies').where('internalid', '==', Number(companyId)).limit(1).get();
      }
      if (querySnap.empty) {
        querySnap = await db.collection('companies').where('customerEntityId', '==', String(customerId)).limit(1).get();
      }

      if (!querySnap.empty) {
        resolvedCompanyDocId = querySnap.docs[0].id;
        companyDocRef = db.collection('companies').doc(resolvedCompanyDocId);
        companyDocSnap = querySnap.docs[0];
      } else {
        // Check leads collection
        const leadDocRef = db.collection('leads').doc(companyId);
        const leadDocSnap = await leadDocRef.get();
        if (leadDocSnap.exists) {
          resolvedCompanyDocId = companyId;
          companyDocRef = leadDocRef;
        }
      }
    }

    // Calculate total invoice amount
    const linesTotal = lines.reduce((acc: number, l: any) => {
      const amt = typeof l.amount === 'number' ? l.amount : parseFloat(String(l.amount || '0'));
      return acc + (isNaN(amt) ? 0 : amt);
    }, 0);

    const adminFeesTotal = (adminFeeRows || []).reduce((acc: number, r: any) => {
      const q = typeof r.qty === 'number' ? r.qty : parseFloat(String(r.qty || '1'));
      const rate = typeof r.rate === 'number' ? r.rate : parseFloat(String(r.rate || '0'));
      return acc + ((isNaN(q) ? 1 : q) * (isNaN(rate) ? 0 : rate));
    }, 0);

    const invoiceTotalNumber = Number((linesTotal + adminFeesTotal).toFixed(2));

    // Normalize items for Firestore
    const normalizedItems = lines.map((l: any) => {
      const q = typeof l.qty === 'number' ? l.qty : parseFloat(String(l.qty || '1'));
      const r = typeof l.rate === 'number' ? l.rate : parseFloat(String(l.rate || '0'));
      const a = typeof l.amount === 'number' ? l.amount : parseFloat(String(l.amount || '0'));
      return {
        service: l.itemName || l.service || 'Service',
        itemName: l.itemName || l.service || 'Service',
        itemId: String(l.itemId || ''),
        rate: isNaN(r) ? 0 : r,
        qty: isNaN(q) ? 1 : q,
        totalAmount: isNaN(a) ? (isNaN(r) ? 0 : r) * (isNaN(q) ? 1 : q) : a,
        itemDetails: l.itemDetails || ''
      };
    });

    const firestoreInvoiceDoc = {
      id: String(invoiceId),
      documentId: String(invoiceId),
      invoiceDocumentID: String(invoiceId),
      invoiceInternalID: String(invoiceId),
      invoiceDate: invoiceDate || periodEndDate || new Date().toISOString(),
      periodStartDate: String(periodStartDate),
      periodEndDate: String(periodEndDate),
      invoiceTotal: invoiceTotalNumber,
      invoiceType: invoiceType || 'Service',
      invoiceStatus: 'Open',
      status: 'Open',
      syncedWithNetSuite: true,
      customerId: String(customerId),
      franchiseeId: String(franchiseeId),
      customerPO: resolvedPoNumber || null,
      poNumber: resolvedPoNumber || null,
      location: location ? String(location) : null,
      department: department ? String(department) : null,
      lpoInvoiceId: lpoInvoiceId || null,
      invoiceCustomerId: invoiceCustomerId || null,
      resolvedCustomerId: resolvedCustomerId || null,
      items: normalizedItems,
      billingAddress: billingAddress || null,
      companyAddress: billingAddress || null,
      abn: companyAbn || (companyDocSnap.exists ? companyDocSnap.data()?.abn : null) || null,
      companyAbn: companyAbn || (companyDocSnap.exists ? companyDocSnap.data()?.abn : null) || null,
      adminFeeRows: (adminFeeRows || []).map((r: any) => ({
        qty: Number(r.qty || 1),
        rate: Number(r.rate || 9.0)
      })),
      createdByUser: {
        uid: requestorUid || null,
        name: requestorName || 'Administrator',
        role: requestorRole || 'Admin'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 5. Save Document in invoices subcollection using invoiceId as doc ID
    await companyDocRef.collection('invoices').doc(String(invoiceId)).set(firestoreInvoiceDoc, { merge: true });

    // 6. Update company's services in Firestore so future invoices default to the selected frequency
    try {
      const companyData = companyDocSnap.exists ? companyDocSnap.data() || {} : {};
      const currentServices: any[] = Array.isArray(companyData.services) ? [...companyData.services] : [];

      lines.forEach((l: any) => {
        const name = String(l.itemName || l.service || '').trim();
        const freqRaw = l.frequency;
        const rateNum = typeof l.rate === 'number' ? l.rate : parseFloat(String(l.rate || '0'));

        if (!name) return;

        // Normalize frequency to standard array or string
        let freqValue: any = freqRaw;
        if (typeof freqRaw === 'string') {
          const norm = normalizeFrequencyDays(freqRaw);
          if (Array.isArray(norm) && norm.length > 0) {
            freqValue = norm;
          } else if (norm === 'Adhoc') {
            freqValue = 'Adhoc';
          }
        }

        const existingIdx = currentServices.findIndex(s => 
          String(s.name || s.service || '').trim().toLowerCase() === name.toLowerCase()
        );

        if (existingIdx >= 0) {
          currentServices[existingIdx] = {
            ...currentServices[existingIdx],
            name: name,
            frequency: freqValue !== undefined && freqValue !== null && freqValue !== '' ? freqValue : currentServices[existingIdx].frequency,
            rate: !isNaN(rateNum) && rateNum > 0 ? rateNum : currentServices[existingIdx].rate
          };
        } else {
          currentServices.push({
            name: name,
            frequency: freqValue || 'Mon,Tue,Wed,Thu,Fri',
            rate: !isNaN(rateNum) ? rateNum : 0,
            startDate: new Date().toISOString().split('T')[0]
          });
        }
      });

      if (currentServices.length > 0) {
        await companyDocRef.set({
          services: currentServices,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Also update leads collection if mirror doc exists
        const leadDocRef = db.collection('leads').doc(resolvedCompanyDocId);
        const leadDocSnap = await leadDocRef.get();
        if (leadDocSnap.exists) {
          await leadDocRef.set({
            services: currentServices,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (svcUpdateErr) {
      console.warn('[Invoice Create API] Failed to update customer services array:', svcUpdateErr);
    }

    // 7. Log activity audit record
    try {
      const poDesc = resolvedPoNumber ? ` (PO: ${resolvedPoNumber})` : '';
      await companyDocRef.collection('activity').add({
        type: 'Update',
        notes: `Created NetSuite Invoice #${invoiceId}${poDesc} for billing period ${periodStartDate} - ${periodEndDate}. Total: $${invoiceTotalNumber.toFixed(2)} (${normalizedItems.length} line item${normalizedItems.length === 1 ? '' : 's'}).`,
        author: requestorName || 'Administrator',
        date: new Date().toISOString(),
        isAutomated: false,
        source: 'manual_invoice_creation'
      });
    } catch (actErr) {
      console.warn('[Invoice Create API] Could not record activity entry:', actErr);
    }

    return NextResponse.json({
      success: true,
      invoiceCreated: true,
      invoiceId: String(invoiceId),
      lpoInvoiceId,
      invoiceCustomerId,
      resolvedCustomerId,
      companyId: resolvedCompanyDocId
    });

  } catch (err: any) {
    console.error('[Invoice Create API Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'An unexpected server error occurred' },
      { status: 500 }
    );
  }
}
