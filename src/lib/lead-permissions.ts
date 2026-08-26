import { Lead, UserProfile } from '@/lib/types';

export function isLeadActionableForUser(
  lead: Lead | null | undefined,
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!lead || !userProfile) return false;

  const role = userProfile.activeRole || userProfile.role || '';
  const roleLower = role.toLowerCase().trim();
  
  // Admins, Super Admins, Sales Managers, Lead Gen Admins, Outbound Admins, and Marketing Managers can action any lead
  if (
    isSuperAdmin ||
    roleLower === 'admin' ||
    roleLower === 'superadmin' ||
    roleLower === 'sales manager' ||
    roleLower === 'outbound admin' ||
    roleLower === 'lead gen admin' ||
    roleLower === 'marketing manager'
  ) {
    return true;
  }

  // Operations users can action leads in the LPO Network bucket
  const assignedRoles = (userProfile.assignedRoles || []).map(r => String(r).toLowerCase().trim());
  const isOperationsRole = 
    roleLower === 'operations' || 
    roleLower === 'operations manager' || 
    roleLower.includes('operations') ||
    assignedRoles.some(r => r === 'operations' || r === 'operations manager' || r.includes('operations'));

  const isLpoNetworkBucket = 
    lead.bucket === 'lpo_network' || 
    (lead.bucket as string)?.toLowerCase() === 'lpo_network' || 
    lead.bucket === 'LPO Network';

  if (isLpoNetworkBucket && isOperationsRole) {
    return true;
  }

  const userDisplayName = (userProfile.displayName || '').trim().toLowerCase();
  const userEmail = (userProfile.email || '').trim().toLowerCase();
  const userUid = (userProfile.uid || '').trim().toLowerCase();

  const isAssignedToUser = (assignedValue?: string | null) => {
    if (!assignedValue) return false;
    const val = assignedValue.trim().toLowerCase();
    return val === userDisplayName || val === userEmail || val === userUid;
  };

  // Account Managers: Can action ONLY leads assigned to them
  if (
    roleLower === 'account manager' ||
    roleLower === 'account managers'
  ) {
    return (
      isAssignedToUser(lead.accountManagerAssigned) ||
      isAssignedToUser(lead.salesRepAssigned) ||
      isAssignedToUser((lead as any).assignedTo)
    );
  }

  // Outbound Dialers (role 'user'): Can action ONLY leads in outbound bucket assigned to them
  if (roleLower === 'user' || roleLower === 'dialer' || roleLower === 'dialers') {
    const bucket = (lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
    if (bucket !== 'outbound') {
      return false; // Viewing non-outbound leads is permitted, but logging outcomes/actioning is disabled
    }
    return (
      isAssignedToUser(lead.dialerAssigned) ||
      isAssignedToUser((lead as any).assignedTo) ||
      isAssignedToUser(lead.salesRepAssigned)
    );
  }

  // Customer Success: Can action ONLY leads assigned to them
  if (roleLower === 'customer success') {
    return (
      isAssignedToUser(lead.customerSuccessAssigned) ||
      isAssignedToUser(lead.accountManagerAssigned) ||
      isAssignedToUser((lead as any).assignedTo) ||
      isAssignedToUser(lead.salesRepAssigned)
    );
  }

  // Default: check generic assignedTo
  return isAssignedToUser((lead as any).assignedTo);
}

export function isAccountManagerUser(userProfile?: UserProfile | null): boolean {
  if (!userProfile) return false;
  const roleLower = (userProfile.activeRole || userProfile.role || '').toLowerCase().trim();
  const assignedRoles = (userProfile.assignedRoles || []).map(r => r.toLowerCase().trim());
  const amRoles = ['account manager', 'account managers'];
  return amRoles.includes(roleLower) || assignedRoles.some(r => amRoles.includes(r));
}

export function canReassignLead(
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!userProfile) return false;
  if (isSuperAdmin) return true;

  const roleLower = (userProfile.activeRole || userProfile.role || '').toLowerCase().trim();
  const assignedRoles = (userProfile.assignedRoles || []).map(r => r.toLowerCase().trim());
  const allowedRoles = [
    'admin', 
    'superadmin',
    'sales manager', 
    'outbound admin', 
    'lead gen admin', 
    'marketing manager',
    'account manager',
    'account managers'
  ];
  return allowedRoles.includes(roleLower) || assignedRoles.some(r => allowedRoles.includes(r));
}

