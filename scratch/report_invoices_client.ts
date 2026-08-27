import { firestore } from '../src/lib/firebase.js';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';

async function runAudit() {
  console.log("Starting Client SDK Invoice Audit...");

  try {
    console.log("1. Fetching all companies...");
    const companiesSnap = await getDocs(collection(firestore, 'companies'));
    console.log(`Found ${companiesSnap.size} companies.`);

    console.log("2. Fetching all leads...");
    const leadsSnap = await getDocs(collection(firestore, 'leads'));
    console.log(`Found ${leadsSnap.size} leads.`);

    let totalInvoicesChecked = 0;
    let missingBothCount = 0;
    let missingIdOnlyCount = 0;
    let missingDateOnlyCount = 0;
    let hasBothCount = 0;

    const missingBothList: any[] = [];
    const missingIdList: any[] = [];
    const missingDateList: any[] = [];

    // Helper to evaluate invoice document
    function evaluateInvoice(docSnap: any, parentType: string, parentId: string) {
      totalInvoicesChecked++;
      const data = docSnap.data();
      const path = docSnap.ref.path;

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

      const info = {
        docId: docSnap.id,
        path: path,
        parentType,
        parentId,
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
    }

    console.log("3. Scanning companies for invoices subcollections...");
    let compCount = 0;
    for (const compDoc of companiesSnap.docs) {
      compCount++;
      if (compCount % 500 === 0) {
        console.log(`  Processed ${compCount}/${companiesSnap.size} companies...`);
      }
      const invSnap = await getDocs(collection(firestore, 'companies', compDoc.id, 'invoices'));
      invSnap.docs.forEach(invDoc => evaluateInvoice(invDoc, 'company', compDoc.id));
    }

    console.log("4. Scanning leads for invoices subcollections...");
    let leadCount = 0;
    for (const leadDoc of leadsSnap.docs) {
      leadCount++;
      if (leadCount % 1000 === 0) {
        console.log(`  Processed ${leadCount}/${leadsSnap.size} leads...`);
      }
      const invSnap = await getDocs(collection(firestore, 'leads', leadDoc.id, 'invoices'));
      invSnap.docs.forEach(invDoc => evaluateInvoice(invDoc, 'lead', leadDoc.id));
    }

    console.log("\n==========================================");
    console.log("          INVOICE AUDIT REPORT            ");
    console.log("==========================================");
    console.log(`Total Companies Scanned:               ${companiesSnap.size}`);
    console.log(`Total Leads Scanned:                   ${leadsSnap.size}`);
    console.log(`Total Invoice Subcollection Documents: ${totalInvoicesChecked}`);
    console.log("------------------------------------------");
    console.log(`- Documents missing BOTH Invoice ID & Date: ${missingBothCount}`);
    console.log(`- Documents missing Invoice ID only:        ${missingIdOnlyCount}`);
    console.log(`- Documents missing Date only:              ${missingDateOnlyCount}`);
    console.log(`- Documents having BOTH Invoice ID & Date:  ${hasBothCount}`);
    console.log("==========================================");

    if (missingBothList.length > 0) {
      console.log("\n--- DETAILED BREAKDOWN OF INVOICES MISSING BOTH ID & DATE ---");
      missingBothList.forEach((item, index) => {
        console.log(`\n[${index + 1}] Path: ${item.path}`);
        console.log(`    Parent:         ${item.parentType} (${item.parentId})`);
        console.log(`    Invoice Doc ID: ${item.docId}`);
        console.log(`    Status:         ${item.status}`);
        console.log(`    Total:          $${item.total}`);
        console.log(`    Item Count:     ${item.itemCount}`);
        console.log(`    Keys Present:   ${JSON.stringify(item.allKeys)}`);
        console.log(`    Data Payload:   ${JSON.stringify(item.dataSnapshot)}`);
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
    console.error("Error executing client audit:", err);
    process.exit(1);
  }
}

runAudit();
