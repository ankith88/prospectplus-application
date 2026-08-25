export interface CancellationHierarchyMatch {
  themeId: string;
  themeName: string;
  whyId: string;
  whyName: string;
  reasonId: string;
  reasonName: string;
}

export const DEFAULT_CANCELLATION_HIERARCHY = [
  {
    id: "5",
    name: "Business Changes",
    whys: [
      {
        id: "3",
        name: "Closing the business",
        reasons: [
          { id: "7", name: "Non-voluntary administration" },
          { id: "6", name: "Voluntary administration" },
          { id: "209", name: "Re-evaluation of business" }
        ]
      },
      {
        id: "4",
        name: "Relocating the business",
        reasons: [
          { id: "9", name: "Moving locations to a non-serviceable area" },
          { id: "8", name: "Moving locations, service no longer required" }
        ]
      },
      {
        id: "10",
        name: "Change of entity",
        reasons: [
          { id: "17", name: "New owners signed new SCF" },
          { id: "16", name: "New owners are not interested in services" }
        ]
      },
      {
        id: "11",
        name: "Going electronic/Cashless",
        reasons: [
          { id: "18", name: "No longer carrying cash/cheques" }
        ]
      },
      {
        id: "12",
        name: "Closure of PO Box",
        reasons: [
          { id: "21", name: "Low mail volumes / going paperless" },
          { id: "19", name: "Moving to a non-serviceable area" },
          { id: "20", name: "Unpaid PO Box - closed by Aus Post" }
        ]
      },
      {
        id: "13",
        name: "Merging of offices",
        reasons: [
          { id: "22", name: "Service in one location no longer required" }
        ]
      },
      {
        id: "14",
        name: "Relocating - Aus Post Redirected",
        reasons: [
          { id: "23", name: "Aus Post redirecting PO Box mail to new location" }
        ]
      },
      {
        id: "15",
        name: "Relocation - New Franchisee",
        reasons: [
          { id: "24", name: "Moving locations, signed new SCF" }
        ]
      }
    ]
  },
  {
    id: "25",
    name: "Service & Quality Issues",
    whys: [
      {
        id: "31",
        name: "Shipping Quality Issues",
        reasons: [
          { id: "34", name: "Damaged items" },
          { id: "33", name: "Delayed deliveries" }
        ]
      },
      {
        id: "32",
        name: "Issues with Operations",
        reasons: [
          { id: "35", name: "Collection times" },
          { id: "130", name: "Other feedback (i.e. Operator Issue)" },
          { id: "36", name: "Conflicting views between franchisee and customer" },
          { id: "37", name: "Sweep issues cannot resolve" }
        ]
      },
      {
        id: "300",
        name: "Freight & Product Restrictions",
        reasons: [
          { id: "301", name: "Dangerous/prohibited goods" },
          { id: "302", name: "Ships items over 20kg" },
          { id: "303", name: "Needs standard shipping" },
          { id: "304", name: "Ships items internationally only" },
          { id: "305", name: "Requires pallet freight / heavy cargo" }
        ]
      }
    ]
  },
  {
    id: "26",
    name: "Cost & Financial",
    whys: [
      {
        id: "38",
        name: "Taking the service in-house",
        reasons: [
          { id: "42", name: "Cutting costs" },
          { id: "44", name: "Cost cutting and dissatisfied with MailPlus" },
          { id: "43", name: "Volume of mail decreased" }
        ]
      },
      {
        id: "39",
        name: "Payment issues",
        reasons: [
          { id: "46", name: "Can no longer afford services" },
          { id: "45", name: "Debt with MailPlus" }
        ]
      },
      {
        id: "40",
        name: "Fuel Surcharge",
        reasons: [
          { id: "48", name: "Product - Cannot be waived" },
          { id: "47", name: "Service - Franchisee chose not to waive" }
        ]
      },
      {
        id: "41",
        name: "Collection Fee",
        reasons: [
          { id: "49", name: "Volume cannot justify free shipping" }
        ]
      },
      {
        id: "310",
        name: "Pricing & Rates",
        reasons: [
          { id: "311", name: "Price too high" },
          { id: "312", name: "Rates not competitive vs current courier" }
        ]
      }
    ]
  },
  {
    id: "27",
    name: "Competitive & Strategic",
    whys: [
      {
        id: "51",
        name: "Going to a competitor",
        reasons: [
          { id: "58", name: "Cost savings" },
          { id: "57", name: "Dissatisfied with service" },
          { id: "56", name: "Value proposition" },
          { id: "55", name: "Technology advantage" }
        ]
      },
      {
        id: "50",
        name: "ShipMate Limitations",
        reasons: [
          { id: "54", name: "Customer going to another platform" },
          { id: "53", name: "Critical feature missing" },
          { id: "52", name: "Other feedback (i.e. Integration)" }
        ]
      },
      {
        id: "320",
        name: "IT & Systems Integration",
        reasons: [
          { id: "321", name: "Needs IT integration that is not available" },
          { id: "322", name: "Incompatible e-commerce / ERP platform" }
        ]
      }
    ]
  },
  {
    id: "28",
    name: "Volume & Demand",
    whys: [
      {
        id: "59",
        name: "Shipping Volume Decreased",
        reasons: [
          { id: "60", name: "Supply chain issues/disruptions" },
          { id: "61", name: "Low consumer demand/business turnover" },
          { id: "62", name: "Prefer standard low cost shipping" }
        ]
      },
      {
        id: "330",
        name: "Lead Volume Constraints",
        reasons: [
          { id: "331", name: "Volume too low / Under minimum requirement" }
        ]
      }
    ]
  },
  {
    id: "29",
    name: "HO Administrative",
    whys: [
      {
        id: "65",
        name: "Head Office Cancelled",
        reasons: [
          { id: "67", name: "Customer uncontactable for onboarding" },
          { id: "210", name: "Duplicate Accounts" },
          { id: "131", name: "Secure Cash / Neopost / Sendle / Dashback / RSEA" },
          { id: "66", name: "Data Wash" }
        ]
      },
      {
        id: "64",
        name: "Franchisee Reasons",
        reasons: [
          { id: "68", name: "Customer behavioral issues" },
          { id: "69", name: "Customer revenue not worth the travel" },
          { id: "70", name: "Unable to do the banking" }
        ]
      },
      {
        id: "63",
        name: "Merge Accounts",
        reasons: [
          { id: "71", name: "There are 2 separate customers for departments" }
        ]
      }
    ]
  },
  {
    id: "30",
    name: "Poor Engagement / Follow Up",
    whys: [
      {
        id: "76",
        name: "No Service",
        reasons: [
          { id: "77", name: "Service did not start after signing SCF" }
        ]
      },
      {
        id: "72",
        name: "Not responsive",
        reasons: [
          { id: "73", name: "Customer is not engaging with HO after cancellation received" },
          { id: "81", name: "No response to multiple phone/email follow-up attempts" },
          { id: "82", name: "Unable to establish contact / gatekeeper blocking" }
        ]
      },
      {
        id: "78",
        name: "Invalid Contact Information",
        reasons: [
          { id: "79", name: "Phone number disconnected / invalid line" },
          { id: "80", name: "Incorrect phone number provided / wrong contact" }
        ]
      },
      {
        id: "83",
        name: "Customer Request / Preference",
        reasons: [
          { id: "84", name: "Customer requested Do Not Call / Do Not Contact" }
        ]
      },
      {
        id: "74",
        name: "Onboarding cancelled",
        reasons: [
          { id: "75", name: "Customer went cold after signing SCF and/or cancelled onboarding" }
        ]
      }
    ]
  }
];