export function canChangeBucket(
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!userProfile) return false;
  if (isSuperAdmin) return true;

  const roleLower = (userProfile.activeRole || userProfile.role || '').toLowerCase().trim();
  if (roleLower === 'outbound admin') return false;
  const allowedRoles = [
    'admin',
    'superadmin',
    'sales manager',
    'lead gen admin',
    'marketing manager',
    'account manager',
    'account managers'
  ];
  return allowedRoles.includes(roleLower);
}

export function isSaleDealsVisible(
  userProfile: UserProfile | null | undefined
): boolean {
  if (!userProfile) return false;

  const roleLower = (userProfile.activeRole || userProfile.role || '').toLowerCase().trim();
  return ![
    'user',
    'customer success',
    'customer service'
  ].includes(roleLower);
}

export function canEditSignedCustomerAddress(
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!userProfile) return false;
  if (isSuperAdmin) return true;

  const roleLower = (userProfile.activeRole || userProfile.role || '').toLowerCase().trim();
  return ![
    'user',
    'customer success',
    'customer service'
  ].includes(roleLower);
}

export function isFranchiseeRole(userProfile: Partial<UserProfile> | null | undefined): boolean {
  if (!userProfile) return false;
  const role = userProfile.activeRole || userProfile.role || '';
  const roleLower = role.toLowerCase().trim();
  const assignedRoles = (userProfile.assignedRoles || []).map(r => String(r).toLowerCase().trim());
  return roleLower === 'franchisee' || assignedRoles.includes('franchisee');
}

