# Module: `src/lib/mrr-realization.ts`

- **Language:** TypeScript
- **Total Lines:** 258
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `INTERFACE` `ExtendedInvoice`

- **Line:** 6

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `parentId` | `string` | Yes | - |

---

### `INTERFACE` `CohortCustomerDetail`

- **Line:** 10

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `companyName` | `string` | No | - |
| `commencementDate` | `string | null` | No | - |
| `signedUpAt` | `string | null` | No | - |
| `repName` | `string` | No | - |
| `status` | `string` | No | - |
| `contractedMrr` | `number` | No | - |
| `actualInvoiced` | `number` | No | - |
| `variance` | `number` | No | - |
| `variancePercentage` | `number` | No | - |
| `billingStatus` | `'Fully Billed' | 'Partially Billed' | 'Unbilled' | 'Over Billed'` | No | - |
| `invoices` | `ExtendedInvoice[]` | No | - |

---

### `INTERFACE` `PrevMonthCohortSummary`

- **Line:** 25

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `prevMonthName` | `string` | No | - |
| `prevMonthStartDate` | `Date` | No | - |
| `prevMonthEndDate` | `Date` | No | - |
| `monthsCount` | `number` | No | - |
| `signedCount` | `number` | No | - |
| `contractedMrr` | `number` | No | - |
| `actualInvoicedTotal` | `number` | No | - |
| `varianceTotal` | `number` | No | - |
| `realizationYield` | `number` | No | - |
| `cohortDetails` | `CohortCustomerDetail[]` | No | - |

---

### `FUNCTION` `getLeadCommencementDate`

> Extracts the Service Commencement Date for a lead or company object.
Priority:
1. SCF subcollection documents (lead.scfs): startDate or service-level startDate / trialStartDate
2. Top-level services array (lead.services): startDate or trialStartDate
3. Explicit commencementDate / serviceCommencementDate / startDate / serviceStartDate / trialStartDate

- **Line:** 45
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `scfs`

- **Line:** 49

---

### `VARIABLE` `sortedScfs`

- **Line:** 51

---

### `VARIABLE` `aAccepted`

- **Line:** 52

---

### `VARIABLE` `bAccepted`

- **Line:** 53

---

### `VARIABLE` `scfStartDate`

- **Line:** 60

---

### `VARIABLE` `parsed`

- **Line:** 62

---

### `VARIABLE` `svcDateVal`

- **Line:** 69

---

### `VARIABLE` `parsed`

- **Line:** 71

---

### `VARIABLE` `dateVal`

- **Line:** 83

---

### `VARIABLE` `parsed`

- **Line:** 85

---

### `VARIABLE` `topLevelCommence`

- **Line:** 92

---

### `VARIABLE` `parsed`

- **Line:** 99

---

### `FUNCTION` `calculatePrevMonthRealizationCohort`

> Calculates 3-Month Service Commencement Cohort Realization metrics.
Compares contracted MRR against actual billed invoices for accounts
whose service commencement date fell in the last 3 months.

- **Line:** 111
- **Returns:** `PrevMonthCohortSummary`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | **Yes** | - | - |
| `invoices` | `ExtendedInvoice[]` | **Yes** | - | - |
| `activeDateRange` | `{ from?: Date; to?: Date }` | No | - | - |
| `monthsCount` | `number` | No | `1` | - |
| `customCohortDateRange` | `{ from?: Date; to?: Date }` | No | - | - |

---

### `VARIABLE` `prevMonthStart`

- **Line:** 118
- **Signature:** `Date`

---

### `VARIABLE` `prevMonthEnd`

- **Line:** 119
- **Signature:** `Date`

---

### `VARIABLE` `referenceDate`

- **Line:** 126

---

### `VARIABLE` `startMonthName`

- **Line:** 132

---

### `VARIABLE` `endMonthName`

- **Line:** 133

---

### `VARIABLE` `prevMonthName`

- **Line:** 134

---

### `VARIABLE` `invoicesByParentMap`

- **Line:** 137

---

### `VARIABLE` `invDate`

- **Line:** 141

---

### `VARIABLE` `parentId`

- **Line:** 146

---

### `VARIABLE` `existing`

- **Line:** 148

---

### `VARIABLE` `cohortDetails`

- **Line:** 156
- **Signature:** `CohortCustomerDetail[]`

---

### `VARIABLE` `status`

- **Line:** 159

---

### `VARIABLE` `isSigned`

- **Line:** 160

---

### `VARIABLE` `lostStatuses`

- **Line:** 163

---

### `VARIABLE` `commencementDateObj`

- **Line:** 167

---

### `VARIABLE` `contractedMrr`

- **Line:** 174

---

### `VARIABLE` `companyId`

- **Line:** 177

---

### `VARIABLE` `leadInvoices`

- **Line:** 178

---

### `VARIABLE` `uniqueInvoicesMap`

- **Line:** 184

---

### `VARIABLE` `invId`

- **Line:** 186

---

### `VARIABLE` `uniqueInvoices`

- **Line:** 189

---

### `VARIABLE` `actualInvoiced`

- **Line:** 192

---

### `VARIABLE` `total`

- **Line:** 193

---

### `VARIABLE` `variance`

- **Line:** 199

---

### `VARIABLE` `variancePercentage`

- **Line:** 200

---

### `VARIABLE` `billingStatus`

- **Line:** 202
- **Signature:** `CohortCustomerDetail['billingStatus']`

---

### `VARIABLE` `dA`

- **Line:** 233

---

### `VARIABLE` `dB`

- **Line:** 234

---

### `VARIABLE` `signedCount`

- **Line:** 239

---

### `VARIABLE` `contractedMrr`

- **Line:** 240

---

### `VARIABLE` `actualInvoicedTotal`

- **Line:** 241

---

### `VARIABLE` `varianceTotal`

- **Line:** 242

---

### `VARIABLE` `realizationYield`

- **Line:** 243

---

