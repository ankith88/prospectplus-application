const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: "mailplus-outbound-leads-crm",
    });
  } catch (e) {
    admin.initializeApp({
      projectId: "mailplus-outbound-leads-crm",
    });
  }
}

const db = admin.firestore();

async function runAudit() {
  console.log("Starting Firebase Admin Invoice Subcollections Audit...");

  try {
    const snap = await db.collectionGroup('invoices').get();
    console.log(`Total Invoice documents found across all subcollections: ${snap.size}\n`);

    let missingBothCount = 0;
    let missingIdOnlyCount = 0;
    let missingDateOnlyCount = 0;
    let hasBothCount = 0;

    const missingBothList = [];
    const missingIdList = [];
    const missingDateList = [];

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const path = docSnap.ref.path;

      // Check fields for ID and Date
      const invoiceId =
        data.invoiceDocumentID ||
        data.documentId ||
        data.invoiceInternalID ||
        data.invoiceNumber ||
        data.tranId ||
        null;

      const invoiceDate = data.invoiceDate || data.date || null;

      const hasId = Boolean(invoiceId && String(invoiceId).trim() !== '' && String(invoiceId).trim().toUpperCase() !== 'N/A');
      const hasDate = Boolean(invoiceDate && String(invoiceDate).trim() !== '' && String(invoiceDate).trim().toUpperCase() !== 'N/A');

      const parentPath = docSnap.ref.parent && docSnap.ref.parent.parent ? docSnap.ref.parent.parent.path : 'unknown';

      const info = {
        docId: docSnap.id,
        path: path,
        parentPath: parentPath,
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
        total: data.invoiceTotal !== undefined ? data.invoiceTotal : (data.total ?? 'N/A'),
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

    console.log("==========================================");
    console.log("          INVOICE AUDIT SUMMARY           ");
    console.log("==========================================");
    console.log(`Total Invoice Subcollection Documents: ${snap.size}`);
    console.log(`- Documents missing BOTH Invoice ID & Date: ${missingBothCount}`);
    console.log(`- Documents missing Invoice ID only:        ${missingIdOnlyCount}`);
    console.log(`- Documents missing Date only:              ${missingDateOnlyCount}`);
    console.log(`- Documents having BOTH Invoice ID & Date:  ${hasBothCount}`);
    console.log("==========================================");

    if (missingBothList.length > 0) {
      console.log("\n--- DETAILED BREAKDOWN OF INVOICES MISSING BOTH ID & DATE ---");
      missingBothList.forEach((item, index) => {
        console.log(`\n[${index + 1}] Document Path: ${item.path}`);
        console.log(`    Parent Path:    ${item.parentPath}`);
        console.log(`    Document ID:    ${item.docId}`);
        console.log(`    Status:         ${item.status}`);
        console.log(`    Total:          $${item.total}`);
        console.log(`    Item Count:     ${item.itemCount}`);
        console.log(`    Fields present: ${JSON.stringify(item.allKeys)}`);
        console.log(`    Data Payload:`, JSON.stringify(item.dataSnapshot, null, 2));
      });
    }

    if (missingIdList.length > 0) {
      console.log("\n--- INVOICES MISSING INVOICE ID ONLY ---");
      missingIdList.forEach((item, index) => {
        console.log(`[${index + 1}] Path: ${item.path} | Date: ${item.resolvedDate} | Total: $${item.total}`);
      });
    }

    if (missingDateList.length > 0) {
      console.log("\n--- INVOICES MISSING DATE ONLY ---");
      missingDateList.forEach((item, index) => {
        console.log(`[${index + 1}] Path: ${item.path} | ID: ${item.resolvedId} | Total: $${item.total}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("Error executing admin audit:", err);
    process.exit(1);
  }
}

runAudit();
