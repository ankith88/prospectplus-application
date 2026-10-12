import { firestore } from '../src/lib/firebase';
import { collection, getDocs, updateDoc } from 'firebase/firestore';

const CANDIDATES = ['Lee Russell', 'Kerina Helliwell'];

function getAvailableCandidate(usersMap: Map<string, any>): string {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  const pool = CANDIDATES.map(name => ({ name, user: usersMap.get(name) }));

  const available = pool.filter(p => {
    if (!p.user) return true;
    const lp = p.user.leaveProfile;
    if (!lp || !lp.isOnLeave) return true;
    if (lp.endDate && todayStr > lp.endDate) return true;
    if (lp.stopAssignment) {
      if (lp.startDate && todayStr < lp.startDate) return true;
      return false;
    }
    return true;
  });

  if (available.length > 0) {
    const chosen = available[Math.floor(Math.random() * available.length)];
    return chosen.name;
  }

  // Fallback to backup AM if defined
  for (const p of pool) {
    if (p.user?.leaveProfile?.backupAmName) {
      return p.user.leaveProfile.backupAmName;
    }
  }

  return CANDIDATES[Math.floor(Math.random() * CANDIDATES.length)];
}

async function assignBlankAccountManagerLeads() {
  console.log('Starting execution of assignBlankAccountManagerLeads script...');

  const usersSnap = await getDocs(collection(firestore, 'users'));
  const usersMap = new Map<string, any>();
  usersSnap.docs.forEach(docSnap => {
    const u = docSnap.data();
    const name = u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim();
    if (name) usersMap.set(name, u);
  });

  const colRef = collection(firestore, 'leads');
  const snapshot = await getDocs(colRef);

  let updatedCount = 0;
  const updatesSummary: Array<{ id: string; companyName?: string; assignedTo: string }> = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const val = data.accountManagerAssigned;

    const isBlank =
      !('accountManagerAssigned' in data) ||
      val === null ||
      val === undefined ||
      (typeof val === 'string' && val.trim() === '');

    if (isBlank) {
      const assignedPerson = getAvailableCandidate(usersMap);
      
      // Update ONLY accountManagerAssigned and salesRepAssigned
      await updateDoc(docSnap.ref, {
        accountManagerAssigned: assignedPerson,
        salesRepAssigned: assignedPerson,
      });

      updatedCount++;
      updatesSummary.push({
        id: docSnap.id,
        companyName: data.companyName,
        assignedTo: assignedPerson,
      });
      console.log(`Updated Lead ID ${docSnap.id} (${data.companyName || 'No Name'}) -> Assigned: ${assignedPerson}`);
    }
  }

  console.log('\n--- SCRIPT SUMMARY ---');
  console.log(`Successfully updated ${updatedCount} leads.`);
  console.log('Details:', JSON.stringify(updatesSummary, null, 2));
}

assignBlankAccountManagerLeads().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});

