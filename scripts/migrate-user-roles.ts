import { adminApp } from '../src/lib/firebase-admin';
import * as admin from 'firebase-admin';

async function migrateRoles() {
    const db = adminApp.firestore();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    let migrated = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.role) {
            // Update the document to the new schema
            batch.update(doc.ref, {
                assignedRoles: [data.role],
                defaultRole: data.role,
                role: admin.firestore.FieldValue.delete()
            });
            migrated++;
        }
    });

    if (migrated > 0) {
        await batch.commit();
        console.log(`Successfully migrated ${migrated} users.`);
    } else {
        console.log('No users found requiring migration.');
    }
}

migrateRoles().catch(console.error);
