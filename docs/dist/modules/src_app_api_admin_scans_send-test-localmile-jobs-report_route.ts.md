# Module: `src/app/api/admin/scans/send-test-localmile-jobs-report/route.ts`

- **Language:** TypeScript
- **Total Lines:** 302
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 6

---

### `FUNCTION` `parseDate`

- **Line:** 8
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 15

---

### `FUNCTION` `POST`

- **Line:** 19
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 21

---

### `VARIABLE` `db`

- **Line:** 28

---

### `FUNCTION` `getSydneyDateRange`

- **Line:** 30
- **Returns:** `{ targetStart: Date; targetEnd: Date }`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `d10`

- **Line:** 32

---

### `VARIABLE` `sydneyDayStr`

- **Line:** 33

---

### `VARIABLE` `offsetStr`

- **Line:** 34

---

### `VARIABLE` `targetStart`

- **Line:** 36

---

### `VARIABLE` `targetEnd`

- **Line:** 37

---

### `FUNCTION` `getYesterdaySydneyDateString`

- **Line:** 41
- **Returns:** `string`

---

### `VARIABLE` `sydneyNowStr`

- **Line:** 42

---

### `VARIABLE` `sydneyTodayDate`

- **Line:** 50

---

### `VARIABLE` `sydneyYesterdayDate`

- **Line:** 51

---

### `VARIABLE` `parts`

- **Line:** 53

---

### `VARIABLE` `day`

- **Line:** 60

---

### `VARIABLE` `month`

- **Line:** 61

---

### `VARIABLE` `year`

- **Line:** 62

---

### `VARIABLE` `dateString`

- **Line:** 67
- **Signature:** `string`

---

### `VARIABLE` `targetStart`

- **Line:** 68
- **Signature:** `Date`

---

### `VARIABLE` `targetEnd`

- **Line:** 69
- **Signature:** `Date`

---

### `VARIABLE` `bounds`

- **Line:** 78

---

### `VARIABLE` `jobsSnap`

- **Line:** 83

---

### `VARIABLE` `leadCache`

- **Line:** 86

---

### `INTERFACE` `LocalMileJobReportItem`

- **Line:** 88

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `jobId` | `string` | No | - |
| `status` | `string` | No | - |
| `createdAtStr` | `string` | No | - |
| `leadId` | `string` | No | - |
| `customerName` | `string` | No | - |
| `customerStatus` | `string` | No | - |
| `franchisee` | `string` | No | - |
| `trialsRemaining` | `number` | No | - |
| `isCompleted` | `boolean` | No | - |

---

### `VARIABLE` `matchingJobs`

- **Line:** 100
- **Signature:** `LocalMileJobReportItem[]`

---

### `VARIABLE` `data`

- **Line:** 103

---

### `VARIABLE` `createdAtDate`

- **Line:** 104

---

### `VARIABLE` `parentLeadRef`

- **Line:** 109

---

### `VARIABLE` `leadId`

- **Line:** 110

---

### `VARIABLE` `leadData`

- **Line:** 112

---

### `VARIABLE` `leadSnap`

- **Line:** 114

---

### `VARIABLE` `customerName`

- **Line:** 121

---

### `VARIABLE` `customerStatus`

- **Line:** 122

---

### `VARIABLE` `franchisee`

- **Line:** 123

---

### `VARIABLE` `trialsRemaining`

- **Line:** 125

---

### `VARIABLE` `statusRaw`

- **Line:** 129

---

### `VARIABLE` `statusLower`

- **Line:** 130

---

### `VARIABLE` `isCompleted`

- **Line:** 131

---

### `VARIABLE` `totalJobsCreated`

- **Line:** 146

---

### `VARIABLE` `completedJobsCount`

- **Line:** 147

---

### `VARIABLE` `pendingJobsCount`

- **Line:** 148

---

### `VARIABLE` `uniqueCustomersCount`

- **Line:** 149

---

### `VARIABLE` `jobRowsHtml`

- **Line:** 152

---

### `VARIABLE` `isCompleted`

- **Line:** 153

---

### `VARIABLE` `statusBadgeColor`

- **Line:** 154

---

### `VARIABLE` `statusBadgeBg`

- **Line:** 155

---

### `VARIABLE` `statusBadgeBorder`

- **Line:** 156

---

### `VARIABLE` `emailHtml`

- **Line:** 184

---

### `VARIABLE` `fromAddress`

- **Line:** 273

---

### `VARIABLE` `configDoc`

- **Line:** 275

---

### `VARIABLE` `toStr`

- **Line:** 283

---

### `VARIABLE` `result`

- **Line:** 285

---

