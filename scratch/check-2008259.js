const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' });
const db = admin.firestore();

async function run() {
  const leadId = "2008259";
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

  const activities = await db.collection('leads').doc(leadId).collection('activity').get();
  activities.forEach(act => {
    const data = act.data();
    if (data.type === 'Call') {
      console.log(`Activity ${act.id}: type=${data.type}, aircallStatus=${data.aircallStatus}, author=${data.author}, date=${data.date}, notes="${data.notes}"`);
    }
  });
}

run().catch(console.error);
