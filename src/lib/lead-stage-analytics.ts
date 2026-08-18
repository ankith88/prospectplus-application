import { Lead, UserProfile, BucketHistory, StatusHistory, Appointment } from '@/lib/types';
import { parseISO, differenceInDays, differenceInHours } from 'date-fns';

export interface StageDurationMetrics {
  currentStatus: string;
  currentStatusDurationDays: number;
  appointmentBookedDate: Date | null;
  quoteSentDate: Date | null;
  signedDate: Date | null;
  timeToQuoteSentDays: number | null;
  timeToSignedDays: number | null;
  totalConversionDays: number | null;
}

export interface OriginMetric {
  origin: string;
  total: number;
  quoteSent: number;
  won: number;
  conversionRate: number;
}

export interface AmStageMetrics {
  amName: string;
  totalLeads: number;
  activeLeads: number;
  appointmentBookedCount: number;
  quoteSentCount: number;
  wonSignedCount: number;
  avgDaysInAppointmentBooked: number | null;
  avgDaysInQuoteSent: number | null;
  avgTotalConversionDays: number | null;
  avgDaysByStatus: Record<string, number>;
  statusLeadCounts: Record<string, number>;
  conversionRateApptToQuote: number;
  conversionRateQuoteToSigned: number;
  overallConversionRate: number;
  projectedConversions: number;
  staleLeads: Array<{ lead: Lead; daysInStatus: number; status: string }>;
  originBreakdown: Record<string, OriginMetric>;
}

export const BUCKET_LABEL_MAP: Record<string, string> = {
  outbound: 'Outbound',
  inbound: 'Inbound',
  field_sales: 'Field Sales',
  marketing: 'Marketing',
  nurture: 'Nurture',
  lead_gen: 'Lead Gen',
  lpo_plus: 'LPO',
  lpo_network: 'LPO',
  customer_success: 'Customer Success',
  account_manager: 'Account Manager',
  in_review: 'In Review',
  multisite: 'Multisite',
  unassigned: 'Unassigned',
  blank: 'Unassigned'
};

