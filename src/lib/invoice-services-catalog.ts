/**
 * NetSuite Standard Services & Line Item Catalog
 */
import { UserProfile } from '@/lib/types';

export type CatalogItemType = 'service' | 'extra';

export interface ServiceCatalogItem {
  itemId: string;
  itemName: string;
  defaultRate: number;
  category: 'Postal' | 'Parcels' | 'Ancillary' | 'Custom' | 'Banking' | 'Hand to Hand & Delivery' | 'Bundled Packages' | 'Extras' | 'Services' | string;
  itemType: CatalogItemType;
  isFixedRate?: boolean; // If true, user cannot alter this price
  defaultFrequency?: string; // e.g. 'Mon,Tue,Wed,Thu,Fri' or 'Adhoc'
  description?: string;
  partnerCommissionAccount?: string;
  partnerCommissionModel?: string;
  partnerCommissionRate?: number | string;
}

export const STANDARD_NETSUITE_SERVICES: ServiceCatalogItem[] = [
  // --- Core Services ---
  { 
    itemId: '501', 
    itemName: 'AMPO', 
    defaultRate: 12.50, 
    category: 'Postal', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'AM Mail Pickup from Post Office' 
  },
  { 
    itemId: '502', 
    itemName: 'PMPO', 
    defaultRate: 8.00, 
    category: 'Postal', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'PM Mail Lodgement to Post Office' 
  },
  { 
    itemId: '503', 
    itemName: 'DX Service', 
    defaultRate: 10.00, 
    category: 'Postal', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'Document Exchange Pickup/Delivery' 
  },
  { 
    itemId: '504', 
    itemName: 'Bank Deposit', 
    defaultRate: 15.00, 
    category: 'Ancillary', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'Banking & Deposit Drop-off' 
  },
  { 
    itemId: '505', 
    itemName: 'Interoffice Courier', 
    defaultRate: 20.00, 
    category: 'Ancillary', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'Point to Point Interoffice Transport' 
  },
  { 
    itemId: '506', 
    itemName: 'Parcel Pickup', 
    defaultRate: 5.00, 
    category: 'Parcels', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'LocalMile / Standard Parcel Pickup' 
  },
  { 
    itemId: '509', 
    itemName: 'Custom Service', 
    defaultRate: 0.00, 
    category: 'Custom', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'Custom Scheduled Service' 
  },

  // --- Extras / Ancillary Items ---
  { 
    itemId: '10910', 
    itemName: 'Additional LPO Bag', 
    defaultRate: 3.50, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: true, // Predefined fixed price $3.50
    defaultFrequency: 'Adhoc',
    description: 'Additional Post Office Mail Bag ($3.50 fixed)' 
  },
  { 
    itemId: '10911', 
    itemName: 'Administration Fee', 
    defaultRate: 9.00, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: true, // Predefined fixed price $9.00
    defaultFrequency: 'Adhoc',
    description: 'Standard Monthly Account Administration Fee ($9.00 fixed)' 
  },
  { 
    itemId: '10912', 
    itemName: 'Extra Satchel / Heavy Bag', 
    defaultRate: 5.00, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: true, // Predefined fixed price $5.00
    defaultFrequency: 'Adhoc',
    description: 'Over-capacity satchel fee ($5.00 fixed)' 
  },
  { 
    itemId: '10913', 
    itemName: 'Key Service Fee', 
    defaultRate: 25.00, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: true, // Predefined fixed price $25.00
    defaultFrequency: 'Adhoc',
    description: 'Key Management & Security Deposit ($25.00 fixed)' 
  },
  { 
    itemId: '10914', 
    itemName: 'Adhoc Courier Extra', 
    defaultRate: 15.00, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: false, // Editable rate
    defaultFrequency: 'Adhoc',
    description: 'Adhoc courier surcharge or special run' 
  },
  { 
    itemId: '10999', 
    itemName: 'Custom Extra', 
    defaultRate: 0.00, 
    category: 'Custom', 
    itemType: 'extra',
    isFixedRate: false, // Editable rate
    defaultFrequency: 'Adhoc',
    description: 'Custom extra or one-off charge' 
  },
];

