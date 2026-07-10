const admin = require('firebase-admin');

delete process.env.FIRESTORE_EMULATOR_HOST;
admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' });
const db = admin.firestore();

async function run() {
  const leadId = "2010443";
  const doc = await db.collection('leads').doc(leadId).get();
  if (!doc.exists) {
    console.log(`Lead ${leadId} not found`);
    return;
  }
  const data = doc.data();
  console.log(`Lead ${leadId} Name: ${data.companyName}`);
  console.log(`CustomerPhone: "${data.customerPhone}"`);
  
  const contacts = await db.collection('leads').doc(leadId).collection('contacts').get();
  contacts.forEach(c => {
    console.log(`Contact: ${c.id}, Name: ${c.data().name}, Phone: "${c.data().phone}"`);
  });
}

run().catch(console.error);
