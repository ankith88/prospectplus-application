const admin = require('firebase-admin');
const fs = require('fs');

async function run() {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  try {
    const app = admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' }, 'queryApp');
    const db = app.firestore();
    
    // Check if the lead exists in 'leads'
    const leadDoc = await db.collection('leads').doc('1931805').get();
    let result = {
      leadsCollection: {
        exists: leadDoc.exists,
        data: leadDoc.exists ? leadDoc.data() : null
      }
    };
    
    if (leadDoc.exists) {
      // Check activity subcollection
      const activitiesSnapshot = await db.collection('leads').doc('1931805').collection('activity').get();
      result.leadsCollection.activities = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
    }
    
    // Check if the lead/company exists in 'companies'
    const companyDoc = await db.collection('companies').doc('1931805').get();
    result.companiesCollection = {
      exists: companyDoc.exists,
      data: companyDoc.exists ? companyDoc.data() : null
    };
    
    if (companyDoc.exists) {
      // Check activity subcollection
      const companyActivitiesSnapshot = await db.collection('companies').doc('1931805').collection('activity').get();
      result.companiesCollection.activities = companyActivitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
    }
    
    fs.writeFileSync('scratch/lead_output.json', JSON.stringify(result, null, 2));
    console.log("Success: wrote scratch/lead_output.json");
  } catch (err) {
    fs.writeFileSync('scratch/lead_output.json', JSON.stringify({error: err.message, stack: err.stack}));
    console.error("Error occurred:", err);
  }
  process.exit(0);
}

run();