export function formatBucketLabel(bucketKey?: string): string {
  if (!bucketKey) return 'Outbound';
  const cleanKey = bucketKey.trim().toLowerCase();
  if (BUCKET_LABEL_MAP[cleanKey]) return BUCKET_LABEL_MAP[cleanKey];
  
  return cleanKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeStatusLabel(statusName?: string): string {
  if (!statusName) return 'New';
  const clean = statusName.trim();
  if (clean === 'Priority Lead' || clean === 'Priority Field Lead' || clean === 'Hot Lead') {
    return 'Hot Leads';
  }
  if (clean === 'Signed') return 'Won';
  return clean;
}

/**
 * Determines whether a lead has transferred from a different initial origin bucket
 * to its current bucket (returns true IF AND ONLY IF initial origin bucket !== current bucket).
 */
export function isLeadTransferred(lead: Lead): boolean {
  if (!lead) return false;
  const origin = getLeadInitialBucket(lead);
  const currentBucketLabel = formatBucketLabel(lead.bucket || 'account_manager');
  return origin.trim().toLowerCase() !== currentBucketLabel.trim().toLowerCase();
}

/**
 * Resolves the initial bucket of a lead before it was moved to Account Manager
 */
export function getLeadInitialBucket(lead: Lead): string {
  if (!lead) return 'Outbound';

  // 1. If lead source is Website or Inbound details present, it originally came from Inbound
  const sourceStr = (lead.customerSource || (lead as any).source || lead.leadSource || '').toLowerCase();
  if (
    sourceStr === 'website' || 
    sourceStr.includes('inbound') || 
    lead.wasInbound || 
    lead.inboundDetails || 
    lead.inboundPageUrl || 
    lead.pageURL
  ) {
    return 'Inbound';
  }

  // 2. Explicit property set when appointment booked
  if (lead.initialAppointmentBucket && lead.initialAppointmentBucket !== 'account_manager') {
    return formatBucketLabel(lead.initialAppointmentBucket);
  }

  // 3. Check bucket history for earliest oldBucket before moving to account_manager
  if (lead.bucketHistory && Array.isArray(lead.bucketHistory) && lead.bucketHistory.length > 0) {
    const sorted = [...lead.bucketHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const amTransition = sorted.find(h => h.newBucket === 'account_manager' && h.oldBucket !== 'account_manager');
    if (amTransition && amTransition.oldBucket) {
      return formatBucketLabel(amTransition.oldBucket);
    }
    const earliestNonAm = sorted.find(h => h.oldBucket && h.oldBucket !== 'account_manager');
    if (earliestNonAm) {
      return formatBucketLabel(earliestNonAm.oldBucket);
    }
  }

  // 4. Check originalBucket property
  if (lead.originalBucket && lead.originalBucket !== 'account_manager') {
    return formatBucketLabel(lead.originalBucket);
  }

  // 5. Customer Success indicators
  if (
    lead.customerSuccessAssigned || 
    (lead as any).customerSuccess || 
    lead.bucket === 'customer_success'
  ) {
    return 'Customer Success';
  }

  // 6. Check explicit flags / source indicators
  if (lead.fieldSales || sourceStr.includes('field')) {
    return 'Field Sales';
  }
  if (
    (lead.campaign && (lead.campaign.toLowerCase().includes('nurture') || lead.campaign.toLowerCase().includes('marketing'))) ||
    sourceStr.includes('marketing') ||
    sourceStr.includes('nurture')
  ) {
    return 'Marketing';
  }
  if (lead.isLpoLead || lead.lpoPlusStatus || lead.bucket === 'lpo_plus' || lead.bucket === 'lpo_network') {
    return 'LPO';
  }
  if (lead.wasOutbound || sourceStr.includes('outbound') || lead.dialerAssigned) {
    return 'Outbound';
  }

  // 7. Fallback to current bucket if not account_manager, otherwise default Outbound
  if (lead.bucket && lead.bucket !== 'account_manager') {
    return formatBucketLabel(lead.bucket);
  }

  return 'Outbound';
}

function safeParseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    try { return val.toDate(); } catch { return null; }
  }
  if (typeof val === 'object' && 'seconds' in val) {
    return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Resolves the exact date when a lead entered the Account Manager bucket / pipeline.
 * - PRIORITY 1: Check bucketHistory for explicit transition to account_manager (e.g. Moved from Customer Success to Account Manager).
 * - PRIORITY 2: Check explicit AM assignment timestamps (accountManagerAssignedAt / assignedToAmAt).
 * - PRIORITY 3: Check earliest appointment booked date.
 * - PRIORITY 4: Check statusHistory for 'Appointment Booked' or 'Account Manager'.
 * - PRIORITY 5: If lead is a Website lead without a subsequent bucket transfer in bucketHistory, use dateLeadEntered.
 * - PRIORITY 6: Fallback to recent update/activity date.
 */
export function getAmEntryDate(lead: Lead): Date | null {
  if (!lead) return null;

  // 1. ALWAYS check bucketHistory FIRST for explicit transition to account_manager
  if (lead.bucketHistory && Array.isArray(lead.bucketHistory) && lead.bucketHistory.length > 0) {
    const sortedBucketHist = [...lead.bucketHistory]
      .filter(b => {
        const nb = (b.newBucket || (b as any).toBucket || (b as any).bucket || '').toLowerCase().trim();
        return nb === 'account_manager' || nb === 'account manager';
      })
      .map(b => safeParseDate(b.date || (b as any).timestamp || (b as any).createdAt))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    if (sortedBucketHist.length > 0) {
      return sortedBucketHist[0];
    }
  }

  // 2. Check explicit AM assignment timestamps
  const assignedAt = safeParseDate((lead as any).accountManagerAssignedAt || (lead as any).assignedToAmAt || (lead as any).amAssignedAt);
  if (assignedAt) return assignedAt;

  // 3. Check earliest appointment booked date (when SDR booked appt to AM)
  if (lead.appointments && Array.isArray(lead.appointments) && lead.appointments.length > 0) {
    const sortedAppts = [...lead.appointments]
      .map(a => safeParseDate(a.createdAt || a.date || a.appointmentDate || a.duedate))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    if (sortedAppts.length > 0) {
      return sortedAppts[0];
    }
  }

  // 4. Check statusHistory for 'Appointment Booked' or 'Account Manager'
  if (lead.statusHistory && Array.isArray(lead.statusHistory)) {
    const apptHist = lead.statusHistory
      .filter(s => s.newStatus === 'Appointment Booked' || s.newStatus === 'Account Manager')
      .map(s => safeParseDate(s.date))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    if (apptHist.length > 0) {
      return apptHist[0];
    }
  }

  // 5. If Website source lead strictly (source === 'Website', excluding 'Inbound - New Website') without bucket transfer history, use dateLeadEntered
  const sourceStr = (lead.customerSource || (lead as any).source || lead.leadSource || '').toLowerCase().trim();
  const isWebsiteSource = sourceStr === 'website';

  if (isWebsiteSource) {
    return safeParseDate(lead.dateLeadEntered) || safeParseDate((lead as any).createdAt);
  }

  // 6. Check last activity or update date
  const recentUpdate = safeParseDate((lead as any).updatedAt) || safeParseDate(lead.lastContactedDate || (lead as any).lastActivityDate);
  if (recentUpdate) return recentUpdate;

  // 7. For non-website leads, return null instead of falling back to dateLeadEntered!
  return null;
}

/**
 * Calculate stage durations and key milestone dates for a single lead
 */
export function calculateLeadStageDurations(lead: Lead, now: Date = new Date()): StageDurationMetrics {
  const rawStatus = lead.customerStatus || lead.status || 'New';
  const currentStatus = normalizeStatusLabel(rawStatus);
  const sourceStr = (lead.customerSource || (lead as any).source || lead.leadSource || '').toLowerCase().trim();
  const isWebsiteSource = sourceStr === 'website';
  
  // 0. Resolve the baseline start date in AM pipeline
  const amEntryDate = getAmEntryDate(lead);

  // 1. Identify Appointment Booked date
  let appointmentBookedDate: Date | null = null;
  if (lead.appointments && Array.isArray(lead.appointments) && lead.appointments.length > 0) {
    const sortedAppts = [...lead.appointments]
      .map(a => safeParseDate(a.createdAt || a.date || a.appointmentDate || a.duedate))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    if (sortedAppts.length > 0) {
      appointmentBookedDate = sortedAppts[0];
    }
  }

  if (!appointmentBookedDate && lead.statusHistory) {
    const apptHist = lead.statusHistory.find(s => s.newStatus === 'Appointment Booked');
    if (apptHist) {
      appointmentBookedDate = safeParseDate(apptHist.date);
    }
  }

  // 2. Identify Quote Sent date
  let quoteSentDate: Date | null = safeParseDate(lead.quoteSentAt);
  if (!quoteSentDate && lead.statusHistory) {
    const quoteHist = lead.statusHistory.find(s => s.newStatus === 'Quote Sent');
    if (quoteHist) {
      quoteSentDate = safeParseDate(quoteHist.date);
    }
  }
  if (!quoteSentDate && lead.scfLinks && Array.isArray(lead.scfLinks) && lead.scfLinks.length > 0) {
    const sortedScf = [...lead.scfLinks]
      .map(s => safeParseDate(s.createdAt))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    if (sortedScf.length > 0) {
      quoteSentDate = sortedScf[0];
    }
  }

  // 3. Identify Signed / Won date
  let signedDate: Date | null = safeParseDate(lead.signedUpAt);
  if (!signedDate && lead.statusHistory) {
    const signedHist = lead.statusHistory.find(s => s.newStatus === 'Won' || s.newStatus === 'Signed' || s.newStatus === 'Quote Accepted');
    if (signedHist) {
      signedDate = safeParseDate(signedHist.date);
    }
  }

  // Baseline start anchor for AM cycle calculations:
  // ONLY for Website source: dateLeadEntered.
  // For all other leads: amEntryDate (when lead entered AM bucket).
  const amCycleStartDate = amEntryDate || appointmentBookedDate || (isWebsiteSource ? safeParseDate(lead.dateLeadEntered) : null);

  // 4. Time in Current Status calculation
  let lastStatusChangeDate: Date | null = null;
  if (lead.statusHistory && Array.isArray(lead.statusHistory) && lead.statusHistory.length > 0) {
    const sortedHistory = [...lead.statusHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const match = sortedHistory.find(s => normalizeStatusLabel(s.newStatus) === currentStatus);
    if (match) {
      lastStatusChangeDate = safeParseDate(match.date);
    } else if (sortedHistory[0]) {
      lastStatusChangeDate = safeParseDate(sortedHistory[0].date);
    }
  }

  // Check logged activity history for status updates
  if (!lastStatusChangeDate && lead.activity && Array.isArray(lead.activity) && lead.activity.length > 0) {
    const statusAct = lead.activity
      .filter(act => ((act as any).details || act.notes || act.type || (act as any).description || '').toLowerCase().includes('status'))
      .map(act => safeParseDate(act.date))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime());

    if (statusAct.length > 0) {
      lastStatusChangeDate = statusAct[0];
    }
  }

  if (!lastStatusChangeDate) {
    if (currentStatus === 'Won' || currentStatus === 'Quote Accepted') {
      lastStatusChangeDate = signedDate;
    } else if (currentStatus === 'Quote Sent') {
      lastStatusChangeDate = quoteSentDate;
    } else if (currentStatus === 'Appointment Booked') {
      lastStatusChangeDate = appointmentBookedDate || amEntryDate;
    }
  }

  if (!lastStatusChangeDate) {
    lastStatusChangeDate = amEntryDate || safeParseDate((lead as any).updatedAt) || safeParseDate(lead.lastContactedDate || (lead as any).lastActivityDate);
  }

  // Bounded Check: Time in current status in AM pipeline CANNOT be earlier than when the lead entered the AM pipeline
  if (amEntryDate && lastStatusChangeDate && lastStatusChangeDate < amEntryDate) {
    lastStatusChangeDate = amEntryDate;
  }

  if (!lastStatusChangeDate && isWebsiteSource) {
    lastStatusChangeDate = safeParseDate(lead.dateLeadEntered) || safeParseDate((lead as any).createdAt);
  }

  const currentStatusDurationDays = lastStatusChangeDate
    ? Math.max(0, parseFloat((differenceInHours(now, lastStatusChangeDate) / 24).toFixed(1)))
    : 0;

  // Time metrics calculations (measured relative to AM Entry / Appointment Booked)
  let timeToQuoteSentDays: number | null = null;
  if (amCycleStartDate && quoteSentDate && quoteSentDate >= amCycleStartDate) {
    timeToQuoteSentDays = parseFloat((differenceInHours(quoteSentDate, amCycleStartDate) / 24).toFixed(1));
  } else if (appointmentBookedDate && quoteSentDate && quoteSentDate >= appointmentBookedDate) {
    timeToQuoteSentDays = parseFloat((differenceInHours(quoteSentDate, appointmentBookedDate) / 24).toFixed(1));
  }

  let timeToSignedDays: number | null = null;
  if (quoteSentDate && signedDate && signedDate >= quoteSentDate) {
    timeToSignedDays = parseFloat((differenceInHours(signedDate, quoteSentDate) / 24).toFixed(1));
  }

  let totalConversionDays: number | null = null;
  if (amCycleStartDate && signedDate && signedDate >= amCycleStartDate) {
    totalConversionDays = parseFloat((differenceInHours(signedDate, amCycleStartDate) / 24).toFixed(1));
  } else if (timeToQuoteSentDays !== null && timeToSignedDays !== null) {
    totalConversionDays = parseFloat((timeToQuoteSentDays + timeToSignedDays).toFixed(1));
  }

  return {
    currentStatus,
    currentStatusDurationDays,
    appointmentBookedDate: appointmentBookedDate || amCycleStartDate,
    quoteSentDate,
    signedDate,
    timeToQuoteSentDays,
    timeToSignedDays,
    totalConversionDays,
  };
}

/**
 * Aggregates AM stage duration and conversion metrics across leads
 */
export function calculateAmStageMetrics(
  leads: Lead[], 
  accountManagers: UserProfile[], 
  selectedAmFilter: string = 'all'
): {
  byAm: Record<string, AmStageMetrics>;
  summary: AmStageMetrics;
  originTotals: Record<string, OriginMetric>;
} {
  const getAmDisplayName = (am: UserProfile) => {
    return am.displayName || [am.firstName, am.lastName].filter(Boolean).join(' ') || am.email || am.uid;
  };

  const amNames = new Set<string>();
  accountManagers.forEach(am => amNames.add(getAmDisplayName(am)));

  leads.forEach(l => {
    if (l.accountManagerAssigned) amNames.add(l.accountManagerAssigned);
  });

  const createEmptyAmMetrics = (name: string): AmStageMetrics => ({
    amName: name,
    totalLeads: 0,
    activeLeads: 0,
    appointmentBookedCount: 0,
    quoteSentCount: 0,
    wonSignedCount: 0,
    avgDaysInAppointmentBooked: null,
    avgDaysInQuoteSent: null,
    avgTotalConversionDays: null,
    avgDaysByStatus: {},
    statusLeadCounts: {},
    conversionRateApptToQuote: 0,
    conversionRateQuoteToSigned: 0,
    overallConversionRate: 0,
    projectedConversions: 0,
    staleLeads: [],
    originBreakdown: {}
  });

  const amMap: Record<string, AmStageMetrics> = {};
  amNames.forEach(name => {
    amMap[name] = createEmptyAmMetrics(name);
  });

  const summary = createEmptyAmMetrics('All Account Managers');
  const originTotals: Record<string, OriginMetric> = {};

  const timeToQuoteSentList: Record<string, number[]> = { summary: [] };
  const timeToSignedList: Record<string, number[]> = { summary: [] };
  const totalConversionList: Record<string, number[]> = { summary: [] };
  const statusDurationByAmList: Record<string, Record<string, number[]>> = { summary: {} };

  const now = new Date();

  const targetLeads = selectedAmFilter === 'all' 
    ? leads 
    : leads.filter(l => l.accountManagerAssigned === selectedAmFilter);

  targetLeads.forEach(lead => {
    const amName = lead.accountManagerAssigned || 'Unassigned AM';
    if (!amMap[amName]) {
      amMap[amName] = createEmptyAmMetrics(amName);
    }
    const amMetrics = amMap[amName];

    const rawStatus = lead.customerStatus || lead.status || 'New';
    const status = normalizeStatusLabel(rawStatus);
    const isWon = status === 'Won' || status === 'Signed' || status === 'Quote Accepted' || status === 'Closed Won';
    const isQuoteSent = status === 'Quote Sent' || isWon;
    const isApptBooked = status === 'Appointment Booked' || isQuoteSent;
    const isLost = status === 'Lost' || status === 'Lost Customer' || status === 'Unqualified' || status === 'Disqualified' || status === 'Closed Lost';

    const origin = getLeadInitialBucket(lead);

    if (!originTotals[origin]) {
      originTotals[origin] = { origin, total: 0, quoteSent: 0, won: 0, conversionRate: 0 };
    }
    originTotals[origin].total += 1;
    if (isQuoteSent) originTotals[origin].quoteSent += 1;
    if (isWon) originTotals[origin].won += 1;

    if (!amMetrics.originBreakdown[origin]) {
      amMetrics.originBreakdown[origin] = { origin, total: 0, quoteSent: 0, won: 0, conversionRate: 0 };
    }
    amMetrics.originBreakdown[origin].total += 1;
    if (isQuoteSent) amMetrics.originBreakdown[origin].quoteSent += 1;
    if (isWon) amMetrics.originBreakdown[origin].won += 1;

    amMetrics.totalLeads += 1;
    summary.totalLeads += 1;

    if (!isLost) {
      amMetrics.activeLeads += 1;
      summary.activeLeads += 1;
    }

    if (isApptBooked) {
      amMetrics.appointmentBookedCount += 1;
      summary.appointmentBookedCount += 1;
    }
    if (isQuoteSent) {
      amMetrics.quoteSentCount += 1;
      summary.quoteSentCount += 1;
    }
    if (isWon) {
      amMetrics.wonSignedCount += 1;
      summary.wonSignedCount += 1;
    }

    const stageMetrics = calculateLeadStageDurations(lead, now);

    // Track status duration for ALL active statuses (excluding Lost and Won/Signed)
    if (!isWon && !isLost) {
      if (!statusDurationByAmList[amName]) statusDurationByAmList[amName] = {};
      if (!statusDurationByAmList[amName][status]) statusDurationByAmList[amName][status] = [];
      statusDurationByAmList[amName][status].push(stageMetrics.currentStatusDurationDays);

      if (!statusDurationByAmList['summary'][status]) statusDurationByAmList['summary'][status] = [];
      statusDurationByAmList['summary'][status].push(stageMetrics.currentStatusDurationDays);
    }

    if (stageMetrics.timeToQuoteSentDays !== null) {
      if (!timeToQuoteSentList[amName]) timeToQuoteSentList[amName] = [];
      timeToQuoteSentList[amName].push(stageMetrics.timeToQuoteSentDays);
      timeToQuoteSentList['summary'].push(stageMetrics.timeToQuoteSentDays);
    }

    if (stageMetrics.timeToSignedDays !== null) {
      if (!timeToSignedList[amName]) timeToSignedList[amName] = [];
      timeToSignedList[amName].push(stageMetrics.timeToSignedDays);
      timeToSignedList['summary'].push(stageMetrics.timeToSignedDays);
    }

    if (stageMetrics.totalConversionDays !== null) {
      if (!totalConversionList[amName]) totalConversionList[amName] = [];
      totalConversionList[amName].push(stageMetrics.totalConversionDays);
      totalConversionList['summary'].push(stageMetrics.totalConversionDays);
    }

    if (!isWon && !isLost && stageMetrics.currentStatusDurationDays >= 14) {
      const staleItem = { lead, daysInStatus: stageMetrics.currentStatusDurationDays, status };
      amMetrics.staleLeads.push(staleItem);
      summary.staleLeads.push(staleItem);
    }
  });

  const calculateAverages = (metrics: AmStageMetrics, key: string) => {
    const qList = timeToQuoteSentList[key] || [];
    if (qList.length > 0) {
      metrics.avgDaysInAppointmentBooked = parseFloat((qList.reduce((a, b) => a + b, 0) / qList.length).toFixed(1));
    }

    const sList = timeToSignedList[key] || [];
    if (sList.length > 0) {
      metrics.avgDaysInQuoteSent = parseFloat((sList.reduce((a, b) => a + b, 0) / sList.length).toFixed(1));
    }

    const cList = totalConversionList[key] || [];
    if (cList.length > 0) {
      metrics.avgTotalConversionDays = parseFloat((cList.reduce((a, b) => a + b, 0) / cList.length).toFixed(1));
    }

    // Compute average days for ALL active statuses
    const amStatusMap = statusDurationByAmList[key] || {};
    Object.entries(amStatusMap).forEach(([stName, daysArr]) => {
      if (daysArr.length > 0) {
        metrics.avgDaysByStatus[stName] = parseFloat((daysArr.reduce((a, b) => a + b, 0) / daysArr.length).toFixed(1));
        metrics.statusLeadCounts[stName] = daysArr.length;
      }
    });

    if (metrics.appointmentBookedCount > 0) {
      metrics.conversionRateApptToQuote = parseFloat(((metrics.quoteSentCount / metrics.appointmentBookedCount) * 100).toFixed(1));
      metrics.overallConversionRate = parseFloat(((metrics.wonSignedCount / metrics.appointmentBookedCount) * 100).toFixed(1));
    }

    if (metrics.quoteSentCount > 0) {
      metrics.conversionRateQuoteToSigned = parseFloat(((metrics.wonSignedCount / metrics.quoteSentCount) * 100).toFixed(1));
    }

    Object.values(metrics.originBreakdown).forEach(ob => {
      if (ob.total > 0) {
        ob.conversionRate = parseFloat(((ob.won / ob.total) * 100).toFixed(1));
      }
    });

    const currentQuoteSent = Math.max(0, metrics.quoteSentCount - metrics.wonSignedCount);
    const currentApptBookedOnly = Math.max(0, metrics.appointmentBookedCount - metrics.quoteSentCount);

    const projQuote = currentQuoteSent * ((metrics.conversionRateQuoteToSigned || 50) / 100);
    const projAppt = currentApptBookedOnly * ((metrics.overallConversionRate || 30) / 100);
    metrics.projectedConversions = Math.round(projQuote + projAppt);
  };

  Object.keys(amMap).forEach(amName => {
    calculateAverages(amMap[amName], amName);
  });
  calculateAverages(summary, 'summary');

  Object.values(originTotals).forEach(ob => {
    if (ob.total > 0) {
      ob.conversionRate = parseFloat(((ob.won / ob.total) * 100).toFixed(1));
    }
  });

  return { byAm: amMap, summary, originTotals };
}
