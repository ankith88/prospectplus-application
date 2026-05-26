import { firestore } from '../src/lib/firebase';
import { collection, getDocs, updateDoc } from 'firebase/firestore';

interface AusSuburb {
  ssc_code: number;
  suburb: string;
  urban_area: string;
  postcode: number;
  state: string;
  state_name: string;
  type: string;
  local_goverment_area: string;
  statistic_area: string;
  elevation: number;
  population: number;
  median_income: number;
  sqkm: number;
  lat: number;
  lng: number;
  timezone: string;
}

async function main() {
  console.log('Fetching Australian suburbs data...');
  const res = await fetch('https://raw.githubusercontent.com/michalsn/australian-suburbs/master/data/suburbs.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch suburbs data: ${res.statusText}`);
  }
  
  const data = await res.json();
  const suburbsData: AusSuburb[] = data.data;
  console.log(`Fetched ${suburbsData.length} suburbs from dataset.`);

  // Create a lookup map for faster processing: key = "SUBURB|POSTCODE"
  const suburbMap = new Map<string, { lat: number; lng: number }>();
  for (const s of suburbsData) {
    const key = `${s.suburb.toUpperCase()}|${s.postcode}`;
    suburbMap.set(key, { lat: s.lat, lng: s.lng });
  }

  console.log('Fetching franchisees from Firestore...');
  const franchiseesRef = collection(firestore, 'franchisees');
  const franchiseesSnapshot = await getDocs(franchiseesRef);
  console.log(`Found ${franchiseesSnapshot.size} franchisees.`);

  let updatedCount = 0;

  for (const docSnapshot of franchiseesSnapshot.docs) {
    const franchisee = docSnapshot.data();
    let hasUpdates = false;

    // Helper to update arrays
    const updateMapping = (mappings: any[]) => {
      if (!Array.isArray(mappings)) return mappings;
      return mappings.map((mapping) => {
        if (!mapping.suburbs || !mapping.post_code) return mapping;
        
        // Exact match attempt
        const key = `${mapping.suburbs.toUpperCase()}|${mapping.post_code}`;
        const coords = suburbMap.get(key);

        if (coords && (mapping.lat !== coords.lat || mapping.lng !== coords.lng)) {
          hasUpdates = true;
          return { ...mapping, lat: coords.lat, lng: coords.lng };
        }
        
        return mapping;
      });
    };

    const updatedData: any = {};

    if (franchisee.territoryJson) {
      updatedData.territoryJson = updateMapping(franchisee.territoryJson);
    }
    if (franchisee.starTrackSuburbsJson) {
      updatedData.starTrackSuburbsJson = updateMapping(franchisee.starTrackSuburbsJson);
    }

    if (hasUpdates) {
      await updateDoc(docSnapshot.ref, updatedData);
      updatedCount++;
      console.log(`Updated coordinates for franchisee: ${franchisee.name || franchisee.internalId}`);
    }
  }

  console.log(`\nFinished! Successfully updated ${updatedCount} franchisee documents with exact latitude/longitude coordinates.`);
  process.exit(0);
}

main().catch(console.error);
