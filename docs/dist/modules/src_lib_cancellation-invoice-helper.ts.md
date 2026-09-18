# Module: `src/lib/cancellation-invoice-helper.ts`

- **Language:** TypeScript
- **Total Lines:** 222
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `INTERFACE` `InvoiceAvgResult`

- **Line:** 6

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `avgMonthlyInvoice` | `number` | No | - |
| `monthsFound` | `number` | No | - |
| `invoicesCount` | `number` | No | - |
| `recentInvoices` | `Invoice[]` | No | - |
| `isSignedCustomer` | `boolean` | No | - |

---

### `FUNCTION` `parseDateRobust`

- **Line:** 14
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parsed`

- **Line:** 27

---

### `VARIABLE` `parts`

- **Line:** 31

---

### `VARIABLE` `d`

- **Line:** 33

---

### `VARIABLE` `m`

- **Line:** 34

---

### `VARIABLE` `y`

- **Line:** 35

---

### `FUNCTION` `resolveFirestoreDocIds`

> Resolves all candidate Firestore company/lead document IDs given an array of candidate IDs
(e.g. leadId, companyId, netsuiteId, prospectPlusId).

- **Line:** 47
- **Async:** Yes
- **Returns:** `Promise<string[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `candidateIds` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `resolved`

- **Line:** 48

---

### `VARIABLE` `cleanId`

- **Line:** 52

---

### `VARIABLE` `compSnap`

- **Line:** 57

---

### `VARIABLE` `leadSnap`

- **Line:** 64

---

### `VARIABLE` `searchKeys`

- **Line:** 71

---

### `VARIABLE` `qComp`

- **Line:** 75

---

### `VARIABLE` `qSnap`

- **Line:** 76

---

### `VARIABLE` `qCompNum`

- **Line:** 84

---

### `VARIABLE` `qSnapNum`

- **Line:** 85

---

### `VARIABLE` `qLead`

- **Line:** 96

---

### `VARIABLE` `qSnap`

- **Line:** 97

---

### `VARIABLE` `qLeadNum`

- **Line:** 105

---

### `VARIABLE` `qSnapNum`

- **Line:** 106

---

### `FUNCTION` `fetch3MonthAvgInvoiceMRR`

> Fetches invoices for a given customer from Firestore across all resolved company/lead document IDs,
and calculates the average monthly invoice value over the 3 available billing months PRIOR to the
most recent month (ignoring the last month with an invoice as it may be pro-rated/partial).

If no prior invoices exist in Firestore, returns avgMonthlyInvoice = 0.

- **Line:** 125
- **Async:** Yes
- **Returns:** `Promise<InvoiceAvgResult>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyId` | `string` | No | - | - |
| `leadId` | `string` | No | - | - |
| `netsuiteId` | `string` | No | - | - |
| `prospectPlusId` | `string` | No | - | - |

---

### `VARIABLE` `candidateIds`

- **Line:** 131

---

### `VARIABLE` `docIdsToQuery`

- **Line:** 137

---

### `VARIABLE` `targetIds`

- **Line:** 138

---

### `VARIABLE` `rawInvoices`

- **Line:** 140
- **Signature:** `Invoice[]`

---

### `VARIABLE` `isSignedCustomer`

- **Line:** 141

---

### `VARIABLE` `compInvoicesRef`

- **Line:** 146

---

### `VARIABLE` `compSnap`

- **Line:** 147

---

### `VARIABLE` `leadInvoicesRef`

- **Line:** 155

---

### `VARIABLE` `leadSnap`

- **Line:** 156

---

### `VARIABLE` `invoiceMap`

- **Line:** 172

---

### `VARIABLE` `key`

- **Line:** 174

---

### `VARIABLE` `uniqueInvoices`

- **Line:** 179

---

### `VARIABLE` `monthlyTotals`

- **Line:** 182

---

### `VARIABLE` `dateVal`

- **Line:** 185

---

### `VARIABLE` `d`

- **Line:** 186

---

### `VARIABLE` `monthKey`

- **Line:** 189

---

### `VARIABLE` `rawVal`

- **Line:** 190

---

### `VARIABLE` `amount`

- **Line:** 191

---

### `VARIABLE` `allSortedMonths`

- **Line:** 201

---

### `VARIABLE` `monthsToAverage`

- **Line:** 204

---

### `VARIABLE` `totalSum`

- **Line:** 206

---

### `VARIABLE` `monthsFound`

- **Line:** 211

---

### `VARIABLE` `avgMonthlyInvoice`

- **Line:** 212

---

