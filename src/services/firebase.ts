/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { database } from '@/lib/firebase';
import type { Lead } from '@/lib/types';
import { ref, get } from 'firebase/database';


async function getLeadsFromFirebase(): Promise<Lead[]> {
  try {
    console.log("Fetching leads from Firebase...");
    const leadsRef = ref(database, 'leads');
    const snapshot = await get(leadsRef);

    if (snapshot.exists()) {
      const leadsData = snapshot.val();
      const leadsArray: Lead[] = Object.keys(leadsData).map((key) => ({
        id: key,
        ...leadsData[key],
      }));
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
