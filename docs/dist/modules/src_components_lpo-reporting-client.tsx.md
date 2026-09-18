# Module: `src/components/lpo-reporting-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 968
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `INTERFACE` `Subcustomer`

- **Line:** 40

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `companyId` | `string` | No | - |
| `customerEntityId` | `string` | Yes | - |
| `companyName` | `string` | No | - |
| `status` | `string` | No | - |
| `customerEmail` | `string` | No | - |
| `customerPhone` | `string` | No | - |
| `jobtype` | `string` | No | - |
| `billing` | `string` | No | - |
| `address` | `string` | Yes | - |
| `ampoRate` | `string` | Yes | - |
| `pmpoRate` | `string` | Yes | - |
| `packageRate` | `string` | Yes | - |
| `additionalBagRate` | `string` | Yes | - |
| `cancellationReason` | `string | null` | Yes | - |
| `cancelledAt` | `string | null` | Yes | - |
| `jobsCount` | `number` | No | - |
| `parentLpoLeadId` | `string` | Yes | - |
| `parentLpoName` | `string` | Yes | - |
| `parentLpoInternalId` | `string` | Yes | - |
| `parentLinkedCompanyName` | `string` | Yes | - |

---

### `INTERFACE` `LpoReportItem`

- **Line:** 64

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `prospectPlusId` | `string` | No | - |
| `lpoName` | `string` | No | - |
| `lpoOwnerName` | `string` | No | - |
| `email` | `string` | No | - |
| `phone` | `string` | No | - |
| `status` | `string` | No | - |
| `linkedLeadId` | `string` | No | - |
| `linkedCustomerId` | `string` | No | - |
| `linkedCompanyName` | `string` | No | - |
| `targetLpoId` | `string` | No | - |
| `hasAccess` | `boolean` | No | - |
| `portalUsersCount` | `number` | No | - |
| `portalUsers` | `any[]` | No | - |
| `subcustomersCount` | `number` | No | - |
| `activeSubcustomersCount` | `number` | No | - |
| `cancelledSubcustomersCount` | `number` | No | - |
| `awaitingTncSubcustomersCount` | `number` | No | - |
| `totalJobsCount` | `number` | No | - |
| `subcustomers` | `Subcustomer[]` | No | - |
| `lpoDetails` | `any` | Yes | - |

---

### `INTERFACE` `ReportSummary`

- **Line:** 88

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `totalLinkedLpos` | `number` | No | - |
| `lposWithLpoPlusAccess` | `number` | No | - |
| `totalSubcustomers` | `number` | No | - |
| `activeSubcustomers` | `number` | No | - |
| `cancelledSubcustomers` | `number` | No | - |
| `awaitingTncSubcustomers` | `number` | No | - |
| `totalJobsCreated` | `number` | No | - |
| `jobsByJobType` | `{
    scheduled: number;
    oneOff: number;
  }` | No | - |
| `jobsByBilling` | `{
    lpoBilled: number;
    customerBilled: number;
  }` | No | - |

---

### `FUNCTION` `LpoReportingClient`

- **Line:** 106
- **Returns:** `void`

---

### `FUNCTION` `fetchReportData`

- **Line:** 125
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `isManualRefresh` | `any` | No | `false` | - |

---

### `VARIABLE` `res`

- **Line:** 131

---

### `VARIABLE` `json`

- **Line:** 132

---

### `FUNCTION` `toggleExpandLpo`

- **Line:** 166

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `filteredLpoLeads`

- **Line:** 174

---

### `VARIABLE` `term`

- **Line:** 180

---

### `VARIABLE` `matchesLpo`

- **Line:** 181

---

### `VARIABLE` `matchesSubcust`

- **Line:** 188

---

### `VARIABLE` `hasMatchingSubcustStatus`

- **Line:** 208

---

### `VARIABLE` `st`

- **Line:** 209

---

### `VARIABLE` `hasMatchingBilling`

- **Line:** 220

---

### `VARIABLE` `filteredSubcustomers`

- **Line:** 229

---

### `VARIABLE` `term`

- **Line:** 235

---

### `VARIABLE` `matchesName`

- **Line:** 236

---

### `VARIABLE` `matchesId`

- **Line:** 237

---

### `VARIABLE` `matchesEntity`

- **Line:** 238

---

### `VARIABLE` `matchesEmail`

- **Line:** 239

---

### `VARIABLE` `matchesParentLpo`

- **Line:** 240

---

### `VARIABLE` `matchesParentCompany`

- **Line:** 241

---

### `VARIABLE` `st`

- **Line:** 250

---

### `FUNCTION` `handleExportCSV`

- **Line:** 266

---

### `VARIABLE` `headers`

- **Line:** 269

---

### `VARIABLE` `rows`

- **Line:** 289
- **Signature:** `string[][]`

---

### `VARIABLE` `csvContent`

- **Line:** 337

---

### `VARIABLE` `encodedUri`

- **Line:** 338

---

### `VARIABLE` `link`

- **Line:** 339

---

### `FUNCTION` `handleClearFilters`

- **Line:** 352

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 359

---

### `VARIABLE` `summary`

- **Line:** 386

---

### `VARIABLE` `isExpanded`

- **Line:** 639

---

