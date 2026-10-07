import { UserProfile } from '@/lib/types';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

export type CatalogItemType = 'service' | 'extra';

export interface ServiceCatalogItem {
  itemId: string;
  itemName: string;
  code?: string;
  netsuiteItemId?: string;
  netsuiteItemName?: string;
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
    code: 'AMPO',
    itemName: 'Pick up and Delivery from PO', 
    netsuiteItemId: '501',
    netsuiteItemName: 'Pick up and Delivery from PO',
    defaultRate: 12.50, 
    category: 'Postal', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'AM Mail Pickup from Post Office' 
  },
  { 
    itemId: '60', 
    code: 'AMPO 2',
    itemName: 'Pick up and Delivery from PO 2', 
    netsuiteItemId: '60',
    netsuiteItemName: 'Pick up and Delivery from PO 2',
    defaultRate: 12.50, 
    category: 'Postal', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'AM Mail Pickup from Post Office 2' 
  },
  { 
    itemId: '502', 
    code: 'PMPO',
    itemName: 'Pick up and Lodge at PO', 
    netsuiteItemId: '502',
    netsuiteItemName: 'Pick up and Lodge at PO',
    defaultRate: 8.00, 
    category: 'Postal', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'PM Mail Lodgement to Post Office' 
  },
  { 
    itemId: '61', 
    code: 'PMPO 2',
    itemName: 'Pick up and Lodge at PO 2', 
    netsuiteItemId: '61',
    netsuiteItemName: 'Pick up and Lodge at PO 2',
    defaultRate: 8.00, 
    category: 'Postal', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'PM Mail Lodgement to Post Office 2' 
  },
  { 
    itemId: '503', 
    code: 'DX Service',
    itemName: 'DX Service', 
    netsuiteItemId: '503',
    netsuiteItemName: 'DX Service',
    defaultRate: 10.00, 
    category: 'Postal', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'Document Exchange Pickup/Delivery' 
  },
  { 
    itemId: '504', 
    code: 'Bank Deposit',
    itemName: 'Bank Deposit', 
    netsuiteItemId: '504',
    netsuiteItemName: 'Bank Deposit',
    defaultRate: 15.00, 
    category: 'Ancillary', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'Banking & Deposit Drop-off' 
  },
  { 
    itemId: '505', 
    code: 'Interoffice Courier',
    itemName: 'Interoffice Courier', 
    netsuiteItemId: '505',
    netsuiteItemName: 'Interoffice Courier',
    defaultRate: 20.00, 
    category: 'Ancillary', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'Point to Point Interoffice Transport' 
  },
  { 
    itemId: '506', 
    code: 'Parcel Pickup',
    itemName: 'Parcel Pickup', 
    netsuiteItemId: '506',
    netsuiteItemName: 'Parcel Pickup',
    defaultRate: 5.00, 
    category: 'Parcels', 
    itemType: 'service',
    isFixedRate: false,
    defaultFrequency: 'Mon,Tue,Wed,Thu,Fri',
    description: 'LocalMile / Standard Parcel Pickup' 
  },
  { 
    itemId: '509', 
    code: 'Custom Service',
    itemName: 'Custom Service', 
    netsuiteItemId: '509',
    netsuiteItemName: 'Custom Service',
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
    code: '10910',
    itemName: 'Additional LPO Bag', 
    netsuiteItemId: '10910',
    netsuiteItemName: 'Additional LPO Bag',
    defaultRate: 3.50, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: true, // Predefined fixed price $3.50
    defaultFrequency: 'Adhoc',
    description: 'Additional Post Office Mail Bag ($3.50 fixed)' 
  },
  { 
    itemId: '10911', 
    code: '10911',
    itemName: 'Administration Fee', 
    netsuiteItemId: '10911',
    netsuiteItemName: 'Administration Fee',
    defaultRate: 9.00, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: true, // Predefined fixed price $9.00
    defaultFrequency: 'Adhoc',
    description: 'Standard Monthly Account Administration Fee ($9.00 fixed)' 
  },
  { 
    itemId: '10912', 
    code: '10912',
    itemName: 'Extra Satchel / Heavy Bag', 
    netsuiteItemId: '10912',
    netsuiteItemName: 'Extra Satchel / Heavy Bag',
    defaultRate: 5.00, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: true, // Predefined fixed price $5.00
    defaultFrequency: 'Adhoc',
    description: 'Over-capacity satchel fee ($5.00 fixed)' 
  },
  { 
    itemId: '10913', 
    code: '10913',
    itemName: 'Key Service Fee', 
    netsuiteItemId: '10913',
    netsuiteItemName: 'Key Service Fee',
    defaultRate: 25.00, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: true, // Predefined fixed price $25.00
    defaultFrequency: 'Adhoc',
    description: 'Key Management & Security Deposit ($25.00 fixed)' 
  },
  { 
    itemId: '10914', 
    code: '10914',
    itemName: 'Adhoc Courier Extra', 
    netsuiteItemId: '10914',
    netsuiteItemName: 'Adhoc Courier Extra',
    defaultRate: 15.00, 
    category: 'Ancillary', 
    itemType: 'extra',
    isFixedRate: false, // Editable rate
    defaultFrequency: 'Adhoc',
    description: 'Adhoc courier surcharge or special run' 
  },
  { 
    itemId: '10999', 
    code: '10999',
    itemName: 'Custom Extra', 
    netsuiteItemId: '10999',
    netsuiteItemName: 'Custom Extra',
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
export function resolveServiceCatalogItem(
  serviceName?: string,
  customCatalog?: ServiceCatalogItem[]
): ServiceCatalogItem | null {
  if (!serviceName) return null;
  const raw = String(serviceName).trim();
  const lower = raw.toLowerCase();
  const normalized = lower.replace(/[^a-z0-9]/g, '');
  const pool = (customCatalog && customCatalog.length > 0) ? customCatalog : STANDARD_NETSUITE_SERVICES;

  // 1. Exact match by code (e.g. "AMPO", "AMPO 2", "PMPO 2", "10910")
  const exactByCode = pool.find(s => (s.code || '').trim().toLowerCase() === lower);
  if (exactByCode) return exactByCode;

  // 2. Normalized alphanumeric match by code (e.g. "AMPO 2" matches "AMPO2")
  const normByCode = pool.find(s => (s.code || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normalized);
  if (normByCode) return normByCode;

  // 3. Exact match by netsuiteItemName or itemName
  const exactByName = pool.find(s => 
    (s.netsuiteItemName || '').trim().toLowerCase() === lower || 
    (s.itemName || '').trim().toLowerCase() === lower
  );
  if (exactByName) return exactByName;

  // 4. Normalized alphanumeric match by netsuiteItemName or itemName
  const normByName = pool.find(s => 
    (s.netsuiteItemName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normalized ||
    (s.itemName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
  );
  if (normByName) return normByName;

  // 5. Match by itemId / netsuiteItemId
  const exactById = pool.find(s => 
    String(s.netsuiteItemId || '').trim() === raw || 
    String(s.itemId || '').trim() === raw
  );
  if (exactById) return exactById;

  // 6. Numbered / multi-frequency services (e.g. "AMPO 2", "AMPO 3", "PMPO 2", "H2H 2")
  const numMatch = lower.match(/^([a-z0-9]+)\s*(\d+)$/i);
  if (numMatch) {
    const baseCode = numMatch[1].toLowerCase();
    const num = numMatch[2];
    const targetWithSpace = `${baseCode} ${num}`;
    const targetNoSpace = `${baseCode}${num}`;
    const foundNum = pool.find(s => {
      const sCode = (s.code || '').toLowerCase().trim();
      const sNorm = sCode.replace(/[^a-z0-9]/g, '');
      return sCode === targetWithSpace || sNorm === targetNoSpace;
    });
    if (foundNum) return foundNum;
  }

  // 7. Standard base aliases (ONLY when NOT having a specific number like 2, 3, etc.)
  if (!numMatch) {
    if (lower === 'ampo' || lower === 'am po' || lower === 'am pickup') {
      return pool.find(s => (s.code || '').toLowerCase() === 'ampo') || STANDARD_NETSUITE_SERVICES[0];
    }
    if (lower === 'pmpo' || lower === 'pm po' || lower === 'pm lodge' || lower === 'pm lodgement') {
      return pool.find(s => (s.code || '').toLowerCase() === 'pmpo') || STANDARD_NETSUITE_SERVICES[1];
    }
    if (lower.includes('additional') && lower.includes('bag')) {
      return pool.find(s => (s.code || '').toLowerCase() === '10910' || s.itemId === '10910' || (s.itemName || '').toLowerCase().includes('additional lpo bag')) || STANDARD_NETSUITE_SERVICES.find(s => s.itemId === '10910') || null;
    }
    if (lower.includes('admin') && lower.includes('fee')) {
      return pool.find(s => (s.code || '').toLowerCase() === '10911' || s.itemId === '10911' || (s.itemName || '').toLowerCase().includes('admin')) || STANDARD_NETSUITE_SERVICES.find(s => s.itemId === '10911') || null;
    }
    if (lower.includes('satchel') || lower.includes('heavy bag')) {
      return pool.find(s => (s.code || '').toLowerCase() === '10912' || s.itemId === '10912' || (s.itemName || '').toLowerCase().includes('satchel')) || STANDARD_NETSUITE_SERVICES.find(s => s.itemId === '10912') || null;
    }
    if (lower.includes('key')) {
      return pool.find(s => (s.code || '').toLowerCase() === '10913' || s.itemId === '10913' || (s.itemName || '').toLowerCase().includes('key')) || STANDARD_NETSUITE_SERVICES.find(s => s.itemId === '10913') || null;
    }
    if (lower.includes('dx')) {
      return pool.find(s => (s.code || '').toLowerCase() === 'dx' || s.itemId === '503') || STANDARD_NETSUITE_SERVICES[2];
    }
    if (lower.includes('bank')) {
      return pool.find(s => (s.code || '').toLowerCase() === 'bank' || s.itemId === '504') || STANDARD_NETSUITE_SERVICES[3];
    }
    if (lower.includes('interoffice') || lower.includes('courier')) {
      return pool.find(s => (s.code || '').toLowerCase() === 'interoffice' || s.itemId === '505') || STANDARD_NETSUITE_SERVICES[4];
    }
    if (lower.includes('parcel') || lower.includes('localmile')) {
      return pool.find(s => (s.code || '').toLowerCase() === 'parcel' || s.itemId === '506') || STANDARD_NETSUITE_SERVICES[5];
    }
  }

  return null;
}

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
