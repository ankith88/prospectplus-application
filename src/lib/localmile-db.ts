import { Firestore } from '@google-cloud/firestore';

let localMilePlusDbInstance: Firestore | null = null;

/**
 * Returns a Google Firestore instance targeting project 'localmile-plus' (default database).
 * Checks for explicit environment service account credentials if configured,
 * otherwise defaults to standard Application Default Credentials (ADC).
 */
export function getLocalMilePlusDb(): Firestore {
  if (localMilePlusDbInstance) return localMilePlusDbInstance;

  const serviceAccountJson = process.env.LOCALMILE_SERVICE_ACCOUNT_KEY || process.env.LPO_CONNECT_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const clientEmail = process.env.LOCALMILE_CLIENT_EMAIL || process.env.LPO_CONNECT_CLIENT_EMAIL;
  const privateKey = (process.env.LOCALMILE_PRIVATE_KEY || process.env.LPO_CONNECT_PRIVATE_KEY)?.replace(/\\n/g, '\n');

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      localMilePlusDbInstance = new Firestore({
        projectId: 'localmile-plus',
        credentials: {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        },
      });
      return localMilePlusDbInstance;
    } catch (e) {
      console.warn('[LocalMile Plus DB] Failed to parse serviceAccountJson:', e);
    }
  }

  if (clientEmail && privateKey) {
    localMilePlusDbInstance = new Firestore({
      projectId: 'localmile-plus',
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
    return localMilePlusDbInstance;
  }

  localMilePlusDbInstance = new Firestore({
    projectId: 'localmile-plus',
  });
  return localMilePlusDbInstance;
}

/**
 * Checks if a company document exists in the LocalMile application database (companies collection in localmile-plus project).
 * Supports polling retries to accommodate asynchronous company creation in NetSuite during signup flows.
 *
 * @param companyId The NetSuite / ProspectPlus Lead or Company ID
 * @param maxRetries Maximum number of check attempts (default: 1)
 * @param delayMs Delay in milliseconds between retry attempts (default: 1000ms)
 */
export async function checkLocalMileCompanyExists(
  companyId: string,
  maxRetries: number = 1,
  delayMs: number = 1000
): Promise<boolean> {
  if (!companyId) return false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const db = getLocalMilePlusDb();
      const snap = await db.collection('companies').doc(companyId).get();
      if (snap.exists) {
        if (attempt > 1) {
          console.log(`[LocalMile DB Check] Company ${companyId} found on attempt ${attempt}/${maxRetries}.`);
        }
        return true;
      }
    } catch (error) {
      console.error(`[LocalMile DB Check Error] Attempt ${attempt}/${maxRetries} failed for company ${companyId}:`, error);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.warn(`[LocalMile DB Check] Company ${companyId} does not exist in LocalMile application database (companies collection) after ${maxRetries} attempt(s).`);
  return false;
}
