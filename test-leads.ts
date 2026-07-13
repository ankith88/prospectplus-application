import { firestore } from './src/lib/firebase.js';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

async function main() {
  const leadId = '2010629';
  const leadDoc = await getDoc(doc(firestore, 'leads', leadId));
  
  if (!leadDoc.exists()) {
    console.log(`Lead ${leadId} not found`);
    process.exit(0);
  }
  
  const lead = leadDoc.data();
  console.log("Target Lead ID:", leadId);
  console.log("Company Name:", lead.companyName);
  console.log("Address Field:", JSON.stringify(lead.address, null, 2));
  console.log("City Field (root):", lead.city);
  console.log("Street Field (root):", lead.street);
  console.log("State Field (root):", lead.state);
  console.log("Zip Field (root):", lead.zip);
  console.log("Country Field (root):", lead.country);
  
  // Find other leads with the same companyName
  const q = query(collection(firestore, 'leads'), where('companyName', '==', lead.companyName));
  const snap = await getDocs(q);
  console.log(`\nFound ${snap.size} total leads with companyName = "${lead.companyName}":`);
  
  snap.docs.forEach(otherDoc => {
    const data = otherDoc.data();
    console.log(`- ID: ${otherDoc.id}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Address Field: ${JSON.stringify(data.address)}`);
    console.log(`  Street Field (root): ${data.street}`);
    console.log(`  City Field (root): ${data.city}`);
    
    // Normalization check using address field
    const streetA = (lead.address?.street || '').toLowerCase().trim();
    const streetB = (data.address?.street || '').toLowerCase().trim();
    const cityA = (lead.address?.city || '').toLowerCase().trim();
    const cityB = (data.address?.city || '').toLowerCase().trim();
    
    console.log(`  Address-based check:`);
    console.log(`    Street Match: "${streetA}" vs "${streetB}" => ${streetA === streetB}`);
    console.log(`    City Match: "${cityA}" vs "${cityB}" => ${cityA === cityB}`);

    // Normalization check using root fields
    const rootStreetA = (lead.street || '').toLowerCase().trim();
    const rootStreetB = (data.street || '').toLowerCase().trim();
    const rootCityA = (lead.city || '').toLowerCase().trim();
    const rootCityB = (data.city || '').toLowerCase().trim();
    console.log(`  Root-based check:`);
    console.log(`    Street Match: "${rootStreetA}" vs "${rootStreetB}" => ${rootStreetA === rootStreetB}`);
    console.log(`    City Match: "${rootCityA}" vs "${rootCityB}" => ${rootCityA === rootCityB}`);
  });
  
  process.exit(0);
}
main();
