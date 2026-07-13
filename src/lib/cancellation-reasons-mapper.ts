export interface CancellationHierarchyMatch {
  themeId: string;
  themeName: string;
  whyId: string;
  whyName: string;
  reasonId: string;
  reasonName: string;
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
  
  if (normalized === 'LOST - NO RESPONSE') {
    return {
      themeId: '30',
      themeName: 'Poor Engagement / Follow Up',
      whyId: '72',
      whyName: 'Not responsive',
      reasonId: '73',
      reasonName: 'Customer is not engaging with HO after cancellation received'
    };
  }
  
  return null;
}
