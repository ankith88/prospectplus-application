import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const resolveAddress = (data: any) => {
  if (data.address) {
    return {
      address1: data.address.address1 || '',
      street: data.address.street || '',
      city: data.address.city || '',
      state: data.address.state || '',
      zip: data.address.zip || '',
    };
  }
  if (data.postalAddress) {
    return {
      address1: data.postalAddress.address1 || '',
      street: data.postalAddress.street || '',
      city: data.postalAddress.city || '',
      state: data.postalAddress.state || '',
      zip: data.postalAddress.zip || '',
    };
  }
  if (data.street || data.city || data.state) {
    return {
      address1: data.address1 || '',
      street: data.street || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
    };
  }
  return null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const db = getFirestore(adminApp);

    // Normalize phone number if digits are present
    const digitsOnly = q.replace(/\D/g, '');
    const isEmail = q.includes('@');

    // Case variations for string queries (prefixes)
    const searchStrings = Array.from(
      new Set(
        [
          q,
          q.toLowerCase(),
          q.toUpperCase(),
          q.charAt(0).toUpperCase() + q.slice(1).toLowerCase(),
          q.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
        ].filter(Boolean)
      )
    );

    const leadPromises: Promise<any>[] = [];
    const companyPromises: Promise<any>[] = [];
    const contactPromises: Promise<any>[] = [];

    for (const searchStr of searchStrings) {
      // 1. Company Name prefix
      leadPromises.push(
        db.collection('leads')
          .where('companyName', '>=', searchStr)
          .where('companyName', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('companyName', '>=', searchStr)
          .where('companyName', '<=', searchStr + '\uf8ff')
          .limit(10)
          .get()
      );

      // 2. Prospect+ ID (prospectPlusId)
      leadPromises.push(
        db.collection('leads')
          .where('prospectPlusId', '>=', searchStr.toUpperCase())
          .where('prospectPlusId', '<=', searchStr.toUpperCase() + '\uf8ff')
          .limit(10)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('prospectPlusId', '>=', searchStr.toUpperCase())
          .where('prospectPlusId', '<=', searchStr.toUpperCase() + '\uf8ff')
          .limit(10)
          .get()
      );

      // 3. NetSuite IDs (entityId / customerEntityId)
      leadPromises.push(
        db.collection('leads')
          .where('entityId', '>=', searchStr)
          .where('entityId', '<=', searchStr + '\uf8ff')
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

      // 4. Address fields (flat root-level fields and nested address object fields)
      // Flat Root-level
      leadPromises.push(
        db.collection('leads')
          .where('street', '>=', searchStr)
          .where('street', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );
      leadPromises.push(
        db.collection('leads')
          .where('address1', '>=', searchStr)
          .where('address1', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );
      leadPromises.push(
        db.collection('leads')
          .where('city', '>=', searchStr)
          .where('city', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );

      companyPromises.push(
        db.collection('companies')
          .where('street', '>=', searchStr)
          .where('street', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('address1', '>=', searchStr)
          .where('address1', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('city', '>=', searchStr)
          .where('city', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );

      // Nested Address object
      leadPromises.push(
        db.collection('leads')
          .where('address.street', '>=', searchStr)
          .where('address.street', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );
      leadPromises.push(
        db.collection('leads')
          .where('address.address1', '>=', searchStr)
          .where('address.address1', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );
      leadPromises.push(
        db.collection('leads')
          .where('address.city', '>=', searchStr)
          .where('address.city', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );

      companyPromises.push(
        db.collection('companies')
          .where('address.street', '>=', searchStr)
          .where('address.street', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('address.address1', '>=', searchStr)
          .where('address.address1', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('address.city', '>=', searchStr)
          .where('address.city', '<=', searchStr + '\uf8ff')
          .limit(5)
          .get()
      );
    }

    // 5. Phone queries
    if (digitsOnly.length >= 3) {
      const getPhoneVariations = (phoneNum: string): string[] => {
        const digits = phoneNum.replace(/\D/g, '');
        const variations = new Set<string>();
        if (!digits) return [];
        variations.add(digits);
        variations.add(`+${digits}`);
        if (digits.startsWith('61')) {
          const localPart = digits.substring(2);
          variations.add(`0${localPart}`);
          variations.add(localPart);
        } else if (digits.startsWith('0')) {
          const localPart = digits.substring(1);
          variations.add(`61${localPart}`);
          variations.add(`+61${localPart}`);
          variations.add(localPart);
        } else {
          variations.add(`0${digits}`);
          variations.add(`61${digits}`);
          variations.add(`+61${digits}`);
        }
        variations.add(phoneNum.trim());
        return Array.from(variations);
      };

      const phoneVariations = getPhoneVariations(q);
      for (const variation of phoneVariations) {
        leadPromises.push(
          db.collection('leads')
            .where('customerPhone', '>=', variation)
            .where('customerPhone', '<=', variation + '\uf8ff')
            .limit(10)
            .get()
        );
        companyPromises.push(
          db.collection('companies')
            .where('customerPhone', '>=', variation)
            .where('customerPhone', '<=', variation + '\uf8ff')
            .limit(10)
            .get()
        );
        contactPromises.push(
          db.collectionGroup('contacts')
            .where('phone', '>=', variation)
            .where('phone', '<=', variation + '\uf8ff')
            .limit(10)
            .get()
        );
      }
    }

    // 6. Email queries
    if (isEmail || q.length >= 3) {
      leadPromises.push(
        db.collection('leads')
          .where('customerServiceEmail', '>=', q.toLowerCase())
          .where('customerServiceEmail', '<=', q.toLowerCase() + '\uf8ff')
          .limit(10)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('customerServiceEmail', '>=', q.toLowerCase())
          .where('customerServiceEmail', '<=', q.toLowerCase() + '\uf8ff')
          .limit(10)
          .get()
      );
      contactPromises.push(
        db.collectionGroup('contacts')
          .where('email', '>=', q.toLowerCase())
          .where('email', '<=', q.toLowerCase() + '\uf8ff')
          .limit(10)
          .get()
      );
    }

    // Resolve all initial queries in parallel
    const [leadSnaps, companySnaps, contactSnaps] = await Promise.all([
      Promise.all(leadPromises),
      Promise.all(companyPromises),
      Promise.all(contactPromises),
    ]);

    // Keep track of direct matches
    const matchedDocs = new Map<string, { type: 'lead' | 'company'; data: any; id: string }>();

    for (const snap of leadSnaps) {
      for (const doc of snap.docs) {
        matchedDocs.set(`lead-${doc.id}`, { type: 'lead', id: doc.id, data: doc.data() });
      }
    }
    for (const snap of companySnaps) {
      for (const doc of snap.docs) {
        matchedDocs.set(`company-${doc.id}`, { type: 'company', id: doc.id, data: doc.data() });
      }
    }

    // Fetch parents for matched contacts
    const parentFetchPromises: Promise<any>[] = [];
    const contactMatchedParents: { id: string; type: 'lead' | 'company' }[] = [];

    for (const snap of contactSnaps) {
      for (const doc of snap.docs) {
        const parentRef = doc.ref.parent.parent;
        if (parentRef) {
          const type = parentRef.path.startsWith('leads') ? 'lead' : 'company';
          const key = `${type}-${parentRef.id}`;
          if (!matchedDocs.has(key)) {
            contactMatchedParents.push({ id: parentRef.id, type });
            parentFetchPromises.push(parentRef.get());
          }
        }
      }
    }

    if (parentFetchPromises.length > 0) {
      const parentSnaps = await Promise.all(parentFetchPromises);
      parentSnaps.forEach((snap, idx) => {
        if (snap.exists) {
          const match = contactMatchedParents[idx];
          matchedDocs.set(`${match.type}-${match.id}`, { type: match.type, id: match.id, data: snap.data() });
        }
      });
    }

    // Determine parent groups to fetch and expand
    const parentIdsToFetch = new Set<string>();
    for (const item of matchedDocs.values()) {
      if (item.data.parentLeadId) {
        parentIdsToFetch.add(item.data.parentLeadId);
      }
    }

    // Fetch sibling/grouped leads and companies in parallel
    const groupItemsMap = new Map<string, any[]>();
    const groupDetailsMap = new Map<string, { name: string; id: string }>();

    if (parentIdsToFetch.size > 0) {
      const groupQueries: Promise<any>[] = [];
      for (const parentId of parentIdsToFetch) {
        // Query sibling leads
        groupQueries.push(
          db.collection('leads')
            .where('parentLeadId', '==', parentId)
            .get()
        );
        // Query sibling companies
        groupQueries.push(
          db.collection('companies')
            .where('parentLeadId', '==', parentId)
            .get()
        );
        // Also fetch the parent document by internalid, internalId, or doc ID
        groupQueries.push(
          db.collection('leads').where('internalid', '==', parentId).limit(1).get()
        );
        groupQueries.push(
          db.collection('companies').where('internalid', '==', parentId).limit(1).get()
        );
        groupQueries.push(
          db.collection('leads').where('internalId', '==', parentId).limit(1).get()
        );
        groupQueries.push(
          db.collection('companies').where('internalId', '==', parentId).limit(1).get()
        );
        groupQueries.push(
          db.collection('leads').doc(parentId).get()
        );
        groupQueries.push(
          db.collection('companies').doc(parentId).get()
        );
      }

      const groupSnaps = await Promise.all(groupQueries);
      let snapIdx = 0;
      for (const parentId of parentIdsToFetch) {
        const siblingLeadsSnap = groupSnaps[snapIdx++];
        const siblingCompaniesSnap = groupSnaps[snapIdx++];
        const parentLeadInternalSnap = groupSnaps[snapIdx++];
        const parentCompanyInternalSnap = groupSnaps[snapIdx++];
        const parentLeadInternalIDSnap = groupSnaps[snapIdx++];
        const parentCompanyInternalIDSnap = groupSnaps[snapIdx++];
        const parentLeadDocSnap = groupSnaps[snapIdx++];
        const parentCompanyDocSnap = groupSnaps[snapIdx++];

        let parentName = 'Unknown Group';

        const getCompanyName = (snap: any) => {
          if (!snap) return null;
          if (snap.docs && snap.docs.length > 0) {
            return snap.docs[0].data()?.companyName || null;
          }
          if (snap.exists) {
            return snap.data()?.companyName || null;
          }
          return null;
        };

        parentName =
          getCompanyName(parentCompanyInternalSnap) ||
          getCompanyName(parentLeadInternalSnap) ||
          getCompanyName(parentCompanyInternalIDSnap) ||
          getCompanyName(parentLeadInternalIDSnap) ||
          getCompanyName(parentCompanyDocSnap) ||
          getCompanyName(parentLeadDocSnap) ||
          parentName;

        if (parentName === 'Unknown Group') {
          // Fallback to check if one of the resolved siblings itself is the parent
          const siblingParent = [...siblingCompaniesSnap.docs, ...siblingLeadsSnap.docs].find(
            d => d.id === parentId || d.data()?.internalid === parentId || d.data()?.internalId === parentId
          );
          if (siblingParent) {
            parentName = siblingParent.data()?.companyName || parentName;
          } else {
            const matchedItem = Array.from(matchedDocs.values()).find(i => i.data.parentLeadId === parentId);
            if (matchedItem) {
              parentName = matchedItem.data.companyName;
            }
          }
        }

        groupDetailsMap.set(parentId, { id: parentId, name: parentName });

        const groupItems: any[] = [];
        const seenIds = new Set<string>();

        // Add companies first (serviced)
        for (const doc of siblingCompaniesSnap.docs) {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            groupItems.push({ id: doc.id, type: 'company', data: doc.data() });
          }
        }

        // Add leads
        for (const doc of siblingLeadsSnap.docs) {
          if (!seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            groupItems.push({ id: doc.id, type: 'lead', data: doc.data() });
          }
        }

        groupItemsMap.set(parentId, groupItems);
      }
    }

    // Now organize the final response structure
    const groups: any[] = [];
    const individualItems: any[] = [];

    // Process matched items into groups or individual items
    for (const [key, item] of matchedDocs.entries()) {
      const parentId = item.data.parentLeadId;
      if (parentId && groupItemsMap.has(parentId)) {
        // Skip duplicate additions of groups
        if (!groups.some(g => g.id === parentId)) {
          const siblingItems = groupItemsMap.get(parentId) || [];
          const groupDetails = groupDetailsMap.get(parentId)!;

          const servicedCount = siblingItems.filter(i => i.type === 'company' || i.data.status === 'Won').length;
          const opportunityCount = siblingItems.length - servicedCount;

          groups.push({
            id: parentId,
            name: groupDetails.name,
            type: 'group',
            meta: {
              total: siblingItems.length,
              serviced: servicedCount,
              toWin: opportunityCount
            },
             sites: siblingItems.map(site => ({
              id: site.id,
              type: site.type,
              companyName: site.data.companyName,
              prospectPlusId: site.data.prospectPlusId || null,
              entityId: site.data.entityId || site.data.customerEntityId || null,
              status: site.data.status || 'New',
              customerStatus: site.data.customerStatus || site.data.status || 'New',
              franchisee: site.data.franchisee || 'Unassigned',
              accountManagerAssigned: site.data.accountManagerAssigned || 'Unassigned',
              address: resolveAddress(site.data),
              lastInvoiceDate: site.data.lastInvoiceDate || null,
              lastInvoiceNumber: site.data.lastInvoiceNumber || null,
            }))
          });
        }
      } else {
        // Individual item with no group/parent
        individualItems.push({
          id: item.id,
          type: item.type,
          companyName: item.data.companyName,
          prospectPlusId: item.data.prospectPlusId || null,
          entityId: item.data.entityId || item.data.customerEntityId || null,
          status: item.data.status || 'New',
          customerStatus: item.data.customerStatus || item.data.status || 'New',
          franchisee: item.data.franchisee || 'Unassigned',
          accountManagerAssigned: item.data.accountManagerAssigned || 'Unassigned',
          address: resolveAddress(item.data),
          lastInvoiceDate: item.data.lastInvoiceDate || null,
          lastInvoiceNumber: item.data.lastInvoiceNumber || null,
        });
      }
    }

    return NextResponse.json({
      groups,
      individuals: individualItems
    });
  } catch (error: any) {
    console.error('API account-lookup error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
