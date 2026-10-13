/**
 * @fileoverview Cloud Functions for automated and on-demand Firestore database exports to Google Cloud Storage.
 */

import * as functions from 'firebase-functions/v1';
import { v1 } from '@google-cloud/firestore';

const client = new v1.FirestoreAdminClient();

// Target destination bucket created for backups
const DEFAULT_BACKUP_BUCKET = 'gs://mailplus-crm-firestore-backups';

/**
 * Triggers a native Firestore export operation to Cloud Storage.
 *
 * @param tag An identifier prefix (e.g., 'daily', 'manual')
 * @returns Object containing the operation details and destination URI
 */
async function executeFirestoreExport(tag: string = 'scheduled') {
  const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'mailplus-outbound-leads-crm';
  const databaseName = client.databasePath(projectId, '(default)');
  const backupBucket = process.env.BACKUP_BUCKET || DEFAULT_BACKUP_BUCKET;

  // Format folder timestamp: YYYY-MM-DDTHH-mm-ss
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputUriPrefix = `${backupBucket}/exports/${tag}-${timestamp}`;

  functions.logger.info(`Initiating Firestore export for ${databaseName} to ${outputUriPrefix}...`);

  const [response] = await client.exportDocuments({
    name: databaseName,
    outputUriPrefix: outputUriPrefix,
    collectionIds: [], // Empty array exports all collections
  });

  functions.logger.info(`Firestore export successfully launched. Operation name: ${response.name}`);

  return {
    operationName: response.name,
    outputUriPrefix,
    databaseName,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Scheduled Cloud Function that runs every day at 02:00 AM Sydney Time (AEST/AEDT).
 */
export const scheduledFirestoreExport = functions
  .region('australia-southeast1')
  .runWith({ memory: '512MB', timeoutSeconds: 300 })
  .pubsub.schedule('0 2 * * *')
  .timeZone('Australia/Sydney')
  .onRun(async (context) => {
    functions.logger.info('Executing scheduledFirestoreExport daily cron...');
    try {
      const result = await executeFirestoreExport('daily');
      functions.logger.info('Daily Firestore backup initiated successfully:', result);
      return result;
    } catch (err: any) {
      functions.logger.error('CRITICAL: Daily Firestore backup export failed:', err);
      throw err;
    }
  });

/**
 * HTTPS endpoint to trigger an instant backup on-demand (e.g. before deployments or schema migrations).
 */
export const triggerManualFirestoreBackup = functions
  .region('australia-southeast1')
  .runWith({ memory: '512MB', timeoutSeconds: 300 })
  .https.onRequest(async (req, res) => {
    // Only accept GET or POST
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed. Use GET or POST.' });
      return;
    }

    try {
      const result = await executeFirestoreExport('manual');
      res.status(200).json({
        success: true,
        message: 'Manual Firestore export operation successfully initiated.',
        ...result,
      });
    } catch (err: any) {
      functions.logger.error('Manual Firestore backup trigger failed:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Unknown error occurred during Firestore export.',
      });
    }
  });
