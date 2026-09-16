# Module: `src/app/api/scans/top-users/route.ts`

- **Language:** TypeScript
- **Total Lines:** 428
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 5

---

### `VARIABLE` `maxDuration`

- **Line:** 6

---

### `INTERFACE` `ScanRecord`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `scan_type` | `string` | No | - |
| `courier` | `string` | No | - |
| `updated_at` | `string` | No | - |
| `customer_ns_id` | `string` | Yes | - |
| `delivery_speed` | `string` | Yes | - |

---

### `INTERFACE` `PackageRecord`

- **Line:** 16

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `code` | `string` | No | - |
| `order_number` | `string` | No | - |
| `sync_date` | `string` | No | - |
| `scans` | `ScanRecord[]` | No | - |
| `latest_scan_at` | `string` | Yes | - |

---

### `INTERFACE` `CompanyMapEntry`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `prospectPlusId` | `string` | Yes | - |
| `name` | `string` | No | - |
| `franchisee` | `string` | No | - |
| `type` | `'companies' | 'leads'` | No | - |
| `contactName` | `string` | Yes | - |
| `phone` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `csCalled` | `boolean` | Yes | - |
| `csCallCount` | `number` | Yes | - |
| `lastContactedDate` | `string | null` | Yes | - |

---

### `INTERFACE` `CustomerStats`

- **Line:** 38

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
| `lastScanDate` | `string | null` | No | - |
| `lastContact` | `{
    date: string | null;
    type: string | null;
    author: string | null;
    notes: string | null;
  } | null` | Yes | - |

---

### `VARIABLE` `cache`

- **Line:** 67
- **Signature:** `{
  packages: PackageRecord[];
  timestamp: number;
} | null`

---

### `VARIABLE` `CACHE_DURATION_MS`

- **Line:** 72

---

### `FUNCTION` `parseDateString`

- **Line:** 74

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `FUNCTION` `GET`

- **Line:** 91
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `startDateParam`

- **Line:** 93

---

### `VARIABLE` `endDateParam`

- **Line:** 94

---

### `VARIABLE` `rangeParam`

- **Line:** 95

---

### `VARIABLE` `refreshParam`

- **Line:** 96

---

### `VARIABLE` `validRanges`

- **Line:** 97

---

### `VARIABLE` `db`

- **Line:** 99

---

### `VARIABLE` `cachedDoc`

- **Line:** 106

---

### `VARIABLE` `data`

- **Line:** 113

---

### `VARIABLE` `now`

- **Line:** 127

---

### `VARIABLE` `limitDays`

- **Line:** 132

---

### `VARIABLE` `start`

- **Line:** 134

---

### `VARIABLE` `diffDays`

- **Line:** 136

---

### `VARIABLE` `limitDate`

- **Line:** 146

---

### `VARIABLE` `limitDateStr`

- **Line:** 147

---

### `VARIABLE` `packagesSnap`

- **Line:** 149

---

### `VARIABLE` `packages`

- **Line:** 154

---

### `VARIABLE` `today`

- **Line:** 165

---

### `VARIABLE` `startDate`

- **Line:** 168

---

### `VARIABLE` `endDate`

- **Line:** 169

---

### `VARIABLE` `t`

- **Line:** 180

---

### `VARIABLE` `currentWeekStart`

- **Line:** 181

---

### `VARIABLE` `currentMonthStart`

- **Line:** 182

---

### `VARIABLE` `weeklyAvgStart`

- **Line:** 184

---

### `VARIABLE` `weeklyAvgEnd`

- **Line:** 185

---

### `VARIABLE` `monthlyAvgStart`

- **Line:** 187

---

### `VARIABLE` `monthlyAvgEnd`

- **Line:** 188

---

### `VARIABLE` `statsMap`

- **Line:** 190
- **Signature:** `Record<string, CustomerStats>`

---

### `VARIABLE` `hasExcludedScan`

- **Line:** 193

---

### `VARIABLE` `type`

- **Line:** 194

---

### `VARIABLE` `customerNsId`

- **Line:** 199

---

### `VARIABLE` `scanWithNsId`

- **Line:** 201

---

### `VARIABLE` `scanDate`

- **Line:** 222

---

### `VARIABLE` `st`

- **Line:** 231

---

### `VARIABLE` `currentLastScan`

- **Line:** 233

---

### `VARIABLE` `seenSpeeds`

- **Line:** 241

---

### `VARIABLE` `top100`

- **Line:** 265

---

### `VARIABLE` `top100NsIds`

- **Line:** 271

---

### `VARIABLE` `companyMap`

- **Line:** 272
- **Signature:** `Record<string, CompanyMapEntry>`

---

### `VARIABLE` `companyPromises`

- **Line:** 275

---

### `VARIABLE` `leadPromises`

- **Line:** 276

---

### `VARIABLE` `chunk`

- **Line:** 279

---

### `VARIABLE` `chunkNum`

- **Line:** 280

---

### `FUNCTION` `processDocs`

- **Line:** 297

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `snaps` | `any[]` | **Yes** | - | - |
| `type` | `'companies' | 'leads'` | **Yes** | - | - |

---

### `VARIABLE` `data`

- **Line:** 300

---

### `VARIABLE` `internalId`

- **Line:** 301

---

### `VARIABLE` `prospectPlusId`

- **Line:** 302

---

### `VARIABLE` `primaryContact`

- **Line:** 303

---

### `VARIABLE` `contactName`

- **Line:** 304

---

### `VARIABLE` `phone`

- **Line:** 305

---

### `VARIABLE` `email`

- **Line:** 306

---

### `VARIABLE` `entry`

- **Line:** 308
- **Signature:** `CompanyMapEntry`

---

### `VARIABLE` `company`

- **Line:** 333

---

### `VARIABLE` `activitySnap`

- **Line:** 357

---

### `VARIABLE` `activities`

- **Line:** 364

---

### `VARIABLE` `act`

- **Line:** 366

---

### `VARIABLE` `cachedDoc`

- **Line:** 406

---

### `VARIABLE` `data`

- **Line:** 413

---

