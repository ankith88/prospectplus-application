
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { Activity, Lead, Transcript, UserProfile, EmailRecord } from '@/lib/types';
import { getSydneyISOString } from '@/lib/utils';

const db = getFirestore(adminApp);

/**
 * Standardizes phone numbers into multiple Australian variations for matching.
 */
function getPhoneVariations(phoneNumber: string): string[] {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    const variations = new Set<string>();

    if (!digits) return [];

    // Base variations
    variations.add(digits);
    variations.add(`+${digits}`);

    // Standardize to local 10-digit (e.g., starting with 0)
    let local10 = '';
    if (digits.length === 10 && digits.startsWith('0')) {
        local10 = digits;
    } else if (digits.length === 11 && digits.startsWith('61')) {
        local10 = `0${digits.substring(2)}`;
    } else if (digits.length === 9 && !digits.startsWith('0')) {
        local10 = `0${digits}`;
    }

    if (local10) {
        variations.add(local10);
        const withoutLeadingZero = local10.substring(1);
        variations.add(withoutLeadingZero);
        variations.add(`61${withoutLeadingZero}`);
        variations.add(`+61${withoutLeadingZero}`);

        // Generate spaced variations
        if (local10.startsWith('04')) {
            // Mobile formatting: "04XX XXX XXX" -> "0490 048 801"
            variations.add(`${local10.substring(0, 4)} ${local10.substring(4, 7)} ${local10.substring(7)}`);
            // Mobile formatting: "04XX-XXX-XXX"
            variations.add(`${local10.substring(0, 4)}-${local10.substring(4, 7)}-${local10.substring(7)}`);
        } else {
            // Landline formatting: "02 XXXX XXXX" -> "02 8359 9676"
            variations.add(`${local10.substring(0, 2)} ${local10.substring(2, 6)} ${local10.substring(6)}`);
            // Landline formatting: "(02) XXXX XXXX" -> "(02) 8359 9676"
            variations.add(`(${local10.substring(0, 2)}) ${local10.substring(2, 6)} ${local10.substring(6)}`);
            // Landline formatting: "(02)XXXXXXXX" -> "(02)83599676"
            variations.add(`(${local10.substring(0, 2)})${local10.substring(2)}`);
        }

        // Add variations with standard country code spaces
        const localPart = local10.substring(1);
        if (local10.startsWith('04')) {
            variations.add(`+61 ${localPart.substring(0, 3)} ${localPart.substring(3, 6)} ${localPart.substring(6)}`); // +61 490 048 801
            variations.add(`61 ${localPart.substring(0, 3)} ${localPart.substring(3, 6)} ${localPart.substring(6)}`);  // 61 490 048 801
        } else {
            variations.add(`+61 ${localPart.substring(0, 1)} ${localPart.substring(1, 5)} ${localPart.substring(5)}`); // +61 2 8359 9676
            variations.add(`61 ${localPart.substring(0, 1)} ${localPart.substring(1, 5)} ${localPart.substring(5)}`);  // 61 2 8359 9676
        }
    }

    // Add raw inputs
    variations.add(phoneNumber.trim());

    return Array.from(variations);
}

/**
 * Finds a lead or company by phone number searching leads, companies, and contacts.
 */
export async function findLeadByPhoneNumberServer(phoneNumber: string): Promise<{ id: string, type: 'leads' | 'companies' } | null> {
    console.log(`[Phone Match] Searching for: ${phoneNumber}`);
    const variations = getPhoneVariations(phoneNumber);
    console.log(`[Phone Match] Trying variations: ${variations.join(', ')}`);

    const collections = ['leads', 'companies'];

    // 1. Search top-level collections
    for (const colName of collections) {
        for (const num of variations) {
            const snap = await db.collection(colName).where('customerPhone', '==', num).limit(1).get();
            if (!snap.empty) {
                console.log(`[Phone Match] Found match in ${colName}: ${snap.docs[0].id}`);
                return { id: snap.docs[0].id, type: colName as any };
            }
        }
    }

    // 2. Search all contacts sub-collections using collectionGroup
    // This catches numbers stored under individual contact persons
    console.log(`[Phone Match] Searching in contacts sub-collections...`);
    for (const num of variations) {
        const contactsSnap = await db.collectionGroup('contacts').where('phone', '==', num).limit(1).get();
        if (!contactsSnap.empty) {
            const contactDoc = contactsSnap.docs[0];
            const parentRef = contactDoc.ref.parent.parent;
            if (parentRef) {
                // Determine if parent is leads or companies
                const collectionType = parentRef.parent?.id as 'leads' | 'companies';
                console.log(`[Phone Match] Found match via contact in ${collectionType}: ${parentRef.id}`);
                return { id: parentRef.id, type: collectionType };
            }
        }
    }

    console.log(`[Phone Match] No match found for ${phoneNumber}`);
    return null;
}

/**
 * Finds all leads or companies by phone number, searching leads, companies, and contacts.
 */
