import { collection, getDocs, doc, query, where, addDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { TaggedAddress, Address } from '@/lib/types';

/**
 * Checks if a service is a banking service (EB, EB2, EB3, CB2, CB3, CB 3, CB, or code/name containing EB/CB)
 */
export function isBankingService(service: any): boolean {
  if (!service) return false;
  const rawStr = (typeof service === 'string' ? service : (service.code || service.name || service.label || '')).toString().trim();
  if (!rawStr) return false;

  const lower = rawStr.toLowerCase();

  // Explicit match set
  const explicitCodes = new Set(['eb', 'eb2', 'eb3', 'cb', 'cb2', 'cb3', 'cb 3', 'express banking', 'cash banking', 'express bank', 'cash bank']);
  if (explicitCodes.has(lower)) return true;

  // Regex check for EB or CB
  return /\b(eb|cb)\b/i.test(rawStr) || /eb/i.test(rawStr) || /cb/i.test(rawStr);
}

/**
 * Checks if any service in an array of selected services is a banking service
 */
export function isBankingServiceSelected(selectedServices: any[]): boolean {
  if (!selectedServices || !Array.isArray(selectedServices)) return false;
  return selectedServices.some(svc => isBankingService(svc));
}

/**
 * Checks if a service is an H2H service (service code/name contains H2H)
 */
export function isH2hService(service: any): boolean {
  if (!service) return false;
  const rawStr = (typeof service === 'string' ? service : (service.code || service.name || service.label || '')).toString().trim();
  if (!rawStr) return false;
  return /h2h/i.test(rawStr);
}

/**
 * Checks if any service in an array of selected services is an H2H service
 */
export function isH2hServiceSelected(selectedServices: any[]): boolean {
  if (!selectedServices || !Array.isArray(selectedServices)) return false;
  return selectedServices.some(svc => isH2hService(svc));
}

/**
 * Haversine formula for distance in kilometers
 */
export function calculateDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface BankLocationOption {
  id: string;
  name: string;
  address1?: string;
  address2?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postCode?: string;
  postcode?: string;
  phone?: string;
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
  distanceKm: number | null;
  displayLabel: string;
  raw: any;
}

/**
 * Retrieves and sorts all partner locations of locationType "Bank" by proximity to lead site address
 */
export function getNearbyBanks(lead: any, partnerLocations: any[]): BankLocationOption[] {
  // Extract site address & coordinates from lead fields
  const leadLatNum = lead?.latitude != null ? Number(lead.latitude) : (lead?.lat != null ? Number(lead.lat) : (lead?.address?.lat != null ? Number(lead.address.lat) : null));
  const leadLngNum = lead?.longitude != null ? Number(lead.longitude) : (lead?.lng != null ? Number(lead.lng) : (lead?.address?.lng != null ? Number(lead.address.lng) : null));

  const leadZip = (lead?.zip || lead?.postcode || lead?.postCode || lead?.address?.zip || lead?.address?.postcode || '').toString().trim();
  const leadCity = (lead?.city || lead?.suburb || lead?.address?.city || lead?.address?.suburb || '').toString().trim().toLowerCase();

  const bankLocs: BankLocationOption[] = [];

  partnerLocations.forEach((loc) => {
    const locType = (loc.locationType || loc.type || '').toString().trim();
    if (locType.toLowerCase() === 'bank') {
      const locLat = parseFloat(loc.lat || loc.latitude);
      const locLng = parseFloat(loc.lng || loc.longitude);
      const hasCoords = leadLatNum !== null && leadLngNum !== null && !isNaN(leadLatNum) && !isNaN(leadLngNum) && !isNaN(locLat) && !isNaN(locLng);
      const distanceKm = hasCoords ? calculateDistanceInKm(leadLatNum, leadLngNum, locLat, locLng) : null;

      const locPostcode = (loc.postCode || loc.postcode || '').toString().trim();
      const locSuburb = (loc.suburb || loc.city || '').toString().trim();

      let label = loc.name || 'Bank Location';
      const addrStr = [loc.address1, locSuburb, loc.state, locPostcode].filter(Boolean).join(', ');
      if (addrStr) label += ` - ${addrStr}`;

      if (distanceKm !== null) {
        label += ` (${distanceKm.toFixed(1)} km away)`;
      } else if (leadZip && locPostcode === leadZip) {
        label += ` (Postcode Match)`;
      } else if (leadCity && locSuburb.toLowerCase() === leadCity) {
        label += ` (Suburb Match)`;
      }

      bankLocs.push({
        id: loc.id || loc.internalId,
        name: loc.name || 'Bank Location',
        address1: loc.address1,
        address2: loc.address2,
        suburb: loc.suburb,
        city: loc.city || loc.suburb,
        state: loc.state,
        postCode: loc.postCode || loc.postcode,
        postcode: loc.postCode || loc.postcode,
        phone: loc.phone,
        lat: isNaN(locLat) ? undefined : locLat,
        latitude: isNaN(locLat) ? undefined : locLat,
        lng: isNaN(locLng) ? undefined : locLng,
        longitude: isNaN(locLng) ? undefined : locLng,
        distanceKm,
        displayLabel: label,
        raw: loc,
      });
    }
  });

  // Sort: closest distance first, fallback to postcode match, then suburb match, then name
  bankLocs.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) {
      return a.distanceKm - b.distanceKm;
    }
    if (a.distanceKm !== null) return -1;
    if (b.distanceKm !== null) return 1;

    const postcodeA = a.postCode || '';
    const postcodeB = b.postCode || '';
    if (leadZip && postcodeA === leadZip && postcodeB !== leadZip) return -1;
    if (leadZip && postcodeB === leadZip && postcodeA !== leadZip) return 1;

    const suburbA = (a.suburb || '').toLowerCase();
    const suburbB = (b.suburb || '').toLowerCase();
    if (leadCity && suburbA === leadCity && suburbB !== leadCity) return -1;
    if (leadCity && suburbB === leadCity && suburbA !== leadCity) return 1;

    return a.name.localeCompare(b.name);
  });

  return bankLocs;
}

