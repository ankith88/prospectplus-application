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
