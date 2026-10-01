import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export interface SimilarCustomerMatch {
  companyName: string;
  industryCategory?: string;
  industrySubCategory?: string;
  suburb?: string;
  state?: string;
  franchiseeName?: string;
  id?: string;
}

/**
 * Searches the `companies` collection for signed MailPlus customers that have a similar profile
 * (matching or similar industry, franchisee territory, or geographic region) to use as social proof.
 */
export async function findSimilarSignedCustomers(params: {
  industryCategory?: string;
  franchiseeName?: string;
  state?: string;
  suburb?: string;
  limitCount?: number;
}): Promise<SimilarCustomerMatch[]> {
  const { industryCategory, franchiseeName, state, suburb, limitCount = 3 } = params;
  const matches: SimilarCustomerMatch[] = [];
  const seenNames = new Set<string>();

  try {
    const db = getFirestore(adminApp);
    const companiesRef = db.collection('companies');

    // 1. Try matching by Industry Category
    if (industryCategory) {
      const snap = await companiesRef.where('industryCategory', '==', industryCategory).limit(15).get();
      
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const cName = data.companyName || data.name;
        if (cName && !seenNames.has(cName.toLowerCase())) {
          seenNames.add(cName.toLowerCase());
          matches.push({
            id: docSnap.id,
            companyName: cName,
            industryCategory: data.industryCategory,
            industrySubCategory: data.industrySubCategory,
            suburb: data.address?.city || data.city || data.address?.suburb,
            state: data.address?.state || data.state,
            franchiseeName: data.franchiseeName || data.franchisee,
          });
        }
      });
    }

    // 2. If fewer than desired matches, try matching by same Franchisee territory
    if (matches.length < limitCount && franchiseeName) {
      const snapFranchisee = await companiesRef.where('franchiseeName', '==', franchiseeName).limit(10).get();
      
      snapFranchisee.forEach(docSnap => {
        if (matches.length >= limitCount) return;
        const data = docSnap.data();
        const cName = data.companyName || data.name;
        if (cName && !seenNames.has(cName.toLowerCase())) {
          seenNames.add(cName.toLowerCase());
          matches.push({
            id: docSnap.id,
            companyName: cName,
            industryCategory: data.industryCategory,
            industrySubCategory: data.industrySubCategory,
            suburb: data.address?.city || data.city || data.address?.suburb,
            state: data.address?.state || data.state,
            franchiseeName: data.franchiseeName || data.franchisee,
          });
        }
      });
    }

    // 3. Fallback: If still not enough, match by State
    if (matches.length < limitCount && state) {
      const snapState = await companiesRef.where('state', '==', state).limit(10).get();

      snapState.forEach(docSnap => {
        if (matches.length >= limitCount) return;
        const data = docSnap.data();
        const cName = data.companyName || data.name;
        if (cName && !seenNames.has(cName.toLowerCase())) {
          seenNames.add(cName.toLowerCase());
          matches.push({
            id: docSnap.id,
            companyName: cName,
            industryCategory: data.industryCategory,
            industrySubCategory: data.industrySubCategory,
            suburb: data.address?.city || data.city || data.address?.suburb,
            state: data.address?.state || data.state,
            franchiseeName: data.franchiseeName || data.franchisee,
          });
        }
      });
    }

    return matches.slice(0, limitCount);
  } catch (error) {
    console.error('Error finding similar signed customers:', error);
    return [];
  }
}
