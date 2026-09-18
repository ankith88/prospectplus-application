# Module: `src/components/scans/scans-reporting-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1316
- **Direct Dependencies:** 18 modules imported

## Exported Symbols & API

### `FUNCTION` `SectionHelp`

- **Line:** 22

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ content }` | `{ content: React.ReactNode }` | **Yes** | - | - |

---

### `INTERFACE` `ScanRecord`

- **Line:** 39

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | No | - |
| `scan_type` | `string` | No | - |
| `courier` | `string` | No | - |
| `updated_at` | `string` | No | - |
| `customer_ns_id` | `string` | Yes | - |
| `delivery_speed` | `string` | Yes | - |
| `product_type` | `string` | Yes | - |
| `depot_id` | `string` | Yes | - |

---

### `INTERFACE` `PackageRecord`

- **Line:** 50

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `code` | `string` | No | - |
| `order_number` | `string` | No | - |
| `sync_date` | `string` | No | - |
| `scans` | `ScanRecord[]` | No | - |
| `real_time_status` | `{
    status: string;
    last_location?: string;
    estimated_delivery_date?: string;
    updated_at: string;
  }` | Yes | - |

---

### `VARIABLE` `COLORS`

- **Line:** 63

---

### `VARIABLE` `AU_HOLIDAYS`

- **Line:** 66

---

### `FUNCTION` `parseDateString`

- **Line:** 73

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `FUNCTION` `toYMD`

- **Line:** 90

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date | string` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 91

---

### `VARIABLE` `yyyy`

- **Line:** 93

---

### `VARIABLE` `mm`

- **Line:** 94

---

### `VARIABLE` `dd`

- **Line:** 95

---

### `FUNCTION` `getFormattedDateDDMMYYYY`

- **Line:** 99

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 101

---

### `VARIABLE` `yyyy`

- **Line:** 103

---

### `VARIABLE` `mm`

- **Line:** 104

---

### `VARIABLE` `dd`

- **Line:** 105

---

### `FUNCTION` `addWorkingDays`

- **Line:** 109

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `startDate` | `Date | string` | **Yes** | - | - |
| `days` | `number` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 110

---

### `VARIABLE` `count`

- **Line:** 113

---

### `VARIABLE` `dayOfWeek`

- **Line:** 116

---

### `FUNCTION` `getLocalIsoDate`

- **Line:** 126

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 128

---

### `VARIABLE` `yyyy`

- **Line:** 130

---

### `VARIABLE` `mm`

- **Line:** 131

---

### `VARIABLE` `dd`

- **Line:** 132

---

### `FUNCTION` `getSortableTime`

- **Line:** 136

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `str` | `string` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 138

---

### `VARIABLE` `match`

- **Line:** 140

---

### `FUNCTION` `normalizeStatus`

- **Line:** 148

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `lower`

- **Line:** 150

---

### `FUNCTION` `getPeriods`

- **Line:** 180

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterDateRange` | `string` | **Yes** | - | - |
| `customStartDate` | `string` | **Yes** | - | - |
| `customEndDate` | `string` | **Yes** | - | - |

---

### `VARIABLE` `today`

- **Line:** 181

---

### `VARIABLE` `todayStart`

- **Line:** 184

---

### `VARIABLE` `currentStart`

- **Line:** 187

---

### `VARIABLE` `currentEnd`

- **Line:** 188

---

### `VARIABLE` `prevStart`

- **Line:** 189

---

### `VARIABLE` `prevEnd`

- **Line:** 190

---

### `VARIABLE` `helperParam`

- **Line:** 193

---

### `VARIABLE` `range`

- **Line:** 194

---

### `VARIABLE` `diffTime`

- **Line:** 198

---

### `VARIABLE` `diffTime`

- **Line:** 212

---

### `FUNCTION` `ScansReportingClient`

- **Line:** 224
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  hideFilters = false,
  hideExtraCharts = false,
  externalDateRange
}` | `{
  hideFilters?: boolean;
  hideExtraCharts?: boolean;
  externalDateRange?: { from?: Date; to?: Date };
}` | No | `{}` | - |

---

### `VARIABLE` `rangeVal`

- **Line:** 287

---

### `VARIABLE` `startVal`

- **Line:** 288

---

### `VARIABLE` `endVal`

- **Line:** 289

---

### `FUNCTION` `handleApplyFilters`

- **Line:** 304

---

### `FUNCTION` `handleResetFilters`

- **Line:** 320

---

### `VARIABLE` `defaultDateRange`

- **Line:** 321

---

### `VARIABLE` `defaultStart`

- **Line:** 322

---

### `VARIABLE` `defaultEnd`

- **Line:** 323

---

### `FUNCTION` `fetchData`

- **Line:** 353
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `params`

- **Line:** 356

---

### `VARIABLE` `res`

- **Line:** 370

---

### `VARIABLE` `data`

- **Line:** 372

---

### `FUNCTION` `merge`

- **Line:** 377

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `existing` | `{label: string, value: string}[]` | **Yes** | - | - |
| `incoming` | `{label: string, value: string}[]` | No | - | - |

---

### `VARIABLE` `map`

- **Line:** 378

---

### `VARIABLE` `metrics`

- **Line:** 403

---

### `VARIABLE` `uniqueScanTypes`

- **Line:** 404

---

### `VARIABLE` `uniqueCouriers`

- **Line:** 405

---

### `VARIABLE` `uniqueSpeeds`

- **Line:** 406

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 407

---

