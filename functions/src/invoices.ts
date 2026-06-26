import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Superadmin UIDs matching src/lib/constants.ts
const SUPER_ADMIN_UIDS = [
  'ncyhwLtOG1W7TZ43PkYCcObeCAf2', // Original Admin
  'a543AEr3TcaHyj4c1Gh0fJoQ6UB2'  // New Super Admin
];

interface InvoiceRow {
  'Internal ID'?: string;
  invoiceInternalID?: string;
  internalId?: string;

  'Type'?: string;
  invoiceType?: string;
  type?: string;

  'Date'?: string;
  invoiceDate?: string;
  date?: string;

  'Document Number'?: string;
  invoiceDocumentID?: string;
  documentNumber?: string;

  'Item'?: string;
  item?: string;

  'Quantity'?: string | number;
  quantity?: string | number;

  'Amount'?: string | number;
  amount?: string | number;

  'Invoice Status'?: string;
  invoiceStatus?: string;
  status?: string;

  'Customer Internal ID'?: string;
  customerInternalId?: string;
  companyId?: string;

  // New fields
  'Date Range: From'?: string;
  dateRangeFrom?: string;
  'Date Range From'?: string;

  'Date Range: To'?: string;
  dateRangeTo?: string;
  'Date Range To'?: string;

  'Period'?: string;
  period?: string;

  'Tax Period'?: string;
  taxPeriod?: string;

  'Amount (Transaction Tax Total)'?: string | number;
  amountTransactionTaxTotal?: string | number;

  'Days Open'?: string | number;
  daysOpen?: string | number;

  'Days Overdue'?: string | number;
  daysOverdue?: string | number;

  'Date Closed'?: string;
  dateClosed?: string;
}

interface GroupedInvoice {
  invoiceInternalId: string;
  customerInternalId: string;
  type: string;
  date: string;
  documentNumber: string;
  status: string;
  dateRangeFrom: string;
  dateRangeTo: string;
  period: string;
  taxPeriod: string;
  amountTransactionTaxTotal: number;
  daysOpen: number;
  daysOverdue: number;
  dateClosed: string;
  newItems: { item: string; quantity: number; amount: number }[];
}

const parseNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const parseStr = (val: any): string => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

