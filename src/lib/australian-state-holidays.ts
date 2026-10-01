/**
 * Australian State-Aware Public Holidays & Working Days Calculation Engine
 * Supports NSW, VIC, QLD, WA, SA, TAS, ACT, and NT.
 */
import { format, parse, isValid, addDays } from 'date-fns';

export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export interface HolidayDetail {
  date: string; // YYYY-MM-DD
  name: string;
  state?: string;
}

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
 * @param n 1 = 1st, 2 = 2nd, etc.
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
 * Gets the last occurrence of a specific weekday in a given month.
 */
export function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = lastDay; day >= 1; day--) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === weekday) {
      return d;
    }
  }
  return new Date(year, month - 1, lastDay);
}

/**
 * Normalizes state strings to 2-3 letter code (e.g. "New South Wales" -> "NSW")
 */
export function normalizeState(rawState?: string): AustralianState {
  if (!rawState) return 'NSW';
  const clean = rawState.trim().toUpperCase();
  if (clean.includes('VIC') || clean.includes('VICTORIA')) return 'VIC';
  if (clean.includes('QLD') || clean.includes('QUEENSLAND')) return 'QLD';
  if (clean.includes('WA') || clean.includes('WESTERN AUSTRALIA')) return 'WA';
  if (clean.includes('SA') || clean.includes('SOUTH AUSTRALIA')) return 'SA';
  if (clean.includes('TAS') || clean.includes('TASMANIA')) return 'TAS';
  if (clean.includes('ACT') || clean.includes('AUSTRALIAN CAPITAL TERRITORY') || clean.includes('CANBERRA')) return 'ACT';
  if (clean.includes('NT') || clean.includes('NORTHERN TERRITORY')) return 'NT';
  return 'NSW'; // Default to NSW
}

/**
 * Generates all public holidays for a given state and year.
 */
