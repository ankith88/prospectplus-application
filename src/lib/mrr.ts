import type { Lead } from '@/lib/types';

/**
 * Calculates monthly recurring revenue (MRR) for a lead or company object based on its configured services, rates, and frequencies.
 */
export function calculateMonthlyValue(lead: Lead | any, ignoreStatusCheck: boolean = false): number {
  if (!lead) return 0;

  const currentStatus = (lead.customerStatus || lead.status || '').trim();

  if (!ignoreStatusCheck) {
    // Filter out lost / inactive leads
    const inactiveStatuses = ['Lost', 'Lost Customer', 'Unqualified', 'Email Brush Off', 'Out of Territory'];
    if (inactiveStatuses.includes(currentStatus)) {
      return 0;
    }

    // Allowed statuses where MRR is calculated
    const applicableStatuses = [
      'Quote Sent', 'Won', 'Signed', 'Customer', 'LocalMile Opportunity',
      'LocalMile Pending', 'Trialing LocalMile', 'Free Trial', 'Trialing ShipMate',
      'Prospect Opportunity', 'Customer Opportunity', 'LPO Review', 'High Touch',
      'Qualified', 'Appointment Booked', 'In Qualification', 'In Progress',
      'Connected', 'Priority Lead', 'Priority Field Lead', 'New'
    ];

    if (currentStatus && !applicableStatuses.includes(currentStatus)) {
      return 0;
    }
  }

  let totalMonthlyValue = 0;

  if (lead.services && Array.isArray(lead.services) && lead.services.length > 0) {
    for (const service of lead.services) {
      if (!service) continue;

      // Extract numeric rate safely
      let rate = 0;
      if (typeof service.rate === 'number') {
        rate = service.rate;
      } else if (typeof service.rate === 'string') {
        const cleanedRate = service.rate.replace(/[^0-9.]/g, '');
        rate = parseFloat(cleanedRate) || 0;
      }
      if (!rate || isNaN(rate)) continue;

      const freq = service.frequency;

      const isAdhocVal = (val: any) =>
        typeof val === 'string' && ['adhoc', 'ad-hoc', 'ad hoc', 'one-off'].includes(val.trim().toLowerCase());

      if (isAdhocVal(freq)) {
        totalMonthlyValue += rate * 1;
        continue;
      }

      if (Array.isArray(freq)) {
        if (freq.length === 0) continue;
        if (freq.some(f => isAdhocVal(f))) {
          totalMonthlyValue += rate * 1;
          continue;
        }
        let daysCount = 0;
        for (const item of freq) {
          if (typeof item === 'string') {
            if (item.includes(',')) {
              daysCount += item.split(',').filter(d => d.trim().length > 0).length;
            } else if (item.trim().length > 0) {
              daysCount += 1;
            }
          } else if (typeof item === 'number') {
            daysCount += item;
          }
        }
        if (daysCount > 0) {
          totalMonthlyValue += rate * daysCount * 4.33;
        }
        continue;
      }

      if (typeof freq === 'string') {
        const lower = freq.trim().toLowerCase();
        if (lower === 'daily' || lower === '5 days' || lower === '5 days/week') {
          totalMonthlyValue += rate * 5 * 4.33;
        } else if (lower === 'weekly' || lower === '1 day' || lower === '1 day/week') {
          totalMonthlyValue += rate * 1 * 4.33;
        } else if (lower === 'fortnightly' || lower === 'bi-weekly') {
          totalMonthlyValue += rate * 0.5 * 4.33;
        } else if (lower === 'monthly') {
          totalMonthlyValue += rate * 1;
        } else if (freq.includes(',')) {
          const days = freq.split(',').filter(d => d.trim().length > 0);
          if (days.length > 0) {
            totalMonthlyValue += rate * days.length * 4.33;
          }
        } else if (freq.trim().length > 0) {
          // Single day name string like 'Tue', 'Tuesday', 'Mon' etc.
          totalMonthlyValue += rate * 1 * 4.33;
        }
        continue;
      }

      if (typeof freq === 'number' && freq > 0) {
        totalMonthlyValue += rate * freq * 4.33;
        continue;
      }
    }
  }

  if (totalMonthlyValue > 0) {
    return Math.round(totalMonthlyValue * 100) / 100;
  }

  // Fallback to top-level fields
  const fallbackVal = (
    (lead as any).estimatedMrr ||
    (lead as any).monthlyValue ||
    (lead as any).mrr ||
    (lead as any).value ||
    (lead as any).quoteAmount ||
    0
  );

  const parsedFallback = typeof fallbackVal === 'number'
    ? fallbackVal
    : (parseFloat(String(fallbackVal).replace(/[^0-9.]/g, '')) || 0);

  return Math.round(parsedFallback * 100) / 100;
}
