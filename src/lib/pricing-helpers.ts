import { PricingTableRow, LeadSuburbMapping, Lead, Franchisee } from './types';

export const PREMIUM_PLANS = [
  { id: 'Merchant', name: 'Merchant Selected' }
];

export const EXPRESS_PLANS = [
  { id: 'Merchant', name: 'Merchant Selected' }
];

export const DEFAULT_PREMIUM_PRICING: PricingTableRow[] = [
  { type: 'premium', delivery_zone: 'national', product: '1kg', price: 1353 },
  { type: 'premium', delivery_zone: 'remote', product: '1kg', price: 1353 },
  { type: 'premium', delivery_zone: 'national', product: '3kg', price: 1725 },
  { type: 'premium', delivery_zone: 'remote', product: '3kg', price: 1725 },
  { type: 'premium', delivery_zone: 'national', product: '5kg', price: 2321 },
  { type: 'premium', delivery_zone: 'remote', product: '5kg', price: 2321 },
  { type: 'premium', delivery_zone: 'national', product: '10kg', price: 4850 },
  { type: 'premium', delivery_zone: 'remote', product: '10kg', price: 6347 },
  { type: 'premium', delivery_zone: 'national', product: '20kg', price: 10029 },
  { type: 'premium', delivery_zone: 'remote', product: '20kg', price: 10649 }
];

export const DEFAULT_EXPRESS_PRICING: PricingTableRow[] = [
  { type: 'express', delivery_zone: 'national', product: '1kg', price: 1500 },
  { type: 'express', delivery_zone: 'remote', product: '1kg', price: 1500 },
  { type: 'express', delivery_zone: 'national', product: '3kg', price: 1900 },
  { type: 'express', delivery_zone: 'remote', product: '3kg', price: 1900 },
  { type: 'express', delivery_zone: 'national', product: '5kg', price: 2500 },
  { type: 'express', delivery_zone: 'remote', product: '5kg', price: 2500 },
  { type: 'express', delivery_zone: 'national', product: '10kg', price: 5200 },
  { type: 'express', delivery_zone: 'remote', product: '10kg', price: 6800 },
  { type: 'express', delivery_zone: 'national', product: '20kg', price: 11000 },
  { type: 'express', delivery_zone: 'remote', product: '20kg', price: 11500 }
];

export function generatePricingTable(premiumPlan: string, expressPlan: string): PricingTableRow[] {
  const table: PricingTableRow[] = [];
  
  if (premiumPlan === 'Merchant') {
    table.push(...DEFAULT_PREMIUM_PRICING);
  }
  if (expressPlan === 'Merchant') {
    table.push(...DEFAULT_EXPRESS_PRICING);
  }
  
  return table;
}

function parseLodgementPoints(points: any[] | string | undefined | null): any[] {
  if (!points) return [];
  if (typeof points === 'string') {
    try {
      const parsed = JSON.parse(points);
      return Array.isArray(parsed) ? parsed : Object.values(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(points)) return points;
  if (typeof points === 'object') {
    return Object.values(points);
  }
  return [];
}

export function generateSuburbMapping(lead: Lead, franchisee: Franchisee | null): LeadSuburbMapping[] {
  if (!lead.address) return [];
  
  const postcode = lead.address.zip || "";
  const suburb = lead.address.city || "";
  const state = lead.address.state || "";
  const customer_ns_id = lead.entityId || lead.id || "";
  
  const couriers = ['toll', 'star_track'];
  
  // Parse premium and express lodgement points
  const starTrackPts = parseLodgementPoints(franchisee?.starTrackLodgementPoints);
  const mpExpressPts = parseLodgementPoints(franchisee?.mpExpressLodgementPoints);
  
  // Helper to match point based on postcode or suburb
  const findMatch = (pts: any) => {
    if (!pts || !Array.isArray(pts) || pts.length === 0) return null;
    return pts.find((pt: any) => 
      String(pt.postcode || pt.post_code || pt.zip || "") === String(postcode) ||
      String(pt.suburb || pt.city || "").toUpperCase() === suburb.toUpperCase()
    ) || pts[0];
  };
  
  const premiumMatch = findMatch(starTrackPts);
  const expressMatch = findMatch(mpExpressPts);

  return couriers.map(courier => {
    // Premium corresponds to star_track, Express corresponds to toll
    const isPremiumCourier = courier === 'star_track';
    const match = isPremiumCourier ? premiumMatch : expressMatch;
    
    // Resolve depot_id
    const depot_id = match ? String(match.depot_id || match.depotId || match.depot || "") : null;
    
    // Resolve drivers (operator)
    const drivers: { ns_id: string; is_primary: boolean }[] = [];
    if (match) {
      const opId = match.operator_id || match.operatorId || match.ns_id || match.operator;
      if (opId) {
        drivers.push({ ns_id: String(opId), is_primary: true });
      }
    }
    
    // Fallback drivers if none found
    if (drivers.length === 0) {
      drivers.push({ ns_id: "1363", is_primary: true });
    }

    return {
      courier,
      depot_id: depot_id || null,
      hub_id: null,
      only_second_driver: false,
      broadcast: false,
      customer_ns_id,
      postcode,
      suburb: suburb.toLowerCase(),
      state: state.toUpperCase(),
      drivers
    };
  });
}
