/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { database } from '@/lib/firebase';
import type { Lead } from '@/lib/types';
import { ref, get } from 'firebase/database';

// A function to seed initial data into the Firebase Realtime Database.
// This is useful for development and testing.
export async function seedLeadsToFirebase() {
  const leadsRef = ref(database, 'leads');
  const sampleLeads: Omit<Lead, 'id'>[] = [
    {
      name: 'Alex Johnson',
      title: 'Marketing Director',
      company: 'Innovate Corp',
      email: 'alex.j@innovate.com',
      phone: '+1-202-555-0176',
      status: 'New',
      avatarUrl: 'https://placehold.co/100x100/E2E8F0/475569.png?text=AJ',
      profile: 'Alex is the Marketing Director at Innovate Corp, a fast-growing tech startup specializing in AI-driven analytics. They recently secured Series B funding. Alex has shown interest in marketing automation tools and has downloaded a whitepaper on lead generation.',
      activity: [
        { id: 'act-1-1', type: 'Email', date: '2023-10-26', notes: 'Initial outreach email sent.' },
      ],
    },
    {
      name: 'Samantha Rodriguez',
      title: 'VP of Sales',
      company: 'Quantum Solutions',
      email: 's.rodriguez@quantum.co',
      phone: '+1-310-555-0188',
      status: 'Contacted',
      avatarUrl: 'https://placehold.co/100x100/E2E8F0/475569.png?text=SR',
      profile: 'Samantha is the VP of Sales at Quantum Solutions, a large enterprise in the logistics sector. The company is looking to overhaul its CRM system. Samantha has 15 years of experience in sales leadership and is focused on improving team efficiency.',
      activity: [
        { id: 'act-2-1', type: 'Call', duration: '15m 20s', date: '2023-10-25', notes: 'Introductory call. Discussed current CRM pain points. Follow-up scheduled.' },
        { id: 'act-2-2', type: 'Email', date: '2023-10-22', notes: 'Initial contact.' },
      ],
    },
  ];

  // In a real app, you would likely use `push` to generate unique IDs.
  // For this example, we'll use a simple structure.
  const leadsToSet: { [key: string]: Omit<Lead, 'id'> } = {};
  sampleLeads.forEach((lead, index) => {
    leadsToSet[`lead-${index + 1}`] = lead;
  });

  // Use set to overwrite any existing data at the 'leads' path.
  // Be careful with this in production.
  await ref(database, 'leads').set(leadsToSet);
  console.log('Sample leads have been seeded to Firebase.');
}


async function getLeadsFromFirebase(): Promise<Lead[]> {
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
    return await getLeadsFromFirebase();
  }
}

export { getLeadsFromFirebase };
