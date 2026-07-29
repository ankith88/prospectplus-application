import { Lead, UserProfile } from '@/lib/types';

export function isLeadActionableForUser(
  lead: Lead | null | undefined,
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!lead || !userProfile) return false;

  const role = userProfile.activeRole || userProfile.role || '';
  
  // Admins, Super Admins, Sales Managers, and Outbound Admins can action any lead
  if (
    isSuperAdmin ||
    role === 'admin' ||
    role === 'Sales Manager' ||
    role === 'Outbound Admin' ||
    role === 'Lead Gen Admin'
  ) {
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
    role === 'Account Manager' ||
    role === 'Account Managers' ||
    role === 'account managers'
  ) {
    return (
      isAssignedToUser(lead.accountManagerAssigned) ||
      isAssignedToUser(lead.salesRepAssigned) ||
      isAssignedToUser((lead as any).assignedTo)
    );
  }

  // Outbound Dialers (role 'user'): Can action ONLY leads in outbound bucket assigned to them
  if (role === 'user' || role === 'Dialer' || role === 'dialers') {
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
  if (role === 'Customer Success' || (role as string) === 'customer success') {
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
  const role = userProfile.activeRole || userProfile.role || '';
  const assignedRoles = userProfile.assignedRoles || [];
  const amRoles = ['Account Manager', 'Account Managers', 'account managers'];
  return amRoles.includes(role) || assignedRoles.some(r => amRoles.includes(r));
}

export function canReassignLead(
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!userProfile) return false;
  if (isSuperAdmin) return true;

  const role = userProfile.activeRole || userProfile.role || '';
  const assignedRoles = userProfile.assignedRoles || [];
  const allowedRoles = [
    'admin', 
    'Sales Manager', 
    'Outbound Admin', 
    'Lead Gen Admin', 
    'Marketing Admin',
    'Account Manager',
    'Account Managers',
    'account managers'
  ];
  return allowedRoles.includes(role) || assignedRoles.some(r => allowedRoles.includes(r));
}

export function canChangeBucket(
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!userProfile) return false;
  if (isSuperAdmin) return true;

  const role = userProfile.activeRole || userProfile.role || '';
  if (role === 'Outbound Admin') return false;
  return ['admin', 'Sales Manager', 'Lead Gen Admin', 'Marketing Admin', 'Marketing Manager'].includes(role);
}

export function isSaleDealsVisible(
  userProfile: UserProfile | null | undefined
): boolean {
  if (!userProfile) return false;

  const role = userProfile.activeRole || userProfile.role || '';
  return ![
    'user',
    'Customer Success',
    'customer success',
    'Customer Service',
    'customer service'
  ].includes(role);
}

export function canEditSignedCustomerAddress(
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!userProfile) return false;
  if (isSuperAdmin) return true;

  const role = userProfile.activeRole || userProfile.role || '';
  return ![
    'user',
    'Customer Success',
    'customer success',
    'Customer Service',
    'customer service'
  ].includes(role);
}
