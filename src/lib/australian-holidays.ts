/**
 * Utility functions for Australian (Sydney, NSW) Public Holidays and Weekend calculations.
 */
import { format } from 'date-fns';

/**
 * Calculates Easter Sunday for a given year using Meeus/Jones/Butcher algorithm.
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Gets the Nth occurrence of a specific weekday in a given month.
 * @param weekday 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1) break;
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return d;
    }
  }
  return new Date(year, month - 1, 1);
}

/**
 * Returns a list of formatted 'yyyy-MM-dd' strings representing all Sydney (NSW) public holidays for a given year.
 */
export function getSydneyPublicHolidays(year: number): string[] {
  const holidays: Date[] = [];

  // 1. New Year's Day (Jan 1)
  const newYear = new Date(year, 0, 1);
  holidays.push(newYear);
  if (newYear.getDay() === 6) holidays.push(new Date(year, 0, 3)); // Sat -> Mon
  if (newYear.getDay() === 0) holidays.push(new Date(year, 0, 2)); // Sun -> Mon

  // 2. Australia Day (Jan 26)
  const australiaDay = new Date(year, 0, 26);
  holidays.push(australiaDay);
  if (australiaDay.getDay() === 6) holidays.push(new Date(year, 0, 28)); // Sat -> Mon
  if (australiaDay.getDay() === 0) holidays.push(new Date(year, 0, 27)); // Sun -> Mon

  // 3. Easter Holidays (Good Friday, Easter Saturday, Easter Sunday, Easter Monday)
  const easterSunday = getEasterSunday(year);
  const goodFriday = new Date(easterSunday);
  goodFriday.setDate(easterSunday.getDate() - 2);
  const easterSaturday = new Date(easterSunday);
  easterSaturday.setDate(easterSunday.getDate() - 1);
  const easterMonday = new Date(easterSunday);
  easterMonday.setDate(easterSunday.getDate() + 1);

  holidays.push(goodFriday, easterSaturday, easterSunday, easterMonday);

  // 4. ANZAC Day (April 25)
  const anzacDay = new Date(year, 3, 25);
  holidays.push(anzacDay);

  // 5. King's Birthday (2nd Monday in June for NSW)
  const kingsBirthday = getNthWeekdayOfMonth(year, 6, 1, 2);
  holidays.push(kingsBirthday);

  // 6. Labour Day (1st Monday in October for NSW)
  const labourDay = getNthWeekdayOfMonth(year, 10, 1, 1);
  holidays.push(labourDay);

  // 7. Christmas Day & Boxing Day (Dec 25 & Dec 26)
  const christmas = new Date(year, 11, 25);
  const boxingDay = new Date(year, 11, 26);
  holidays.push(christmas, boxingDay);

  // Substitutes for Christmas & Boxing Day
  if (christmas.getDay() === 6) {
    // Dec 25 Sat -> Dec 27 Mon (Christmas), Dec 28 Tue (Boxing Day)
    holidays.push(new Date(year, 11, 27), new Date(year, 11, 28));
  } else if (christmas.getDay() === 0) {
    // Dec 25 Sun -> Dec 27 Tue (Christmas), Dec 26 Mon is Boxing Day
    holidays.push(new Date(year, 11, 27));
  } else if (boxingDay.getDay() === 6) {
    // Dec 26 Sat -> Dec 28 Mon (Boxing Day)
    holidays.push(new Date(year, 11, 28));
  } else if (boxingDay.getDay() === 0) {
    // Dec 26 Sun -> Dec 28 Tue (Boxing Day)
    holidays.push(new Date(year, 11, 28));
  }

  // Format as YYYY-MM-DD set for fast lookup
  return Array.from(new Set(holidays.map((d) => format(d, 'yyyy-MM-dd'))));
}

/**
 * Checks if a given date falls on a weekend (Saturday or Sunday).
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Checks if a given date is a Sydney (NSW), Australia public holiday.
 */
export function isSydneyPublicHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const dateStr = format(date, 'yyyy-MM-dd');
  const sydneyHolidays = getSydneyPublicHolidays(year);
  return sydneyHolidays.includes(dateStr);
}

/**
 * Checks if a given date is non-bookable (weekend or Sydney public holiday).
 */
export function isWeekendOrPublicHoliday(date: Date): boolean {
  return isWeekend(date) || isSydneyPublicHoliday(date);
}
