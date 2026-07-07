import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function checkPhone() {
  const phoneToFind = "0402712233"; // also check +61402712233
  console.log("Searching for phone:", phoneToFind);

  // Search leads
  const leadsSnap = await db.collection('leads').get();
  console.log(`Total leads: ${leadsSnap.size}`);
  
  let foundLeads = 0;
  leadsSnap.forEach(doc => {
    const data = doc.data();
    if (data.customerPhone) {
      const cleanPhone = data.customerPhone.replace(/\D/g, '');
      if (cleanPhone.includes("402712233") || cleanPhone.includes("402") || data.customerPhone.includes("402")) {
        console.log(`[Lead Match] ID: ${doc.id}, Company: ${data.companyName}, Phone: "${data.customerPhone}"`);
        foundLeads++;
      }
    }
  });

  // Search contacts
  const contactsSnap = await db.collectionGroup('contacts').get();
  console.log(`Total contacts: ${contactsSnap.size}`);
  
  let foundContacts = 0;
  contactsSnap.forEach(doc => {
    const data = doc.data();
    if (data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, '');
      if (cleanPhone.includes("402712233") || data.phone.includes("402")) {
        console.log(`[Contact Match] ID: ${doc.id}, Name: ${data.name}, Phone: "${data.phone}", Parent: ${doc.ref.parent.parent?.path}`);
        foundContacts++;
      }
    }
  });

  if (foundLeads === 0 && foundContacts === 0) {
    console.log("No matching phone records found in DB.");
  }
}

checkPhone().catch(console.error);