export function canFranchiseeAccessLead(
  lead: Lead | null | undefined,
  userProfile: UserProfile | null | undefined
): boolean {
  if (!userProfile) return false;

  const role = userProfile.activeRole || userProfile.role || '';
  const roleLower = role.toLowerCase().trim();
  const isFranchiseeRole = roleLower === 'franchisee';

  // Non-franchisee roles are not restricted by franchisee linkage
  if (!isFranchiseeRole) return true;

  // Franchisee role requires lead to exist
  if (!lead) return false;

  // Gather user's linked franchisee names and IDs
  const userFranchiseeNames = new Set<string>();
  const userFranchiseeIds = new Set<string>();

  if (userProfile.franchisee) {
    userFranchiseeNames.add(userProfile.franchisee.trim().toLowerCase());
  }

  if (userProfile.franchiseeId) {
    userFranchiseeIds.add(String(userProfile.franchiseeId).trim().toLowerCase());
  }
  if (userProfile.franchiseeInternalId) {
    userFranchiseeIds.add(String(userProfile.franchiseeInternalId).trim().toLowerCase());
  }
  if ((userProfile as any).activeFranchiseeId) {
    userFranchiseeIds.add(String((userProfile as any).activeFranchiseeId).trim().toLowerCase());
  }

  if (Array.isArray(userProfile.linkedFranchiseeIds)) {
    userProfile.linkedFranchiseeIds.forEach(id => {
      if (id !== undefined && id !== null && String(id).trim()) {
        userFranchiseeIds.add(String(id).trim().toLowerCase());
      }
    });
  }

  if (Array.isArray((userProfile as any).historicalFranchiseeIds)) {
    (userProfile as any).historicalFranchiseeIds.forEach((id: any) => {
      if (id !== undefined && id !== null && String(id).trim()) {
        userFranchiseeIds.add(String(id).trim().toLowerCase());
      }
    });
  }

  if (Array.isArray((userProfile as any).linkedFranchisees)) {
    (userProfile as any).linkedFranchisees.forEach((item: any) => {
      if (typeof item === 'string' && item.trim()) {
        userFranchiseeNames.add(item.trim().toLowerCase());
      } else if (typeof item === 'object' && item !== null) {
        if (item.franchiseeName && typeof item.franchiseeName === 'string' && item.franchiseeName.trim()) {
          userFranchiseeNames.add(item.franchiseeName.trim().toLowerCase());
        }
        if (item.name && typeof item.name === 'string' && item.name.trim()) {
          userFranchiseeNames.add(item.name.trim().toLowerCase());
        }
        if (item.franchiseeId !== undefined && item.franchiseeId !== null && String(item.franchiseeId).trim()) {
          userFranchiseeIds.add(String(item.franchiseeId).trim().toLowerCase());
        }
        if (item.franchiseeInternalId !== undefined && item.franchiseeInternalId !== null && String(item.franchiseeInternalId).trim()) {
          userFranchiseeIds.add(String(item.franchiseeInternalId).trim().toLowerCase());
        }
      }
    });
  }

  // Lead franchisee details
  const leadFranchiseeName = lead.franchisee ? String(lead.franchisee).trim().toLowerCase() : '';
  const leadFranchiseeId = lead.franchisee_id || (lead as any).franchiseeId || (lead as any).franchiseeInternalId
    ? String(lead.franchisee_id || (lead as any).franchiseeId || (lead as any).franchiseeInternalId).trim().toLowerCase()
    : '';

  // 1. Check Franchisee Name match
  if (leadFranchiseeName) {
    if (userFranchiseeNames.has(leadFranchiseeName) || userFranchiseeIds.has(leadFranchiseeName)) {
      return true;
    }
  }

  // 2. Check Franchisee ID match
  if (leadFranchiseeId) {
    if (userFranchiseeIds.has(leadFranchiseeId) || userFranchiseeNames.has(leadFranchiseeId)) {
      return true;
    }
  }

  // 3. Check array of linkedFranchisees on lead
  if (Array.isArray((lead as any).linkedFranchisees)) {
    const hasLinkedMatch = (lead as any).linkedFranchisees.some((item: any) => {
      if (typeof item === 'string' && item.trim()) {
        const norm = item.trim().toLowerCase();
        return userFranchiseeNames.has(norm) || userFranchiseeIds.has(norm);
      } else if (typeof item === 'object' && item !== null) {
        const nameNorm = (item.franchiseeName || item.name || '').toString().trim().toLowerCase();
        const idNorm = (item.franchiseeId || item.franchiseeInternalId || item.id || '').toString().trim().toLowerCase();
        return (nameNorm && (userFranchiseeNames.has(nameNorm) || userFranchiseeIds.has(nameNorm))) ||
               (idNorm && (userFranchiseeIds.has(idNorm) || userFranchiseeNames.has(idNorm)));
      }
      return false;
    });
    if (hasLinkedMatch) return true;
  }

  // 4. Check direct user assignment / creation
  const userDisplayName = (userProfile.displayName || '').trim().toLowerCase();
  const userEmail = (userProfile.email || '').trim().toLowerCase();
  const userUid = (userProfile.uid || '').trim().toLowerCase();
  const userName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ').trim().toLowerCase();

  const isUserIdentity = (val?: string | null) => {
    if (!val) return false;
    const norm = val.trim().toLowerCase();
    return Boolean(
      norm && (
        norm === userDisplayName ||
        norm === userEmail ||
        norm === userUid ||
        (userName && norm === userName)
      )
    );
  };

  if (
    isUserIdentity(lead.salesRepAssigned) ||
    isUserIdentity(lead.dialerAssigned) ||
    isUserIdentity(lead.fieldRepAssigned) ||
    isUserIdentity(lead.accountManagerAssigned) ||
    isUserIdentity((lead as any).assignedTo) ||
    isUserIdentity((lead as any).createdBy) ||
    isUserIdentity((lead as any).createdByName)
  ) {
    return true;
  }

  return false;
}

export function isSignedCustomer(lead?: Partial<Lead> | null): boolean {
  if (!lead) return false;
  const status = (lead.status || '').toString().toLowerCase().trim();
  const customerStatus = (lead.customerStatus || '').toString().toLowerCase().trim();
  const isCompany = Boolean((lead as any).isCompany);

  return (
    isCompany ||
    customerStatus === 'signed' ||
    customerStatus === 'signed customer' ||
    customerStatus === 'won' ||
    customerStatus === 'customer' ||
    status === 'signed' ||
    status === 'signed customer' ||
    status === 'won' ||
    status === 'customer'
  );
}

export function canChangeFranchisee(
  lead: Partial<Lead> | null | undefined,
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!userProfile) return false;

  const role = userProfile.activeRole || userProfile.role || '';
  const roleLower = role.toLowerCase().trim();
  const isStrictAdmin = isSuperAdmin || roleLower === 'admin' || roleLower === 'superadmin';

  // For signed customers, ONLY users with role as 'admin' or 'superadmin' (or isSuperAdmin) can change franchisee
  if (isSignedCustomer(lead)) {
    return isStrictAdmin;
  }

  // For unsigned prospects, dialers ('user') cannot change franchisee
  if (roleLower === 'user' || roleLower === 'dialer' || roleLower === 'dialers') {
    return false;
  }

  return true;
}


