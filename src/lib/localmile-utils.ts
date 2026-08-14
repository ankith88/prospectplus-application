import type { Lead, ServiceSelection } from '@/lib/types';

export interface PmpoServiceResult {
  hasPmpoService: boolean;
  rate: number;
  frequency: string | string[];
  serviceType: 'Adhoc' | 'Recurring';
  serviceName?: string;
}

/**
 * Resolves the PMPO service rate and frequency for a given Lead.
 * Checks lead.services for a service matching PMPO / Outgoing Mail Lodgement,
 * or falls back to lead.pmpoRate. If no PMPO service exists, returns default flags.
 */
export function getPmpoServiceForLead(lead?: Lead | null): PmpoServiceResult {
  if (!lead) {
    return {
      hasPmpoService: false,
      rate: 15,
      frequency: 'Adhoc',
      serviceType: 'Adhoc',
    };
  }

  // 1. Search lead.services array
  const services = lead.services || [];
  const pmpoService = services.find((s: ServiceSelection) => {
    if (!s || !s.name) return false;
    const nameLower = s.name.toLowerCase();
    return nameLower.includes('pmpo') || nameLower.includes('outgoing mail lodgement');
  });

  if (pmpoService) {
    const rawRate = typeof pmpoService.rate === 'number' ? pmpoService.rate : parseFloat(String(pmpoService.rate || 0));
    const rate = !isNaN(rawRate) && rawRate > 0 ? rawRate : 15;
    const isRecurring = Array.isArray(pmpoService.frequency) || (typeof pmpoService.frequency === 'string' && pmpoService.frequency !== 'Adhoc' && pmpoService.frequency.toLowerCase() !== 'adhoc');
    const serviceType: 'Adhoc' | 'Recurring' = isRecurring ? 'Recurring' : 'Adhoc';
    const frequency = pmpoService.frequency || (serviceType === 'Recurring' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : 'Adhoc');

    return {
      hasPmpoService: true,
      rate,
      frequency,
      serviceType,
      serviceName: pmpoService.name,
    };
  }

  // 2. Fallback check for lead.pmpoRate
  const leadPmpoRate = (lead as any).pmpoRate;
  if (leadPmpoRate !== undefined && leadPmpoRate !== null && leadPmpoRate !== '') {
    const parsedRate = typeof leadPmpoRate === 'number' ? leadPmpoRate : parseFloat(String(leadPmpoRate));
    if (!isNaN(parsedRate) && parsedRate > 0) {
      return {
        hasPmpoService: true,
        rate: parsedRate,
        frequency: lead.serviceType === 'Recurring' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : 'Adhoc',
        serviceType: lead.serviceType === 'Recurring' ? 'Recurring' : 'Adhoc',
        serviceName: 'PMPO',
      };
    }
  }

  // 3. Fallback to lead.rate / lead.serviceType if available, or default 15 Adhoc / 10 Recurring
  const fallbackType: 'Adhoc' | 'Recurring' = lead.serviceType === 'Recurring' ? 'Recurring' : 'Adhoc';
  const fallbackRate = typeof lead.rate === 'number' && lead.rate > 0
    ? lead.rate
    : (fallbackType === 'Recurring' ? 10 : 15);

  return {
    hasPmpoService: false,
    rate: fallbackRate,
    frequency: fallbackType === 'Recurring' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : 'Adhoc',
    serviceType: fallbackType,
  };
}

/**
 * Determines whether a user profile strictly has the 'dialer' role.
 * Only returns true if the user's active role is explicitly a dialer role ('dialer', 'dialers', 'lead gen').
 * All management, admin, account manager, customer success, franchisee, and other non-dialer roles return false.
 */
export function isDialerUser(userProfile?: any): boolean {
  if (!userProfile) return false;

  const activeRole = String(userProfile.activeRole || '').toLowerCase().trim();
  const dialerRoles = ['dialer', 'dialers', 'lead gen', 'lead_gen', 'leadgen'];

  // Explicitly return true ONLY if activeRole is in dialerRoles
  if (dialerRoles.includes(activeRole)) {
    return true;
  }

  // For any other active role (admin, superadmin, account manager, sales manager, customer success, franchisee, user, etc.), return false
  return false;
}
