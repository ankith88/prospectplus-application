import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { 
  startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, 
  startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears,
  format as dateFnsFormat, isValid
} from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeFormatDate(dateVal: any, formatStr: string = 'MMM d, yyyy'): string {
  if (!dateVal) return '-';
  try {
    let d: Date | null = null;
    if (dateVal instanceof Date) {
      d = dateVal;
    } else if (typeof dateVal === 'object') {
      if (typeof dateVal.toDate === 'function') {
        d = dateVal.toDate();
      } else if ('seconds' in dateVal && 'nanoseconds' in dateVal) {
        d = new Date(dateVal.seconds * 1000 + (dateVal.nanoseconds || 0) / 1000000);
      }
    }
    if (!d) {
      let cleaned = String(dateVal).trim();
      cleaned = cleaned.replace(/\s*\([^)]*\)$/, '');
      d = new Date(cleaned);
    }
    if (d && isValid(d)) {
      return dateFnsFormat(d, formatStr);
    }
  } catch (e) {
    console.error("Error formatting date:", dateVal, e);
  }
  return '-';
}

export function getQuickDateRange(preset: string): { from: Date; to: Date } {
  const now = new Date();
  const normalized = preset.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  switch (normalized) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case 'todayandyesterday':
    case 'todaysandyesterdayscalls': {
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(now) };
    }
    case 'thisweek':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'lastweek': {
      const lastWeek = subWeeks(now, 1);
      return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    }
    case 'thismonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastmonth': {
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'prevandthismonth':
    case 'previousandthismonth':
    case 'prevmonththismonth': {
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(now) };
    }
    case 'thisquarter':
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case 'thisyear':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'lastyear': {
      const lastYear = subYears(now, 1);
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    }
    case 'last7':
    case 'last7days': {
      const start = subDays(now, 7);
      return { from: startOfDay(start), to: endOfDay(now) };
    }
    case 'last30':
    case 'last30days': {
      const start = subDays(now, 30);
      return { from: startOfDay(start), to: endOfDay(now) };
    }
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}


/**
 * Checks if a given date is outside of standard office hours (9 AM - 5 PM AEST, Mon-Fri).
 * AEST is UTC+10 (using Australia/Brisbane as it doesn't observe Daylight Saving).
 */
export function isOutsideOfficeHours(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Australia/Brisbane',
    hour12: false,
    hour: 'numeric',
    weekday: 'short'
  };
  
  const formatter = new Intl.DateTimeFormat('en-AU', options);
  const parts = formatter.formatToParts(date);
  
  const hourPart = parts.find(p => p.type === 'hour')?.value;
  const weekdayPart = parts.find(p => p.type === 'weekday')?.value;
  
  if (!hourPart || !weekdayPart) return false;
  
  const hour = parseInt(hourPart, 10);
  const isWeekend = weekdayPart === 'Sat' || weekdayPart === 'Sun';
  const isOutsideTime = hour < 9 || hour >= 17;

  return isWeekend || isOutsideTime;
}

/**
 * Formats a date in a specific timezone, defaulting to Australia/Sydney.
 */
export function formatInTimezone(
  date: Date | string | undefined, 
  timezone: string | undefined, 
  options: Intl.DateTimeFormatOptions | 'PP' | 'PPP' | 'PPpp' | 'yyyy-MM-dd' | 'HH:mm' = { dateStyle: 'medium' }
) {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const tz = timezone || 'Australia/Sydney';
  
  if (typeof options === 'string') {
    if (options === 'PP') {
      return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeZone: tz }).format(d);
    }
    if (options === 'PPP') {
      return new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: tz }).format(d);
    }
    if (options === 'PPpp') {
      return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'medium', timeZone: tz }).format(d);
    }
    if (options === 'yyyy-MM-dd') {
      const year = new Intl.DateTimeFormat('en-AU', { timeZone: tz, year: 'numeric' }).format(d);
      const month = new Intl.DateTimeFormat('en-AU', { timeZone: tz, month: '2-digit' }).format(d);
      const day = new Intl.DateTimeFormat('en-AU', { timeZone: tz, day: '2-digit' }).format(d);
      return `${year}-${month}-${day}`;
    }
    if (options === 'HH:mm') {
      const hour = new Intl.DateTimeFormat('en-AU', { timeZone: tz, hour: '2-digit', hour12: false }).format(d);
      const minute = new Intl.DateTimeFormat('en-AU', { timeZone: tz, minute: '2-digit' }).format(d);
      return `${hour}:${minute}`;
    }
  }

  try {
    return new Intl.DateTimeFormat('en-AU', {
      ...(options as Intl.DateTimeFormatOptions),
      timeZone: tz
    }).format(d);
  } catch (e) {
    console.warn(`Invalid timezone or options provided: ${tz}. Falling back to Australia/Sydney.`);
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney'
    }).format(d);
  }
}

