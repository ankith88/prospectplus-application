import { firestore } from '../src/lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function checkLeadNotes() {
  const leadDoc = await getDoc(doc(firestore, 'leads', '1985895'));
  if (leadDoc.exists()) {
    const data = leadDoc.data();
    console.log("companyName:", data.companyName);
    console.log("status:", data.status);
    console.log("customerStatus:", data.customerStatus);
    console.log("notes:", data.notes);
    
    const companyNameLower = (data.companyName || '').toLowerCase();
    const notesLower = (data.notes || '').toLowerCase();
    const statusLower = ((data.customerStatus || data.status) || '').toLowerCase();

    console.log("companyNameLower.includes('website'):", companyNameLower.includes('website'));
    console.log("notesLower.includes('website'):", notesLower.includes('website'));
    console.log("statusLower.includes('website'):", statusLower.includes('website'));

    const isExcluded = companyNameLower.includes('website') || notesLower.includes('website') || statusLower.includes('website');
    console.log("EXCLUDED BY WEBSITE FILTER?:", isExcluded);
  }
  process.exit(0);
}
checkLeadNotes();