export function getAustralianPublicHolidays(year: number, rawState?: string): HolidayDetail[] {
  const state = normalizeState(rawState);
  const holidays: { date: Date; name: string }[] = [];

  // Helper to add holiday with weekend roll-over substitute if applicable
  const addHolidayWithWeekendSubstitute = (baseDate: Date, name: string) => {
    holidays.push({ date: baseDate, name });
    const day = baseDate.getDay();
    if (day === 6) {
      // Saturday -> Monday
      holidays.push({ date: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 2), name: `${name} (Observed)` });
    } else if (day === 0) {
      // Sunday -> Monday
      holidays.push({ date: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1), name: `${name} (Observed)` });
    }
  };

  // 1. New Year's Day (Jan 1)
  addHolidayWithWeekendSubstitute(new Date(year, 0, 1), "New Year's Day");

  // 2. Australia Day (Jan 26)
  addHolidayWithWeekendSubstitute(new Date(year, 0, 26), 'Australia Day');

  // 3. Easter Period
  const easterSunday = getEasterSunday(year);
  const goodFriday = new Date(easterSunday);
  goodFriday.setDate(easterSunday.getDate() - 2);
  const easterSaturday = new Date(easterSunday);
  easterSaturday.setDate(easterSunday.getDate() - 1);
  const easterMonday = new Date(easterSunday);
  easterMonday.setDate(easterSunday.getDate() + 1);

  holidays.push({ date: goodFriday, name: 'Good Friday' });
  holidays.push({ date: easterSaturday, name: 'Easter Saturday' });
  holidays.push({ date: easterSunday, name: 'Easter Sunday' });
  holidays.push({ date: easterMonday, name: 'Easter Monday' });

  // 4. ANZAC Day (April 25)
  const anzacDay = new Date(year, 3, 25);
  holidays.push({ date: anzacDay, name: 'ANZAC Day' });
  if (state === 'WA' && (anzacDay.getDay() === 6 || anzacDay.getDay() === 0)) {
    holidays.push({ date: addDays(anzacDay, anzacDay.getDay() === 6 ? 2 : 1), name: 'ANZAC Day (Observed)' });
  }

  // 5. State-Specific Holidays
  switch (state) {
    case 'NSW':
      // King's Birthday: 2nd Monday in June
      holidays.push({ date: getNthWeekdayOfMonth(year, 6, 1, 2), name: "King's Birthday" });
      // Labour Day: 1st Monday in October
      holidays.push({ date: getNthWeekdayOfMonth(year, 10, 1, 1), name: 'Labour Day' });
      break;

    case 'VIC':
      // Labour Day: 2nd Monday in March
      holidays.push({ date: getNthWeekdayOfMonth(year, 3, 1, 2), name: 'Labour Day' });
      // King's Birthday: 2nd Monday in June
      holidays.push({ date: getNthWeekdayOfMonth(year, 6, 1, 2), name: "King's Birthday" });
      // Friday before the AFL Grand Final: Last Friday in September (approx)
      holidays.push({ date: getLastWeekdayOfMonth(year, 9, 5), name: 'Friday before the AFL Grand Final' });
      // Melbourne Cup Day: 1st Tuesday in November
      holidays.push({ date: getNthWeekdayOfMonth(year, 11, 2, 1), name: 'Melbourne Cup Day' });
      break;

    case 'QLD':
      // Labour Day: 1st Monday in May
      holidays.push({ date: getNthWeekdayOfMonth(year, 5, 1, 1), name: 'Labour Day' });
      // King's Birthday: 1st Monday in October
      holidays.push({ date: getNthWeekdayOfMonth(year, 10, 1, 1), name: "King's Birthday" });
      // Royal Queensland Show (Brisbane/Regional approx 2nd Wednesday in August)
      holidays.push({ date: getNthWeekdayOfMonth(year, 8, 3, 2), name: 'Royal Queensland Show (Ekka)' });
      break;

    case 'WA':
      // Labour Day: 1st Monday in March
      holidays.push({ date: getNthWeekdayOfMonth(year, 3, 1, 1), name: 'Labour Day' });
      // Western Australia Day: 1st Monday in June
      holidays.push({ date: getNthWeekdayOfMonth(year, 6, 1, 1), name: 'Western Australia Day' });
      // King's Birthday: Last Monday in September
      holidays.push({ date: getLastWeekdayOfMonth(year, 9, 1), name: "King's Birthday" });
      break;

    case 'SA':
      // Adelaide Cup Day: 2nd Monday in March
      holidays.push({ date: getNthWeekdayOfMonth(year, 3, 1, 2), name: 'Adelaide Cup Day' });
      // King's Birthday: 2nd Monday in June
      holidays.push({ date: getNthWeekdayOfMonth(year, 6, 1, 2), name: "King's Birthday" });
      // Labour Day: 1st Monday in October
      holidays.push({ date: getNthWeekdayOfMonth(year, 10, 1, 1), name: 'Labour Day' });
      break;

    case 'TAS':
      // Eight Hours Day: 2nd Monday in March
      holidays.push({ date: getNthWeekdayOfMonth(year, 3, 1, 2), name: 'Eight Hours Day' });
      // King's Birthday: 2nd Monday in June
      holidays.push({ date: getNthWeekdayOfMonth(year, 6, 1, 2), name: "King's Birthday" });
      break;

    case 'ACT':
      // Canberra Day: 2nd Monday in March
      holidays.push({ date: getNthWeekdayOfMonth(year, 3, 1, 2), name: 'Canberra Day' });
      // Reconciliation Day: Last Monday in May
      holidays.push({ date: getLastWeekdayOfMonth(year, 5, 1), name: 'Reconciliation Day' });
      // King's Birthday: 2nd Monday in June
      holidays.push({ date: getNthWeekdayOfMonth(year, 6, 1, 2), name: "King's Birthday" });
      // Labour Day: 1st Monday in October
      holidays.push({ date: getNthWeekdayOfMonth(year, 10, 1, 1), name: 'Labour Day' });
      break;

    case 'NT':
      // May Day: 1st Monday in May
      holidays.push({ date: getNthWeekdayOfMonth(year, 5, 1, 1), name: 'May Day' });
      // King's Birthday: 2nd Monday in June
      holidays.push({ date: getNthWeekdayOfMonth(year, 6, 1, 2), name: "King's Birthday" });
      // Picnic Day: 1st Monday in August
      holidays.push({ date: getNthWeekdayOfMonth(year, 8, 1, 1), name: 'Picnic Day' });
      break;
  }

  // 6. Christmas & Boxing Day
  const christmas = new Date(year, 11, 25);
  const boxingDay = new Date(year, 11, 26);
  holidays.push({ date: christmas, name: 'Christmas Day' });
  holidays.push({ date: boxingDay, name: state === 'SA' ? 'Proclamation Day' : 'Boxing Day' });

  if (christmas.getDay() === 6) {
    // Dec 25 Sat -> Dec 27 Mon (Christmas), Dec 28 Tue (Boxing Day)
    holidays.push({ date: new Date(year, 11, 27), name: 'Christmas Day (Observed)' });
    holidays.push({ date: new Date(year, 11, 28), name: `${state === 'SA' ? 'Proclamation Day' : 'Boxing Day'} (Observed)` });
  } else if (christmas.getDay() === 0) {
    // Dec 25 Sun -> Dec 27 Tue (Christmas), Dec 26 Mon is Boxing Day
    holidays.push({ date: new Date(year, 11, 27), name: 'Christmas Day (Observed)' });
  } else if (boxingDay.getDay() === 6) {
    // Dec 26 Sat -> Dec 28 Mon (Boxing Day)
    holidays.push({ date: new Date(year, 11, 28), name: `${state === 'SA' ? 'Proclamation Day' : 'Boxing Day'} (Observed)` });
  } else if (boxingDay.getDay() === 0) {
    // Dec 26 Sun -> Dec 28 Tue (Boxing Day)
    holidays.push({ date: new Date(year, 11, 28), name: `${state === 'SA' ? 'Proclamation Day' : 'Boxing Day'} (Observed)` });
  }

  // Map to distinct YYYY-MM-DD
  const holidayMap = new Map<string, HolidayDetail>();
  holidays.forEach(h => {
    const key = format(h.date, 'yyyy-MM-dd');
    if (!holidayMap.has(key)) {
      holidayMap.set(key, { date: key, name: h.name, state });
    }
  });

  return Array.from(holidayMap.values());
}

