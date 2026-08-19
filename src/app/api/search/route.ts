import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const db = getFirestore(adminApp);

    // Authenticate user & check franchisee restriction
    const authHeader = req.headers.get('Authorization');
    const activeRoleHeader = req.headers.get('X-Active-Role');
    let isFranchisee = false;
    const userFranchiseeNames = new Set<string>();
    const userFranchiseeIds = new Set<string>();
    const userIdentities = new Set<string>();

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7);
      try {
        const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userProfile = userDoc.data() || {};
          const role = activeRoleHeader || userProfile.activeRole || userProfile.role || '';
          isFranchisee = role.toLowerCase().trim() === 'franchisee';

          if (userProfile.franchisee) userFranchiseeNames.add(userProfile.franchisee.trim().toLowerCase());
          if (userProfile.franchiseeName) userFranchiseeNames.add(userProfile.franchiseeName.trim().toLowerCase());
          if (userProfile.franchiseeId) userFranchiseeIds.add(String(userProfile.franchiseeId).trim().toLowerCase());
          if (userProfile.franchiseeInternalId) userFranchiseeIds.add(String(userProfile.franchiseeInternalId).trim().toLowerCase());
          if (userProfile.activeFranchiseeId) userFranchiseeIds.add(String(userProfile.activeFranchiseeId).trim().toLowerCase());

          if (Array.isArray(userProfile.linkedFranchiseeIds)) {
            userProfile.linkedFranchiseeIds.forEach((id: any) => {
              if (id !== undefined && id !== null && String(id).trim()) {
                userFranchiseeIds.add(String(id).trim().toLowerCase());
              }
            });
          }
          if (Array.isArray(userProfile.historicalFranchiseeIds)) {
            userProfile.historicalFranchiseeIds.forEach((id: any) => {
              if (id !== undefined && id !== null && String(id).trim()) {
                userFranchiseeIds.add(String(id).trim().toLowerCase());
              }
            });
          }
          if (Array.isArray(userProfile.linkedFranchisees)) {
            userProfile.linkedFranchisees.forEach((item: any) => {
              if (typeof item === 'string' && item.trim()) {
                userFranchiseeNames.add(item.trim().toLowerCase());
              } else if (typeof item === 'object' && item !== null) {
                if (item.franchiseeName) userFranchiseeNames.add(String(item.franchiseeName).trim().toLowerCase());
                if (item.name) userFranchiseeNames.add(String(item.name).trim().toLowerCase());
                if (item.franchiseeId) userFranchiseeIds.add(String(item.franchiseeId).trim().toLowerCase());
                if (item.franchiseeInternalId) userFranchiseeIds.add(String(item.franchiseeInternalId).trim().toLowerCase());
              }
            });
          }

          if (userProfile.displayName) userIdentities.add(userProfile.displayName.trim().toLowerCase());
          if (userProfile.email) userIdentities.add(userProfile.email.trim().toLowerCase());
          if (uid) userIdentities.add(uid.trim().toLowerCase());
          const fullName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ').trim().toLowerCase();
          if (fullName) userIdentities.add(fullName);
        }
      } catch (err) {
        console.error('ID Token verification failed in search API:', err);
      }
    }

    const matchesUserFranchisee = (data: any) => {
      if (!isFranchisee) return true;
      if (!data) return false;

      const franName = (data.franchisee || data.franchiseeName || '').toString().trim().toLowerCase();
      const franId = (data.franchisee_id || data.franchiseeId || data.franchiseeInternalId || '').toString().trim().toLowerCase();

      if (franName && (userFranchiseeNames.has(franName) || userFranchiseeIds.has(franName))) return true;
      if (franId && (userFranchiseeIds.has(franId) || userFranchiseeNames.has(franId))) return true;

      if (Array.isArray(data.linkedFranchisees)) {
        const hasLinkedMatch = data.linkedFranchisees.some((item: any) => {
          if (typeof item === 'string') {
            const norm = item.trim().toLowerCase();
            return userFranchiseeNames.has(norm) || userFranchiseeIds.has(norm);
          } else if (typeof item === 'object' && item !== null) {
            const nameNorm = (item.franchiseeName || item.name || '').toString().trim().toLowerCase();
            const idNorm = (item.franchiseeId || item.franchiseeInternalId || item.id || '').toString().trim().toLowerCase();
            return (nameNorm && (userFranchiseeNames.has(nameNorm) || userFranchiseeIds.has(nameNorm))) ||
                   (idNorm && (userFranchiseeIds.has(idNorm) || userFranchiseeNames.has(idNorm)));
          }
          return false;
        });
        if (hasLinkedMatch) return true;
      }

      const isAssigned = (val: any) => {
        if (!val) return false;
        return userIdentities.has(String(val).trim().toLowerCase());
      };

      if (
        isAssigned(data.salesRepAssigned) ||
        isAssigned(data.dialerAssigned) ||
        isAssigned(data.fieldRepAssigned) ||
        isAssigned(data.accountManagerAssigned) ||
        isAssigned(data.assignedTo) ||
        isAssigned(data.createdBy)
      ) {
        return true;
      }

      return false;
    };

    // Generate query variations for case-sensitive prefix matching
    const searchStrings = Array.from(
      new Set(
        [
          q,
          q.toLowerCase(),
          q.toUpperCase(),
          q.charAt(0).toUpperCase() + q.slice(1).toLowerCase(), // Capitalized
          q.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '), // Title Case
        ].filter(Boolean)
      )
    );

    // Prepare arrays to hold parallel query promises
    const leadPromises: Promise<any>[] = [];
    const companyPromises: Promise<any>[] = [];
    const contactPromises: Promise<any>[] = [];

    for (const searchStr of searchStrings) {
      // 1. Search leads by companyName
      leadPromises.push(
        db.collection('leads')
          .where('companyName', '>=', searchStr)
          .where('companyName', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );

      // 2. Search companies by companyName
      companyPromises.push(
        db.collection('companies')
          .where('companyName', '>=', searchStr)
          .where('companyName', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );

      // 3. Search by entityId & customerEntityId
      // Note: entityId is sometimes numeric or string. We query as string prefix.
      leadPromises.push(
        db.collection('leads')
          .where('entityId', '>=', searchStr)
          .where('entityId', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );
      leadPromises.push(
        db.collection('leads')
          .where('customerEntityId', '>=', searchStr)
          .where('customerEntityId', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('entityId', '>=', searchStr)
          .where('entityId', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('customerEntityId', '>=', searchStr)
          .where('customerEntityId', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );

      // Search by prospectPlusId
      leadPromises.push(
        db.collection('leads')
          .where('prospectPlusId', '>=', searchStr)
          .where('prospectPlusId', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('prospectPlusId', '>=', searchStr)
          .where('prospectPlusId', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );

      // 4. Search contacts by email prefix
      contactPromises.push(
        db.collectionGroup('contacts')
          .where('email', '>=', searchStr.toLowerCase())
          .where('email', '<=', searchStr.toLowerCase() + '\uf8ff')
          .limit(10)
          .get()
      );
    }

    // Resolve all queries in parallel
    const [leadSnapshots, companySnapshots, contactSnapshots] = await Promise.all([
      Promise.all(leadPromises),
      Promise.all(companyPromises),
      Promise.all(contactPromises),
    ]);

    const resultsMap = new Map<string, any>();

    // Process leads
    for (const snap of leadSnapshots) {
      for (const doc of snap.docs) {
        if (doc.data().isDuplicate) continue;
        const data = doc.data();
        if (isFranchisee && !matchesUserFranchisee(data)) continue;
        const entityId = data.customerEntityId || data.entityId || '';
        const prospectPlusId = data.prospectPlusId ? ` • ${data.prospectPlusId}` : '';
        resultsMap.set(`lead-${doc.id}`, {
          type: 'lead',
          id: doc.id,
          title: data.companyName || 'Unknown Lead',
          description: `Lead • ${data.customerStatus || 'New'}${entityId ? ` (${entityId})` : ''}${prospectPlusId}`,
          entityId,
        });
      }
    }

    // Process companies
    for (const snap of companySnapshots) {
      for (const doc of snap.docs) {
        const data = doc.data();
        if (isFranchisee && !matchesUserFranchisee(data)) continue;
        const entityId = data.customerEntityId || data.entityId || '';
        const prospectPlusId = data.prospectPlusId ? ` • ${data.prospectPlusId}` : '';
        resultsMap.set(`company-${doc.id}`, {
          type: 'company',
          id: doc.id,
          title: data.companyName || 'Unknown Company',
          description: `Signed Customer${entityId ? ` (${entityId})` : ''}${prospectPlusId}`,
          entityId,
        });
      }
    }

    // Process contact matches
    const parentFetchPromises: Promise<any>[] = [];
    const contactMatches: { parentPath: string; parentId: string; type: 'lead' | 'company'; email: string; name: string }[] = [];

    for (const snap of contactSnapshots) {
      for (const doc of snap.docs) {
        const contactData = doc.data();
        const parentRef = doc.ref.parent.parent;
        if (parentRef) {
          const parentId = parentRef.id;
          const parentPath = parentRef.path; // e.g. "leads/123" or "companies/456"
          const type = parentPath.startsWith('leads') ? 'lead' : 'company';
          
          const key = `${type}-${parentId}`;
          // If we already have this parent in results, maybe append description but don't fetch
          if (resultsMap.has(key)) {
            const existing = resultsMap.get(key);
            if (!existing.description.includes(contactData.email)) {
              existing.description += ` • Contact: ${contactData.email}`;
            }
            continue;
          }

          contactMatches.push({
            parentPath,
            parentId,
            type,
            email: contactData.email || '',
            name: contactData.name || '',
          });
          parentFetchPromises.push(parentRef.get());
        }
      }
    }

    // Fetch parent documents for matched contacts
    if (parentFetchPromises.length > 0) {
      const parentSnaps = await Promise.all(parentFetchPromises);
      parentSnaps.forEach((snap, idx) => {
        if (snap.exists) {
          const match = contactMatches[idx];
          const data = snap.data();
          if (isFranchisee && !matchesUserFranchisee(data)) return;
          const entityId = data.customerEntityId || data.entityId || '';
          const key = `${match.type}-${match.parentId}`;

          resultsMap.set(key, {
            type: match.type,
            id: match.parentId,
            title: data.companyName || (match.type === 'lead' ? 'Unknown Lead' : 'Unknown Company'),
            description: `${match.type === 'lead' ? 'Lead' : 'Signed Customer'}${entityId ? ` (${entityId})` : ''} • Contact: ${match.name} (${match.email})`,
            entityId,
          });
        }
      });
    }

    // Limit overall results to a reasonable amount
    const results = Array.from(resultsMap.values()).slice(0, 20);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('API global search error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
