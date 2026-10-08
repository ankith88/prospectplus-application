import type { Lead, UserProfile, Franchisee } from '@/lib/types';

export interface LeadDialerRecommendation {
  leadId: string;
  companyName: string;
  franchiseeName: string;
  franchiseeId?: string;
  currentDialer: string;
  recommendedDialer: string | null;
  needsReassignment: boolean;
  reason: string;
  selectedDialer?: string;
  isSelected?: boolean;
}

/**
 * Checks if a territory list matches a given suburb, state, and postcode.
 */
function matchesTerritoryList(
  tList: any[],
  city?: string,
  state?: string,
  zip?: string
): boolean {
  if (!Array.isArray(tList) || tList.length === 0) return false;
  const leadCity = city?.toLowerCase().trim();
  const leadState = state?.toLowerCase().trim();
  const leadZip = zip?.toLowerCase().trim();

  if (!leadCity && !leadZip) return false;

  return tList.some((t: any) => {
    const subStr = String(t.suburbs || t.suburb || '').toLowerCase().trim();
    const subMatch = leadCity && (
      subStr === leadCity ||
      subStr.includes(leadCity) ||
      subStr.split(',').map((s: string) => s.trim()).includes(leadCity)
    );
    const targetState = String(t.state || '').toLowerCase().trim();
    const stateMatch = !leadState || !targetState || targetState === leadState;
    const targetZip = String(t.post_code || t.postcode || '').toLowerCase().trim();
    const zipMatch = !leadZip || targetZip === leadZip;

    if (leadZip && leadCity) {
      return zipMatch && subMatch && stateMatch;
    }
    if (leadZip) {
      return zipMatch && stateMatch;
    }
    return Boolean(subMatch && stateMatch);
  });
}

/**
 * Finds the matching franchisee from the list of franchisees for a given address.
 */
export function findMatchingFranchisee(
  city?: string,
  state?: string,
  zip?: string,
  franchisees: Franchisee[] = []
): Franchisee | null {
  if (!franchisees || franchisees.length === 0) return null;

  for (const f of franchisees) {
    if (
      matchesTerritoryList(f.territoryJson, city, state, zip) ||
      matchesTerritoryList(f.ausPostSuburbsJson, city, state, zip) ||
      matchesTerritoryList(f.tgeSuburbsJSON || [], city, state, zip)
    ) {
      return f;
    }
  }

  return null;
}

/**
 * Resolves the recommended dialer (Linked BDR) for a franchisee name/ID from the user list.
 */
export function getLinkedBdrForFranchisee(
  franchiseeName?: string,
  franchiseeId?: string,
  users: UserProfile[] = [],
  franchisees: Franchisee[] = []
): { dialer: string | null; reason: string } {
  const fNameLower = (franchiseeName || '').trim().toLowerCase();
  const fIdStr = (franchiseeId || '').trim();

  if (!fNameLower && !fIdStr) {
    return { dialer: null, reason: 'No Franchisee or Territory assigned to lead.' };
  }

  // 1. Check users with Franchisee role
  for (const u of users) {
    const userFName = (u.franchisee || '').trim().toLowerCase();
    const userFId = String(u.franchiseeId || u.franchiseeInternalId || '').trim();
    const linkedIds = (u.linkedFranchiseeIds || []).map(String);
    const linkedObjects = u.linkedFranchisees || [];

    const isMatch =
      (fNameLower && userFName === fNameLower) ||
      (fIdStr && userFId === fIdStr) ||
      (fIdStr && linkedIds.includes(fIdStr)) ||
      linkedObjects.some(
        (lo: any) =>
          (fIdStr && String(lo.franchiseeId || lo.id || '').trim() === fIdStr) ||
          (fNameLower && String(lo.franchiseeName || lo.name || '').trim().toLowerCase() === fNameLower)
      );

    if (isMatch && u.linkedBDR && u.linkedBDR.trim().length > 0) {
      const bdr = u.linkedBDR.trim();
      return {
        dialer: bdr,
        reason: `Linked Inside Dialer for ${u.displayName || u.name || franchiseeName || 'Franchisee'}`,
      };
    }
  }

  // 2. Check the Franchisee collection docs directly
  if (franchisees && franchisees.length > 0) {
    const franDoc = franchisees.find(f => {
      const fDocName = (f.name || '').trim().toLowerCase();
      const fDocId = String(f.internalId || f.id || '').trim();
      return (fNameLower && fDocName === fNameLower) || (fIdStr && fDocId === fIdStr);
    });

    if (franDoc) {
      // Check if users array inside franchisee doc has linkedBDR
      const docUsers = (franDoc as any).users;
      if (Array.isArray(docUsers)) {
        for (const u of docUsers) {
          if ((u as any).linkedBDR && String((u as any).linkedBDR).trim().length > 0) {
            return {
              dialer: String((u as any).linkedBDR).trim(),
              reason: `Linked Inside Dialer configured for ${franDoc.name}`,
            };
          }
        }
      }

      // If salesRepAssigned exists and matches an active user
      if (franDoc.salesRepAssigned && franDoc.salesRepAssigned.trim().length > 0) {
        return {
          dialer: franDoc.salesRepAssigned.trim(),
          reason: `Assigned Sales Rep/Dialer for ${franDoc.name}`,
        };
      }
    }
  }

  return {
    dialer: null,
    reason: franchiseeName
      ? `No Linked Inside Dialer (BDR) configured for ${franchiseeName}.`
      : 'No Franchisee identified.',
  };
}

