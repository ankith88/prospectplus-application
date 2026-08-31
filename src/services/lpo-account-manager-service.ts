import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function assignKerryONeillToLpoBucket() {
  const db = getFirestore(adminApp);
  const TARGET_AM = "Kerry O'Neill";
  let updatedLeadsCount = 0;
  let updatedCompaniesCount = 0;

  // 1. Process 'leads' collection
  const leadQueries = [
    db.collection('leads').where('bucket', '==', 'lpo_network'),
    db.collection('leads').where('bucket', '==', 'LPO Network'),
    db.collection('leads').where('bucket', '==', 'lpo_plus'),
    db.collection('leads').where('source', '==', 'LPO Lead Conversion'),
    db.collection('leads').where('leadSource', '==', 'LPO Expressions of Interest'),
  ];

  const leadDocMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const q of leadQueries) {
    const snap = await q.get();
    snap.docs.forEach(doc => leadDocMap.set(doc.id, doc));
  }

  // Also scan leads where isParentLead is true or lpo flags exist
  const extraLeadSnap = await db.collection('leads').where('isParentLead', '==', true).get();
  extraLeadSnap.docs.forEach(doc => {
    const data = doc.data();
    if (
      data.bucket === 'lpo_network' ||
      data.bucket === 'LPO Network' ||
      data.bucket === 'lpo_plus' ||
      data.isLpoLead ||
      data.lpoLeadId ||
      data.linkedLpoLeadId ||
      data.parentLpoId ||
      data.companyName?.includes('LPO')
    ) {
      leadDocMap.set(doc.id, doc);
    }
  });

  const leadDocs = Array.from(leadDocMap.values());
  for (let i = 0; i < leadDocs.length; i += 400) {
    const batch = db.batch();
    const chunk = leadDocs.slice(i, i + 400);
    chunk.forEach(docSnap => {
      const data = docSnap.data();
      if (data.accountManagerAssigned !== TARGET_AM) {
        batch.update(docSnap.ref, {
          accountManagerAssigned: TARGET_AM,
          updatedAt: new Date().toISOString()
        });
        updatedLeadsCount++;
      }
    });
    await batch.commit();
  }

  // 2. Process 'companies' collection
  const companyQueries = [
    db.collection('companies').where('bucket', '==', 'lpo_network'),
    db.collection('companies').where('bucket', '==', 'LPO Network'),
    db.collection('companies').where('bucket', '==', 'lpo_plus'),
    db.collection('companies').where('source', '==', 'LPO Lead Conversion'),
    db.collection('companies').where('leadSource', '==', 'LPO Expressions of Interest'),
  ];

  const companyDocMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const q of companyQueries) {
    const snap = await q.get();
    snap.docs.forEach(doc => companyDocMap.set(doc.id, doc));
  }

  // Also scan companies where isParentLead is true or lpoLeadId exists
  const extraCompanySnap = await db.collection('companies').where('isParentLead', '==', true).get();
  extraCompanySnap.docs.forEach(doc => {
    const data = doc.data();
    if (
      data.bucket === 'lpo_network' ||
      data.bucket === 'LPO Network' ||
      data.bucket === 'lpo_plus' ||
      data.isLpoLead ||
      data.lpoLeadId ||
      data.linkedLpoLeadId ||
      data.companyName?.includes('LPO')
    ) {
      companyDocMap.set(doc.id, doc);
    }
  });

  const companyDocs = Array.from(companyDocMap.values());
  for (let i = 0; i < companyDocs.length; i += 400) {
    const batch = db.batch();
    const chunk = companyDocs.slice(i, i + 400);
    chunk.forEach(docSnap => {
      const data = docSnap.data();
      if (data.accountManagerAssigned !== TARGET_AM) {
        batch.update(docSnap.ref, {
          accountManagerAssigned: TARGET_AM,
          updatedAt: new Date().toISOString()
        });
        updatedCompaniesCount++;
      }
    });
    await batch.commit();
  }

  return {
    success: true,
    message: `Successfully assigned Kerry O'Neill as Account Manager to all LPO Network leads and companies.`,
    updatedLeadsCount,
    updatedCompaniesCount,
    totalMatchedLeads: leadDocs.length,
    totalMatchedCompanies: companyDocs.length
  };
}
