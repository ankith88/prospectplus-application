import { firestore } from '../src/lib/firebase.js';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

async function checkFieldSales() {
  console.log("=== Checking Lead 1985895 ===");
  const lead1985895Doc = await getDoc(doc(firestore, 'leads', '1985895'));
  let company1985895Doc = null;
  if (!lead1985895Doc.exists()) {
    company1985895Doc = await getDoc(doc(firestore, 'companies', '1985895'));
  }

  const targetDoc = lead1985895Doc.exists() ? lead1985895Doc : company1985895Doc;
  if (targetDoc && targetDoc.exists()) {
    const data = targetDoc.data();
    console.log("Found Lead 1985895 in collection:", lead1985895Doc.exists() ? 'leads' : 'companies');
    console.log("  companyName:", data.companyName);
    console.log("  bucket:", data.bucket);
    console.log("  status:", data.status);
    console.log("  customerStatus:", data.customerStatus);
    console.log("  fieldSales:", data.fieldSales);
    console.log("  dialerAssigned:", data.dialerAssigned);
    console.log("  assignedToDialerAt:", data.assignedToDialerAt);
    console.log("  lpoPlusOpportunity:", data.lpoPlusOpportunity);
  } else {
    console.log("Lead 1985895 NOT FOUND in leads or companies collection.");
  }

  console.log("\n=== Scanning 'outbound' bucket leads across 'leads' and 'companies' collections ===");

  // Query leads
  const qLeadsOutbound = query(collection(firestore, 'leads'), where('bucket', '==', 'outbound'));
  const snapLeads = await getDocs(qLeadsOutbound);
  
  // Query companies
  const qCompaniesOutbound = query(collection(firestore, 'companies'), where('bucket', '==', 'outbound'));
  const snapCompanies = await getDocs(qCompaniesOutbound);

  console.log(`Total leads with bucket == 'outbound': ${snapLeads.size}`);
  console.log(`Total companies with bucket == 'outbound': ${snapCompanies.size}`);

  let leadsFieldSalesTrue = 0;
  let leadsFieldSalesFalse = 0;
  let leadsFieldSalesUndefined = 0;
  const leadsToFix: { id: string, col: string, fieldSalesVal: any }[] = [];

  const processDoc = (docSnap: any, col: string) => {
    const data = docSnap.data();
    const fs = data.fieldSales;
    if (fs === true) {
      leadsFieldSalesTrue++;
      leadsToFix.push({ id: docSnap.id, col, fieldSalesVal: true });
    } else if (fs === false) {
      leadsFieldSalesFalse++;
    } else {
      leadsFieldSalesUndefined++;
      leadsToFix.push({ id: docSnap.id, col, fieldSalesVal: fs });
    }
  };

  snapLeads.docs.forEach(docSnap => processDoc(docSnap, 'leads'));
  snapCompanies.docs.forEach(docSnap => processDoc(docSnap, 'companies'));

  console.log("\n=== Summary of 'outbound' bucket ===");
  console.log(`fieldSales === true: ${leadsFieldSalesTrue}`);
  console.log(`fieldSales === false: ${leadsFieldSalesFalse}`);
  console.log(`fieldSales undefined / null / not boolean: ${leadsFieldSalesUndefined}`);
  console.log(`Total needing update to fieldSales: false -> ${leadsToFix.length}`);

  if (leadsToFix.length > 0) {
    console.log("\nSample leads needing update (up to 10):");
    leadsToFix.slice(0, 10).forEach(item => console.log(`  - [${item.col}] ID: ${item.id}, current fieldSales: ${item.fieldSalesVal}`));
  }

  process.exit(0);
}

checkFieldSales().catch(err => {
  console.error("Error running check script:", err);
  process.exit(1);
});
