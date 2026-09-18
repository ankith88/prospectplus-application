# Module: `src/components/scans/top-users-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 877
- **Direct Dependencies:** 22 modules imported

## Exported Symbols & API

### `INTERFACE` `PackageRecord`

- **Line:** 26

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `code` | `string` | No | - |
| `order_number` | `string` | No | - |
| `sync_date` | `string` | No | - |
| `scans` | `{
    scan_type: string;
    courier: string;
    updated_at: string;
    customer_ns_id?: string;
    delivery_speed?: string;
  }[]` | No | - |

---

### `INTERFACE` `CustomerStats`

- **Line:** 39

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `prospectPlusId` | `string` | Yes | - |
| `companyId` | `string` | Yes | - |
| `type` | `'companies' | 'leads'` | Yes | - |
| `name` | `string` | No | - |
| `franchisee` | `string` | No | - |
| `contactName` | `string` | Yes | - |
| `phone` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `csCalled` | `boolean` | Yes | - |
| `csCallCount` | `number` | Yes | - |
| `lastContactedDate` | `string | null` | Yes | - |
| `allTimeBarcodes` | `number` | No | - |
| `currentWeekScans` | `number` | No | - |
| `currentMonthScans` | `number` | No | - |
| `weeklyAverage` | `number` | No | - |
| `monthlyAverage` | `number` | No | - |
| `deliverySpeeds` | `Record<string, number>` | No | - |
| `lastScanDate` | `string | Date | null` | No | - |
| `lastContact` | `{
    date: string | null;
    type: string | null;
    author: string | null;
    notes: string | null;
  } | null` | Yes | - |

---

### `FUNCTION` `parseDateString`

- **Line:** 67

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getFormattedDateDDMMYYYY`

- **Line:** 84

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date | null` | **Yes** | - | - |

---

### `VARIABLE` `dd`

- **Line:** 86

---

### `VARIABLE` `mm`

- **Line:** 87

---

### `VARIABLE` `yyyy`

- **Line:** 88

---

### `FUNCTION` `getUsageStatus`

- **Line:** 92

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `current` | `number` | **Yes** | - | - |
| `average` | `number` | **Yes** | - | - |

---

### `VARIABLE` `ratio`

- **Line:** 96

---

### `FUNCTION` `UsageBadge`

- **Line:** 102

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ current, average }` | `{ current: number, average: number }` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 103

---

### `VARIABLE` `diff`

- **Line:** 104

---

### `VARIABLE` `pct`

- **Line:** 105

---

### `FUNCTION` `TopUsersClient`

- **Line:** 131
- **Returns:** `void`

---

### `VARIABLE` `loggedInCsName`

- **Line:** 133

---

### `FUNCTION` `fetchData`

- **Line:** 175
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `forceRefresh` | `any` | No | `false` | - |
| `rangeToFetch` | `any` | No | `appliedFilterDateRange` | - |
| `startToFetch` | `any` | No | `appliedCustomStartDate` | - |
| `endToFetch` | `any` | No | `appliedCustomEndDate` | - |

---

### `VARIABLE` `startTimePerf`

- **Line:** 181

---

### `VARIABLE` `startStr`

- **Line:** 185

---

### `VARIABLE` `endStr`

- **Line:** 186

---

### `VARIABLE` `today`

- **Line:** 188

---

### `VARIABLE` `startDate`

- **Line:** 191

---

### `VARIABLE` `endDate`

- **Line:** 192

---

### `VARIABLE` `range`

- **Line:** 195

---

### `VARIABLE` `url`

- **Line:** 214

---

### `VARIABLE` `res`

- **Line:** 215

---

### `VARIABLE` `data`

- **Line:** 217

---

### `FUNCTION` `handleApplyFilters`

- **Line:** 236

---

### `FUNCTION` `handleResetFilters`

- **Line:** 249

---

### `FUNCTION` `handleSaveCallOutcome`

- **Line:** 271
- **Async:** Yes

---

### `VARIABLE` `stat`

- **Line:** 274

---

### `VARIABLE` `companyId`

- **Line:** 275

---

### `VARIABLE` `nowStr`

- **Line:** 289

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 318

---

### `VARIABLE` `franchisees`

- **Line:** 319

---

### `VARIABLE` `filteredStats`

- **Line:** 323

---

### `VARIABLE` `result`

- **Line:** 324

---

### `VARIABLE` `status`

- **Line:** 342

---

### `VARIABLE` `statusA`

- **Line:** 355

---

### `VARIABLE` `statusB`

- **Line:** 356

---

### `VARIABLE` `valMap`

- **Line:** 357

---

### `VARIABLE` `statusA`

- **Line:** 362

---

### `VARIABLE` `statusB`

- **Line:** 363

---

### `VARIABLE` `valMap`

- **Line:** 364

---

### `FUNCTION` `handleExportCSV`

- **Line:** 372

---

### `VARIABLE` `headers`

- **Line:** 373

---

### `VARIABLE` `rows`

- **Line:** 395

---

### `VARIABLE` `wStatus`

- **Line:** 396

---

### `VARIABLE` `mStatus`

- **Line:** 397

---

### `VARIABLE` `csvContent`

- **Line:** 422

---

### `VARIABLE` `encodedUri`

- **Line:** 423

---

### `VARIABLE` `link`

- **Line:** 424

---

### `VARIABLE` `today`

- **Line:** 433

---

### `VARIABLE` `last7Start`

- **Line:** 435

---

### `VARIABLE` `last7DaysLabel`

- **Line:** 437

---

### `VARIABLE` `last30Start`

- **Line:** 439

---

### `VARIABLE` `last30DaysLabel`

- **Line:** 441

---

### `VARIABLE` `status`

- **Line:** 666

---

### `VARIABLE` `rowClass`

- **Line:** 670

---

