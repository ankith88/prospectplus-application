import { firestore } from '../src/lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { submitServiceQuote } from '../src/services/netsuite-services-proxy';
import { format } from 'date-fns';

const salesRepIdMap: Record<string, string> = {
  "Lee Russell": "668711",
  "Kerina Helliwell": "696160",
  "Luke F": "653718",
  "Account Manager": "409635"
};

const targetLeadIds = ["1506470", "2008179", "2009810", "2010337", "2010641", "2010651"];

async function main() {
  console.log('Starting sync for 6 leads to NetSuite API...');
  
  for (const id of targetLeadIds) {
    console.log(`\n----------------------------------------`);
    console.log(`Processing Lead ID: ${id}`);
    
    try {
      const leadRef = doc(firestore, 'leads', id);
      const leadSnap = await getDoc(leadRef);
      
      if (!leadSnap.exists()) {
        console.log(`Lead ${id} not found in Firestore.`);
        continue;
      }
      
      const leadData = leadSnap.data();
      
      // Get contacts subcollection
      const contactsRef = collection(firestore, 'leads', id, 'contacts');
      const contactsSnap = await getDocs(contactsRef);
      let selectedContactId = "";
      
      if (!contactsSnap.empty) {
        // Find primary contact or first contact
        const primary = contactsSnap.docs.find(d => d.data().isPrimary);
        selectedContactId = primary ? primary.id : contactsSnap.docs[0].id;
        console.log(`Found contact: ${selectedContactId} (${contactsSnap.docs[0].data().name})`);
      } else {
        console.log(`No contacts found for lead ${id}.`);
      }
      
      const am = leadData.accountManagerAssigned || "Account Manager";
      const salesRepId = salesRepIdMap[am] || salesRepIdMap["Account Manager"];
      
      let commDate = "";
      const quoteSentDate = leadData.quoteSentAt || new Date().toISOString();
      try {
        commDate = format(new Date(quoteSentDate), 'dd/MM/yyyy');
      } catch (err) {
        commDate = format(new Date(), 'dd/MM/yyyy');
      }

      const payload = {
        operation: "quoteCustomer" as const,
        customerId: leadData.internalid || id,
        contactId: selectedContactId,
        salesRecordId: leadData.salesRecordInternalId || "",
        salesRepId: salesRepId,
        services: [],
        commDate: commDate,
        accountManagerName: am
      };
      
      console.log(`Submitting NetSuite quote payload for ${leadData.companyName}:`, JSON.stringify(payload, null, 2));
      
      const result = await submitServiceQuote(payload);
      
      if (result.success) {
        console.log(`[Success] NetSuite synced. commRegId: ${result.commRegId}, dynamicScfUrl: ${result.dynamicScfUrl}`);
        
        // Update Firestore
        const updateData: any = {
          updatedAt: new Date()
        };
        if (result.commRegId) updateData.commRegId = result.commRegId;
        if (result.dynamicScfUrl) updateData.dynamicScfUrl = result.dynamicScfUrl;
        
        await updateDoc(leadRef, updateData);
        
        await addDoc(collection(firestore, 'leads', id, 'activity'), {
          type: 'Update',
          date: new Date().toISOString(),
          notes: `NetSuite API sync executed for product-only quote. commRegId: ${result.commRegId || 'N/A'}.`,
          author: 'System (Migration Script)'
        });
        
        // Wait, leadRef.collection is a Firestore Web SDK DocReference method? No, in Web SDK we do collection(firestore, 'leads', id, 'activity')
        // Let's make sure the Firestore Web SDK updates are written correctly.
      } else {
        console.error(`[Error] NetSuite API failed: ${result.message}`);
      }
      
    } catch (error: any) {
      console.error(`Exception processing lead ${id}:`, error);
    }
  }
  
  process.exit(0);
}

main().catch(console.error);