export function getMergedCancellationHierarchy(incomingThemes?: any[]): any[] {
  const normId = (id: any) => String(id);
  const mergedMap = new Map<string, any>();

  // 1. Seed map with default hierarchy
  DEFAULT_CANCELLATION_HIERARCHY.forEach(t => {
    mergedMap.set(normId(t.id), {
      id: normId(t.id),
      name: t.name,
      whys: (t.whys || []).map(w => ({
        id: normId(w.id),
        name: w.name,
        reasons: (w.reasons || []).map(r => ({ id: normId(r.id), name: r.name }))
      }))
    });
  });

  if (!incomingThemes || !Array.isArray(incomingThemes)) {
    return Array.from(mergedMap.values());
  }

  // 2. Merge incoming themes from Firestore
  incomingThemes.forEach(incTheme => {
    if (!incTheme || !incTheme.id) return;
    const tid = normId(incTheme.id);
    const existingTheme = mergedMap.get(tid);

    if (!existingTheme) {
      mergedMap.set(tid, {
        id: tid,
        name: incTheme.name || `Theme ${tid}`,
        whys: (incTheme.whys || []).map((w: any) => ({
          id: normId(w.id),
          name: w.name || `Category ${w.id}`,
          reasons: (w.reasons || []).map((r: any) => ({ id: normId(r.id), name: r.name || `Reason ${r.id}` }))
        }))
      });
    } else {
      if (incTheme.name) existingTheme.name = incTheme.name;
      const whyMap = new Map<string, any>();
      existingTheme.whys.forEach((w: any) => whyMap.set(normId(w.id), w));

      (incTheme.whys || []).forEach((incWhy: any) => {
        if (!incWhy || !incWhy.id) return;
        const wid = normId(incWhy.id);
        const existingWhy = whyMap.get(wid);
        if (!existingWhy) {
          whyMap.set(wid, {
            id: wid,
            name: incWhy.name || `Category ${wid}`,
            reasons: (incWhy.reasons || []).map((r: any) => ({ id: normId(r.id), name: r.name || `Reason ${r.id}` }))
          });
        } else {
          if (incWhy.name) existingWhy.name = incWhy.name;
          const reasonMap = new Map<string, any>();
          existingWhy.reasons.forEach((r: any) => reasonMap.set(normId(r.id), r));
          (incWhy.reasons || []).forEach((incReason: any) => {
            if (!incReason || !incReason.id) return;
            const rid = normId(incReason.id);
            if (!reasonMap.has(rid)) {
              reasonMap.set(rid, { id: rid, name: incReason.name || `Reason ${rid}` });
            } else if (incReason.name) {
              reasonMap.get(rid).name = incReason.name;
            }
          });
          existingWhy.reasons = Array.from(reasonMap.values());
        }
      });
      existingTheme.whys = Array.from(whyMap.values());
    }
  });

  return Array.from(mergedMap.values());
}

