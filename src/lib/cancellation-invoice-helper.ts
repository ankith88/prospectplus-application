import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Invoice } from '@/lib/types';
import { parseISO, format, isValid } from 'date-fns';

export interface InvoiceAvgResult {
  avgMonthlyInvoice: number;
  monthsFound: number;
  invoicesCount: number;
  recentInvoices: Invoice[];
}

/**
 * Fetches invoices for a given company or lead ID from Firestore
 * and calculates the average monthly invoice value over the last 3 available billing months.
 *
 * If no invoices exist in Firestore, returns avgMonthlyInvoice = 0 (no fallback to contract rate).
 */
export async function fetch3MonthAvgInvoiceMRR(
  companyId?: string,
  leadId?: string
): Promise<InvoiceAvgResult> {
  const idsToTry = Array.from(new Set([companyId, leadId].filter(Boolean) as string[]));
  
  if (idsToTry.length === 0) {
    return { avgMonthlyInvoice: 0, monthsFound: 0, invoicesCount: 0, recentInvoices: [] };
  }

  let rawInvoices: Invoice[] = [];

  for (const id of idsToTry) {
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
      if (rawInvoices.length === 0) {
        const leadInvoicesRef = collection(firestore, 'leads', id, 'invoices');
        const leadSnap = await getDocs(leadInvoicesRef);
        if (!leadSnap.empty) {
          leadSnap.forEach(d => {
            rawInvoices.push({ id: d.id, ...d.data() } as Invoice);
          });
        }
      }

      if (rawInvoices.length > 0) break;
    } catch (e) {
      console.error(`Error fetching invoices for ID ${id}:`, e);
    }
  }

  if (rawInvoices.length === 0) {
    return { avgMonthlyInvoice: 0, monthsFound: 0, invoicesCount: 0, recentInvoices: [] };
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
    if (!inv.invoiceDate) return;
    let d: Date | null = null;
    try {
      d = typeof inv.invoiceDate === 'string' ? parseISO(inv.invoiceDate) : new Date(inv.invoiceDate);
    } catch {
      d = null;
    }
    if (!d || !isValid(d)) return;

    const monthKey = format(d, 'yyyy-MM');
    const rawVal = inv.invoiceTotal != null ? inv.invoiceTotal : '0.00';
    const amount = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.]/g, '')) || 0;

    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + amount);
  });

  if (monthlyTotals.size === 0) {
    return { avgMonthlyInvoice: 0, monthsFound: 0, invoicesCount: uniqueInvoices.length, recentInvoices: uniqueInvoices };
  }

  // Sort available months descending (newest month first) and take the top 3
  const sortedMonths = Array.from(monthlyTotals.keys()).sort().reverse().slice(0, 3);
  
  let totalSum = 0;
  sortedMonths.forEach(m => {
    totalSum += monthlyTotals.get(m) || 0;
  });

  const monthsFound = sortedMonths.length;
  const avgMonthlyInvoice = monthsFound > 0 ? Number((totalSum / monthsFound).toFixed(2)) : 0;

  return {
    avgMonthlyInvoice,
    monthsFound,
    invoicesCount: uniqueInvoices.length,
    recentInvoices: uniqueInvoices
  };
}
