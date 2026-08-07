import type { Lead, Invoice } from '@/lib/types';
import { calculateMonthlyValue } from '@/lib/mrr';
import { format, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { parseDateString } from '@/lib/utils';

export interface ExtendedInvoice extends Invoice {
  parentId?: string;
}

export interface CohortCustomerDetail {
  leadId: string;
  companyName: string;
  commencementDate: string | null;
  signedUpAt: string | null;
  repName: string;
  status: string;
  contractedMrr: number;
  actualInvoiced: number;
  variance: number;
  variancePercentage: number;
  billingStatus: 'Fully Billed' | 'Partially Billed' | 'Unbilled' | 'Over Billed';
  invoices: ExtendedInvoice[];
}

export interface PrevMonthCohortSummary {
  prevMonthName: string;
  prevMonthStartDate: Date;
  prevMonthEndDate: Date;
  signedCount: number;
  contractedMrr: number;
  actualInvoicedTotal: number;
  varianceTotal: number;
  realizationYield: number;
  cohortDetails: CohortCustomerDetail[];
}

/**
 * Extracts the Service Commencement Date for a lead or company object.
 * Hierarchy:
 * 1. Service-level startDate / trialStartDate
 * 2. Top-level commencementDate / serviceCommencementDate / startDate
 * 3. SCF acceptance date / signedUpAt timestamp
 * 4. Sign-up activity date
 * 5. Lead entry date
 */
export function getLeadCommencementDate(lead: Lead): Date | null {
  if (!lead) return null;

  // 1. Check services array for explicit startDate or trialStartDate
  if (lead.services && Array.isArray(lead.services) && lead.services.length > 0) {
    for (const svc of lead.services) {
      if (!svc) continue;
      const dateVal = svc.startDate || (svc as any).trialStartDate;
      if (dateVal) {
        const parsed = parseDateString(dateVal);
        if (parsed && !isNaN(parsed.getTime())) return parsed;
      }
    }
  }

  // 2. Check top-level commencement / start date fields
  const topLevelCommence = (lead as any).commencementDate ||
    (lead as any).serviceCommencementDate ||
    (lead as any).startDate ||
    (lead as any).serviceStartDate ||
    (lead as any).trialStartDate;

  if (topLevelCommence) {
    const parsed = parseDateString(topLevelCommence);
    if (parsed && !isNaN(parsed.getTime())) return parsed;
  }

  // 3. Fallback to SCF acceptance date or signedUpAt
  const signedDateVal = lead.signedUpAt ||
    (lead as any).scfAcceptedAt ||
    (lead as any).signedDate ||
    (lead as any).signedAt ||
    (lead as any).acceptedAt;

  if (signedDateVal) {
    const parsed = parseDateString(signedDateVal);
    if (parsed && !isNaN(parsed.getTime())) return parsed;
  }

  // 4. Check activity log for sign-up activity
  if (lead.activity && Array.isArray(lead.activity)) {
    const signedActivity = lead.activity.find(act => {
      const notes = act.notes || '';
      return /Status changed to (Won|Signed)/i.test(notes) ||
             /Signed customer|Converted to Signed|Contract Signed|SCF Signed|SCF Accepted/i.test(notes);
    });
    if (signedActivity) {
      const parsed = parseDateString(signedActivity.date);
      if (parsed && !isNaN(parsed.getTime())) return parsed;
    }
  }

  // 5. Fallback to dateLeadEntered
  if (lead.dateLeadEntered) {
    const parsed = parseDateString(lead.dateLeadEntered);
    if (parsed && !isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/**
 * Calculates 3-Month Service Commencement Cohort Realization metrics.
 * Compares contracted MRR against actual billed invoices for accounts
 * whose service commencement date fell in the last 3 months.
 */
export function calculatePrevMonthRealizationCohort(
  leads: Lead[],
  invoices: ExtendedInvoice[],
  activeDateRange?: { from?: Date; to?: Date },
  monthsCount: number = 3,
  customCohortDateRange?: { from?: Date; to?: Date }
): PrevMonthCohortSummary {
  let prevMonthStart: Date;
  let prevMonthEnd: Date;

  if (customCohortDateRange?.from && customCohortDateRange?.to) {
    prevMonthStart = startOfDay(customCohortDateRange.from);
    prevMonthEnd = endOfDay(customCohortDateRange.to);
  } else {
    // Determine reference date (default to today if omitted)
    const referenceDate = activeDateRange?.from || new Date();
    // Calculate Previous Months Range (prior N calendar months)
    prevMonthStart = startOfDay(startOfMonth(subMonths(referenceDate, monthsCount)));
    prevMonthEnd = endOfDay(endOfMonth(subMonths(referenceDate, 1)));
  }
  
  const startMonthName = format(prevMonthStart, 'MMM yyyy');
  const endMonthName = format(prevMonthEnd, 'MMM yyyy');
  const prevMonthName = startMonthName === endMonthName ? startMonthName : `${startMonthName} – ${endMonthName}`;

  // Map invoices by parent lead/company ID
  const invoicesByParentMap = new Map<string, ExtendedInvoice[]>();
  
  invoices.forEach(inv => {
    if (!inv.invoiceDate) return;
    const invDate = parseDateString(inv.invoiceDate);
    if (!invDate) return;

    // Verify invoice falls within the 3-month range
    if (invDate >= prevMonthStart && invDate <= prevMonthEnd) {
      const parentId = inv.parentId;
      if (parentId) {
        const existing = invoicesByParentMap.get(parentId) || [];
        existing.push(inv);
        invoicesByParentMap.set(parentId, existing);
      }
    }
  });

  // Filter accounts whose service commencement date falls in the 3-month cohort window
  const cohortDetails: CohortCustomerDetail[] = [];

  leads.forEach(lead => {
    const status = lead.customerStatus || lead.status || '';
    const isSigned = ['Won', 'Signed', 'Customer'].includes(status) || !!lead.signedUpAt;
    
    // Skip non-signed / lost leads
    const lostStatuses = ['Lost', 'Lost Customer', 'Unqualified', 'Email Brush Off', 'Out of Territory'];
    if (!isSigned || lostStatuses.includes(status)) return;

    // Extract Service Commencement Date
    const commencementDateObj = getLeadCommencementDate(lead);

    if (!commencementDateObj || isNaN(commencementDateObj.getTime()) || commencementDateObj < prevMonthStart || commencementDateObj > prevMonthEnd) {
      return;
    }

    // Contracted Monthly MRR
    const contractedMrr = calculateMonthlyValue(lead);

    // Get matching invoices for lead.id or lead.companyId
    const companyId = (lead as any).companyId;
    const leadInvoices = [
      ...(invoicesByParentMap.get(lead.id) || []),
      ...(companyId ? invoicesByParentMap.get(companyId) || [] : [])
    ];

    // Deduplicate invoices by document ID if any overlap
    const uniqueInvoicesMap = new Map<string, ExtendedInvoice>();
    leadInvoices.forEach(inv => {
      const invId = inv.invoiceInternalID || inv.invoiceDocumentID || inv.id || String(Math.random());
      uniqueInvoicesMap.set(invId, inv);
    });
    const uniqueInvoices = Array.from(uniqueInvoicesMap.values());

    // Calculate actual invoiced sum
    const actualInvoiced = uniqueInvoices.reduce((sum, inv) => {
      const total = typeof inv.invoiceTotal === 'number' 
        ? inv.invoiceTotal 
        : (parseFloat(String(inv.invoiceTotal).replace(/[^0-9.]/g, '')) || 0);
      return sum + total;
    }, 0);

    const variance = actualInvoiced - contractedMrr;
    const variancePercentage = contractedMrr > 0 ? (actualInvoiced / contractedMrr) * 100 : (actualInvoiced > 0 ? 100 : 0);

    let billingStatus: CohortCustomerDetail['billingStatus'] = 'Unbilled';
    if (actualInvoiced === 0 && contractedMrr === 0) {
      billingStatus = 'Fully Billed';
    } else if (actualInvoiced === 0) {
      billingStatus = 'Unbilled';
    } else if (actualInvoiced >= contractedMrr * 0.9) {
      billingStatus = 'Fully Billed';
    } else if (actualInvoiced > contractedMrr * 1.5) {
      billingStatus = 'Over Billed';
    } else {
      billingStatus = 'Partially Billed';
    }

    cohortDetails.push({
      leadId: lead.id,
      companyName: lead.companyName || (lead as any).company || (lead as any).name || 'Unnamed Company',
      commencementDate: format(commencementDateObj, 'dd/MM/yyyy'),
      signedUpAt: lead.signedUpAt || lead.dateLeadEntered || null,
      repName: (lead as any).assignedUser || lead.accountManagerAssigned || (lead as any).amAssigned || (lead as any).userInCharge || lead.dialerAssigned || 'Unassigned',
      status,
      contractedMrr,
      actualInvoiced,
      variance,
      variancePercentage,
      billingStatus,
      invoices: uniqueInvoices
    });
  });

  // Sort cohort details by commencement date descending (newest first)
  cohortDetails.sort((a, b) => {
    const dA = parseDateString(a.commencementDate || '')?.getTime() || 0;
    const dB = parseDateString(b.commencementDate || '')?.getTime() || 0;
    return dB - dA;
  });

  // Calculate Aggregates
  const signedCount = cohortDetails.length;
  const contractedMrr = cohortDetails.reduce((sum, item) => sum + item.contractedMrr, 0);
  const actualInvoicedTotal = cohortDetails.reduce((sum, item) => sum + item.actualInvoiced, 0);
  const varianceTotal = actualInvoicedTotal - contractedMrr;
  const realizationYield = contractedMrr > 0 ? (actualInvoicedTotal / contractedMrr) * 100 : (actualInvoicedTotal > 0 ? 100 : 0);

  return {
    prevMonthName,
    prevMonthStartDate: prevMonthStart,
    prevMonthEndDate: prevMonthEnd,
    signedCount,
    contractedMrr,
    actualInvoicedTotal,
    varianceTotal,
    realizationYield,
    cohortDetails
  };
}