export function autoMapLostOutcome(outcome: string): CancellationHierarchyMatch | null {
  const normalized = outcome.trim().toUpperCase();
  
  if (normalized === 'LOST - OUT OF TERRITORY' || normalized === 'LOST - OUT OF TERRITORY') {
    return {
      themeId: '5',
      themeName: 'Business Changes',
      whyId: '4',
      whyName: 'Relocating the business',
      reasonId: '9',
      reasonName: 'Moving locations to a non-serviceable area'
    };
  }
  
  if (normalized === 'LOST - DUPLICATE') {
    return {
      themeId: '29',
      themeName: 'HO Administrative',
      whyId: '65',
      whyName: 'Head Office Cancelled',
      reasonId: '210',
      reasonName: 'Duplicate Accounts'
    };
  }
  
  if (normalized === 'DISCONNECTED') {
    return {
      themeId: '30',
      themeName: 'Poor Engagement / Follow Up',
      whyId: '78',
      whyName: 'Invalid Contact Information',
      reasonId: '79',
      reasonName: 'Phone number disconnected / invalid line'
    };
  }

  if (normalized === 'WRONG NUMBER') {
    return {
      themeId: '30',
      themeName: 'Poor Engagement / Follow Up',
      whyId: '78',
      whyName: 'Invalid Contact Information',
      reasonId: '80',
      reasonName: 'Incorrect phone number provided / wrong contact'
    };
  }

  if (normalized === 'LOST - NO RESPONSE') {
    return {
      themeId: '30',
      themeName: 'Poor Engagement / Follow Up',
      whyId: '72',
      whyName: 'Not responsive',
      reasonId: '81',
      reasonName: 'No response to multiple phone/email follow-up attempts'
    };
  }

  if (normalized === 'LOST - NO CONTACT') {
    return {
      themeId: '30',
      themeName: 'Poor Engagement / Follow Up',
      whyId: '72',
      whyName: 'Not responsive',
      reasonId: '82',
      reasonName: 'Unable to establish contact / gatekeeper blocking'
    };
  }

  if (normalized === 'DNC - STOP LIST' || normalized === 'DNC - STOPLIST' || normalized === 'DNC') {
    return {
      themeId: '30',
      themeName: 'Poor Engagement / Follow Up',
      whyId: '83',
      whyName: 'Customer Request / Preference',
      reasonId: '84',
      reasonName: 'Customer requested Do Not Call / Do Not Contact'
    };
  }
  
  return null;
}

