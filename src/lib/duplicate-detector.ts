import { Lead } from './types';

export type MatchConfidence = 'High' | 'Medium' | 'Low' | 'None';

export interface DuplicateMatchResult {
  isMatch: boolean;
  score: number; // 0 to 100
  confidence: MatchConfidence;
  matchedCriteria: string[];
}

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.com.au',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'outlook.com.au',
  'icloud.com',
  'me.com',
  'aol.com',
  'bigpond.com',
  'bigpond.net.au',
  'optusnet.com.au',
  'live.com',
  'live.com.au',
  'protonmail.com',
  'zoho.com'
]);

/**
 * Normalizes ABN string by retaining only digits
 */
export function cleanAbn(abn?: string | null): string {
  if (!abn) return '';
  return abn.replace(/\D/g, '');
}

/**
 * Extracts and normalizes the email domain from an email address
 */
export function extractEmailDomain(email?: string | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length < 2) return null;
  const domain = parts[parts.length - 1].trim();
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) {
    return null;
  }
  return domain;
}

/**
 * Normalizes company names for comparison (strips punctuation, common corporate entity suffixes, and extra spaces)
 */
export function normalizeCompanyName(name?: string | null): string {
  if (!name || typeof name !== 'string') return '';
  let cleaned = name.trim().toLowerCase();
  // Remove common corporate suffixes
  cleaned = cleaned
    .replace(/\b(pty\s+ltd|pty\.?\s*ltd\.?|ltd\.?|limited|inc\.?|incorporated|corp\.?|corporation|co\.?)\b/gi, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

/**
 * Normalizes phone numbers to digits only (stripping country codes / formatting)
 */
export function cleanPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  // Retain last 8-10 digits for local comparison
  return digits.length >= 8 ? digits.slice(-9) : digits;
}

/**
 * Normalizes address for comparison
 */
export function normalizeAddress(address?: any): { street: string; suburb: string; state: string; zip: string } {
  if (!address) return { street: '', suburb: '', state: '', zip: '' };
  
  const streetRaw = address.street || address.address1 || '';
  const street = streetRaw.trim().toLowerCase()
    .replace(/\b(street|st|road|rd|avenue|ave|drive|drv|dr|place|pl|parade|pde|highway|hwy|court|ct)\b/gi, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const suburb = (address.city || address.suburb || '').trim().toLowerCase();
  const state = (address.state || '').trim().toLowerCase();
  const zip = (address.zip || address.postcode || '').trim().toLowerCase();

  return { street, suburb, state, zip };
}

/**
 * Evaluates duplicate match tier and confidence score between two lead entities
 */
export function evaluateDuplicateScore(
  leadA: Partial<Lead> & { contacts?: any[] },
  leadB: Partial<Lead> & { contacts?: any[] }
): DuplicateMatchResult {
  const matchedCriteria: string[] = [];

  // 1. ABN Match Check
  const abnA = cleanAbn(leadA.abn);
  const abnB = cleanAbn(leadB.abn);
  const isAbnMatch = abnA.length >= 9 && abnB.length >= 9 && abnA === abnB;

  if (isAbnMatch) {
    matchedCriteria.push('Exact ABN Match');
    return {
      isMatch: true,
      score: 100,
      confidence: 'High',
      matchedCriteria
    };
  }

  // 2. Company Name Comparison
  const compA = normalizeCompanyName(leadA.companyName);
  const compB = normalizeCompanyName(leadB.companyName);
  const isCompMatch = compA.length >= 2 && compB.length >= 2 && (compA === compB || compA.includes(compB) || compB.includes(compA));

  if (isCompMatch) {
    matchedCriteria.push('Company Name');
  }

  // 3. Email Domain Comparison
  const domainA = extractEmailDomain(leadA.customerServiceEmail) || 
    (leadA.contacts && leadA.contacts[0] ? extractEmailDomain(leadA.contacts[0].email) : null);
  const domainB = extractEmailDomain(leadB.customerServiceEmail) || 
    (leadB.contacts && leadB.contacts[0] ? extractEmailDomain(leadB.contacts[0].email) : null);
  
  const isDomainMatch = !!(domainA && domainB && domainA === domainB);
  if (isDomainMatch) {
    matchedCriteria.push('Email Domain');
  }

  // 4. Address Comparison
  const addrA = normalizeAddress(leadA.address || leadA);
  const addrB = normalizeAddress(leadB.address || leadB);
  
  const isStreetMatch = !!(addrA.street && addrB.street && (addrA.street === addrB.street || addrA.street.includes(addrB.street) || addrB.street.includes(addrA.street)));
  const isZipOrSuburbMatch = !!((addrA.zip && addrB.zip && addrA.zip === addrB.zip) || (addrA.suburb && addrB.suburb && addrA.suburb === addrB.suburb));
  const isAddressMatch = isStreetMatch && isZipOrSuburbMatch;

  if (isAddressMatch) {
    matchedCriteria.push('Address');
  }

  // 5. Phone Comparison
  const phoneA = cleanPhone(leadA.customerPhone || (leadA.contacts && leadA.contacts[0] ? leadA.contacts[0].phone : null));
  const phoneB = cleanPhone(leadB.customerPhone || (leadB.contacts && leadB.contacts[0] ? leadB.contacts[0].phone : null));
  const isPhoneMatch = !!(phoneA && phoneB && phoneA === phoneB);

  if (isPhoneMatch) {
    matchedCriteria.push('Phone Number');
  }

  // Multi-Tier Confidence Scoring Evaluation
  // Tier 1 (Triple Match: Company + Address + Email Domain): High Confidence (95%)
  if (isCompMatch && isAddressMatch && isDomainMatch) {
    return {
      isMatch: true,
      score: 95,
      confidence: 'High',
      matchedCriteria
    };
  }

  // Tier 2 (Company + Address + Phone): High Confidence (90%)
  if (isCompMatch && isAddressMatch && isPhoneMatch) {
    return {
      isMatch: true,
      score: 90,
      confidence: 'High',
      matchedCriteria
    };
  }

  // Tier 3 (Company + Domain): Medium Confidence (75%)
  if (isCompMatch && isDomainMatch) {
    return {
      isMatch: true,
      score: 75,
      confidence: 'Medium',
      matchedCriteria
    };
  }

  // Tier 4 (Company + Address): Medium Confidence (70%)
  if (isCompMatch && isAddressMatch) {
    return {
      isMatch: true,
      score: 70,
      confidence: 'Medium',
      matchedCriteria
    };
  }

  // Tier 5 (Company + Phone): Medium Confidence (65%)
  if (isCompMatch && isPhoneMatch) {
    return {
      isMatch: true,
      score: 65,
      confidence: 'Medium',
      matchedCriteria
    };
  }

  // Tier 6 (Domain + Address): Low Confidence (50%)
  if (isDomainMatch && isAddressMatch) {
    return {
      isMatch: true,
      score: 50,
      confidence: 'Low',
      matchedCriteria
    };
  }

  // Single Criteria Match (e.g. Company Name only) - Low Confidence (35%), flag as potential duplicate candidate
  if (isCompMatch) {
    return {
      isMatch: true,
      score: 35,
      confidence: 'Low',
      matchedCriteria
    };
  }

  return {
    isMatch: false,
    score: 0,
    confidence: 'None',
    matchedCriteria: []
  };
}
