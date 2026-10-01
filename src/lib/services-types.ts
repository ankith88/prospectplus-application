/**
 * Service Line Item & Commission Structures Specification
 */

export type CatalogItemType = 'service' | 'extra';

export type CommissionModelType = 
  | '- New -'
  | 'Unit Rate - Item Defined'
  | 'Percentage of Sales - Item Defined'
  | 'No Franchisee Commission'
  | 'Percentage of Sales - Franchisee Defined'
  | '100% Franchisee Commission';

export const COMMISSION_MODEL_OPTIONS: { label: string; value: CommissionModelType; description: string }[] = [
  { 
    label: 'Percentage of Sales - Franchisee Defined', 
    value: 'Percentage of Sales - Franchisee Defined', 
    description: 'Franchisee receives their individual standard commission percentage (e.g. 70%, 80%) on the total line item revenue.' 
  },
  { 
    label: 'Percentage of Sales - Item Defined', 
    value: 'Percentage of Sales - Item Defined', 
    description: 'All franchisees receive a fixed percentage defined directly on this service item (e.g. 75%).' 
  },
  { 
    label: 'Unit Rate - Item Defined', 
    value: 'Unit Rate - Item Defined', 
    description: 'Franchisee receives a fixed dollar amount per unit/stop completed (e.g. $5.00 per pickup), regardless of sale price.' 
  },
  { 
    label: '100% Franchisee Commission', 
    value: '100% Franchisee Commission', 
    description: 'Franchisee receives 100% of the service revenue with no franchisor deduction.' 
  },
  { 
    label: 'No Franchisee Commission', 
    value: 'No Franchisee Commission', 
    description: '0% commission. Full revenue is retained by MailPlus Head Office / Franchisor.' 
  },
  { 
    label: '- New -', 
    value: '- New -', 
    description: 'Unconfigured / Custom commission structure.' 
  },
];

export interface FranchiseeServiceCommissionOverride {
  franchiseeId: string;
  franchiseeName: string;
  commissionModel?: CommissionModelType;
  commissionRate?: number; // Custom rate (either % or $ depending on model)
  customBaseRate?: number; // Custom service base rate override for this franchisee ($)
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ServiceLineItemDoc {
  id: string; // Document ID (usually internal ID or code)
  code: string; // e.g. "AMPO", "PMPO", "10910"
  netsuiteItemName: string; // NetSuite Item Name e.g. "Pick up and Delivery from PO"
  netsuiteItemId?: string; // NetSuite Internal Item ID e.g. "24", "501"
  itemType: CatalogItemType; // 'service' | 'extra'
  category: string; // "Postal" | "Parcels" | "Ancillary" | "Banking" | "Hand to Hand & Delivery" | "Bundled Packages" | "Custom" | "Extras" | "Services" | string
  basePrice: number; // Default base rate ($)
  defaultRate?: number; // Alias for basePrice
  isFixedRate: boolean; // If true, dialers/invoicing users cannot modify the unit rate
  defaultFrequency: string; // "Mon,Tue,Wed,Thu,Fri" | "Adhoc" | "Daily" | "Mon,Wed,Fri" | string
  gstApplicable: 'Yes' | 'No' | boolean;
  partnerCommissionAccount?: string; // e.g. "Franchise Commissions"
  partnerCommissionModel?: CommissionModelType;
  partnerCommissionRate?: number | string; // Default commission rate (e.g. 70 or 5.00)
  description?: string;
  isActive: boolean; // Active vs Inactive
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
  franchiseeCommissions?: Record<string, FranchiseeServiceCommissionOverride>;
}

export const SERVICE_CATEGORIES = [
  'Postal',
  'Parcels',
  'Ancillary',
  'Banking',
  'Hand to Hand & Delivery',
  'Bundled Packages',
  'Custom',
  'Services',
  'Extras'
] as const;

export const FREQUENCY_PRESETS = [
  'Mon,Tue,Wed,Thu,Fri',
  'Mon,Wed,Fri',
  'Tue,Thu',
  'Daily',
  'Weekly',
  'Fortnightly',
  'Monthly',
  'Adhoc'
] as const;

/**
 * Calculates estimated commission and franchisor share for a service line item
 */
export function calculateServiceCommissionEstimate(
  model: CommissionModelType | undefined,
  itemRate: number,
  partnerRate: number | string | undefined,
  franchiseeDefaultRate: number = 0.70, // 70% default
  override?: FranchiseeServiceCommissionOverride
): {
  effectiveModel: CommissionModelType;
  commissionAmountPerUnit: number;
  commissionPercentage: number;
  franchisorAmountPerUnit: number;
  summaryText: string;
} {
  const effectiveModel = override?.commissionModel && override.commissionModel !== '- New -'
    ? override.commissionModel
    : (model || 'Percentage of Sales - Franchisee Defined');

  const parsedPartnerRate = Number(override?.commissionRate ?? partnerRate ?? 0);
  const baseRate = Number(override?.customBaseRate ?? itemRate ?? 0);

  let commAmount = 0;
  let commPercent = 0;

  switch (effectiveModel) {
    case '100% Franchisee Commission':
      commAmount = baseRate;
      commPercent = 100;
      break;

    case 'No Franchisee Commission':
      commAmount = 0;
      commPercent = 0;
      break;

    case 'Unit Rate - Item Defined':
      commAmount = parsedPartnerRate;
      commPercent = baseRate > 0 ? Math.round((commAmount / baseRate) * 100) : 0;
      break;

    case 'Percentage of Sales - Item Defined': {
      // If parsedPartnerRate is entered as 70 or 0.70
      const pct = parsedPartnerRate > 1 ? parsedPartnerRate / 100 : parsedPartnerRate;
      commAmount = baseRate * pct;
      commPercent = Math.round(pct * 100);
      break;
    }

    case 'Percentage of Sales - Franchisee Defined':
    default: {
      // Uses franchisee default rate (e.g. 0.70 -> 70%)
      const pct = franchiseeDefaultRate > 1 ? franchiseeDefaultRate / 100 : franchiseeDefaultRate;
      commAmount = baseRate * pct;
      commPercent = Math.round(pct * 100);
      break;
    }
  }

  const franchisorAmount = Math.max(0, baseRate - commAmount);

  let summaryText = '';
  if (effectiveModel === '100% Franchisee Commission') {
    summaryText = `100% to Franchisee ($${baseRate.toFixed(2)})`;
  } else if (effectiveModel === 'No Franchisee Commission') {
    summaryText = `0% to Franchisee ($0.00)`;
  } else if (effectiveModel === 'Unit Rate - Item Defined') {
    summaryText = `$${commAmount.toFixed(2)}/unit fixed`;
  } else {
    summaryText = `${commPercent}% ($${commAmount.toFixed(2)})`;
  }

  return {
    effectiveModel,
    commissionAmountPerUnit: Number(commAmount.toFixed(2)),
    commissionPercentage: commPercent,
    franchisorAmountPerUnit: Number(franchisorAmount.toFixed(2)),
    summaryText
  };
}
