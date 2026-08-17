
export const industryCategories = [
  "Marketing, Design & Advertising Services",
  "ACCOMMODATION AND FOOD SERVICES",
  "ADMINISTRATIVE AND SUPPORT SERVICES",
  "AGRICULTURE, FORESTRY AND FISHing",
  "ARTS AND RECREATION SERVICES",
  "B2C - PET PRODUCTS",
  "B2C – BABY & MATERNITY",
  "B2C – BEAUTY & COSMETICS",
  "B2C – CLOTHING & FASHION",
  "B2C – GIFTS",
  "B2C – HARDWARE & TOOLS",
  "B2C – HEALTH & WELLNESS",
  "B2C – HOBBY, OUTDOOR & LIFESTYLE",
  "B2C – NON-PERISHABLE CONSUMABLES",
  "B2C – PACKAGING & PROMOTIONAL",
  "B2C – PERISHABLE ITEMS",
  "B2C – TECHNOLOGY",
  "CONSTRUCTION",
  "EDUCATION AND TRAINING",
  "ELECTRICITY, GAS, WATER AND WASTE SERVICES",
  "FINANCIAL AND INSURANCE SERVICES",
  "HEALTH CARE AND SOCIAL ASSISTANCE",
  "HOSPITALITY SERVICES",
  "INFORMATION MEDIA AND TELECOMMUNICATIONS",
  "LEGAL SERVICES",
  "MANUFACTURING",
  "MINING",
  "OTHER SERVICES",
  "PROFESSIONAL, SCIENTIFIC AND TECHNICAL SERVICES",
  "PUBLIC ADMINISTRATION AND SAFETY",
  "RECRUITING/EMPLOYMENT SERVICES",
  "RENTAL, HIRING AND REAL ESTATE SERVICES",
  "RETAIL - ACCESSORIES",
  "RETAIL - ARTS/CRAFTS",
  "RETAIL - AUTOMOTIVE/MECHANICAL",
  "RETAIL - BABY",
  "RETAIL - BEAUTY PRODUCTS",
  "RETAIL - BOOKS/EDUCATION",
  "RETAIL - BRIDAL",
  "RETAIL - CAMPING/OUTDOOR GOODS",
  "RETAIL - CLEANING SUPPLIES",
  "RETAIL - CLOTHING FASHION",
  "RETAIL - ELECTRICAL",
  "RETAIL - FASHION ACCESSORIES",
  "RETAIL - FOOD",
  "RETAIL - GIFTS",
  "RETAIL - HABERDASHERY",
  "RETAIL - HEALTH & WELLNESS",
  "RETAIL - HOME & GARDEN",
  "RETAIL - HOMEWARES",
  "RETAIL - JEWELLERY",
  "RETAIL - MECHANICAL",
  "RETAIL - MEDICAL",
  "RETAIL - MUSIC SUPPLIES",
  "RETAIL - NATUROPATHIC MEDICINES",
  "RETAIL - NIC NAX",
  "RETAIL - OFFICE",
  "RETAIL - PACKAGING",
  "RETAIL - PARTY SUPPLIES",
  "RETAIL - PET ITEMS",
  "RETAIL - PRINTING/CUSTOMISED PRODUCTS",
  "RETAIL - SPORTING GOODS",
  "RETAIL - STATIONARY",
  "RETAIL - SWIMWEAR",
  "RETAIL - TEAS & COFFEES",
  "RETAIL - TECHNOLOGY",
  "RETAIL - TOBACCO/VAPE",
  "RETAIL - TOOLS/HARDWARE",
  "RETAIL - WORKWEAR/SAFETY",
  "RETAIL TRADE",
  "RETAIL – COLLECTABLES/HOBBIES",
  "RETAIL – KIDS TOYS & FASHION/ACCESSORIES",
  "TECHNOLOGY SERVICES",
  "TRANSPORT, POSTAL AND WAREHOUSING",
  "WHOLESALE TRADE",
];

export const salesReps = [
    { name: 'Lee Russell', url: 'https://calendly.com/lee-russell-mailplus/mailplus-intro-call-lee?' },
    { name: 'Kerina Helliwell', url: 'https://calendly.com/kerina-helliwell-mailplus/mailplus-intro-call-kerina?' },
    { name: 'Luke Forbes', url: 'https://calendly.com/luke-forbes-mailplus/mailplus-intro-call-luke?' },
];

export const SUPER_ADMIN_UIDS = [
  'ncyhwLtOG1W7TZ43PkYCcObeCAf2', // Original Admin
  'a543AEr3TcaHyj4c1Gh0fJoQ6UB2', // New Super Admin
  'xmvOICErk9WvpS8Psc9Geys2QQ62',
  'L3hjsZYldoVjVr8MAFRJt0bSGL12'
];

export const EXCLUDED_LOGIN_ACTIVITY_UIDS = [
  'xmvOICErk9WvpS8Psc9Geys2QQ62',
  'L3hjsZYldoVjVr8MAFRJt0bSGL12'
];

export const ALLOWED_ASK_UIDS = [
  'ncyhwLtOG1W7TZ43PkYCcObeCAf2',
  'xmvOICErk9WvpS8Psc9Geys2QQ62',
  'L3hjsZYldoVjVr8MAFRJt0bSGL12',
  'a543AEr3TcaHyj4c1Gh0fJoQ6UB2',
  'jHLpIZ8r4tf0IJkuRQZXG8rUR333'
];

export const GOOGLE_MAPS_LIBRARIES: ('places' | 'drawing' | 'geometry' | 'visualization')[] = [
  'places',
  'drawing',
  'geometry',
  'visualization',
];

export const MULTISITE_ACCOUNT_MANAGER_UID = 'AR2TfLJJCAQBUVf4IxHa6P3AKqG2';

export function isMultisiteCampaign(campaign?: string | null): boolean {
  if (!campaign) return false;
  const c = campaign.toLowerCase().replace(/[-_]/g, ' ').trim();
  return c.includes('multi site') || c.includes('multisite') || c === 'multisite' || c === 'multi-site';
}

export function isMultiSiteBucket(leadOrBucket?: string | { bucket?: string | null; campaign?: string | null } | null): boolean {
  if (!leadOrBucket) return false;
  if (typeof leadOrBucket === 'string') {
    const b = leadOrBucket.toLowerCase().replace(/[-_]/g, ' ').trim();
    return b.includes('multi site') || b.includes('multisite') || b === 'multisite' || b === 'multi-site';
  }
  const bucket = (leadOrBucket.bucket || '').toLowerCase().replace(/[-_]/g, ' ').trim();
  const campaign = (leadOrBucket.campaign || '').toLowerCase().replace(/[-_]/g, ' ').trim();
  return (
    bucket.includes('multi site') ||
    bucket.includes('multisite') ||
    bucket === 'multisite' ||
    bucket === 'multi-site' ||
    campaign.includes('multi site') ||
    campaign.includes('multisite') ||
    campaign === 'multisite' ||
    campaign === 'multi-site'
  );
}