/**
 * Saves or updates a tagged address (e.g. 'EB/CB Bank' or 'H2H Address') for a lead in subcollection `leads/{leadId}/addresses`
 */
export async function saveOrUpdateTaggedAddress(
  leadId: string,
  addressData: Partial<Address> & { tag: 'EB/CB Bank' | 'H2H Address'; [key: string]: any }
): Promise<string> {
  if (!leadId) return '';
  const addressesRef = collection(firestore, 'leads', leadId, 'addresses');
  const q = query(addressesRef, where('tag', '==', addressData.tag));
  const existingSnap = await getDocs(q);

  const payload = {
    tag: addressData.tag,
    address1: addressData.address1 || '',
    street: addressData.street || addressData.address1 || '',
    city: addressData.city || addressData.suburb || '',
    suburb: addressData.suburb || addressData.city || '',
    state: addressData.state || '',
    zip: addressData.zip || addressData.postCode || addressData.postcode || '',
    postCode: addressData.zip || addressData.postCode || addressData.postcode || '',
    country: addressData.country || 'Australia',
    lat: addressData.lat ?? addressData.latitude ?? null,
    lng: addressData.lng ?? addressData.longitude ?? null,
    updatedAt: new Date().toISOString()
  };

  if (!existingSnap.empty) {
    const existingDocRef = doc(firestore, 'leads', leadId, 'addresses', existingSnap.docs[0].id);
    await updateDoc(existingDocRef, payload);
    return existingSnap.docs[0].id;
  } else {
    const newDoc = await addDoc(addressesRef, {
      ...payload,
      createdAt: new Date().toISOString()
    });
    return newDoc.id;
  }
}
