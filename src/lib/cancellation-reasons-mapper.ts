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
