import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export interface SimilarCustomerMatch {
  companyName: string;
  industryCategory?: string;
  industrySubCategory?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  franchiseeName?: string;
  matchType?: 'industry' | 'nearby' | 'both';
  matchReason?: string;
  id?: string;
}

/**
 * Searches the `companies` collection for signed MailPlus customers based strictly on TWO checks:
 * 1. Industry Category & Sub Category Match: Signed customers matching the lead's industry category & subcategory.
 * 2. Serviced Close to Lead: Signed customers serviced in close geographic proximity (same suburb, postcode, or local franchisee route).
 */
export async function findSimilarSignedCustomers(params: {
  industryCategory?: string;
  industrySubCategory?: string;
  franchiseeName?: string;
  state?: string;
  suburb?: string;
  postcode?: string;
  limitCount?: number;
}): Promise<SimilarCustomerMatch[]> {
  const { industryCategory, industrySubCategory, franchiseeName, suburb, postcode, limitCount = 4 } = params;
  const matchesMap = new Map<string, SimilarCustomerMatch>();

  try {
    const db = getFirestore(adminApp);
    const companiesRef = db.collection('companies');

    // =========================================================================
    // CHECK 1: Industry Category & Sub Category Match
    // =========================================================================
    if (industryCategory && industryCategory.trim() !== '') {
      const cleanCategory = industryCategory.trim();
      const snapCategory = await companiesRef
        .where('industryCategory', '==', cleanCategory)
        .limit(30)
        .get();

      const targetSubNorm = (industrySubCategory || '').toLowerCase().trim();
      const subTokens = targetSubNorm
        .split(/[\s,&/\\-]+/)
        .map(t => t.trim())
        .filter(t => t.length > 2);

      const scoredIndustryMatches: Array<{ doc: FirebaseFirestore.QueryDocumentSnapshot; score: number }> = [];

      snapCategory.forEach(docSnap => {
        const data = docSnap.data();
        const cName = (data.companyName || data.name || '').trim();
        if (!cName) return;

        const compSub = (data.industrySubCategory || '').toLowerCase().trim();
        let score = 1; // Base category match

        if (targetSubNorm && compSub) {
          if (compSub === targetSubNorm) {
            score = 10; // Exact sub-category match
          } else if (compSub.includes(targetSubNorm) || targetSubNorm.includes(compSub)) {
            score = 8; // Substring match
          } else if (subTokens.length > 0 && subTokens.some(tok => compSub.includes(tok))) {
            score = 5; // Keyword overlap match
          }
        }

        scoredIndustryMatches.push({ doc: docSnap, score });
      });

      // Sort by best subcategory match first
      scoredIndustryMatches.sort((a, b) => b.score - a.score);

      for (const item of scoredIndustryMatches) {
        if (matchesMap.size >= limitCount) break;
        const data = item.doc.data();
        const cName = (data.companyName || data.name || '').trim();
        const key = cName.toLowerCase();

        if (!matchesMap.has(key)) {
          matchesMap.set(key, {
            id: item.doc.id,
            companyName: cName,
            industryCategory: data.industryCategory,
            industrySubCategory: data.industrySubCategory,
            suburb: data.address?.city || data.city || data.address?.suburb || data.suburb,
            state: data.address?.state || data.state,
            franchiseeName: data.franchiseeName || data.franchisee,
            matchType: 'industry',
            matchReason: item.score >= 5 ? 'Industry & Sub-Category Match' : 'Industry Category Match',
          });
        }
      }
    }

    // =========================================================================
    // CHECK 2: Serviced Close to the Lead (Same Suburb, Postcode, or Local Route)
    // =========================================================================
    const localMatches: Array<{ doc: FirebaseFirestore.QueryDocumentSnapshot; reason: string }> = [];

    // 2a. Match by exact Suburb
    if (suburb && suburb.trim() !== '') {
      const cleanSuburb = suburb.trim();
      const snapSuburb = await companiesRef
        .where('address.city', '==', cleanSuburb)
        .limit(10)
        .get();

      snapSuburb.forEach(docSnap => {
        localMatches.push({ doc: docSnap, reason: `Serviced in ${cleanSuburb}` });
      });

      if (localMatches.length < 5) {
        const snapSuburbAlt = await companiesRef
          .where('city', '==', cleanSuburb)
          .limit(10)
          .get();
        snapSuburbAlt.forEach(docSnap => {
          localMatches.push({ doc: docSnap, reason: `Serviced in ${cleanSuburb}` });
        });
      }
    }

    // 2b. Match by Postcode if available
    if (postcode && postcode.trim() !== '' && localMatches.length < 5) {
      const cleanZip = postcode.trim();
      const snapZip = await companiesRef
        .where('address.zip', '==', cleanZip)
        .limit(10)
        .get();

      snapZip.forEach(docSnap => {
        localMatches.push({ doc: docSnap, reason: `Serviced in Postcode ${cleanZip}` });
      });
    }

    // 2c. Match by local Franchisee Territory (if local routes service nearby clients)
    if (franchiseeName && franchiseeName.trim() !== '' && localMatches.length < 5) {
      const cleanFranchisee = franchiseeName.trim();
      const snapFranchisee = await companiesRef
        .where('franchiseeName', '==', cleanFranchisee)
        .limit(10)
        .get();

      snapFranchisee.forEach(docSnap => {
        localMatches.push({ doc: docSnap, reason: `Serviced by ${cleanFranchisee}` });
      });
    }

    // Merge local proximity matches
    for (const item of localMatches) {
      const data = item.doc.data();
      const cName = (data.companyName || data.name || '').trim();
      if (!cName) continue;
      const key = cName.toLowerCase();

      if (matchesMap.has(key)) {
        // Customer satisfies both industry match AND local proximity
        const existing = matchesMap.get(key)!;
        existing.matchType = 'both';
        existing.matchReason = 'Industry Match & Serviced Close to Lead';
      } else {
        matchesMap.set(key, {
          id: item.doc.id,
          companyName: cName,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          suburb: data.address?.city || data.city || data.address?.suburb || data.suburb,
          state: data.address?.state || data.state,
          franchiseeName: data.franchiseeName || data.franchisee,
          matchType: 'nearby',
          matchReason: 'Serviced Close to Lead',
        });
      }
    }

    return Array.from(matchesMap.values()).slice(0, Math.max(limitCount, 4));
  } catch (error) {
    console.error('Error finding similar signed customers:', error);
    return [];
  }
}
