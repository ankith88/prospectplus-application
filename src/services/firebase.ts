/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { database } from '@/lib/firebase';
import type { Lead } from '@/lib/types';
import { ref, get, set } from 'firebase/database';

// This is the source of truth for sample data.
const sampleLeads: Lead[] = [
    {
      id: 'lead-1',
      entityId: 'ent-12345',
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
      },
      franchisee: 'Main Branch',
      websiteUrl: 'https://innovatecorp.com',
      industryCategory: 'Technology',
      industrySubCategory: 'AI Analytics',
      salesRepAssigned: 'John Doe',
      campaign: 'Q4 Tech Growth'
    },
    {
      id: 'lead-2',
      entityId: 'ent-67890',
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
      },
      franchisee: 'West Coast HQ',
      websiteUrl: 'https://quantumsolutions.com',
      industryCategory: 'Logistics',
      industrySubCategory: 'Enterprise Software',
      salesRepAssigned: 'Jane Smith',
      campaign: 'CRM Overhaul 2023'
    },
    {
      id: 'lead-3',
      entityId: 'ent-54321',
      companyName: 'Synergy Inc',
      status: 'Qualified',
      avatarUrl: 'https://placehold.co/100x100/E2E8F0/475569.png?text=SI',
      profile: 'Synergy Inc. is a well-established player in the renewable energy sector. They have shown interest in our products at a recent trade show and are looking for a scalable solution.',
      activity: [
        { id: 'act-3-1', type: 'Meeting', date: '2023-11-01', notes: 'Met with the CTO at the Green Energy Summit. Strong interest in a pilot program.' },
        { id: 'act-3-2', type: 'Email', date: '2023-11-02', notes: 'Sent follow-up email with pilot program details and pricing.' },
      ],
      contacts: [
        { id: 'contact-3-1', name: 'David Chen', title: 'Chief Technology Officer', email: 'david.c@synergy.com', phone: '+1-415-555-0199' },
      ],
      address: {
        street: '789 Energy Way',
        city: 'San Francisco',
        state: 'CA',
        zip: '94103',
        country: 'USA'
      },
      franchisee: 'Bay Area Office',
      websiteUrl: 'https://synergyinc.com',
      industryCategory: 'Energy',
      industrySubCategory: 'Renewables',
      salesRepAssigned: 'John Doe',
      campaign: 'Green Energy Summit Outreach'
    }
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
      const leadsArray: Lead[] = Object.keys(leadsData).map((key) => ({
        id: key,
        ...leadsData[key],
      }));

      // Simple validation to check if critical fields exist
      const isDataValid = leadsArray.every(lead => lead.entityId && lead.companyName);
      
      if(isDataValid) {
        return leadsArray;
      } else {
        console.log("Firebase data is incomplete, falling back to local sample data and reseeding.");
        await seedLeadsToFirebase(); // Reseed with correct data
        return sampleLeads; // Return the valid local data
      }

    } else {
      console.log("No leads found, seeding sample data...");
      await seedLeadsToFirebase();
      return sampleLeads;
    }
  } catch (error) {
    console.error("Firebase fetch failed, falling back to local data:", error);
    return sampleLeads;
  }
}

export { getLeadsFromFirebase };
