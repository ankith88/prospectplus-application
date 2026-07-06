import { firestore } from '../src/lib/firebase';
import { collection, getDocs, updateDoc } from 'firebase/firestore';

async function processCollection(collectionName: 'leads' | 'companies') {
  console.log(`Querying ${collectionName} collection...`);
  const rootRef = collection(firestore, collectionName);
  const snapshot = await getDocs(rootRef);
  
  if (snapshot.empty) {
    console.log(`No documents found in ${collectionName}.`);
    return;
  }

  console.log(`Found ${snapshot.size} documents in ${collectionName}.`);
  let totalUpdated = 0;

  for (const docSnapshot of snapshot.docs) {
    const parentId = docSnapshot.id;
    const activityRef = collection(firestore, collectionName, parentId, 'activity');
    const activitySnapshot = await getDocs(activityRef);

    for (const activityDoc of activitySnapshot.docs) {
      const activityData = activityDoc.data();
      if (activityData.type === 'Call' && activityData.notes && activityData.notes.startsWith('Outcome: ')) {
        console.log(`Updating activity ${activityDoc.id} under ${collectionName}/${parentId}:`);
        console.log(`  Notes: "${activityData.notes}"`);
        
        await updateDoc(activityDoc.ref, { type: 'Update' });
        totalUpdated++;
      }
    }
  }

  console.log(`Finished ${collectionName}. Total activities updated: ${totalUpdated}\n`);
}

async function main() {
  console.log('Starting call activities migration script...');
  try {
    await processCollection('leads');
    await processCollection('companies');
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

main();