/**
 * Safely parses a date string, resolving format variations like DD/MM/YYYY
 * and cleaning up timezone name suffixes (e.g. "(PDT)", "(AEST)") which
 * cause standard Date constructor to fail in many browsers (like Safari).
 */
export function parseDateString(dateVal: any): Date | null {
  if (!dateVal) return null;

  // If it's already a Date object
  if (dateVal instanceof Date) {
    const d = new Date(dateVal);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // If it's a Firestore Timestamp (has toDate method or seconds/nanoseconds properties)
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') {
      const d = dateVal.toDate();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if ('seconds' in dateVal && 'nanoseconds' in dateVal) {
      const d = new Date(dateVal.seconds * 1000 + dateVal.nanoseconds / 1000000);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  
  let cleaned = String(dateVal).trim();
  cleaned = cleaned.replace(/\s*\([^)]*\)$/, '');
  
  const dateTimeParts = cleaned.split(' ');
  const datePart = dateTimeParts[0];
  const dateParts = datePart.split('/');
  if (dateParts.length === 3) {
    const [day, month, year] = dateParts.map(Number);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, month - 1, day, 0, 0, 0, 0);
    }
  }
  
  const date = new Date(cleaned);
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Returns a date string in Sydney timezone (ISO format with offset).
 */
export function getSydneyISOString(date: Date = new Date()): string {
  const tz = 'Australia/Sydney';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getVal = (type: string) => parts.find(p => p.type === type)!.value;

  const year = getVal('year');
  const month = getVal('month');
  const day = getVal('day');
  const hour = getVal('hour');
  const minute = getVal('minute');
  const second = getVal('second');

  // Offset format: GMT+10 or GMT+11
  const tzParts = new Intl.DateTimeFormat('en-AU', {
    timeZone: tz,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const offsetVal = tzParts.find(p => p.type === 'timeZoneName')?.value || 'GMT+10';
  const offset = offsetVal.replace('GMT', '').replace('UTC', '').trim() || '+10:00';

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}

/**
 * Validates an Australian Business Number (ABN) using the official check digit algorithm.
 */
export function validateABN(abn: string): boolean {
  const cleanAbn = abn.replace(/\s+/g, '').replace(/-/g, '');
  if (!/^\d{11}$/.test(cleanAbn)) {
    return false;
  }
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let digit = parseInt(cleanAbn[i], 10);
    if (i === 0) {
      digit -= 1;
    }
    sum += digit * weights[i];
  }
  return sum % 89 === 0;
}

/**
 * Checks whether an activity was manually performed by a user (e.g. manual call, email, meeting, or note)
 * rather than automatically generated by system background processes, webhooks, or campaigns.
 */
export function isManualActivity(act: any): boolean {
  if (!act) return false;

  // 1. Check explicit automated / system / data management / csv upload flags
  if (
    act.isAutomated === true ||
    act.automated === true ||
    act.isSystem === true ||
    act.autoGenerated === true ||
    act.isAuto === true ||
    act.isDataManagement === true ||
    act.isCsvUpload === true ||
    act.channel === 'automated'
  ) {
    return false;
  }

  // 2. Check source field
  const source = (act.source || '').toString().toLowerCase();
  if (
    [
      'system',
      'automation',
      'campaign',
      'nurture',
      'api',
      'webhook',
      'netsuite',
      'bot',
      'cron',
      'data_management',
      'data-management',
      'csv_upload',
      'csv',
      'bulk_import',
      'import_wizard'
    ].includes(source)
  ) {
    return false;
  }

  // 3. Check author
  const author = (act.author || '').toString().trim().toLowerCase();
  if (
    !author ||
    author === 'unknown rep' ||
    author === 'unassigned' ||
    author.includes('system') ||
    author.includes('engine') ||
    author.includes('webhook') ||
    author.includes('api') ||
    author.includes('assistant') ||
    author.includes('operator') ||
    author.includes('nudge') ||
    author.includes('cron') ||
    author.includes('automation') ||
    author.includes('bot') ||
    author.includes('prospectplus') ||
    author.includes('netsuite') ||
    author.includes('opt-out') ||
    author.includes('portal') ||
    author.includes('booking') ||
    author.includes('registration') ||
    author.includes('external') ||
    author.includes('data management') ||
    author.includes('csv upload') ||
    author.includes('bulk import')
  ) {
    return false;
  }

  // 4. Check notes / content / title / event for automated, data management, and csv upload patterns
  const noteText = (act.notes || act.content || act.event || act.title || '').toString().toLowerCase();
  
  // CSV Uploads & Bulk Imports
  if (
    noteText.includes('csv') ||
    noteText.includes('bulk import') ||
    noteText.includes('import wizard') ||
    noteText.includes('lead imported') ||
    noteText.includes('imported via') ||
    noteText.includes('imported as') ||
    noteText.includes('imported from')
  ) {
    return false;
  }

  // Data Management, status changes & bucket transitions
  if (
    noteText.includes('data management') ||
    noteText.includes('data-management') ||
    noteText.includes('status changed') ||
    noteText.includes('status updated') ||
    noteText.includes('bucket updated') ||
    noteText.includes('bucket changed') ||
    noteText.includes('stage changed') ||
    noteText.includes('lead moved to') ||
    noteText.includes('reassigned to') ||
    noteText.includes('auto-assigned') ||
    noteText.includes('system note:') ||
    noteText.includes('system:')
  ) {
    return false;
  }

  // Automated campaigns / nurture / drip emails / SMS
  if (
    noteText.includes('campaign email') ||
    noteText.includes('sent campaign email') ||
    noteText.includes('campaign:') ||
    noteText.includes('nurture:') ||
    noteText.includes('nurture sequence') ||
    noteText.includes('nurture step') ||
    noteText.includes('automated email') ||
    noteText.includes('automated sms') ||
    noteText.includes('drip email') ||
    noteText.includes('enrolled in nurture') ||
    noteText.includes('opt-out') ||
    noteText.includes('unsubscribed')
  ) {
    return false;
  }

  // Automated integrations / logs / syncs / maintenance
  if (
    noteText.includes('netsuite sync') ||
    noteText.includes('transcript added') ||
    noteText.includes('synced from') ||
    noteText.includes('batch updated') ||
    noteText.includes('scanned by') ||
    noteText.includes('triggered') ||
    noteText.includes('rule executed') ||
    noteText.includes('localmile nudge') ||
    noteText.includes('localmile.plus webhook') ||
    noteText.includes('performed by: system') ||
    noteText.includes('system backfill script') ||
    noteText.includes('avatar updated') ||
    noteText.includes('lead merged')
  ) {
    return false;
  }

  return true;
}

/**
 * Checks whether an email was manually sent by a user (excluding marketing campaigns and system senders).
 */
export function isManualEmail(email: { campaignId?: string; sender?: string }): boolean {
  if (!email) return false;
  if (email.campaignId) return false;
  
  if (email.sender) {
    const senderLower = email.sender.toLowerCase();
    const isSystemSender = 
      senderLower.includes('system') || 
      senderLower.includes('engine') || 
      senderLower.includes('webhook') || 
      senderLower.includes('api') || 
      senderLower.includes('assistant') || 
      senderLower.includes('operator') || 
      senderLower.includes('nudge') || 
      senderLower.includes('no-reply') || 
      senderLower.includes('noreply');
    if (isSystemSender) return false;
  }
  
  return true;
}

/**
 * Calculates business hours (9:00 AM - 5:00 PM Mon-Fri Sydney time) between two dates.
 */
export function calculateBusinessHoursSydney(start: Date, end: Date): number {
  if (!start || !end || start >= end || !isValid(start) || !isValid(end)) return 0;
  
  const getSydneyLocal = (d: Date): Date => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const partObj: Record<string, string> = {};
    for (const part of parts) {
      partObj[part.type] = part.value;
    }
    const hour = parseInt(partObj.hour, 10);
    return new Date(
      parseInt(partObj.year, 10),
      parseInt(partObj.month, 10) - 1,
      parseInt(partObj.day, 10),
      hour === 24 ? 0 : hour,
      parseInt(partObj.minute, 10),
      parseInt(partObj.second, 10)
    );
  };

  const startSyd = getSydneyLocal(start);
  const endSyd = getSydneyLocal(end);

  const startDay = new Date(startSyd.getFullYear(), startSyd.getMonth(), startSyd.getDate());
  const endDay = new Date(endSyd.getFullYear(), endSyd.getMonth(), endSyd.getDate());

  const msPerDay = 24 * 60 * 60 * 1000;

  // If start and end are on the same calendar day
  if (startDay.getTime() === endDay.getTime()) {
    const dayOfWeek = startSyd.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0;

    const businessStart = new Date(startDay);
    businessStart.setHours(9, 0, 0, 0);
    const businessEnd = new Date(startDay);
    businessEnd.setHours(17, 0, 0, 0);

    const clampedStart = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), startSyd.getTime())));
    const clampedEnd = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), endSyd.getTime())));

    return Math.max(0, clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60);
  }

  let totalMs = 0;

  // 1. First day business hours
  const startDayOfWeek = startSyd.getDay();
  if (startDayOfWeek !== 0 && startDayOfWeek !== 6) {
    const businessStart = new Date(startDay);
    businessStart.setHours(9, 0, 0, 0);
    const businessEnd = new Date(startDay);
    businessEnd.setHours(17, 0, 0, 0);

    const clampedStart = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), startSyd.getTime())));
    totalMs += Math.max(0, businessEnd.getTime() - clampedStart.getTime());
  }

  // 2. Intermediate days
  let currentDay = new Date(startDay.getTime() + msPerDay);
  while (currentDay.getTime() < endDay.getTime()) {
    const dayOfWeek = currentDay.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      totalMs += 8 * 60 * 60 * 1000; // 8 hours (9am-5pm)
    }
    currentDay.setTime(currentDay.getTime() + msPerDay);
  }

  // 3. Last day business hours
  const endDayOfWeek = endSyd.getDay();
  if (endDayOfWeek !== 0 && endDayOfWeek !== 6) {
    const businessStart = new Date(endDay);
    businessStart.setHours(9, 0, 0, 0);
    const businessEnd = new Date(endDay);
    businessEnd.setHours(17, 0, 0, 0);

    const clampedEnd = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), endSyd.getTime())));
    totalMs += Math.max(0, clampedEnd.getTime() - businessStart.getTime());
  }

  return totalMs / (1000 * 60 * 60);
}

