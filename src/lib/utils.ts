import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
) {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  try {
    return new Intl.DateTimeFormat('en-AU', {
      ...options,
      timeZone: timezone || 'Australia/Sydney'
    }).format(d);
  } catch (e) {
    console.warn(`Invalid timezone provided: ${timezone}. Falling back to Australia/Sydney.`);
    return new Intl.DateTimeFormat('en-AU', {
      ...options,
      timeZone: 'Australia/Sydney'
    }).format(d);
  }
}
