import { adminApp } from '../src/lib/firebase-admin';
import fetch from 'node-fetch';

const db = adminApp.firestore();

const API_URL = 'https://app.mailplus.com.au/api/v2/leads';
const API_KEY = process.env.RTA_GENERAL_API_KEY || process.env.MAILPLUS_GENERAL_API_KEY || '708aa067-d67d-73e6-8967-66786247f5d7';
const BATCH_SIZE = 50;

function formatFieldValue(val: any): any {
  if (val && typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      return val.toDate().toISOString();
    }
    if (val instanceof Date) {
      return val.toISOString();
    }
    if (Array.isArray(val)) {
      return val.map(formatFieldValue);
    }
    const formattedObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      formattedObj[k] = formatFieldValue(v);
    }
    return formattedObj;
  }
  return val;
}

async function syncLeads() {
  console.log('--- Starting Sync of Leads to MailPlus API v2 ---');
  console.log(`Endpoint: ${API_URL}`);

  const snapshot = await db.collection('leads').get();
  console.log(`Total documents in leads collection: ${snapshot.size}`);

  const numericDocs: Record<string, any>[] = [];

  for (const docSnap of snapshot.docs) {
    const docId = docSnap.id;
    // Check if the document ID is numeric
    if (/^\d+$/.test(docId)) {
      const data = docSnap.data();
      const leadPayload: Record<string, any> = {
        "Document ID": Number(docId)
      };

      for (const [key, val] of Object.entries(data)) {
        leadPayload[key] = formatFieldValue(val);
      }

      numericDocs.push(leadPayload);
    }
  }

  console.log(`Found ${numericDocs.length} lead documents with numeric Document IDs.`);

  if (numericDocs.length === 0) {
    console.log('No numeric lead documents found to sync.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < numericDocs.length; i += BATCH_SIZE) {
    const batch = numericDocs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(numericDocs.length / BATCH_SIZE);

    console.log(`\nSending batch ${batchNum}/${totalBatches} (${batch.length} leads)...`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'GENERAL_API_KEY': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batch)
      });

      if (response.ok) {
        let result: any = {};
        try {
          result = await response.json();
        } catch (e) {
          // ignore non-json
        }
        successCount += batch.length;
        console.log(`Batch ${batchNum} successfully synced. HTTP ${response.status}`, result);
      } else {
        const errorText = await response.text();
        failCount += batch.length;
        console.error(`Batch ${batchNum} failed. HTTP ${response.status}: ${errorText}`);
      }
    } catch (err: any) {
      failCount += batch.length;
      console.error(`Batch ${batchNum} error:`, err.message || err);
    }
  }

  console.log('\n--- Sync Finished Summary ---');
  console.log(`Total Numeric Leads: ${numericDocs.length}`);
  console.log(`Successfully Synced: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

syncLeads().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