export type CancellationType = 'GREY' | 'GREEN' | 'YELLOW' | 'RED';

export interface CancellationTypeInfo {
  type: CancellationType;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  badgeClass: string;
  hexColor: string;
}

export const CANCELLATION_TYPE_CONFIG: Record<CancellationType, CancellationTypeInfo> = {
  GREY: {
    type: 'GREY',
    label: 'Data Wash',
    shortLabel: 'Data Wash',
    description: 'Admin/data cleanup, non-service starts, or uncollectible debt',
    colorClass: 'text-slate-800 bg-slate-100 border-slate-300',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300 font-semibold',
    hexColor: '#64748b',
  },
  GREEN: {
    type: 'GREEN',
    label: 'Still a Customer',
    shortLabel: 'Still Customer',
    description: 'Customer retained via new SCF ownership transfer or location move',
    colorClass: 'text-emerald-800 bg-emerald-100 border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
    hexColor: '#10b981',
  },
  YELLOW: {
    type: 'YELLOW',
    label: 'End of Month (Franchisee Cancelled)',
    shortLabel: 'EOM (Franchisee)',
    description: 'Cancelled directly by the Franchisee at End of Month',
    colorClass: 'text-amber-900 bg-amber-100 border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    hexColor: '#eab308',
  },
  RED: {
    type: 'RED',
    label: 'True Cancellation',
    shortLabel: 'True Cancellation',
    description: 'Customer-initiated true churn request',
    colorClass: 'text-rose-800 bg-rose-100 border-rose-300',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
    hexColor: '#ef4444',
  },
};

export function getCancellationTypeInfo(r: {
  cancellationReason?: string;
  cancelledByFranchisee?: boolean;
  isFranchiseeCancelled?: boolean;
  cancellationType?: string;
}): CancellationTypeInfo {
  // 1. YELLOW - END OF MONTH (Franchisee Cancelled)
  if (r.cancelledByFranchisee || r.isFranchiseeCancelled || r.cancellationType === 'YELLOW') {
    return CANCELLATION_TYPE_CONFIG.YELLOW;
  }

  const reason = (r.cancellationReason || '').trim().toLowerCase();

  // 2. GREY - DATA WASH
  const greyKeywords = [
    'data wash',
    'secure cash / neopost / sendle / dashback / rsea',
    'secure cash',
    'neopost',
    'sendle',
    'dashback',
    'rsea',
    'service did not start after signing scf',
    'customer went cold after signing scf and/or cancelled onboarding',
    'customer went cold after signing scf',
    'debt with mailplus'
  ];

  if (greyKeywords.some(kw => reason.includes(kw) || kw.includes(reason))) {
    return CANCELLATION_TYPE_CONFIG.GREY;
  }

  // 3. GREEN - STILL A CUSTOMER
  const greenKeywords = [
    'new owners signed new scf',
    'moving locations, signed new scf',
    'moving locations signed new scf'
  ];

  if (greenKeywords.some(kw => reason.includes(kw) || kw.includes(reason))) {
    return CANCELLATION_TYPE_CONFIG.GREEN;
  }

  // 4. RED - TRUE CANCELLATION (Default for all other reason codes)
  return CANCELLATION_TYPE_CONFIG.RED;
}


