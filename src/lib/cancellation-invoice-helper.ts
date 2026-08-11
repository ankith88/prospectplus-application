import { firestore } from '@/lib/firebase';
import { collection, getDocs, getDoc, doc, query, where, limit } from 'firebase/firestore';
import { Invoice } from '@/lib/types';
import { parseISO, format, isValid } from 'date-fns';

export interface InvoiceAvgResult {
  avgMonthlyInvoice: number;
  monthsFound: number;
  invoicesCount: number;
  recentInvoices: Invoice[];
  isSignedCustomer: boolean;
}

function parseDateRobust(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') {
    try { return dateVal.toDate(); } catch {}
  }
  if (typeof dateVal === 'object' && dateVal._seconds) {
    return new Date(dateVal._seconds * 1000);
  }
  if (typeof dateVal === 'object' && dateVal.seconds) {
    return new Date(dateVal.seconds * 1000);
  }
  if (dateVal instanceof Date && isValid(dateVal)) return dateVal;
  if (typeof dateVal === 'string') {
    let parsed = parseISO(dateVal);
    if (isValid(parsed)) return parsed;
    parsed = new Date(dateVal);
    if (isValid(parsed)) return parsed;
    const parts = dateVal.split(/[/.-]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      parsed = new Date(y, m, d);
      if (isValid(parsed)) return parsed;
    }
  }
  return null;
}

/**
 * Resolves all candidate Firestore company/lead document IDs given an array of candidate IDs
 * (e.g. leadId, companyId, netsuiteId, prospectPlusId).
 */
async function resolveFirestoreDocIds(candidateIds: string[]): Promise<string[]> {
  const resolved = new Set<string>();

  for (const rawId of candidateIds) {
    if (!rawId || typeof rawId !== 'string') continue;
    const cleanId = rawId.trim();
    if (!cleanId) continue;

    // 1. Direct document check in companies & leads
    try {
      const compSnap = await getDoc(doc(firestore, 'companies', cleanId));
      if (compSnap.exists()) {
        resolved.add(compSnap.id);
      }
    } catch {}

    try {
      const leadSnap = await getDoc(doc(firestore, 'leads', cleanId));
      if (leadSnap.exists()) {
        resolved.add(leadSnap.id);
      }
    } catch {}

    // 2. Query companies collection by netsuiteId, internalid (string or number), prospectPlusId
    const searchKeys = ['netsuiteId', 'internalid', 'internalId', 'prospectPlusId', 'customerEntityId'];
    
    for (const key of searchKeys) {
      try {
        const qComp = query(collection(firestore, 'companies'), where(key, '==', cleanId), limit(1));
        const qSnap = await getDocs(qComp);
        if (!qSnap.empty) {
          resolved.add(qSnap.docs[0].id);
        }
      } catch {}

      if (!isNaN(Number(cleanId))) {
        try {
          const qCompNum = query(collection(firestore, 'companies'), where(key, '==', Number(cleanId)), limit(1));
          const qSnapNum = await getDocs(qCompNum);
          if (!qSnapNum.empty) {
            resolved.add(qSnapNum.docs[0].id);
          }
        } catch {}
      }
    }

    // 3. Query leads collection by netsuiteId, internalid
    for (const key of ['netsuiteId', 'internalid', 'internalId']) {
      try {
        const qLead = query(collection(firestore, 'leads'), where(key, '==', cleanId), limit(1));
        const qSnap = await getDocs(qLead);
        if (!qSnap.empty) {
          resolved.add(qSnap.docs[0].id);
        }
      } catch {}

      if (!isNaN(Number(cleanId))) {
        try {
          const qLeadNum = query(collection(firestore, 'leads'), where(key, '==', Number(cleanId)), limit(1));
          const qSnapNum = await getDocs(qLeadNum);
          if (!qSnapNum.empty) {
            resolved.add(qSnapNum.docs[0].id);
          }
        } catch {}
      }
    }
  }

  return Array.from(resolved);
}

/**
 * Fetches invoices for a given customer from Firestore across all resolved company/lead document IDs,
 * and calculates the average monthly invoice value over the 3 available billing months PRIOR to the
 * most recent month (ignoring the last month with an invoice as it may be pro-rated/partial).
 *
 * If no prior invoices exist in Firestore, returns avgMonthlyInvoice = 0.
 */