/**
 * Parses user input date in formats like DD/MM/YYYY or YYYY-MM-DD
 */
export function parseFlexibleDate(dateInput: string | Date): Date | null {
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (!dateInput || typeof dateInput !== 'string') return null;

  const trimmed = dateInput.trim();
  if (trimmed.includes('/')) {
    const parsed = parse(trimmed, 'dd/MM/yyyy', new Date());
    if (isValid(parsed)) return parsed;
  }
  if (trimmed.includes('-')) {
    const parsed = parse(trimmed, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) return parsed;
  }
  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : null;
}

/**
 * Formats a Date or date string to DD/MM/YYYY
 */
export function formatFlexibleDateToDDMMYYYY(dateInput: string | Date): string {
  const d = parseFlexibleDate(dateInput);
  if (!d) return '';
  return format(d, 'dd/MM/yyyy');
}

export interface ServiceFrequencyCalculation {
  billableDaysCount: number;
  totalDaysInPeriod: number;
  totalWeekdaysInPeriod: number;
  excludedHolidays: HolidayDetail[];
  matchingDays: string[]; // YYYY-MM-DD of all billable days
}

/**
 * Normalizes frequency definition (e.g. ['Mon', 'Wed', 'Fri'], 'Daily', '2 times a week', 'Adhoc', '2 Days', 'Mon-Fri')
 * to an array of standard weekday strings ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] or 'Adhoc' or empty array []
 */