export const AVAILABLE_SERVICES = STANDARD_NETSUITE_SERVICES.filter(s => s.itemType === 'service');
export const AVAILABLE_EXTRAS = STANDARD_NETSUITE_SERVICES.filter(s => s.itemType === 'extra');

/**
 * Resolves standard NetSuite item details from service name or keyword
 */
export function resolveServiceCatalogItem(serviceName?: string): ServiceCatalogItem | null {
  if (!serviceName) return null;
  const lower = serviceName.toLowerCase().trim();

  // Exact match first
  const exact = STANDARD_NETSUITE_SERVICES.find(s => s.itemName.toLowerCase() === lower);
  if (exact) return exact;

  if (lower === 'ampo' || lower.includes('am po') || lower.includes('am pickup')) {
    return STANDARD_NETSUITE_SERVICES[0];
  }
  if (lower === 'pmpo' || lower.includes('pm po') || lower.includes('pm lodge') || lower.includes('pm lodgement')) {
    return STANDARD_NETSUITE_SERVICES[1];
  }
  if (lower.includes('additional') && lower.includes('bag')) {
    return STANDARD_NETSUITE_SERVICES.find(s => s.itemId === '10910') || null;
  }
  if (lower.includes('admin') && lower.includes('fee')) {
    return STANDARD_NETSUITE_SERVICES.find(s => s.itemId === '10911') || null;
  }
  if (lower.includes('satchel') || lower.includes('heavy bag')) {
    return STANDARD_NETSUITE_SERVICES.find(s => s.itemId === '10912') || null;
  }
  if (lower.includes('key')) {
    return STANDARD_NETSUITE_SERVICES.find(s => s.itemId === '10913') || null;
  }
  if (lower.includes('dx')) {
    return STANDARD_NETSUITE_SERVICES[2];
  }
  if (lower.includes('bank')) {
    return STANDARD_NETSUITE_SERVICES[3];
  }
  if (lower.includes('interoffice') || lower.includes('courier')) {
    return STANDARD_NETSUITE_SERVICES[4];
  }
  if (lower.includes('parcel') || lower.includes('localmile')) {
    return STANDARD_NETSUITE_SERVICES[5];
  }

  return null;
}

import { SUPER_ADMIN_UIDS } from '@/lib/constants';

/**
 * Checks if the current user has permission to create customer invoices.
 * Restricts access to Superadmins and Admins; strictly disables for Franchisees.
 */
export function canCreateCustomerInvoice(
  userProfile: UserProfile | null | undefined,
  isSuperAdmin: boolean = false
): boolean {
  if (!userProfile) return false;
  if (isSuperAdmin) return true;
  if (userProfile.uid && SUPER_ADMIN_UIDS.includes(userProfile.uid)) return true;

  const activeRole = String(userProfile.activeRole || userProfile.role || '').trim().toLowerCase();

  // Strict Franchisee Lockout
  if (activeRole === 'franchisee' || (userProfile as any).franchiseeOnly === true) {
    return false;
  }

  // Check all assigned roles
  const assignedRoles = (userProfile.assignedRoles || []).map(r => String(r).toLowerCase());
  if (assignedRoles.includes('franchisee') && !assignedRoles.some(r => ['admin', 'outbound admin', 'super user', 'sales manager', 'operations'].includes(r))) {
    return false;
  }

  const allowedRoles = [
    'admin',
    'outbound admin',
    'super user',
    'lead gen admin',
    'field sales admin',
    'finance',
    'finance manager',
    'finanace manager',
    'data admin',
    'operations',
    'operations manager',
    'sales manager',
    'account manager',
    'account managers',
    'customer success',
    'customer service',
    'user'
  ];

  return allowedRoles.includes(activeRole) || assignedRoles.some(r => allowedRoles.includes(r));
}
