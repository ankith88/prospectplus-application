import { getLeadFromFirebase } from './src/services/firebase';

async function main() {
  const lead1 = await getLeadFromFirebase('2005907');
  console.log('Lead 2005907 status:', lead1?.status, 'hasCreatedJob:', lead1?.hasCreatedJob);
  
  const lead2 = await getLeadFromFirebase('2005796');
  console.log('Lead 2005796 status:', lead2?.status, 'hasCreatedJob:', lead2?.hasCreatedJob);
}

main().catch(console.error);