/**
 * Computes a detailed dialer recommendation for a single lead.
 */
export function computeLeadDialerRecommendation(
  lead: Lead,
  users: UserProfile[] = [],
  franchisees: Franchisee[] = []
): LeadDialerRecommendation {
  const currentDialer = (lead.dialerAssigned || '').trim();
  let franchiseeName = (lead.franchisee || (lead as any).franchiseeName || '').trim();
  let franchiseeId = String(lead.franchisee_id || (lead as any).franchiseeInternalId || '').trim();

  // If lead doesn't have a franchisee explicitly recorded, attempt territory lookup
  if (!franchiseeName && (lead.address?.city || lead.address?.zip || (lead as any).city || (lead as any).zip)) {
    const city = lead.address?.city || (lead as any).city || (lead as any).suburb || '';
    const state = lead.address?.state || (lead as any).state || '';
    const zip = lead.address?.zip || (lead as any).zip || (lead as any).postcode || '';

    const matchedFran = findMatchingFranchisee(city, state, zip, franchisees);
    if (matchedFran) {
      franchiseeName = matchedFran.name || '';
      franchiseeId = String(matchedFran.internalId || matchedFran.id || '');
    }
  }

  const { dialer: recommendedDialer, reason } = getLinkedBdrForFranchisee(
    franchiseeName,
    franchiseeId,
    users,
    franchisees
  );

  const isCurrentDialerAssigned = Boolean(currentDialer && currentDialer.toLowerCase() !== 'unassigned');
  const isRecommendedDialerAvailable = Boolean(recommendedDialer && recommendedDialer.trim().length > 0);

  // Needs reassignment if recommended dialer is available and differs from current
  const needsReassignment = Boolean(
    isRecommendedDialerAvailable &&
    (!isCurrentDialerAssigned || currentDialer.toLowerCase() !== recommendedDialer!.toLowerCase())
  );

  return {
    leadId: lead.id,
    companyName: lead.companyName || 'Untitled Lead',
    franchiseeName: franchiseeName || 'Unassigned Franchisee',
    franchiseeId: franchiseeId || undefined,
    currentDialer: currentDialer || 'Unassigned',
    recommendedDialer: recommendedDialer || null,
    needsReassignment,
    reason,
    selectedDialer: recommendedDialer || (currentDialer !== 'Unassigned' ? currentDialer : undefined),
    isSelected: needsReassignment,
  };
}

/**
 * Computes recommendations for an array of leads.
 */
export function computeBatchLeadDialerRecommendations(
  leads: Lead[],
  users: UserProfile[] = [],
  franchisees: Franchisee[] = []
): LeadDialerRecommendation[] {
  return leads.map(lead => computeLeadDialerRecommendation(lead, users, franchisees));
}
