# Module: `functions/src/invoices.ts`

- **Language:** TypeScript
- **Total Lines:** 325
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 8

---

### `VARIABLE` `SUPER_ADMIN_UIDS`

- **Line:** 11

---

### `INTERFACE` `InvoiceRow`

- **Line:** 18

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `'Internal ID'` | `string` | Yes | - |
| `invoiceInternalID` | `string` | Yes | - |
| `internalId` | `string` | Yes | - |
| `'Type'` | `string` | Yes | - |
| `invoiceType` | `string` | Yes | - |
| `type` | `string` | Yes | - |
| `'Date'` | `string` | Yes | - |
| `invoiceDate` | `string` | Yes | - |
| `date` | `string` | Yes | - |
| `'Document Number'` | `string` | Yes | - |
| `invoiceDocumentID` | `string` | Yes | - |
| `documentNumber` | `string` | Yes | - |
| `'Item'` | `string` | Yes | - |
| `item` | `string` | Yes | - |
| `'Quantity'` | `string | number` | Yes | - |
| `quantity` | `string | number` | Yes | - |
| `'Amount'` | `string | number` | Yes | - |
| `amount` | `string | number` | Yes | - |
| `'Invoice Status'` | `string` | Yes | - |
| `invoiceStatus` | `string` | Yes | - |
| `status` | `string` | Yes | - |
| `'Customer Internal ID'` | `string` | Yes | - |
| `customerInternalId` | `string` | Yes | - |
| `companyId` | `string` | Yes | - |
| `'Date Range: From'` | `string` | Yes | - |
| `dateRangeFrom` | `string` | Yes | - |
| `'Date Range From'` | `string` | Yes | - |
| `'Date Range: To'` | `string` | Yes | - |
| `dateRangeTo` | `string` | Yes | - |
| `'Date Range To'` | `string` | Yes | - |
| `'Period'` | `string` | Yes | - |
| `period` | `string` | Yes | - |
| `'Tax Period'` | `string` | Yes | - |
| `taxPeriod` | `string` | Yes | - |
| `'Amount (Transaction Tax Total)'` | `string | number` | Yes | - |
| `amountTransactionTaxTotal` | `string | number` | Yes | - |
| `'Days Open'` | `string | number` | Yes | - |
| `daysOpen` | `string | number` | Yes | - |
| `'Days Overdue'` | `string | number` | Yes | - |
| `daysOverdue` | `string | number` | Yes | - |
| `'Date Closed'` | `string` | Yes | - |
| `dateClosed` | `string` | Yes | - |

---

### `INTERFACE` `GroupedInvoice`

- **Line:** 80

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `invoiceInternalId` | `string` | No | - |
| `customerInternalId` | `string` | No | - |
| `type` | `string` | No | - |
| `date` | `string` | No | - |
| `documentNumber` | `string` | No | - |
| `status` | `string` | No | - |
| `dateRangeFrom` | `string` | No | - |
| `dateRangeTo` | `string` | No | - |
| `period` | `string` | No | - |
| `taxPeriod` | `string` | No | - |
| `amountTransactionTaxTotal` | `number` | No | - |
| `daysOpen` | `number` | No | - |
| `daysOverdue` | `number` | No | - |
| `dateClosed` | `string` | No | - |
| `newItems` | `{ item: string; quantity: number; amount: number }[]` | No | - |

---

### `FUNCTION` `parseNum`

- **Line:** 98
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parsed`

- **Line:** 101

---

### `FUNCTION` `parseStr`

- **Line:** 105
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `bulkImportInvoices`

- **Line:** 110

---

### `VARIABLE` `uid`

- **Line:** 119

---

### `VARIABLE` `rows`

- **Line:** 124

---

### `VARIABLE` `skippedCompanies`

- **Line:** 129
- **Signature:** `{ customerInternalId: string; reason: string; documentNumber?: string }[]`

---

### `VARIABLE` `invoiceGroupsMap`

- **Line:** 130

---

### `VARIABLE` `totalProcessed`

- **Line:** 132

---

### `VARIABLE` `invoiceInternalId`

- **Line:** 137

---

### `VARIABLE` `customerInternalId`

- **Line:** 138

---

### `VARIABLE` `item`

- **Line:** 145

---

### `VARIABLE` `quantity`

- **Line:** 146

---

### `VARIABLE` `amount`

- **Line:** 147

---

### `VARIABLE` `type`

- **Line:** 149

---

### `VARIABLE` `date`

- **Line:** 150

---

### `VARIABLE` `documentNumber`

- **Line:** 151

---

### `VARIABLE` `status`

- **Line:** 152

---

### `VARIABLE` `dateRangeFrom`

- **Line:** 154

---

### `VARIABLE` `dateRangeTo`

- **Line:** 155

---

### `VARIABLE` `period`

- **Line:** 156

---

### `VARIABLE` `taxPeriod`

- **Line:** 157

---

### `VARIABLE` `amountTransactionTaxTotal`

- **Line:** 158

---

### `VARIABLE` `daysOpen`

- **Line:** 159

---

### `VARIABLE` `daysOverdue`

- **Line:** 160

---

### `VARIABLE` `dateClosed`

- **Line:** 161

---

### `VARIABLE` `lineItem`

- **Line:** 163

---

### `VARIABLE` `group`

- **Line:** 184

---

### `VARIABLE` `groupedInvoices`

- **Line:** 202

---

### `VARIABLE` `uniqueCompanyIds`

- **Line:** 205

---

### `VARIABLE` `companyExistsMap`

- **Line:** 206

---

### `VARIABLE` `companyRefs`

- **Line:** 208

---

### `VARIABLE` `chunk`

- **Line:** 210

---

### `VARIABLE` `snaps`

- **Line:** 211

---

### `VARIABLE` `invoicesToProcess`

- **Line:** 218
- **Signature:** `GroupedInvoice[]`

---

### `VARIABLE` `invoiceDocRefs`

- **Line:** 219
- **Signature:** `admin.firestore.DocumentReference[]`

---

### `VARIABLE` `ref`

- **Line:** 224

---

### `VARIABLE` `existingInvoicesMap`

- **Line:** 240

---

### `VARIABLE` `chunk`

- **Line:** 242

---

### `VARIABLE` `snaps`

- **Line:** 243

---

### `VARIABLE` `totalImported`

- **Line:** 249

---

### `VARIABLE` `totalUpdated`

- **Line:** 250

---

### `VARIABLE` `CHUNK_SIZE`

- **Line:** 251

---

### `VARIABLE` `currentBatch`

- **Line:** 252

---

### `VARIABLE` `currentBatchCount`

- **Line:** 253

---

### `VARIABLE` `inv`

- **Line:** 257

---

### `VARIABLE` `docRef`

- **Line:** 258

---

### `VARIABLE` `docSnap`

- **Line:** 259

---

### `VARIABLE` `finalItems`

- **Line:** 261

---

### `VARIABLE` `isUpdate`

- **Line:** 262

---

### `VARIABLE` `existingData`

- **Line:** 266

---

### `VARIABLE` `existingItems`

- **Line:** 267

---

### `VARIABLE` `invoiceTotal`

- **Line:** 274

---

### `VARIABLE` `invoiceData`

- **Line:** 276
- **Signature:** `any`

---