export async function fetch3MonthAvgInvoiceMRR(
  companyId?: string,
  leadId?: string,
  netsuiteId?: string,
  prospectPlusId?: string
): Promise<InvoiceAvgResult> {
  const candidateIds = Array.from(new Set([companyId, leadId, netsuiteId, prospectPlusId].filter(Boolean) as string[]));
  
  if (candidateIds.length === 0) {
    return { avgMonthlyInvoice: 0, monthsFound: 0, invoicesCount: 0, recentInvoices: [], isSignedCustomer: false };
  }

  const docIdsToQuery = await resolveFirestoreDocIds(candidateIds);
  const targetIds = docIdsToQuery.length > 0 ? docIdsToQuery : candidateIds;

  let rawInvoices: Invoice[] = [];
  let isSignedCustomer = docIdsToQuery.length > 0;

  for (const id of targetIds) {
    try {
      // 1. Try companies/{id}/invoices
      const compInvoicesRef = collection(firestore, 'companies', id, 'invoices');
      const compSnap = await getDocs(compInvoicesRef);
      if (!compSnap.empty) {
        compSnap.forEach(d => {
          rawInvoices.push({ id: d.id, ...d.data() } as Invoice);
        });
      }

      // 2. Try leads/{id}/invoices if needed
      const leadInvoicesRef = collection(firestore, 'leads', id, 'invoices');
      const leadSnap = await getDocs(leadInvoicesRef);
      if (!leadSnap.empty) {
        leadSnap.forEach(d => {
          rawInvoices.push({ id: d.id, ...d.data() } as Invoice);
        });
      }
    } catch (e) {
      console.error(`Error fetching invoices for ID ${id}:`, e);
    }
  }

  if (rawInvoices.length === 0) {
    return { avgMonthlyInvoice: 0, monthsFound: 0, invoicesCount: 0, recentInvoices: [], isSignedCustomer };
  }

  // Deduplicate invoices by document ID or invoiceDocumentID/invoiceInternalID
  const invoiceMap = new Map<string, Invoice>();
  rawInvoices.forEach(inv => {
    const key = inv.invoiceInternalID || inv.invoiceDocumentID || inv.id || String(Math.random());
    if (!invoiceMap.has(key)) {
      invoiceMap.set(key, inv);
    }
  });
  const uniqueInvoices = Array.from(invoiceMap.values());

  // Group invoice amounts by YYYY-MM month
  const monthlyTotals = new Map<string, number>();

  uniqueInvoices.forEach(inv => {
    const dateVal = inv.invoiceDate || (inv as any).createdAt || (inv as any).updatedAt;
    const d = parseDateRobust(dateVal);
    if (!d) return;

    const monthKey = format(d, 'yyyy-MM');
    const rawVal = inv.invoiceTotal != null ? inv.invoiceTotal : '0.00';
    const amount = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.]/g, '')) || 0;

    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + amount);
  });

  if (monthlyTotals.size === 0) {
    return { avgMonthlyInvoice: 0, monthsFound: 0, invoicesCount: uniqueInvoices.length, recentInvoices: uniqueInvoices, isSignedCustomer: true };
  }

  // Sort available months descending (newest month first)
  const allSortedMonths = Array.from(monthlyTotals.keys()).sort().reverse();

  // Ignore the most recent month with an invoice and take the 3 months before that
  const monthsToAverage = allSortedMonths.length > 1 ? allSortedMonths.slice(1, 4) : [];
  
  let totalSum = 0;
  monthsToAverage.forEach(m => {
    totalSum += monthlyTotals.get(m) || 0;
  });

  const monthsFound = monthsToAverage.length;
  const avgMonthlyInvoice = monthsFound > 0 ? Number((totalSum / monthsFound).toFixed(2)) : 0;

  return {
    avgMonthlyInvoice,
    monthsFound,
    invoicesCount: uniqueInvoices.length,
    recentInvoices: uniqueInvoices,
    isSignedCustomer: true
  };
}
