import { Firestore as GoogleFirestore } from '@google-cloud/firestore';

/**
 * Returns a Google Firestore instance targeting project 'mp-lpo-connect', database 'lpoconnect'.
 * Checks for explicit environment service account credentials (LPO_CONNECT_SERVICE_ACCOUNT_KEY or 
 * LPO_CONNECT_CLIENT_EMAIL + LPO_CONNECT_PRIVATE_KEY) to support cross-project GCP access in App Hosting.
 */
export function getLpoConnectDb(): GoogleFirestore {
  const serviceAccountJson = process.env.LPO_CONNECT_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const clientEmail = process.env.LPO_CONNECT_CLIENT_EMAIL;
  const privateKey = process.env.LPO_CONNECT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      return new GoogleFirestore({
        projectId: 'mp-lpo-connect',
        databaseId: 'lpoconnect',
        credentials: {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        },
      });
    } catch (e) {
      console.warn('[LPO Connect DB] Failed to parse serviceAccountJson:', e);
    }
  }

  if (clientEmail && privateKey) {
    return new GoogleFirestore({
      projectId: 'mp-lpo-connect',
      databaseId: 'lpoconnect',
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }

  return new GoogleFirestore({
    projectId: 'mp-lpo-connect',
    databaseId: 'lpoconnect',
  });
}
