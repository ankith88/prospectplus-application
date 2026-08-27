const { execSync } = require('child_process');

async function runRestQuery() {
  try {
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
    console.log("Got access token from gcloud.");

    const url = 'https://firestore.googleapis.com/v1/projects/mailplus-outbound-leads-crm/databases/(default)/documents:runQuery';

    const body = {
      structuredQuery: {
        from: [
          {
            collectionId: 'invoices',
            allDescendants: true
          }
        ]
      }
    };

    console.log("Sending REST runQuery request for collectionGroup 'invoices'...");
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const results = await res.json();
    console.log("REST Query finished!");

    if (!Array.isArray(results)) {
      console.log("Response:", JSON.stringify(results, null, 2));
      return;
    }

    // Filter out empty responses (sometimes end of stream or metadata object is returned)
    const docResults = results.filter(r => r.document);
    console.log(`\nFound ${docResults.length} total invoice documents in collectionGroup('invoices').\n`);

    let missingBothCount = 0;
    let missingIdOnlyCount = 0;
    let missingDateOnlyCount = 0;
    let hasBothCount = 0;

    const missingBothList = [];
    const missingIdList = [];
    const missingDateList = [];

    // Helper to parse Firestore REST document value
    function parseValue(val) {
      if (!val) return null;
      if (val.stringValue !== undefined) return val.stringValue;
      if (val.integerValue !== undefined) return Number(val.integerValue);
      if (val.doubleValue !== undefined) return Number(val.doubleValue);
      if (val.booleanValue !== undefined) return val.booleanValue;
      if (val.timestampValue !== undefined) return val.timestampValue;
      if (val.nullValue !== undefined) return null;
      if (val.mapValue !== undefined) {
        const obj = {};
        const fields = val.mapValue.fields || {};
        for (const k in fields) {
          obj[k] = parseValue(fields[k]);
        }
        return obj;
      }
      if (val.arrayValue !== undefined) {
        const values = val.arrayValue.values || [];
        return values.map(parseValue);
      }
      return val;
    }

    function parseDocument(doc) {
      const name = doc.name; // projects/mailplus-outbound-leads-crm/databases/(default)/documents/companies/ABC/invoices/XYZ
      const fields = doc.fields || {};
      const data = {};
      for (const k in fields) {
        data[k] = parseValue(fields[k]);
      }
      // Extract path after /documents/
      const parts = name.split('/documents/');
      const path = parts[1] || name;
      return { path, name, data, docId: path.split('/').pop() };
    }

    docResults.forEach((r, i) => {
      const { path, data, docId } = parseDocument(r.document);

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
        index: i + 1,
        docId,
        path,
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
        data
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

    console.log("=================================================");
    console.log("           INVOICE AUDIT REPORT SUMMARY          ");
    console.log("=================================================");
    console.log(`Total Invoice Subcollection Documents: ${docResults.length}`);
    console.log(`- Missing BOTH Invoice ID & Date:      ${missingBothCount}`);
    console.log(`- Missing Invoice ID only:              ${missingIdOnlyCount}`);
    console.log(`- Missing Date only:                    ${missingDateOnlyCount}`);
    console.log(`- Having BOTH Invoice ID & Date:        ${hasBothCount}`);
    console.log("=================================================");

    if (missingBothList.length > 0) {
      console.log("\n=================================================");
      console.log("  INVOICE SUBCOLLECTIONS WITH NO INVOICE ID & DATE");
      console.log("=================================================");
      missingBothList.forEach((item, index) => {
        console.log(`\n[#${index + 1}] Document Path: ${item.path}`);
        console.log(`     Document ID:   ${item.docId}`);
        console.log(`     Status:        ${item.status}`);
        console.log(`     Total:         $${item.total}`);
        console.log(`     Items Count:   ${item.itemCount}`);
        console.log(`     Keys Present:  ${JSON.stringify(item.allKeys)}`);
        console.log(`     Full Payload:`, JSON.stringify(item.data, null, 2));
      });
    } else {
      console.log("\nNo invoice subcollections found missing both Invoice ID and Date.");
    }

    if (missingIdList.length > 0) {
      console.log("\n=================================================");
      console.log("  INVOICES MISSING INVOICE ID ONLY");
      console.log("=================================================");
      missingIdList.forEach((item, index) => {
        console.log(`[#${index + 1}] Path: ${item.path} | Date: ${item.resolvedDate} | Total: $${item.total}`);
      });
    }

    if (missingDateList.length > 0) {
      console.log("\n=================================================");
      console.log("  INVOICES MISSING DATE ONLY");
      console.log("=================================================");
      missingDateList.forEach((item, index) => {
        console.log(`[#${index + 1}] Path: ${item.path} | ID: ${item.resolvedId} | Total: $${item.total}`);
      });
    }

  } catch (err) {
    console.error("Error running REST query:", err);
  }
}

runRestQuery();
