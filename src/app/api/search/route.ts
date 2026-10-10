import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { findAllLeadsByPhoneNumberServer } from '@/services/firebase-server';

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
    const callActivityPromises: { promise: Promise<any>; callId: string; source: 'activity' | 'transcript' | 'unassigned' }[] = [];

    const strippedAircallId = q.replace(/^(aircall|call)[\s\-_:]*/i, '').trim();
    const digitsOnly = q.replace(/\D/g, '');
    const possibleAircallIds = Array.from(new Set([
      strippedAircallId,
      digitsOnly,
      q.trim(),
    ])).filter(id => id.length >= 2 && !id.includes('/'));

    if (possibleAircallIds.length > 0) {
      for (const callId of possibleAircallIds) {
        callActivityPromises.push({
          promise: db.collection('unassigned_calls').doc(callId).get(),
          callId,
          source: 'unassigned'
        });
        callActivityPromises.push({
          promise: db.collection('unassigned_calls').where('callId', '==', callId).limit(10).get(),
          callId,
          source: 'unassigned'
        });
        callActivityPromises.push({
          promise: db.collectionGroup('activity').where('callId', '==', callId).limit(10).get(),
          callId,
          source: 'activity'
        });
        callActivityPromises.push({
          promise: db.collectionGroup('activity').where('aircallId', '==', callId).limit(10).get(),
          callId,
          source: 'activity'
        });
        callActivityPromises.push({
          promise: db.collectionGroup('transcripts').where('callId', '==', callId).limit(10).get(),
          callId,
          source: 'transcript'
        });

        if (!isNaN(Number(callId))) {
          const numCallId = Number(callId);
          callActivityPromises.push({
            promise: db.collectionGroup('activity').where('callId', '==', numCallId).limit(10).get(),
            callId,
            source: 'activity'
          });
          callActivityPromises.push({
            promise: db.collectionGroup('transcripts').where('callId', '==', numCallId).limit(10).get(),
            callId,
            source: 'transcript'
          });
        }

        leadPromises.push(db.collection('leads').where('callId', '==', callId).limit(5).get());
        leadPromises.push(db.collection('leads').where('aircallId', '==', callId).limit(5).get());
        leadPromises.push(db.collection('leads').where('lastCallId', '==', callId).limit(5).get());
        companyPromises.push(db.collection('companies').where('callId', '==', callId).limit(5).get());
        companyPromises.push(db.collection('companies').where('aircallId', '==', callId).limit(5).get());
        companyPromises.push(db.collection('companies').where('lastCallId', '==', callId).limit(5).get());
      }
    }

    // Query candidates using searchKeywords
    const isEmailDomain = q.trim().startsWith('@');
    const domainQuery = isEmailDomain
      ? q.trim().replace(/^@+/, '').toLowerCase().trim()
      : (q.includes('@') ? q.split('@').pop()?.toLowerCase().trim() || '' : '');

    const queryWords = q.toLowerCase().split(/[\s,./\\_\-+()@&]+/).filter(w => w.length >= 2);
    let arrayQueryWords = Array.from(new Set([
      ...queryWords,
      q.toLowerCase(),
    ])).filter(w => w.length >= 2).slice(0, 10);

    if (isEmailDomain && domainQuery) {
      const domainParts = domainQuery.split('.').filter(Boolean);
      const domainRoot = domainParts[0] || domainQuery;
      arrayQueryWords = Array.from(new Set([
        `@${domainQuery}`,
        domainQuery,
        domainRoot,
        `@${domainRoot}`,
        ...domainParts.filter(p => p.length >= 2),
        ...arrayQueryWords,
      ])).filter(w => w.length >= 2).slice(0, 10);
    }

    if (arrayQueryWords.length > 0) {
      leadPromises.push(
        db.collection('leads')
          .where('searchKeywords', 'array-contains-any', arrayQueryWords)
          .limit(20)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('searchKeywords', 'array-contains-any', arrayQueryWords)
          .limit(20)
          .get()
      );

      if (isEmailDomain) {
        contactPromises.push(
          db.collectionGroup('contacts')
            .where('searchKeywords', 'array-contains-any', arrayQueryWords)
            .limit(20)
            .get()
        );
      }
    }

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
    const [leadSnapshots, companySnapshots, contactSnapshots, callSnapshots] = await Promise.all([
      Promise.all(leadPromises),
      Promise.all(companyPromises),
      Promise.all(contactPromises),
      Promise.all(
        callActivityPromises.map(item =>
          item.promise
            .then(res => ({ res, callId: item.callId, source: item.source }))
            .catch(err => {
              console.warn('Call query failed in search API:', err.message || err);
              return null;
            })
        )
      ),
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

    // Process AirCall call activities, transcripts, and unassigned calls
    const callParentFetchPromises: Promise<any>[] = [];
    const callMatches: { parentPath: string; parentId: string; type: 'lead' | 'company'; callId: string; notes?: string }[] = [];

    for (const item of (callSnapshots || []).filter(Boolean) as any[]) {
      const snap = item.res;
      if (!snap) continue;

      if (item.source === 'unassigned') {
        const docs = snap.docs || (snap.exists ? [snap] : []);
        for (const uDoc of docs) {
          const uData = uDoc.data() || {};
          const callId = String(uData.callId || uDoc.id || item.callId);
          if (Array.isArray(uData.matches)) {
            for (const m of uData.matches) {
              if (m.id && m.type) {
                const colName = m.type.startsWith('lead') ? 'leads' : 'companies';
                const colType = m.type.startsWith('lead') ? 'lead' : 'company';
                const key = `${colType}-${m.id}`;
                if (resultsMap.has(key)) {
                  const existing = resultsMap.get(key);
                  if (!existing.description.includes(`AirCall #${callId}`)) {
                    existing.description += ` • AirCall #${callId}`;
                  }
                  continue;
                }
                callMatches.push({ parentPath: `${colName}/${m.id}`, parentId: m.id, type: colType, callId, notes: uData.notes });
                callParentFetchPromises.push(db.collection(colName).doc(m.id).get());
              }
            }
          }
          if (uData.phoneNumber) {
            try {
              const phoneMatches = await findAllLeadsByPhoneNumberServer(uData.phoneNumber);
              for (const pm of phoneMatches) {
                const colName = pm.type;
                const colType = pm.type.startsWith('lead') ? 'lead' : 'company';
                const key = `${colType}-${pm.id}`;
                if (resultsMap.has(key)) {
                  const existing = resultsMap.get(key);
                  if (!existing.description.includes(`AirCall #${callId}`)) {
                    existing.description += ` • AirCall #${callId}`;
                  }
                  continue;
                }
                callMatches.push({ parentPath: `${colName}/${pm.id}`, parentId: pm.id, type: colType, callId, notes: uData.notes });
                callParentFetchPromises.push(db.collection(colName).doc(pm.id).get());
              }
            } catch (pErr) {
              console.warn('Error matching phone in unassigned call search:', pErr);
            }
          }
        }
      } else {
        const docs = snap.docs || (snap.exists ? [snap] : []);
        for (const doc of docs) {
          const actData = doc.data() || {};
          const parentRef = doc.ref.parent.parent;
          if (parentRef) {
            const parentId = parentRef.id;
            const parentPath = parentRef.path;
            const type = parentPath.startsWith('leads') ? 'lead' : 'company';
            const callId = String(actData.callId || item.callId);
            const key = `${type}-${parentId}`;
            if (resultsMap.has(key)) {
              const existing = resultsMap.get(key);
              if (!existing.description.includes(`AirCall #${callId}`)) {
                existing.description += ` • AirCall #${callId}`;
              }
              continue;
            }
            callMatches.push({ parentPath, parentId, type, callId, notes: actData.notes });
            callParentFetchPromises.push(parentRef.get());
          }
        }
      }
    }

    // Live AirCall API fallback if nothing found locally
    if (callMatches.length === 0 && possibleAircallIds.length > 0) {
      const apiId = (process.env.AIRCALL_API_ID || process.env.NEXT_PUBLIC_AIRCALL_API_ID || '').trim().replace(/^["']|["']$/g, '');
      const apiToken = (process.env.AIRCALL_API_TOKEN || process.env.NEXT_PUBLIC_AIRCALL_API_TOKEN || '').trim().replace(/^["']|["']$/g, '');
      if (apiId && apiToken) {
        const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
        for (const cId of possibleAircallIds) {
          if (/^\d{4,15}$/.test(cId)) {
            try {
              const aircallRes = await fetch(`https://api.aircall.io/v1/calls/${cId}`, {
                headers: { Authorization: `Basic ${credentials}` }
              });
              if (aircallRes.ok) {
                const aircallData = await aircallRes.json();
                const callObj = aircallData.call || aircallData;
                const phone = callObj.contact?.phone_number || callObj.raw_digits;
                if (phone) {
                  const phoneMatches = await findAllLeadsByPhoneNumberServer(phone);
                  for (const pm of phoneMatches) {
                    const colName = pm.type;
                    const colType = pm.type.startsWith('lead') ? 'lead' : 'company';
                    const key = `${colType}-${pm.id}`;
                    if (resultsMap.has(key)) {
                      const existing = resultsMap.get(key);
                      if (!existing.description.includes(`AirCall #${cId}`)) {
                        existing.description += ` • AirCall #${cId}`;
                      }
                      continue;
                    }
                    callMatches.push({ parentPath: `${colName}/${pm.id}`, parentId: pm.id, type: colType, callId: cId, notes: callObj.note });
                    callParentFetchPromises.push(db.collection(colName).doc(pm.id).get());
                  }
                }
              }
            } catch (aErr) {
              console.warn('[AirCall API fallback in /api/search] Error:', aErr);
            }
          }
        }
      }
    }

    if (callParentFetchPromises.length > 0) {
      const callParentSnaps = await Promise.all(callParentFetchPromises);
      callParentSnaps.forEach((snap, idx) => {
        if (snap && snap.exists) {
          const match = callMatches[idx];
          const data = snap.data();
          if (isFranchisee && !matchesUserFranchisee(data)) return;
          const entityId = data.customerEntityId || data.entityId || '';
          const prospectPlusId = data.prospectPlusId ? ` • ${data.prospectPlusId}` : '';
          const key = `${match.type}-${match.parentId}`;
          resultsMap.set(key, {
            type: match.type,
            id: match.parentId,
            title: data.companyName || (match.type === 'lead' ? 'Unknown Lead' : 'Unknown Company'),
            description: `${match.type === 'lead' ? 'Lead' : 'Signed Customer'}${entityId ? ` (${entityId})` : ''}${prospectPlusId} • AirCall Call #${match.callId}`,
            entityId,
          });
        }
      });
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
