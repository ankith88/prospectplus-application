import { firestore } from '../src/lib/firebase.js';
import { collectionGroup, getDocs } from 'firebase/firestore';

async function runReport() {
  console.log("Starting Invoice Collection Group Audit...\n");

  try {
    const snap = await getDocs(collectionGroup(firestore, 'invoices'));
    console.log(`Total Invoice documents found across all subcollections: ${snap.size}\n`);

    let missingBothCount = 0;
    let missingIdOnlyCount = 0;
    let missingDateOnlyCount = 0;
    let hasBothCount = 0;

    const missingBothList: any[] = [];
    const missingIdList: any[] = [];
    const missingDateList: any[] = [];

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const path = docSnap.ref.path;

      // ID resolution check:
      // Table checks: inv.invoiceDocumentID || inv.documentId
      // Also check invoiceInternalID, invoiceNumber, tranId, id
      const invoiceId =
        data.invoiceDocumentID ||
        data.documentId ||
        data.invoiceInternalID ||
        data.invoiceNumber ||
        data.tranId ||
        null;

      // Date resolution check:
      // Table checks: inv.invoiceDate
      // Also check date, createdAt
      const invoiceDate = data.invoiceDate || data.date || null;

      const hasId = Boolean(invoiceId && String(invoiceId).trim() !== '' && String(invoiceId).trim().toUpperCase() !== 'N/A');
      const hasDate = Boolean(invoiceDate && String(invoiceDate).trim() !== '' && String(invoiceDate).trim().toUpperCase() !== 'N/A');

      const info = {
        docId: docSnap.id,
        path: path,
        parentPath: docSnap.ref.parent.parent ? docSnap.ref.parent.parent.path : 'unknown',
        rawIdFields: {
          invoiceDocumentID: data.invoiceDocumentID,
          documentId: data.documentId,
          invoiceInternalID: data.invoiceInternalID,
          invoiceNumber: data.invoiceNumber,
          tranId: data.tranId
        },
        rawDateFields: {
          invoiceDate: data.invoiceDate,
          date: data.date,
          createdAt: data.createdAt
        },
        resolvedId: invoiceId,
        resolvedDate: invoiceDate,
        status: data.invoiceStatus || data.status || 'N/A',
        total: data.invoiceTotal ?? 'N/A',
        itemCount: Array.isArray(data.items) ? data.items.length : 0,
        allKeys: Object.keys(data),
        dataSnapshot: data
      };

      if (!hasId && !hasDate) {
        missingBothCount++;
        missingBothList.push(info);
      } else if (!hasId && hasDate) {
        missingIdOnlyCount++;
        missingIdList.push(info);
      } else if (hasId && !hasDate) {
        missingDateOnlyCount++;
        missingDateList.push(info);
      } else {
        hasBothCount++;
      }
    });

    console.log("=== AUDIT SUMMARY ===");
    console.log(`Total Invoice Documents: ${snap.size}`);
    console.log(`1. Missing BOTH Invoice ID & Date: ${missingBothCount}`);
    console.log(`2. Missing Invoice ID only: ${missingIdOnlyCount}`);
    console.log(`3. Missing Date only: ${missingDateOnlyCount}`);
    console.log(`4. Has BOTH Invoice ID & Date: ${hasBothCount}\n`);

    console.log("=== DETAILS OF INVOICES MISSING BOTH INVOICE ID AND DATE ===");
    missingBothList.forEach((item, index) => {
      console.log(`\n[${index + 1}] Doc Path: ${item.path}`);
      console.log(`    Parent Path: ${item.parentPath}`);
      console.log(`    Doc ID: ${item.docId}`);
      console.log(`    Status: ${item.status}`);
      console.log(`    Total: $${item.total}`);
      console.log(`    Item Count: ${item.itemCount}`);
      console.log(`    Raw Data Keys: ${JSON.stringify(item.allKeys)}`);
      console.log(`    Full Data Payload:`, JSON.stringify(item.dataSnapshot, null, 2));
    });

    if (missingIdList.length > 0) {
      console.log("\n=== DETAILS OF INVOICES MISSING INVOICE ID ONLY ===");
      missingIdList.forEach((item, index) => {
        console.log(`[${index + 1}] Path: ${item.path} | Date: ${item.resolvedDate} | Total: $${item.total}`);
      });
    }

    if (missingDateList.length > 0) {
      console.log("\n=== DETAILS OF INVOICES MISSING DATE ONLY ===");
      missingDateList.forEach((item, index) => {
        console.log(`[${index + 1}] Path: ${item.path} | ID: ${item.resolvedId} | Total: $${item.total}`);
      });
    }

  } catch (err) {
    console.error("Error executing report script:", err);
  }
}

runReport();