export function getLeadDisplayDateValue(lead: any): string | undefined {
  if (!lead) return undefined;
  const status = typeof lead === 'string' ? lead : (lead.customerStatus || lead.status || '');
  if (status === 'LocalMile Opportunity' || (typeof lead === 'string' && lead.includes('LocalMile Opportunity'))) {
    return (
      lead.dateRegistrationSent ||
      lead.registrationSentAt ||
      lead.localMileRegistrationSentAt ||
      lead.localMileOpportunityAt ||
      lead.trialStartedAt ||
      lead.assignedToDialerAt ||
      lead.dateLeadEntered
    );
  }
  if (status === 'LocalMile Pending' || (typeof lead === 'string' && lead.includes('LocalMile Pending'))) {
    return (
      lead.localMileTermsAcceptedAt ||
      lead.localMileTnCAcceptedAt ||
      lead.dateLocalmileAccepted ||
      lead.localMileAcceptedAt ||
      lead.trialStartedAt ||
      lead.dateLeadEntered
    );
  }
  return typeof lead === 'string' ? undefined : lead.dateLeadEntered;
}

export function getLeadDisplayDateLabel(lead: any): string {
  if (!lead) return 'Date Lead Entered';
  const status = typeof lead === 'string' ? lead : (lead.customerStatus || lead.status || '');
  if (status === 'LocalMile Opportunity' || status.includes('LocalMile Opportunity')) {
    return 'Date Registration Sent';
  }
  if (status === 'LocalMile Pending' || status.includes('LocalMile Pending')) {
    return 'Date LocalMile Accepted';
  }
  return 'Date Lead Entered';
}

/**
 * Checks if a lead has an accepted or signed SCF (Service Confirmation Form).
 */
export function isScfAcceptedForLead(lead: any): boolean {
  if (!lead) return false;
  return Boolean(
    lead.scfAcceptedAt ||
    lead.status === 'Quote Accepted' ||
    lead.customerStatus === 'Quote Accepted' ||
    lead.status === 'Accepted' ||
    lead.customerStatus === 'Accepted' ||
    lead.scfStatus === 'Accepted' ||
    lead.scfStatus === 'Signed' ||
    (Array.isArray(lead.scfLinks) && lead.scfLinks.some((s: any) => s.status === 'Accepted' || s.status === 'Signed' || !!s.acceptedAt)) ||
    (Array.isArray(lead.scfs) && lead.scfs.some((s: any) => s.status === 'Accepted' || s.status === 'Signed' || s.status === 'Quote Accepted' || !!s.acceptedAt || !!s.signedAt))
  );
}






