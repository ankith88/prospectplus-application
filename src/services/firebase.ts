/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { database } from '@/lib/firebase';
import type { Lead } from '@/lib/types';
import { ref, get, set } from 'firebase/database';

const sampleLeads: Lead[] = [
    {
      id: 'lead-1',
      companyName: 'Innovate Corp',
      status: 'New',
      avatarUrl: 'https://placehold.co/100x100/E2E8F0/475569.png?text=IC',
      profile: 'Innovate Corp is a fast-growing tech startup specializing in AI-driven analytics. They recently secured Series B funding and are looking to expand their marketing efforts.',
      activity: [
        { id: 'act-1-1', type: 'Email', date: '2023-10-26', notes: 'Initial outreach email sent to the marketing department.' },
      ],
      contacts: [
        { id: 'contact-1-1', name: 'Alex Johnson', title: 'Marketing Director', email: 'alex.j@innovate.com', phone: '+1-202-555-0176' },
        { id: 'contact-1-2', name: 'Jane Smith', title: 'Marketing Manager', email: 'jane.s@innovate.com', phone: '+1-202-555-0177' },
      ],
      address: {
        street: '123 Innovation Drive',
        city: 'Palo Alto',
        state: 'CA',
        zip: '94304',
        country: 'USA'
      }
    },
    {
      id: 'lead-2',
      companyName: 'Quantum Solutions',
      status: 'Contacted',
      avatarUrl: 'https://placehold.co/100x100/E2E8F0/475569.png?text=QS',
      profile: 'Quantum Solutions is a large enterprise in the logistics sector. The company is looking to overhaul its CRM system to improve team efficiency and data integration.',
      activity: [
        { id: 'act-2-1', type: 'Call', duration: '15m 20s', date: '2023-10-25', notes: 'Introductory call with Samantha. Discussed current CRM pain points. Follow-up scheduled.' },
        { id: 'act-2-2', type: 'Email', date: '2023-10-22', notes: 'Initial contact with the sales department.' },
      ],
      contacts: [
          { id: 'contact-2-1', name: 'Samantha Rodriguez', title: 'VP of Sales', email: 's.rodriguez@quantum.co', phone: '+1-310-555-0188' },
      ],
      address: {
        street: '456 Quantum Plaza',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'USA'
      }
    },
  ];

// A function to seed initial data into the Firebase Realtime Database.
// This is useful for development and testing.
export async function seedLeadsToFirebase() {
  const leadsRef = ref(database, 'leads');
  
  const leadsToSet: { [key: string]: Omit<Lead, 'id'> } = {};
  sampleLeads.forEach((lead) => {
    const { id, ...leadData } = lead;
    leadsToSet[id] = leadData;
  });

  // Use set to overwrite any existing data at the 'leads' path.
  // Be careful with this in production.
  await set(leadsRef, leadsToSet);
  console.log('Sample leads have been seeded to Firebase.');
}


async function getLeadsFromFirebase(): Promise<Lead[]> {
  try {
    console.log("Fetching leads from Firebase...");
    const leadsRef = ref(database, 'leads');
    const snapshot = await get(leadsRef);

    if (snapshot.exists()) {
      const leadsData = snapshot.val();
      // Convert the object of leads into an array
      const leadsArray = Object.keys(leadsData).map((key) => ({
        id: key,
        ...leadsData[key],
      }));
      return leadsArray;
    } else {
      // If no leads exist, seed them and then fetch again.
      console.log("No leads found, seeding sample data...");
      await seedLeadsToFirebase();
      const seededSnapshot = await get(leadsRef);
      if (seededSnapshot.exists()) {
        const leadsData = seededSnapshot.val();
        return Object.keys(leadsData).map((key) => ({
            id: key,
            ...leadsData[key],
        }));
      }
      return [];
    }
  } catch (error) {
    console.error("Firebase fetch failed, falling back to local data:", error);
    // Fallback to sample data if Firebase is not available
    return sampleLeads;
  }
}

export { getLeadsFromFirebase };
