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
