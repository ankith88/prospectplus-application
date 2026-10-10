import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { scoreSearchResult } from '@/lib/search/search-utils';
import { findAllLeadsByPhoneNumberServer } from '@/services/firebase-server';

export const dynamic = 'force-dynamic';

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

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
        console.error('ID Token verification failed in account-lookup API:', err);
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

    const type = searchParams.get('type')?.trim() || 'all';

    // Parse query words and variations
    const isEmailDomain = q.trim().startsWith('@');
    const domainQuery = isEmailDomain
      ? q.trim().replace(/^@+/, '').toLowerCase().trim()
      : (q.includes('@') ? q.split('@').pop()?.toLowerCase().trim() || '' : '');
    const digitsOnly = q.replace(/\D/g, '');
    const isEmail = q.includes('@');
    const phoneVariations = getPhoneVariations(q);

    // Stop words for corporate and common particles (pty, ltd, as, tas, etc.)
    const STOP_WORDS = new Set(['pty', 'ltd', 'proprietary', 'limited', 'as', 'tas', 'ta', 'atf', 'the', 'and', 'for', 'of', 'in', 'on', 'to', 'a', 'an']);

    // Extract individual non-empty words, splitting on punctuation & whitespace
    const rawWords = q.toLowerCase().split(/[\s,./\\_\-+()@&]+/).filter(w => w.length > 0);
    const queryWords = rawWords.map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w.length > 0);
    const significantQueryWords = queryWords.filter(w => !STOP_WORDS.has(w) && w.length >= 2);

    // Extract potential ID or path segment if q is a URL or contains path segments
    let extractedId = q;
    if (q.includes('http://') || q.includes('https://') || q.includes('/')) {
      try {
        const urlPath = q.includes('://') ? new URL(q).pathname : q;
        const segments = urlPath.split('/').filter(Boolean);
        if (segments.length > 0) {
          extractedId = segments[segments.length - 1];
        }
      } catch (e) {
        extractedId = q.split('/').filter(Boolean).pop() || q;
      }
    }

    const strippedInvId = q.replace(/^INV/i, '').trim();
    const strippedAircallId = q.replace(/^(aircall|call)[\s\-_:]*/i, '').trim();

    const possibleAircallIds = Array.from(new Set([
      strippedAircallId,
      digitsOnly,
      extractedId.replace(/^(aircall|call)[\s\-_:]*/i, '').trim(),
      q.trim(),
    ])).filter(id => id.length >= 2 && !id.includes('/'));

    const possibleIds = Array.from(new Set([
      q.trim(),
      extractedId.trim(),
      strippedInvId,
      strippedAircallId,
      digitsOnly,
    ])).filter(id => id.length >= 2 && !id.includes('/'));

    // Base search strings including full query and individual words
    const baseSearchStrings = new Set<string>([
      q,
      extractedId,
      strippedInvId,
      strippedAircallId,
      digitsOnly,
      q.toLowerCase(),
      q.toUpperCase(),
      q.charAt(0).toUpperCase() + q.slice(1).toLowerCase(),
      q.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
    ]);

    // Add individual words to search strings to ensure candidates are retrieved from Firestore
    for (const word of queryWords) {
      if (word.length >= 2) {
        baseSearchStrings.add(word);
        baseSearchStrings.add(word.toUpperCase());
        baseSearchStrings.add(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      }
    }

    const searchStrings = Array.from(
      new Set([
        ...baseSearchStrings,
        ...Array.from(baseSearchStrings).map(s => s.replace(/ /g, '\u00a0')),
        ...Array.from(baseSearchStrings).map(s => s.replace(/\u00a0/g, ' ')),
      ])
    ).filter(s => Boolean(s) && !s.includes('/'));

    const leadPromises: Promise<any>[] = [];
    const companyPromises: Promise<any>[] = [];
    const contactPromises: Promise<any>[] = [];
    const ticketPromises: Promise<any>[] = [];
    const invoicePromises: Promise<any>[] = [];
    const callActivityPromises: { promise: Promise<any>; callId: string; source: 'activity' | 'transcript' | 'unassigned' }[] = [];

    // Direct document ID and internalid lookups
    for (const id of possibleIds) {
      companyPromises.push(db.collection('companies').doc(id).get());
      leadPromises.push(db.collection('leads').doc(id).get());
      companyPromises.push(db.collection('companies').where('internalid', '==', id).limit(10).get());
      leadPromises.push(db.collection('leads').where('internalid', '==', id).limit(10).get());
      companyPromises.push(db.collection('companies').where('internalId', '==', id).limit(10).get());
      leadPromises.push(db.collection('leads').where('internalId', '==', id).limit(10).get());
    }

    // searchKeywords array indexing lookup (Fast candidate retrieval)
    const rawLowerQuery = q.toLowerCase().trim();
    const queryBigrams: string[] = [];
    for (let i = 0; i < queryWords.length - 1; i++) {
      const w1 = queryWords[i];
      const w2 = queryWords[i + 1];
      if (!STOP_WORDS.has(w1) || !STOP_WORDS.has(w2)) {
        queryBigrams.push(`${w1} ${w2}`);
      }
    }

    const nonStopWords = queryWords.filter(w => !STOP_WORDS.has(w) && w.length >= 2).sort((a, b) => b.length - a.length);

    let arrayQueryWords = Array.from(new Set([
      ...queryBigrams,
      ...nonStopWords,
      rawLowerQuery,
    ])).filter(w => w.length >= 2).slice(0, 10);

    if (isEmailDomain && domainQuery) {
      const domainParts = domainQuery.split('.').filter(Boolean);
      const domainRoot = domainParts[0] || domainQuery;
      arrayQueryWords = Array.from(new Set([
        `@${domainQuery}`,
        domainQuery,
        domainRoot,
        `@${domainRoot}`,
        ...domainParts.filter(p => p.length >= 2 && !STOP_WORDS.has(p)),
        ...arrayQueryWords,
      ])).filter(w => w.length >= 2).slice(0, 10);
    } else if (arrayQueryWords.length === 0) {
      arrayQueryWords = queryWords.filter(w => w.length >= 2).slice(0, 10);
    }

    if (arrayQueryWords.length > 0) {
      leadPromises.push(
        db.collection('leads')
          .where('searchKeywords', 'array-contains-any', arrayQueryWords)
          .limit(60)
          .get()
      );
      companyPromises.push(
        db.collection('companies')
          .where('searchKeywords', 'array-contains-any', arrayQueryWords)
          .limit(60)
          .get()
      );

      if (isEmailDomain || type === 'email') {
        contactPromises.push(
          db.collectionGroup('contacts')
            .where('searchKeywords', 'array-contains-any', arrayQueryWords)
            .limit(40)
            .get()
        );
      }
    }

    // 1. Account / Search Strings Queries
    if (type === 'all' || type === 'company' || type === 'id') {
      for (const searchStr of searchStrings) {
        if (type === 'all' || type === 'company') {
          // Company Name prefix
          leadPromises.push(
            db.collection('leads')
              .where('companyName', '>=', searchStr)
              .where('companyName', '<=', searchStr + '\uf8ff')
              .limit(30)
              .get()
          );
          companyPromises.push(
            db.collection('companies')
              .where('companyName', '>=', searchStr)
              .where('companyName', '<=', searchStr + '\uf8ff')
              .limit(30)
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

    // 2. Address Prefix Queries
    if (type === 'all' || type === 'address') {
      for (const searchStr of searchStrings) {
        leadPromises.push(
          db.collection('leads')
            .where('street', '>=', searchStr)
            .where('street', '<=', searchStr + '\uf8ff')
            .limit(40)
            .get()
        );
        leadPromises.push(
          db.collection('leads')
            .where('address1', '>=', searchStr)
            .where('address1', '<=', searchStr + '\uf8ff')
            .limit(40)
            .get()
        );
        leadPromises.push(
          db.collection('leads')
            .where('address.street', '>=', searchStr)
            .where('address.street', '<=', searchStr + '\uf8ff')
            .limit(40)
            .get()
        );

        companyPromises.push(
          db.collection('companies')
            .where('street', '>=', searchStr)
            .where('street', '<=', searchStr + '\uf8ff')
            .limit(40)
            .get()
        );
        companyPromises.push(
          db.collection('companies')
            .where('address1', '>=', searchStr)
            .where('address1', '<=', searchStr + '\uf8ff')
            .limit(40)
            .get()
        );
        companyPromises.push(
          db.collection('companies')
            .where('address.street', '>=', searchStr)
            .where('address.street', '<=', searchStr + '\uf8ff')
            .limit(40)
            .get()
        );
      }
    }

    // 3. Smart Phone Prefix Queries
    if (type === 'all' || type === 'phone') {
      if (digitsOnly.length >= 3) {
        const prefixes = new Set<string>();
        for (const variation of phoneVariations) {
          if (variation.length >= 3) {
            prefixes.add(variation.substring(0, 5));
          }
        }
        for (const prefix of prefixes) {
          leadPromises.push(
            db.collection('leads')
              .where('customerPhone', '>=', prefix)
              .where('customerPhone', '<=', prefix + '\uf8ff')
              .limit(30)
              .get()
          );
          companyPromises.push(
            db.collection('companies')
              .where('customerPhone', '>=', prefix)
              .where('customerPhone', '<=', prefix + '\uf8ff')
              .limit(30)
              .get()
          );
          contactPromises.push(
            db.collectionGroup('contacts')
              .where('phone', '>=', prefix)
              .where('phone', '<=', prefix + '\uf8ff')
              .limit(30)
              .get()
          );
        }
      }
    }

    // 4. Email Queries
    if (type === 'all' || type === 'email') {
      if (isEmail || q.length >= 2) {
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

    // 5. Ticket ID & Ticket Queries
    if (type === 'all' || type === 'ticket') {
      if (q.length >= 2) {
        for (const id of possibleIds) {
          ticketPromises.push(db.collection('tickets').doc(id).get());
          ticketPromises.push(db.collection('tickets').doc(id.toUpperCase()).get());
        }
        for (const searchStr of searchStrings) {
          ticketPromises.push(
            db.collection('tickets')
              .where('ticketNumber', '>=', searchStr.toUpperCase())
              .where('ticketNumber', '<=', searchStr.toUpperCase() + '\uf8ff')
              .limit(20)
              .get()
          );
          ticketPromises.push(
            db.collection('tickets')
              .where('customerCompany', '>=', searchStr)
              .where('customerCompany', '<=', searchStr + '\uf8ff')
              .limit(20)
              .get()
          );
        }
      }
    }

    // 6. Invoice Number / Document ID Queries (subcollection collectionGroup & main doc)
    if (type === 'all' || type === 'id' || type === 'invoice') {
      if (q.length >= 2) {
        const invoiceFields = ['invoiceDocumentID', 'invoiceNum', 'documentId', 'invoiceInternalID', 'tranId', 'tranid', 'number', 'id'];

        for (const id of possibleIds) {
          // Check lastInvoiceNumber on main lead/company docs
          leadPromises.push(db.collection('leads').where('lastInvoiceNumber', '==', id).limit(10).get());
          leadPromises.push(db.collection('leads').where('lastInvoiceNumber', '==', id.toUpperCase()).limit(10).get());
          companyPromises.push(db.collection('companies').where('lastInvoiceNumber', '==', id).limit(10).get());
          companyPromises.push(db.collection('companies').where('lastInvoiceNumber', '==', id.toUpperCase()).limit(10).get());

          // Check subcollection invoices
          for (const field of invoiceFields) {
            invoicePromises.push(
              db.collectionGroup('invoices')
                .where(field, '==', id)
                .limit(10)
                .get()
            );
            invoicePromises.push(
              db.collectionGroup('invoices')
                .where(field, '==', id.toUpperCase())
                .limit(10)
                .get()
            );
          }
        }

        for (const searchStr of searchStrings) {
          if (searchStr.length >= 2) {
            companyPromises.push(
              db.collection('companies')
                .where('lastInvoiceNumber', '>=', searchStr)
                .where('lastInvoiceNumber', '<=', searchStr + '\uf8ff')
                .limit(20)
                .get()
            );
            companyPromises.push(
              db.collection('companies')
                .where('lastInvoiceNumber', '>=', searchStr.toUpperCase())
                .where('lastInvoiceNumber', '<=', searchStr.toUpperCase() + '\uf8ff')
                .limit(20)
                .get()
            );

            for (const field of ['invoiceDocumentID', 'invoiceNum', 'documentId']) {
              invoicePromises.push(
                db.collectionGroup('invoices')
                  .where(field, '>=', searchStr)
                  .where(field, '<=', searchStr + '\uf8ff')
                  .limit(20)
                  .get()
              );
              invoicePromises.push(
                db.collectionGroup('invoices')
                  .where(field, '>=', searchStr.toUpperCase())
                  .where(field, '<=', searchStr.toUpperCase() + '\uf8ff')
                  .limit(20)
                  .get()
              );
            }
          }
        }
      }
    }

    // 7. AirCall Call ID / Activity Queries
    if (type === 'all' || type === 'id' || type === 'aircall') {
      if (q.length >= 2) {
        for (const callId of possibleAircallIds) {
          // Direct document ID lookups for unassigned calls
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

          // Activity subcollection matches across all leads & companies
          callActivityPromises.push({
            promise: db.collectionGroup('activity').where('callId', '==', callId).limit(20).get(),
            callId,
            source: 'activity'
          });
          callActivityPromises.push({
            promise: db.collectionGroup('activity').where('aircallId', '==', callId).limit(20).get(),
            callId,
            source: 'activity'
          });

          // Transcripts subcollection matches
          callActivityPromises.push({
            promise: db.collectionGroup('transcripts').where('callId', '==', callId).limit(20).get(),
            callId,
            source: 'transcript'
          });

          // Numeric queries if applicable
          if (!isNaN(Number(callId))) {
            const numCallId = Number(callId);
            callActivityPromises.push({
              promise: db.collectionGroup('activity').where('callId', '==', numCallId).limit(20).get(),
              callId,
              source: 'activity'
            });
            callActivityPromises.push({
              promise: db.collectionGroup('transcripts').where('callId', '==', numCallId).limit(20).get(),
              callId,
              source: 'transcript'
            });
          }

          // Top-level fields on leads and companies
          leadPromises.push(db.collection('leads').where('callId', '==', callId).limit(10).get());
          leadPromises.push(db.collection('leads').where('aircallId', '==', callId).limit(10).get());
          leadPromises.push(db.collection('leads').where('lastCallId', '==', callId).limit(10).get());
          companyPromises.push(db.collection('companies').where('callId', '==', callId).limit(10).get());
          companyPromises.push(db.collection('companies').where('aircallId', '==', callId).limit(10).get());
          companyPromises.push(db.collection('companies').where('lastCallId', '==', callId).limit(10).get());
        }
      }
    }

    // Resolve all initial queries in parallel using safe resolver
    const [leadSnaps, companySnaps, contactSnaps, ticketSnaps, invoiceSnaps, callSnaps] = await Promise.all([
      safeResolve(leadPromises),
      safeResolve(companyPromises),
      safeResolve(contactPromises),
      safeResolve(ticketPromises),
      safeResolve(invoicePromises),
      Promise.all(
        callActivityPromises.map(item =>
          item.promise
            .then(res => ({ res, callId: item.callId, source: item.source }))
            .catch(err => {
              console.warn('Call activity query failed:', err.message || err);
              return null;
            })
        )
      ),
    ]);

    // Keep track of direct matches
    const rawMatchedDocs = new Map<string, { type: 'lead' | 'company'; data: any; id: string }>();

    for (const snap of leadSnaps) {
      if (snap.exists) {
        rawMatchedDocs.set(`lead-${snap.id}`, { type: 'lead', id: snap.id, data: snap.data() });
      } else if (snap.docs) {
        for (const doc of snap.docs) {
          rawMatchedDocs.set(`lead-${doc.id}`, { type: 'lead', id: doc.id, data: doc.data() });
        }
      }
    }
    for (const snap of companySnaps) {
      if (snap.exists) {
        rawMatchedDocs.set(`company-${snap.id}`, { type: 'company', id: snap.id, data: snap.data() });
      } else if (snap.docs) {
        for (const doc of snap.docs) {
          rawMatchedDocs.set(`company-${doc.id}`, { type: 'company', id: doc.id, data: doc.data() });
        }
      }
    }

    // Fetch parents for matched contacts and invoices with explicit item mapping
    const parentFetchItems: { ref: any; type: 'lead' | 'company'; matchedInvoice?: string; matchedContactEmail?: string }[] = [];

    for (const snap of contactSnaps) {
      if (snap.docs) {
        for (const doc of snap.docs) {
          const cData = doc.data() || {};
          const parentRef = doc.ref.parent.parent;
          if (parentRef) {
            const type = parentRef.path.startsWith('leads') ? 'lead' : 'company';
            const key = `${type}-${parentRef.id}`;
            if (!rawMatchedDocs.has(key)) {
              parentFetchItems.push({ ref: parentRef, type, matchedContactEmail: cData.email });
            } else {
              const existing = rawMatchedDocs.get(key);
              if (existing && existing.data && cData.email) {
                existing.data._matchedContactEmail = cData.email;
              }
            }
          }
        }
      }
    }

    for (const snap of invoiceSnaps) {
      if (snap.docs) {
        for (const doc of snap.docs) {
          const invData = doc.data();
          const invDocId = invData.invoiceDocumentID || invData.invoiceNum || invData.documentId || invData.tranId || invData.tranid || doc.id;
          const parentRef = doc.ref.parent.parent;
          if (parentRef) {
            const type = parentRef.path.startsWith('leads') ? 'lead' : 'company';
            const key = `${type}-${parentRef.id}`;
            if (!rawMatchedDocs.has(key)) {
              parentFetchItems.push({ ref: parentRef, type, matchedInvoice: invDocId });
            } else {
              const existing = rawMatchedDocs.get(key);
              if (existing && existing.data) {
                existing.data._matchedInvoiceNumber = invDocId;
              }
            }
          }
        }
      }
    }

    // Process matched AirCall call activities, transcripts, and unassigned calls
    const callParentFetchItems: { ref: any; type: 'lead' | 'company'; matchedCallId: string; callDetails?: any }[] = [];

    for (const item of (callSnaps || []).filter(Boolean) as any[]) {
      const snap = item.res;
      if (!snap) continue;

      if (item.source === 'unassigned') {
        const docs = snap.docs || (snap.exists ? [snap] : []);
        for (const uDoc of docs) {
          const uData = uDoc.data() || {};
          const callDetails = {
            callId: String(uData.callId || uDoc.id || item.callId),
            date: uData.date || null,
            notes: uData.notes || 'Unassigned AirCall Call',
            duration: uData.duration || null,
            author: uData.author || 'AirCall',
            aircallStatus: uData.aircallStatus || 'unassigned',
            unassigned: true,
          };

          if (Array.isArray(uData.matches)) {
            for (const m of uData.matches) {
              if (m.id && m.type) {
                const colName = m.type.startsWith('lead') ? 'leads' : 'companies';
                const colType = m.type.startsWith('lead') ? 'lead' : 'company';
                callParentFetchItems.push({
                  ref: db.collection(colName).doc(m.id),
                  type: colType,
                  matchedCallId: callDetails.callId,
                  callDetails,
                });
              }
            }
          }

          if (uData.phoneNumber) {
            try {
              const phoneMatches = await findAllLeadsByPhoneNumberServer(uData.phoneNumber);
              for (const pm of phoneMatches) {
                const colName = pm.type;
                const colType = pm.type.startsWith('lead') ? 'lead' : 'company';
                callParentFetchItems.push({
                  ref: db.collection(colName).doc(pm.id),
                  type: colType,
                  matchedCallId: callDetails.callId,
                  callDetails,
                });
              }
            } catch (pErr) {
              console.warn('Error matching phone in unassigned call:', pErr);
            }
          }
        }
      } else {
        // Activity or Transcripts subcollection
        const docs = snap.docs || (snap.exists ? [snap] : []);
        for (const doc of docs) {
          const actData = doc.data() || {};
          const parentRef = doc.ref.parent.parent;
          if (parentRef) {
            const colType = parentRef.path.startsWith('leads') ? 'lead' : 'company';
            const key = `${colType}-${parentRef.id}`;
            const callDetails = {
              callId: String(actData.callId || item.callId),
              date: actData.date || null,
              notes: actData.notes || (item.source === 'transcript' ? 'AirCall Transcript available' : 'AirCall Call Record'),
              duration: actData.duration || null,
              author: actData.author || '',
              aircallStatus: actData.aircallStatus || '',
              recordingUrl: actData.recordingUrl || null,
            };

            if (!rawMatchedDocs.has(key)) {
              callParentFetchItems.push({
                ref: parentRef,
                type: colType,
                matchedCallId: callDetails.callId,
                callDetails,
              });
            } else {
              const existing = rawMatchedDocs.get(key);
              if (existing && existing.data) {
                existing.data._matchedCallId = callDetails.callId;
                existing.data._matchedCallDetails = callDetails;
              }
            }
          }
        }
      }
    }

    // Live AirCall API fallback if no local call record was linked yet
    const shouldTryAirCallApi = (type === 'aircall' || (type === 'all' && callParentFetchItems.length === 0)) && possibleAircallIds.length > 0;
    if (shouldTryAirCallApi) {
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
                const callDetails = {
                  callId: String(callObj.id || cId),
                  date: callObj.started_at ? new Date(callObj.started_at * 1000).toISOString() : (callObj.created_at ? new Date(callObj.created_at * 1000).toISOString() : null),
                  notes: callObj.note || `AirCall ${callObj.direction || ''} call`,
                  duration: formatDuration(callObj.duration || 0),
                  author: callObj.user?.name || 'Aircall',
                  aircallStatus: callObj.status || '',
                  recordingUrl: callObj.recording || null,
                };
                if (phone) {
                  const phoneMatches = await findAllLeadsByPhoneNumberServer(phone);
                  for (const pm of phoneMatches) {
                    const colName = pm.type;
                    const colType = pm.type.startsWith('lead') ? 'lead' : 'company';
                    callParentFetchItems.push({
                      ref: db.collection(colName).doc(pm.id),
                      type: colType,
                      matchedCallId: String(cId),
                      callDetails,
                    });
                  }
                }
              }
            } catch (aircallErr) {
              console.warn('[AirCall API Lookup] Error fetching call by ID:', aircallErr);
            }
          }
        }
      }
    }

    if (parentFetchItems.length > 0) {
      const parentSnaps = await Promise.all(
        parentFetchItems.map(item =>
          item.ref.get().catch((err: any) => {
            console.warn('Failed fetching parent doc for contact/invoice:', err);
            return null;
          })
        )
      );

      parentSnaps.forEach((snap, idx) => {
        if (snap && snap.exists) {
          const item = parentFetchItems[idx];
          const data = snap.data() || {};
          if (item.matchedInvoice) {
            data._matchedInvoiceNumber = item.matchedInvoice;
          }
          if (item.matchedContactEmail) {
            data._matchedContactEmail = item.matchedContactEmail;
          }
          rawMatchedDocs.set(`${item.type}-${snap.id}`, { type: item.type, id: snap.id, data });
        }
      });
    }

    if (callParentFetchItems.length > 0) {
      const callParentSnaps = await Promise.all(
        callParentFetchItems.map(item =>
          item.ref.get().catch((err: any) => {
            console.warn('Failed fetching parent doc for call:', err);
            return null;
          })
        )
      );

      callParentSnaps.forEach((snap, idx) => {
        if (snap && snap.exists) {
          const item = callParentFetchItems[idx];
          const data = snap.data() || {};
          data._matchedCallId = item.matchedCallId;
          if (item.callDetails) {
            data._matchedCallDetails = item.callDetails;
          }
          rawMatchedDocs.set(`${item.type}-${snap.id}`, { type: item.type, id: snap.id, data });
        }
      });
    }

    // Robust post-filtering: Ensure EVERY word in query matches across searchable fields of the document
    const matchedDocs = new Map<string, { type: 'lead' | 'company'; data: any; id: string }>();
    for (const [key, item] of rawMatchedDocs.entries()) {
      const data = item.data;

      // Direct ID or URL extracted ID match check
      const isDirectIdMatch = possibleIds.some(id =>
        item.id.toLowerCase() === id.toLowerCase() ||
        String(data.internalid || '').toLowerCase() === id.toLowerCase() ||
        String(data.internalId || '').toLowerCase() === id.toLowerCase() ||
        String(data.prospectPlusId || '').toLowerCase() === id.toLowerCase() ||
        String(data.entityId || data.customerEntityId || '').toLowerCase() === id.toLowerCase() ||
        String(data._matchedInvoiceNumber || '').toLowerCase() === id.toLowerCase() ||
        String(data.lastInvoiceNumber || '').toLowerCase() === id.toLowerCase() ||
        String(data._matchedCallId || '').toLowerCase() === id.toLowerCase() ||
        String(data.callId || '').toLowerCase() === id.toLowerCase() ||
        String(data.aircallId || '').toLowerCase() === id.toLowerCase()
      );

      if (isDirectIdMatch) {
        (item as any).score = 100;
        matchedDocs.set(key, item);
        continue;
      }

      const companyNameStr = (data.companyName || '').toLowerCase();
      const prospectPlusIdStr = (data.prospectPlusId || '').toLowerCase();
      const entityIdStr = (data.entityId || data.customerEntityId || '').toLowerCase();
      const emailFieldStr = (data.customerServiceEmail || data.email || '').toLowerCase();
      const phoneFieldStr = (data.customerPhone || data.phone || '').toString();
      const phoneDigits = phoneFieldStr.replace(/\D/g, '');

      const matchedInvoiceStr = (data._matchedInvoiceNumber || '').toLowerCase();
      const lastInvoiceNumberStr = (data.lastInvoiceNumber || '').toLowerCase();

      // Collect all possible emails attached to this record
      const docEmails: string[] = [
        data.customerServiceEmail,
        data.email,
        data.contactEmail,
        data.billingEmail,
        data.accountsEmail,
        data._matchedContactEmail,
      ].filter(Boolean).map(e => String(e).toLowerCase().trim());

      if (Array.isArray(data.contacts)) {
        data.contacts.forEach((c: any) => {
          if (c && c.email) docEmails.push(String(c.email).toLowerCase().trim());
        });
      }

      const resolvedAddr = resolveAddress(data);
      const addressStr = resolvedAddr
        ? `${resolvedAddr.address1} ${resolvedAddr.street} ${resolvedAddr.city} ${resolvedAddr.state} ${resolvedAddr.zip}`.toLowerCase()
        : '';

      const fullCombinedStr = `${companyNameStr} ${prospectPlusIdStr} ${entityIdStr} ${emailFieldStr} ${docEmails.join(' ')} ${addressStr} ${phoneFieldStr} ${phoneDigits} ${matchedInvoiceStr} ${lastInvoiceNumberStr}`.toLowerCase();

      const checkWords = significantQueryWords.length > 0 ? significantQueryWords : queryWords;

      // Handle Email Domain search (@domain.com.au or @domain)
      if (isEmailDomain) {
        const matchesDomain = docEmails.some(e => {
          if (e.endsWith(`@${domainQuery}`) || e === domainQuery || e === `@${domainQuery}`) return true;
          if (e.includes(`@${domainQuery}`) || (domainQuery.includes('.') && e.endsWith(domainQuery))) return true;
          const root = domainQuery.split('.')[0];
          if (root && root.length >= 3 && (e.includes(`@${root}.`) || e.includes(`@${root}`))) return true;
          return false;
        });
        if (!matchesDomain) continue;
      } else if (type === 'company') {
        const matches = checkWords.every(w => companyNameStr.includes(w));
        if (!matches) continue;
      } else if (type === 'id') {
        const matches = queryWords.every(w => {
          const cleanW = w.replace(/^inv/i, '');
          return prospectPlusIdStr.includes(w) || entityIdStr.includes(w) || matchedInvoiceStr.includes(w) || (cleanW.length >= 2 && matchedInvoiceStr.includes(cleanW)) || lastInvoiceNumberStr.includes(w) || (cleanW.length >= 2 && lastInvoiceNumberStr.includes(cleanW));
        });
        if (!matches) continue;
      } else if (type === 'invoice') {
        const matches = queryWords.every(w => {
          const cleanW = w.replace(/^inv/i, '');
          return matchedInvoiceStr.includes(w) || (cleanW.length >= 2 && matchedInvoiceStr.includes(cleanW)) || lastInvoiceNumberStr.includes(w) || (cleanW.length >= 2 && lastInvoiceNumberStr.includes(cleanW));
        });
        if (!matches) continue;
      } else if (type === 'aircall') {
        const matchesCall = possibleAircallIds.some(cId => {
          const clean = cId.toLowerCase().trim();
          return (
            String(data._matchedCallId || '').toLowerCase() === clean ||
            String(data.callId || '').toLowerCase() === clean ||
            String(data.aircallId || '').toLowerCase() === clean ||
            String(data.aircallCallId || '').toLowerCase() === clean ||
            String(data.lastCallId || '').toLowerCase() === clean
          );
        });
        if (!matchesCall) continue;
      } else if (type === 'address') {
        const matches = queryWords.every(w => addressStr.includes(w));
        if (!matches) continue;
      } else if (type === 'email') {
        const matches = docEmails.some(e => {
          if (domainQuery) {
            if (e.endsWith(`@${domainQuery}`) || e.includes(`@${domainQuery}`)) return true;
          }
          return queryWords.every(w => e.includes(w));
        }) || queryWords.every(w => emailFieldStr.includes(w));
        if (!matches) continue;
      } else if (type === 'phone') {
        if (digitsOnly.length >= 3) {
          const matchesPhone = phoneVariations.some(v => {
            const vDigits = v.replace(/\D/g, '');
            return phoneDigits.includes(vDigits) || vDigits.includes(phoneDigits);
          });
          if (!matchesPhone) continue;
        } else {
          const matches = queryWords.every(w => phoneFieldStr.includes(w));
          if (!matches) continue;
        }
      } else {
        // 'all' type: every significant query word must appear somewhere in the combined document text
        const matches = checkWords.every(w => {
          const cleanW = w.replace(/^inv/i, '');
          return fullCombinedStr.includes(w) || (cleanW.length >= 2 && fullCombinedStr.includes(cleanW)) || (digitsOnly.length >= 3 && phoneDigits.includes(w));
        });
        if (!matches) continue;
      }

      const score = scoreSearchResult(item, queryWords, q, possibleIds);
      (item as any).score = score;

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
          let siblingItems = groupItemsMap.get(parentId) || [];
          if (isFranchisee) {
            siblingItems = siblingItems.filter(i => matchesUserFranchisee(i.data));
          }

          if (siblingItems.length > 0) {
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
                lastInvoiceNumber: site.data.lastInvoiceNumber || site.data._matchedInvoiceNumber || null,
                matchedCallId: site.data._matchedCallId || site.data.callId || site.data.aircallId || null,
                matchedCallDetails: site.data._matchedCallDetails || null,
               }))
            });
          }
        }
      } else {
        // Individual item with no group/parent
        if (isFranchisee && !matchesUserFranchisee(item.data)) {
          continue;
        }
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
          lastInvoiceNumber: item.data.lastInvoiceNumber || item.data._matchedInvoiceNumber || null,
          matchedCallId: item.data._matchedCallId || item.data.callId || item.data.aircallId || null,
          matchedCallDetails: item.data._matchedCallDetails || null,
          score: (item as any).score || 0,
        });
      }
    }

    // Sort individual items by relevance score
    individualItems.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Collect all company IDs and Prospect+ IDs for deduplication (prefer companies over leads when Prospect+ IDs match)
    const companyIdsSet = new Set<string>();
    const getDocIds = (doc: any) => {
      const ids = new Set<string>();
      if (doc.id) ids.add(String(doc.id).toLowerCase().trim());
      if (doc.prospectPlusId) ids.add(String(doc.prospectPlusId).toLowerCase().trim());
      if (doc.entityId) ids.add(String(doc.entityId).toLowerCase().trim());
      return ids;
    };

    individualItems.forEach(item => {
      if (item.type === 'company') {
        getDocIds(item).forEach(id => companyIdsSet.add(id));
      }
    });

    for (const [key, item] of matchedDocs.entries()) {
      if (item.type === 'company') {
        const ids = getDocIds({ id: item.id, ...item.data });
        ids.forEach(id => companyIdsSet.add(id));
      }
    }

    const deduplicatedIndividualItems = individualItems.filter(item => {
      if (item.type !== 'lead') return true;
      const leadIds = getDocIds(item);
      for (const id of leadIds) {
        if (companyIdsSet.has(id)) {
          return false; // Omit lead if company with same Prospect+ ID / doc ID exists
        }
      }
      return true;
    });

    // Process matched tickets
    const ticketItems: any[] = [];
    const seenTicketIds = new Set<string>();

    for (const snap of ticketSnaps) {
      const processTicketDoc = (id: string, data: any) => {
        if (!data || seenTicketIds.has(id)) return;
        if (isFranchisee && !matchesUserFranchisee(data)) return;

        const ticketNumberStr = String(data.ticketNumber || id).toLowerCase();
        const companyStr = String(data.customerCompany || data.customerName || '').toLowerCase();
        const enquiryStr = String(typeof data.enquiryType === 'string' ? data.enquiryType : (data.enquiryType?.label || data.enquiryType?.name || '')).toLowerCase();
        const combinedTicket = `${ticketNumberStr} ${companyStr} ${enquiryStr}`;

        if (type === 'ticket') {
          if (!queryWords.every(w => ticketNumberStr.includes(w))) return;
        } else if (type === 'company') {
          if (!queryWords.every(w => companyStr.includes(w))) return;
        } else if (type === 'all') {
          if (!queryWords.every(w => combinedTicket.includes(w))) return;
        } else {
          return;
        }

        seenTicketIds.add(id);
        ticketItems.push({
          id,
          ticketNumber: data.ticketNumber || id,
          enquiryType: data.enquiryType || 'Other',
          status: data.status || 'Open',
          priority: data.priority || 'Standard',
          companyName: data.customerCompany || data.customerName || 'Unknown Company',
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null
        });
      };

      if (snap.exists) {
        processTicketDoc(snap.id, snap.data());
      } else if (snap.docs) {
        for (const doc of snap.docs) {
          processTicketDoc(doc.id, doc.data());
        }
      }
    }

    return NextResponse.json({
      groups,
      individuals: deduplicatedIndividualItems,
      tickets: ticketItems
    });
  } catch (error: any) {
    console.error('API account-lookup error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
