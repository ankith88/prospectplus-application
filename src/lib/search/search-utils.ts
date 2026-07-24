/**
 * Search Utilities for Prospect+ Universal Lookup
 */

// Generate normalized search keywords array for a Firestore document (lead / company / ticket)
export function generateSearchKeywords(data: any): string[] {
  if (!data) return [];

  const keywords = new Set<string>();

  const addText = (val: any) => {
    if (!val) return;
    const str = String(val).toLowerCase().trim();
    if (!str || str === '- none -' || str === 'undefined' || str === 'null') return;

    // Add full string if reasonable length
    if (str.length >= 2 && str.length <= 80) {
      keywords.add(str);
    }

    // Split words
    const words = str.split(/[\s,./\\_\-+()@]+/).filter(Boolean);
    for (const w of words) {
      const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanWord.length >= 2) {
        keywords.add(cleanWord);
      }
    }
  };

  // 1. Company Name & IDs
  addText(data.companyName);
  addText(data.prospectPlusId);
  addText(data.internalid);
  addText(data.internalId);
  addText(data.entityId);
  addText(data.customerEntityId);

  // 2. Email & Phone
  if (data.customerServiceEmail) addText(data.customerServiceEmail);
  if (data.email) addText(data.email);
  if (data.customerPhone || data.phone) {
    const rawPhone = String(data.customerPhone || data.phone);
    addText(rawPhone);
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length >= 3) {
      keywords.add(digits);
      if (digits.startsWith('61')) {
        keywords.add(`0${digits.substring(2)}`);
      }
    }
  }

  // 3. Address components
  if (data.address) {
    addText(data.address.address1);
    addText(data.address.street);
    addText(data.address.city);
    addText(data.address.state);
    addText(data.address.zip);
  }
  addText(data.street);
  addText(data.city);
  addText(data.state);
  addText(data.zip);

  // 4. Franchisee & Team
  addText(data.franchisee);
  addText(data.accountManagerAssigned);
  addText(data.salesRepAssigned);

  return Array.from(keywords).slice(0, 150);
}

// Levenshtein distance for fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Compute relevance score for a search result document
export function scoreSearchResult(item: { id: string; type: string; data: any }, queryWords: string[], queryRaw: string, possibleIds: string[]): number {
  const data = item.data || {};
  let score = 0;

  const rawLower = queryRaw.toLowerCase().trim();
  const companyNameLower = String(data.companyName || '').toLowerCase().trim();
  const prospectPlusIdLower = String(data.prospectPlusId || '').toLowerCase().trim();
  const internalidLower = String(data.internalid || data.internalId || '').toLowerCase().trim();
  const entityIdLower = String(data.entityId || data.customerEntityId || '').toLowerCase().trim();

  // 1. Direct ID / URL match: Highest score (100)
  const isDirectId = possibleIds.some(id => {
    const cleanId = id.toLowerCase().trim();
    return (
      item.id.toLowerCase() === cleanId ||
      prospectPlusIdLower === cleanId ||
      internalidLower === cleanId ||
      entityIdLower === cleanId
    );
  });

  if (isDirectId) {
    return 100;
  }

  // 2. Exact Company Name match: 95
  if (companyNameLower === rawLower) {
    return 95;
  }

  // 3. Company Name starts with full query: 90
  if (companyNameLower.startsWith(rawLower)) {
    score = Math.max(score, 90);
  }

  // 4. Company Name contains full query: 80
  if (companyNameLower.includes(rawLower)) {
    score = Math.max(score, 80);
  }

  // 5. Every query word matches company name: 75
  const allWordsInCompany = queryWords.length > 0 && queryWords.every(w => companyNameLower.includes(w));
  if (allWordsInCompany) {
    score = Math.max(score, 75);
  }

  // 6. Fuzzy match on company name words (typo tolerance)
  if (queryWords.length > 0) {
    const compWords = companyNameLower.split(/\s+/).filter(Boolean);
    let fuzzyMatches = 0;

    for (const qWord of queryWords) {
      if (qWord.length < 3) continue;
      const matched = compWords.some(cWord => {
        if (cWord.includes(qWord)) return true;
        if (Math.abs(cWord.length - qWord.length) <= 2) {
          const dist = levenshteinDistance(qWord, cWord);
          return dist <= 1 || (qWord.length >= 6 && dist <= 2);
        }
        return false;
      });
      if (matched) fuzzyMatches++;
    }

    if (fuzzyMatches === queryWords.length) {
      score = Math.max(score, 65);
    } else if (fuzzyMatches > 0) {
      score = Math.max(score, 40 + Math.floor((fuzzyMatches / queryWords.length) * 20));
    }
  }

  // 7. Serviced / Active status boost (+5)
  if (item.type === 'company' || data.status === 'Won' || data.customerStatus === 'Signed') {
    score += 5;
  }

  return score;
}
