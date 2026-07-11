import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
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

// Helper to generate variations of the phone number
function getPhoneVariations(phoneNum: string): string[] {
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
}

// Resilient promise resolver to handle missing indexes gracefully
async function safeResolve(promises: Promise<any>[]) {
  const results = await Promise.all(
    promises.map(p =>
      p.catch(err => {
        console.warn('Firestore query failed (possibly missing index):', err.message || err);
        return null;
      })
    )
  );
  return results.filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q.length < 2) {
      return NextResponse.json({ groups: [], individuals: [] });
    }

    const db = getFirestore(adminApp);

    const type = searchParams.get('type')?.trim() || 'all';

    // Normalize phone number if digits are present
    const digitsOnly = q.replace(/\D/g, '');
    const isEmail = q.includes('@');
    const phoneVariations = getPhoneVariations(q);

    // Case variations for string queries (prefixes)
    const baseSearchStrings = [
      q,
      q.toLowerCase(),
      q.toUpperCase(),
      q.charAt(0).toUpperCase() + q.slice(1).toLowerCase(),
      q.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
    ].filter(Boolean);

    const searchStrings = Array.from(
      new Set([
        ...baseSearchStrings,
        ...baseSearchStrings.map(s => s.replace(/ /g, '\u00a0')),
        ...baseSearchStrings.map(s => s.replace(/\u00a0/g, ' ')),
      ])
    );

    const leadPromises: Promise<any>[] = [];
    const companyPromises: Promise<any>[] = [];
    const contactPromises: Promise<any>[] = [];
    const ticketPromises: Promise<any>[] = [];

    // Parse query for address tokens if it contains both alphabetic chars and digits and type is 'all' or 'address'
    const isAddressQuery = (type === 'all' || type === 'address') && /\d+/.test(q) && /[a-zA-Z]/.test(q);
    const queryWords = q.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    const streetNumber = queryWords.find(w => /^\d+$/.test(w));
    const streetSuffixes = new Set(['st', 'street', 'rd', 'road', 'ave', 'avenue', 'pl', 'place', 'ln', 'lane', 'nsw', 'vic', 'qld', 'sa', 'wa', 'tas', 'nt', 'act', 'suite', 'lvl', 'level', 'unit']);
    const streetNameWords = queryWords.filter(w => !/^\d+$/.test(w) && !streetSuffixes.has(w));

    // 1. Account / Search Strings Queries
    if (type === 'all' || type === 'company' || type === 'id') {
      for (const searchStr of searchStrings) {
        if (type === 'all' || type === 'company') {
          // Company Name prefix
          leadPromises.push(
            db.collection('leads')
              .where('companyName', '>=', searchStr)
              .where('companyName', '<=', searchStr + '\uf8ff')
              .limit(20)
              .get()
          );
          companyPromises.push(
            db.collection('companies')
              .where('companyName', '>=', searchStr)
              .where('companyName', '<=', searchStr + '\uf8ff')
              .limit(20)
              .get()
          );
        }

        if (type === 'all' || type === 'id') {
          // Prospect+ ID
          leadPromises.push(
            db.collection('leads')
              .where('prospectPlusId', '>=', searchStr.toUpperCase())
              .where('prospectPlusId', '<=', searchStr.toUpperCase() + '\uf8ff')
              .limit(20)
              .get()
          );
          companyPromises.push(
            db.collection('companies')
              .where('prospectPlusId', '>=', searchStr.toUpperCase())
              .where('prospectPlusId', '<=', searchStr.toUpperCase() + '\uf8ff')
              .limit(20)
              .get()
          );

          // NetSuite ID
          leadPromises.push(
            db.collection('leads')
              .where('entityId', '>=', searchStr)
              .where('entityId', '<=', searchStr + '\uf8ff')
              .limit(20)
              .get()
          );
          companyPromises.push(
            db.collection('companies')
              .where('entityId', '>=', searchStr)
              .where('entityId', '<=', searchStr + '\uf8ff')
              .limit(20)
              .get()
          );
        }
      }
    }

    // 2. Smart Address Prefix Queries (using a higher limit of 80 to prevent truncation)
    if (type === 'all' || type === 'address') {
      const addressSearchStrings = new Set<string>();
      for (const word of [...streetNameWords, streetNumber].filter(Boolean)) {
        const capWord = word!.charAt(0).toUpperCase() + word!.slice(1).toLowerCase();
        addressSearchStrings.add(word!);
        addressSearchStrings.add(capWord);
        addressSearchStrings.add(word!.toUpperCase());
      }

      if (addressSearchStrings.size === 0) {
        for (const searchStr of searchStrings) {
          addressSearchStrings.add(searchStr);
        }
      }

      for (const searchStr of addressSearchStrings) {
        leadPromises.push(
          db.collection('leads')
            .where('street', '>=', searchStr)
            .where('street', '<=', searchStr + '\uf8ff')
            .limit(80)
            .get()
        );
        leadPromises.push(
          db.collection('leads')
            .where('address1', '>=', searchStr)
            .where('address1', '<=', searchStr + '\uf8ff')
            .limit(80)
            .get()
        );
        leadPromises.push(
          db.collection('leads')
            .where('address.street', '>=', searchStr)
            .where('address.street', '<=', searchStr + '\uf8ff')
            .limit(80)
            .get()
        );

        companyPromises.push(
          db.collection('companies')
            .where('street', '>=', searchStr)
            .where('street', '<=', searchStr + '\uf8ff')
            .limit(80)
            .get()
        );
        companyPromises.push(
          db.collection('companies')
            .where('address1', '>=', searchStr)
            .where('address1', '<=', searchStr + '\uf8ff')
            .limit(80)
            .get()
        );
        companyPromises.push(
          db.collection('companies')
            .where('address.street', '>=', searchStr)
            .where('address.street', '<=', searchStr + '\uf8ff')
            .limit(80)
            .get()
        );
      }
    }

    // 3. Smart Phone Prefix Queries
    if (type === 'all' || type === 'phone') {
      if (digitsOnly.length >= 3) {
        const prefixes = new Set<string>();
        for (const variation of phoneVariations) {
          if (variation.length >= 4) {
            prefixes.add(variation.substring(0, 5));
          }
        }
        for (const prefix of prefixes) {
          leadPromises.push(
            db.collection('leads')
              .where('customerPhone', '>=', prefix)
              .where('customerPhone', '<=', prefix + '\uf8ff')
              .limit(50)
              .get()
          );
          companyPromises.push(
            db.collection('companies')
              .where('customerPhone', '>=', prefix)
              .where('customerPhone', '<=', prefix + '\uf8ff')
              .limit(50)
              .get()
          );
          contactPromises.push(
            db.collectionGroup('contacts')
              .where('phone', '>=', prefix)
              .where('phone', '<=', prefix + '\uf8ff')
              .limit(50)
              .get()
          );
        }
      }
    }

    // 4. Email Queries
    if (type === 'all' || type === 'email') {
      if (isEmail || q.length >= 3) {
        leadPromises.push(
          db.collection('leads')
            .where('customerServiceEmail', '>=', q.toLowerCase())
            .where('customerServiceEmail', '<=', q.toLowerCase() + '\uf8ff')
            .limit(20)
            .get()
        );
        companyPromises.push(
          db.collection('companies')
            .where('customerServiceEmail', '>=', q.toLowerCase())
            .where('customerServiceEmail', '<=', q.toLowerCase() + '\uf8ff')
            .limit(20)
            .get()
        );
        contactPromises.push(
          db.collectionGroup('contacts')
            .where('email', '>=', q.toLowerCase())
            .where('email', '<=', q.toLowerCase() + '\uf8ff')
            .limit(20)
            .get()
        );
      }
    }

    // 5. Ticket ID Queries
    if (type === 'all' || type === 'ticket') {
      if (q.length >= 2) {
        ticketPromises.push(db.collection('tickets').doc(q).get());
        ticketPromises.push(db.collection('tickets').doc(q.toUpperCase()).get());
        ticketPromises.push(
          db.collection('tickets')
            .where('ticketNumber', '>=', q.toUpperCase())
            .where('ticketNumber', '<=', q.toUpperCase() + '\uf8ff')
            .limit(20)
            .get()
        );
      }
    }

    // Resolve all initial queries in parallel using safe resolver
    const [leadSnaps, companySnaps, contactSnaps, ticketSnaps] = await Promise.all([
      safeResolve(leadPromises),
      safeResolve(companyPromises),
      safeResolve(contactPromises),
      safeResolve(ticketPromises),
    ]);

    // Keep track of direct matches
    const rawMatchedDocs = new Map<string, { type: 'lead' | 'company'; data: any; id: string }>();

    for (const snap of leadSnaps) {
      for (const doc of snap.docs) {
        rawMatchedDocs.set(`lead-${doc.id}`, { type: 'lead', id: doc.id, data: doc.data() });
      }
    }
    for (const snap of companySnaps) {
      for (const doc of snap.docs) {
        rawMatchedDocs.set(`company-${doc.id}`, { type: 'company', id: doc.id, data: doc.data() });
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
          if (!rawMatchedDocs.has(key)) {
            contactMatchedParents.push({ id: parentRef.id, type });
            parentFetchPromises.push(parentRef.get());
          }
        }
      }
    }

    if (parentFetchPromises.length > 0) {
      const parentSnaps = await safeResolve(parentFetchPromises);
      parentSnaps.forEach((snap, idx) => {
        if (snap.exists) {
          const match = contactMatchedParents[idx];
          rawMatchedDocs.set(`${match.type}-${match.id}`, { type: match.type, id: match.id, data: snap.data() });
        }
      });
    }

    // Standardize matching for Address & Phone queries to filter false positives
    const matchedDocs = new Map<string, { type: 'lead' | 'company'; data: any; id: string }>();
    for (const [key, item] of rawMatchedDocs.entries()) {
      const data = item.data;

      // Validate Phone Format (standardized digit matching)
      if (digitsOnly.length >= 3) {
        const itemPhoneDigits = String(data.customerPhone || data.phone || '').replace(/\D/g, '');
        const matchesPhone = phoneVariations.some(v => {
          const vDigits = v.replace(/\D/g, '');
          return itemPhoneDigits.includes(vDigits) || vDigits.includes(itemPhoneDigits);
        });
        if (digitsOnly.length >= 6 && !matchesPhone) {
          continue;
        }
      }

      // Validate Address Format (token matching across whole address block)
      if (isAddressQuery) {
        const resolvedAddr = resolveAddress(data);
        if (!resolvedAddr) continue;
        const fullAddrStr = `${resolvedAddr.address1} ${resolvedAddr.street} ${resolvedAddr.city} ${resolvedAddr.state} ${resolvedAddr.zip}`.toLowerCase();
        const matchesAddress = queryWords.every(word => fullAddrStr.includes(word));
        if (!matchesAddress) {
          continue;
        }
      }

      matchedDocs.set(key, item);
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

      const groupSnaps = await safeResolve(groupQueries);
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

    // Process matched tickets
    const ticketItems: any[] = [];
    const seenTicketIds = new Set<string>();

    for (const snap of ticketSnaps) {
      if (snap.exists) {
        if (!seenTicketIds.has(snap.id)) {
          seenTicketIds.add(snap.id);
          const data = snap.data();
          ticketItems.push({
            id: snap.id,
            ticketNumber: data.ticketNumber || snap.id,
            enquiryType: data.enquiryType || 'Other',
            status: data.status || 'Open',
            priority: data.priority || 'Standard',
            companyName: data.customerCompany || data.customerName || 'Unknown Company',
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null
          });
        }
      } else if (snap.docs) {
        for (const doc of snap.docs) {
          if (!seenTicketIds.has(doc.id)) {
            seenTicketIds.add(doc.id);
            const data = doc.data();
            ticketItems.push({
              id: doc.id,
              ticketNumber: data.ticketNumber || doc.id,
              enquiryType: data.enquiryType || 'Other',
              status: data.status || 'Open',
              priority: data.priority || 'Standard',
              companyName: data.customerCompany || data.customerName || 'Unknown Company',
              createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null
            });
          }
        }
      }
    }

    return NextResponse.json({
      groups,
      individuals: individualItems,
      tickets: ticketItems
    });
  } catch (error: any) {
    console.error('API account-lookup error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