export function normalizeFrequencyDays(freq: any): ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] | 'Adhoc' {
  if (freq === undefined || freq === null) return [];
  
  if (Array.isArray(freq)) {
    if (freq.length === 0) return [];
    const filtered = freq.filter(f => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(f));
    return filtered.length > 0 ? (filtered as any) : [];
  }

  const str = String(freq).trim().toLowerCase();
  if (!str || str === '' || str === 'none') return [];
  if (str === 'adhoc' || str === 'ad-hoc' || str === '0') return 'Adhoc';

  // 1. Check for specific weekday mentions (e.g. "Mon,Wed,Fri", "Tue, Thu", "Monday & Thursday")
  const days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] = [];
  if (str.includes('mon') && !str.includes('month')) days.push('Mon');
  if (str.includes('tue')) days.push('Tue');
  if (str.includes('wed')) days.push('Wed');
  if (str.includes('thu')) days.push('Thu');
  if (str.includes('fri')) days.push('Fri');

  if (days.length > 0) return days;

  // 2. Pattern matching for "N times a week", "N days a week", "Nx", "twice a week", etc.
  if (str.includes('1') || str.includes('once') || str.includes('single') || str.includes('weekly')) {
    return ['Wed']; // 1 day per week (approx 4-5 days/mo)
  }
  if (str.includes('2') || str.includes('twice') || str.includes('two') || str.includes('bi-weekly')) {
    return ['Tue', 'Thu']; // 2 days per week (approx 8-9 days/mo)
  }
  if (str.includes('3') || str.includes('thrice') || str.includes('three')) {
    return ['Mon', 'Wed', 'Fri']; // 3 days per week (approx 13 days/mo)
  }
  if (str.includes('4') || str.includes('four')) {
    return ['Mon', 'Tue', 'Wed', 'Thu']; // 4 days per week (approx 17-18 days/mo)
  }
  if (str.includes('5') || str.includes('daily') || str.includes('five') || str.includes('mon-fri') || str.includes('all')) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // 5 days per week (Daily ~22 days/mo)
  }

  return [];
}

/**
 * Calculates the exact billable quantity for a service in a date range,
 * based on its frequency and the customer's state public holidays.
 */
export function calculateServiceWorkingDays(
  startDateInput: string | Date,
  endDateInput: string | Date,
  frequency: any,
  rawState?: string
): ServiceFrequencyCalculation {
  const start = parseFlexibleDate(startDateInput);
  const end = parseFlexibleDate(endDateInput);

  if (!start || !end || start > end) {
    return {
      billableDaysCount: 0,
      totalDaysInPeriod: 0,
      totalWeekdaysInPeriod: 0,
      excludedHolidays: [],
      matchingDays: []
    };
  }

  const state = normalizeState(rawState);
  const normalizedFreq = normalizeFrequencyDays(frequency);

  // If Adhoc or no frequency specified, default to 0 (user enters frequency or quantity manually)
  if (normalizedFreq === 'Adhoc' || (Array.isArray(normalizedFreq) && normalizedFreq.length === 0)) {
    return {
      billableDaysCount: 0,
      totalDaysInPeriod: 0,
      totalWeekdaysInPeriod: 0,
      excludedHolidays: [],
      matchingDays: []
    };
  }

  // Pre-fetch public holidays for years covering the period
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const holidaysMap = new Map<string, HolidayDetail>();

  for (let y = startYear; y <= endYear; y++) {
    const list = getAustralianPublicHolidays(y, state);
    list.forEach(h => holidaysMap.set(h.date, h));
  }

  let curr = new Date(start);
  curr.setHours(0, 0, 0, 0);
  const targetEnd = new Date(end);
  targetEnd.setHours(0, 0, 0, 0);

  let totalDays = 0;
  let totalWeekdays = 0;
  const excludedHolidays: HolidayDetail[] = [];
  const matchingDays: string[] = [];

  const dayMap: Record<number, 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Weekend'> = {
    0: 'Weekend',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Weekend'
  };

  while (curr <= targetEnd) {
    totalDays++;
    const dayOfWeek = curr.getDay();
    const dayName = dayMap[dayOfWeek];
    const dateStr = format(curr, 'yyyy-MM-dd');

    if (dayName !== 'Weekend') {
      totalWeekdays++;

      // Check if frequency includes this day of the week
      if (normalizedFreq.includes(dayName)) {
        // Check if it's a public holiday in the customer's state
        if (holidaysMap.has(dateStr)) {
          excludedHolidays.push(holidaysMap.get(dateStr)!);
        } else {
          matchingDays.push(dateStr);
        }
      }
    }

    curr = addDays(curr, 1);
  }

  return {
    billableDaysCount: matchingDays.length,
    totalDaysInPeriod: totalDays,
    totalWeekdaysInPeriod: totalWeekdays,
    excludedHolidays,
    matchingDays
  };
}
