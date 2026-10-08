/**
 * Standing Order Form (SOF / R9B) Service Eligibility
 * 
 * The Standing Order Form (SCF / SOF R9B) is exclusively generated for Australia Post
 * PO Box pickup services (AMPO and AMPO package bundles).
 */

export interface SofEligibleService {
  code: string;
  name: string;
  netsuiteItemId: string;
  netsuiteItemName: string;
}

export const SOF_ELIGIBLE_SERVICES: readonly SofEligibleService[] = [
  { code: 'AMPO', name: 'AMPO', netsuiteItemId: '24', netsuiteItemName: 'Pick up and Delivery from PO' },
  { code: 'AMPO 10', name: 'AMPO 10', netsuiteItemId: '8912', netsuiteItemName: 'Pick up and Delivery from PO 10' },
  { code: 'AMPO 2', name: 'AMPO 2', netsuiteItemId: '60', netsuiteItemName: 'Pick up and Delivery from PO 2' },
  { code: 'AMPO 3', name: 'AMPO 3', netsuiteItemId: '61', netsuiteItemName: 'Pick up and Delivery from PO 3' },
  { code: 'AMPO 4', name: 'AMPO 4', netsuiteItemId: '72', netsuiteItemName: 'Pick up and Delivery from PO 4' },
  { code: 'AMPO 5', name: 'AMPO 5', netsuiteItemId: '8907', netsuiteItemName: 'Pick up and Delivery from PO 5' },
  { code: 'AMPO 6', name: 'AMPO 6', netsuiteItemId: '8908', netsuiteItemName: 'Pick up and Delivery from PO 6' },
  { code: 'AMPO 7', name: 'AMPO 7', netsuiteItemId: '8909', netsuiteItemName: 'Pick up and Delivery from PO 7' },
  { code: 'AMPO 8', name: 'AMPO 8', netsuiteItemId: '8910', netsuiteItemName: 'Pick up and Delivery from PO 8' },
  { code: 'AMPO 9', name: 'AMPO 9', netsuiteItemId: '8911', netsuiteItemName: 'Pick up and Delivery from PO 9' },
  { code: 'Package: AMPO & H2H', name: 'Package: AMPO & H2H', netsuiteItemId: '79', netsuiteItemName: 'Package: Pickup from PO & Hand to Hand Delivery' },
  { code: 'Package: AMPO & PMPO', name: 'Package: AMPO & PMPO', netsuiteItemId: '76', netsuiteItemName: 'Package: Pickup from PO & Lodge Outgoing Mail' },
  { code: 'Package: AMPO & PMPO 2', name: 'Package: AMPO & PMPO 2', netsuiteItemId: '10793', netsuiteItemName: 'Package: Pickup from PO & Lodge Outgoing Mail 2' },
  { code: 'Package: AMPO & PMPO 3', name: 'Package: AMPO & PMPO 3', netsuiteItemId: '10794', netsuiteItemName: 'Package: Pickup from PO & Lodge Outgoing Mail 3' },
  { code: 'Package: AMPO 2 PO Box', name: 'Package: AMPO 2 PO Box', netsuiteItemId: '78', netsuiteItemName: 'Package: Pickup & Delivery from 2 PO' },
  { code: 'Package: AMPO, PMPO & EB', name: 'Package: AMPO, PMPO & EB', netsuiteItemId: '77', netsuiteItemName: 'Package: Pickup from PO, Lodge Outgoing Mail & Express Bank' },
  { code: 'Package: AMST & AMPO', name: 'Package: AMST & AMPO', netsuiteItemId: '9223', netsuiteItemName: 'Package: Pick Up and Delivery of Street & PO' },
] as const;

export const SOF_ELIGIBLE_ITEM_IDS = new Set<string>(
  SOF_ELIGIBLE_SERVICES.map(s => s.netsuiteItemId)
);

export const SOF_ELIGIBLE_CODES = new Set<string>(
  SOF_ELIGIBLE_SERVICES.map(s => s.code.toLowerCase())
);

/**
 * Checks whether an individual service is eligible for Standing Order Form creation.
 */
export function isSofEligibleService(service: any): boolean {
  if (!service) return false;

  // If service is a string (e.g. service code, name, or itemId)
  if (typeof service === 'string') {
    const s = service.trim();
    if (!s) return false;
    const lower = s.toLowerCase();

    // Check direct ID or code match
    if (SOF_ELIGIBLE_ITEM_IDS.has(s) || SOF_ELIGIBLE_CODES.has(lower)) {
      return true;
    }

    // Explicitly reject standalone non-AMPO services that might otherwise contain partial strings
    if (
      lower.startsWith('pmpo') || 
      lower.startsWith('amstreet') || 
      lower.includes('mail processing') || 
      lower.includes('redirection') ||
      lower === 'package: pmpo & eb'
    ) {
      return false;
    }

    // Must contain 'ampo' and match one of our known patterns
    return lower.includes('ampo');
  }

  // If service is an object (ServiceLineItem, LeadService, etc.)
  const itemId = String(service.netsuiteItemId || service.itemId || service.id || '').trim();
  if (itemId && SOF_ELIGIBLE_ITEM_IDS.has(itemId)) {
    return true;
  }

  const name = String(service.name || service.serviceName || service.code || service.netsuiteItemName || '').trim().toLowerCase();
  if (!name) return false;

  if (SOF_ELIGIBLE_CODES.has(name)) {
    return true;
  }

  if (
    name.startsWith('pmpo') || 
    name.startsWith('amstreet') || 
    name.includes('mail processing') || 
    name.includes('redirection') ||
    name === 'package: pmpo & eb'
  ) {
    return false;
  }

  return name.includes('ampo');
}

/**
 * Checks whether a lead or company entity has at least one SOF-eligible service.
 */
export function checkHasAmpo(data: any): boolean {
  if (!data) return false;

  const services = Array.isArray(data.services) 
    ? data.services 
    : Array.isArray(data.selectedServices) 
      ? data.selectedServices 
      : [];

  return services.some((s: any) => isSofEligibleService(s));
}

/**
 * Validates whether a lead or company record has a postal address populated.
 */
export function checkHasPostalAddress(data: any): boolean {
  if (!data) return false;
  if (data.postalAddress) {
    const p = data.postalAddress;
    if (p.street || p.address1 || p.city || p.zip) return true;
  }
  return !!(data.postalAddress1 || data.boxNumber || data.postalStreet);
}

/**
 * Checks if a lead has both an AMPO service and a valid postal address for SOF.
 */
export function isLeadSofEligible(data: any): boolean {
  return checkHasAmpo(data) && checkHasPostalAddress(data);
}
