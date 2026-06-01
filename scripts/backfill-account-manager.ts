import { firestore } from '../src/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function processCollection(collectionName: string) {
  console.log(`\n--- Processing collection: ${collectionName} ---`);
  try {
    const colRef = collection(firestore, collectionName);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log(`Collection '${collectionName}' is empty or does not exist.`);
      return;
    }

    console.log(`Found ${snapshot.size} documents in '${collectionName}'.`);

    let updatedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // Check if salesRepAssigned exists and has a value
      if (data.salesRepAssigned && typeof data.salesRepAssigned === 'string' && data.salesRepAssigned.trim() !== '') {
        // If accountManagerAssigned is completely missing or is an empty string
        if (data.accountManagerAssigned === undefined || data.accountManagerAssigned === null || data.accountManagerAssigned === '') {
          
          await updateDoc(docSnapshot.ref, {
            accountManagerAssigned: data.salesRepAssigned
          });
          
          updatedCount++;
          if (updatedCount % 50 === 0) {
            console.log(`Updated ${updatedCount} documents...`);
          }
        }
      }
    }

    console.log(`Finished processing '${collectionName}'. Successfully updated ${updatedCount} documents.`);
  } catch (error) {
    console.error(`Error processing collection '${collectionName}':`, error);
  }
}

async function main() {
  console.log('Starting backfill script...');
  
  await processCollection('leads');
  await processCollection('companies');
  
  console.log('\nAll done!');
  process.exit(0);
}

main().catch(console.error);