export async function findAllLeadsByPhoneNumberServer(phoneNumber: string): Promise<{ id: string, type: 'leads' | 'companies' }[]> {
    console.log(`[Phone Match] Searching all for: ${phoneNumber}`);
    const variations = getPhoneVariations(phoneNumber);
    const results: { id: string, type: 'leads' | 'companies' }[] = [];
    const seen = new Set<string>();

    const collections = ['leads', 'companies'];

    // 1. Search top-level collections
    for (const colName of collections) {
        for (const num of variations) {
            const snap = await db.collection(colName).where('customerPhone', '==', num).get();
            snap.forEach(doc => {
                const key = `${colName}/${doc.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ id: doc.id, type: colName as any });
                }
            });
        }
    }

    // 2. Search all contacts sub-collections using collectionGroup
    for (const num of variations) {
        const contactsSnap = await db.collectionGroup('contacts').where('phone', '==', num).get();
        contactsSnap.forEach(contactDoc => {
            const parentRef = contactDoc.ref.parent.parent;
            if (parentRef) {
                const collectionType = parentRef.parent?.id as 'leads' | 'companies';
                const key = `${collectionType}/${parentRef.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ id: parentRef.id, type: collectionType });
                }
            }
        });
    }

    return results;
}

/**
 * Checks if a call activity already exists by callId.
 */
export async function findActivityByCallIdServer(leadId: string, collectionType: 'leads' | 'companies', callId: string) {
    const snap = await db.collection(collectionType).doc(leadId).collection('activity').where('callId', '==', callId).limit(1).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Logs or updates a call activity.
 */
export async function logActivityServer(leadId: string, collectionType: 'leads' | 'companies', activity: Partial<Activity>) {
    const activityRef = db.collection(collectionType).doc(leadId).collection('activity');
    const data = {
        ...activity,
        date: activity.date || getSydneyISOString(),
        type: activity.type || 'Call'
    };
    
    if (activity.callId) {
        const existing = await findActivityByCallIdServer(leadId, collectionType, activity.callId);
        if (existing) {
            await activityRef.doc(existing.id).update(data);
            return existing.id;
        }
    }
    
    const docRef = await activityRef.add(data);
    return docRef.id;
}

/**
 * Logs a transcript activity.
 */
export async function logTranscriptActivityServer(leadId: string, collectionType: 'leads' | 'companies', transcript: Partial<Transcript>) {
    const ref = db.collection(collectionType).doc(leadId).collection('transcripts');
    const snap = await ref.where('callId', '==', transcript.callId).limit(1).get();
    
    const data = {
        ...transcript,
        date: transcript.date || getSydneyISOString()
    };

    if (!snap.empty) {
        await ref.doc(snap.docs[0].id).update(data);
        return snap.docs[0].id;
    }

    const docRef = await ref.add(data);
    return docRef.id;
}

/**
 * Creates a real-time notification for a specific user.
 */
export async function createUserNotificationServer(userEmail: string, notification: { title: string, message: string, type: 'call_sync' | 'transcript_sync', callId?: string }) {
    try {
        const usersSnap = await db.collection('users').where('email', '==', userEmail).limit(1).get();
        if (usersSnap.empty) {
            console.warn(`[Notification] Could not find user with email ${userEmail} to send notification.`);
            return;
        }

        const userDoc = usersSnap.docs[0];
        // We write to a notifications subcollection which the client component listens to
        await userDoc.ref.collection('notifications').add({
            ...notification,
            createdAt: new Date().toISOString(),
            isRead: false
        });
        console.log(`[Notification] Created ${notification.type} notification for ${userEmail}`);
    } catch (error) {
        console.error(`[Notification Error]`, error);
    }
}

/**
 * Logs an email record to the new emails subcollection.
 */
export async function logEmailServer(leadId: string, emailData: Partial<EmailRecord>, collectionType: 'leads' | 'companies' | 'franchisees' = 'leads') {
    const emailRef = db.collection(collectionType).doc(leadId).collection('emails');
    const data = {
        ...emailData,
        sentAt: emailData.sentAt || new Date().toISOString(),
    };
    const docRef = await emailRef.add(data);
    return docRef.id;
}

/**
 * Fetches a lead by ID on the server.
 */
export async function getLeadServer(leadId: string): Promise<Lead | null> {
    const snap = await db.collection('leads').doc(leadId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Lead;
}

/**
 * Fetches a franchisee email by its name.
 */
export async function getFranchiseeEmailServer(franchiseeName: string): Promise<string | null> {
    const snap = await db.collection('franchisees').where('name', '==', franchiseeName).limit(1).get();
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return data.email || null;
}

/**
 * Duplicates a lead document and all its subcollections into the companies collection on the server.
 */
export async function duplicateLeadToCompaniesServer(leadId: string): Promise<void> {
    try {
        const leadRef = db.collection('leads').doc(leadId);
        const leadSnap = await leadRef.get();
        if (!leadSnap.exists) {
            console.error(`[Server] Lead with ID ${leadId} not found for duplication.`);
            return;
        }

        const leadData = leadSnap.data();
        const companyRef = db.collection('companies').doc(leadId);
        await companyRef.set(leadData || {});

        const collections = await leadRef.listCollections();

        for (const subRef of collections) {
            const subName = subRef.id;
            const sourceSnap = await subRef.get();
            if (!sourceSnap.empty) {
                const batch = db.batch();
                sourceSnap.docs.forEach(docSnap => {
                    const destDocRef = db.collection('companies').doc(leadId).collection(subName).doc(docSnap.id);
                    batch.set(destDocRef, docSnap.data());
                });
                await batch.commit();
            }
        }
        console.log(`[Server] Successfully duplicated lead ${leadId} and all subcollections to companies collection.`);
    } catch (error) {
        console.error('[Server] Error duplicating lead to companies:', error);
        throw error;
    }
}

export { db as adminDb };
