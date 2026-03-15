
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { Activity, Lead, Transcript, UserProfile } from '@/lib/types';

const db = getFirestore(adminApp);

/**
 * Standardizes phone numbers into multiple Australian variations for matching.
 */
function getPhoneVariations(phoneNumber: string): string[] {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    const variations = new Set<string>();

    if (!digits) return [];

    // Base variation (pure digits)
    variations.add(digits);
    variations.add(`+${digits}`);

    // Australian specific logic
    if (digits.startsWith('61')) {
        const localPart = digits.substring(2);
        variations.add(`0${localPart}`); // 0490...
        variations.add(localPart);       // 490...
    } else if (digits.startsWith('0')) {
        const localPart = digits.substring(1);
        variations.add(`61${localPart}`); // 61490...
        variations.add(`+61${localPart}`); // +61490...
        variations.add(localPart);        // 490...
    } else {
        // Assume it's a mobile without leading 0 or 61
        variations.add(`0${digits}`);
        variations.add(`61${digits}`);
        variations.add(`+61${digits}`);
    }

    // Add common formatting if necessary (though digits are best for DB)
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
        date: activity.date || new Date().toISOString(),
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
        date: transcript.date || new Date().toISOString()
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