export const bulkImportInvoices = functions
  .region('australia-southeast1')
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onCall(async (data: { invoices: InvoiceRow[] }, context) => {
    // 1. Authorization Check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const uid = context.auth.uid;
    if (!SUPER_ADMIN_UIDS.includes(uid)) {
      throw new functions.https.HttpsError('permission-denied', 'Only Superadmins can import invoices.');
    }

    const rows = data.invoices;
    if (!Array.isArray(rows)) {
      throw new functions.https.HttpsError('invalid-argument', 'Payload must contain an "invoices" array.');
    }

    const skippedCompanies: { customerInternalId: string; reason: string; documentNumber?: string }[] = [];
    const invoiceGroupsMap = new Map<string, GroupedInvoice>();

    let totalProcessed = 0;

    // 2. Aggregate line items and consolidate by Invoice Internal ID in memory
    for (const row of rows) {
      totalProcessed++;
      const invoiceInternalId = parseStr(row['Internal ID'] || row.invoiceInternalID || row.internalId);
      const customerInternalId = parseStr(row['Customer Internal ID'] || row.customerInternalId || row.companyId);

      if (!invoiceInternalId || !customerInternalId) {
        // Skip invalid rows missing identifiers
        continue;
      }

      const item = parseStr(row['Item'] || row.item);
      const quantity = parseNum(row['Quantity'] || row.quantity);
      const amount = parseNum(row['Amount'] || row.amount);

      const type = parseStr(row['Type'] || row.invoiceType || row.type);
      const date = parseStr(row['Date'] || row.invoiceDate || row.date);
      const documentNumber = parseStr(row['Document Number'] || row.invoiceDocumentID || row.documentNumber);
      const status = parseStr(row['Invoice Status'] || row.invoiceStatus || row.status);

      const dateRangeFrom = parseStr(row['Date Range: From'] || row.dateRangeFrom || row['Date Range From']);
      const dateRangeTo = parseStr(row['Date Range: To'] || row.dateRangeTo || row['Date Range To']);
      const period = parseStr(row['Period'] || row.period);
      const taxPeriod = parseStr(row['Tax Period'] || row.taxPeriod);
      const amountTransactionTaxTotal = parseNum(row['Amount (Transaction Tax Total)'] || row.amountTransactionTaxTotal);
      const daysOpen = parseNum(row['Days Open'] || row.daysOpen);
      const daysOverdue = parseNum(row['Days Overdue'] || row.daysOverdue);
      const dateClosed = parseStr(row['Date Closed'] || row.dateClosed);

      const lineItem = { item, quantity, amount };

      if (!invoiceGroupsMap.has(invoiceInternalId)) {
        invoiceGroupsMap.set(invoiceInternalId, {
          invoiceInternalId,
          customerInternalId,
          type,
          date,
          documentNumber,
          status,
          dateRangeFrom,
          dateRangeTo,
          period,
          taxPeriod,
          amountTransactionTaxTotal,
          daysOpen,
          daysOverdue,
          dateClosed,
          newItems: [lineItem]
        });
      } else {
        const group = invoiceGroupsMap.get(invoiceInternalId)!;
        group.newItems.push(lineItem);
        // Update general fields if they are missing on first row but exist in subsequent rows
        if (!group.type && type) group.type = type;
        if (!group.date && date) group.date = date;
        if (!group.documentNumber && documentNumber) group.documentNumber = documentNumber;
        if (!group.status && status) group.status = status;
        if (!group.dateRangeFrom && dateRangeFrom) group.dateRangeFrom = dateRangeFrom;
        if (!group.dateRangeTo && dateRangeTo) group.dateRangeTo = dateRangeTo;
        if (!group.period && period) group.period = period;
        if (!group.taxPeriod && taxPeriod) group.taxPeriod = taxPeriod;
        if (!group.amountTransactionTaxTotal && amountTransactionTaxTotal) group.amountTransactionTaxTotal = amountTransactionTaxTotal;
        if (!group.daysOpen && daysOpen) group.daysOpen = daysOpen;
        if (!group.daysOverdue && daysOverdue) group.daysOverdue = daysOverdue;
        if (!group.dateClosed && dateClosed) group.dateClosed = dateClosed;
      }
    }

    const groupedInvoices = Array.from(invoiceGroupsMap.values());

    // 3. Batch Check Company Existence
    const uniqueCompanyIds = Array.from(new Set(groupedInvoices.map(inv => inv.customerInternalId)));
    const companyExistsMap = new Map<string, boolean>();

    const companyRefs = uniqueCompanyIds.map(id => db.collection('companies').doc(id));
    for (let i = 0; i < companyRefs.length; i += 100) {
      const chunk = companyRefs.slice(i, i + 100);
      const snaps = await db.getAll(...chunk);
      for (const snap of snaps) {
        companyExistsMap.set(snap.id, snap.exists);
      }
    }

    // 4. Filter Invoices & Identify Skipped ones
    const invoicesToProcess: GroupedInvoice[] = [];
    const invoiceDocRefs: admin.firestore.DocumentReference[] = [];

    for (const inv of groupedInvoices) {
      if (companyExistsMap.get(inv.customerInternalId)) {
        invoicesToProcess.push(inv);
        const ref = db
          .collection('companies')
          .doc(inv.customerInternalId)
          .collection('invoices')
          .doc(inv.invoiceInternalId);
        invoiceDocRefs.push(ref);
      } else {
        skippedCompanies.push({
          customerInternalId: inv.customerInternalId,
          reason: 'Company does not exist in database',
          documentNumber: inv.documentNumber || undefined
        });
      }
    }

    // 5. Batch Check Invoice Existence
    const existingInvoicesMap = new Map<string, admin.firestore.DocumentSnapshot>();
    for (let i = 0; i < invoiceDocRefs.length; i += 100) {
      const chunk = invoiceDocRefs.slice(i, i + 100);
      const snaps = await db.getAll(...chunk);
      for (const snap of snaps) {
        existingInvoicesMap.set(snap.ref.path, snap);
      }
    }

    let totalImported = 0;
    let totalUpdated = 0;
    const CHUNK_SIZE = 400;
    let currentBatch = db.batch();
    let currentBatchCount = 0;

    // 6. Perform batch writes / updates
    for (let i = 0; i < invoicesToProcess.length; i++) {
      const inv = invoicesToProcess[i];
      const docRef = invoiceDocRefs[i];
      const docSnap = existingInvoicesMap.get(docRef.path);

      let finalItems = [...inv.newItems];
      let isUpdate = false;

      if (docSnap && docSnap.exists) {
        isUpdate = true;
        const existingData = docSnap.data() || {};
        const existingItems = Array.isArray(existingData.items) ? existingData.items : [];
        
        // Append new items seamlessly
        finalItems = [...existingItems, ...inv.newItems];
      }

      // Calculate total cumulative amount
      const invoiceTotal = finalItems.reduce((sum, item) => sum + (item.amount || 0), 0);

      const invoiceData: any = {
        invoiceInternalID: inv.invoiceInternalId,
        invoiceType: inv.type,
        invoiceDate: inv.date,
        invoiceDocumentID: inv.documentNumber,
        invoiceStatus: inv.status,
        dateRangeFrom: inv.dateRangeFrom,
        dateRangeTo: inv.dateRangeTo,
        period: inv.period,
        taxPeriod: inv.taxPeriod,
        amountTransactionTaxTotal: inv.amountTransactionTaxTotal,
        daysOpen: inv.daysOpen,
        daysOverdue: inv.daysOverdue,
        dateClosed: inv.dateClosed,
        items: finalItems,
        invoiceTotal,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (isUpdate) {
        currentBatch.set(docRef, invoiceData, { merge: true });
        totalUpdated++;
      } else {
        invoiceData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        currentBatch.set(docRef, invoiceData);
        totalImported++;
      }

      currentBatchCount++;

      if (currentBatchCount >= CHUNK_SIZE) {
        await currentBatch.commit();
        currentBatch = db.batch();
        currentBatchCount = 0;
      }
    }

    if (currentBatchCount > 0) {
      await currentBatch.commit();
    }

    return {
      success: true,
      totalProcessed,
      totalImported,
      totalUpdated,
      skippedCompanies
    };
  });
