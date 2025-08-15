/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { firestore } from '@/lib/firebase';
import type { Lead, LeadStatus, Address } from '@/lib/types';
import { collection, getDocs } from 'firebase/firestore';


async function getLeadsFromFirebase(): Promise<Lead[]> {
  try {
    console.log("Fetching leads from Firebase...");
    const leadsRef = collection(firestore, 'leads');
    const snapshot = await getDocs(leadsRef);

    if (!snapshot.empty) {
      const leadsArray: Lead[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        
        let address: Address | undefined;
        if (data.address && data.address.street) {
          address = {
            street: data.address.street || 'Not available',
            city: data.address.city || 'Not available',
            state: data.address.state || 'N/A',
            zip: data.address.zip || 'N/A',
            country: data.address.country || 'Unknown'
          };
        }

        // Transform the data from Firestore to match the Lead type
        const transformedLead: Lead = {
          id: doc.id,
          entityId: data.customerEntityId || doc.id,
          companyName: data.companyName || 'Unknown Company',
          status: (data.customerStatus?.replace('SUSPECT-', '') || 'New') as LeadStatus,
          avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.companyName || 'UC').charAt(0)}`,
          profile: `A lead for ${data.companyName || 'Unknown Company'}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${data.customerStatus || 'New'}.`,
          activity: data.activity || [],
          contacts: data.contacts || [],
          address: address,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          campaign: data.campaign,
        };
        return transformedLead;
      });
      return leadsArray;
    } else {
      console.log("No leads found in Firebase.");
      return [];
    }
  } catch (error) {
    console.error("Firebase fetch failed:", error);
    return [];
  }
}

export { getLeadsFromFirebase };
