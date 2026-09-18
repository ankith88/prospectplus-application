# Module: `functions/src/localmileJobsReport.ts`

- **Language:** TypeScript
- **Total Lines:** 325
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `FUNCTION` `parseDate`

- **Line:** 5
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 12

---

### `FUNCTION` `getSydneyDateRange`

- **Line:** 16
- **Returns:** `{ targetStart: Date; targetEnd: Date }`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | **Yes** | - | - |

---

### `VARIABLE` `d10`

- **Line:** 18

---

### `VARIABLE` `sydneyDayStr`

- **Line:** 19

---

### `VARIABLE` `offsetStr`

- **Line:** 20

---

### `VARIABLE` `targetStart`

- **Line:** 22

---

### `VARIABLE` `targetEnd`

- **Line:** 23

---

### `FUNCTION` `getYesterdaySydneyDateString`

- **Line:** 27
- **Returns:** `string`

---

### `VARIABLE` `sydneyNowStr`

- **Line:** 28

---

### `VARIABLE` `sydneyTodayDate`

- **Line:** 36

---

### `VARIABLE` `sydneyYesterdayDate`

- **Line:** 37

---

### `VARIABLE` `parts`

- **Line:** 39

---

### `VARIABLE` `day`

- **Line:** 46

---

### `VARIABLE` `month`

- **Line:** 47

---

### `VARIABLE` `year`

- **Line:** 48

---

### `FUNCTION` `runLocalMileJobsReport`

- **Line:** 53
- **Async:** Yes
- **Returns:** `Promise<any>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | **Yes** | - | - |
| `recipients` | `string[]` | **Yes** | - | - |
| `fromAddress` | `string` | No | - | - |

---

### `VARIABLE` `db`

- **Line:** 54

---

### `VARIABLE` `jobsSnap`

- **Line:** 61

---

### `VARIABLE` `leadCache`

- **Line:** 63

---

### `INTERFACE` `LocalMileJobReportItem`

- **Line:** 65

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

- **Line:** 77
- **Signature:** `LocalMileJobReportItem[]`

---

### `VARIABLE` `data`

- **Line:** 80

---

### `VARIABLE` `createdAtDate`

- **Line:** 81

---

### `VARIABLE` `parentLeadRef`

- **Line:** 86

---

### `VARIABLE` `leadId`

- **Line:** 87

---

### `VARIABLE` `leadData`

- **Line:** 89

---

### `VARIABLE` `leadSnap`

- **Line:** 91

---

### `VARIABLE` `customerName`

- **Line:** 98

---

### `VARIABLE` `customerStatus`

- **Line:** 99

---

### `VARIABLE` `franchisee`

- **Line:** 100

---

### `VARIABLE` `trialsRemaining`

- **Line:** 102

---

### `VARIABLE` `statusRaw`

- **Line:** 106

---

### `VARIABLE` `statusLower`

- **Line:** 107

---

### `VARIABLE` `isCompleted`

- **Line:** 108

---

### `VARIABLE` `totalJobsCreated`

- **Line:** 123

---

### `VARIABLE` `completedJobsCount`

- **Line:** 124

---

### `VARIABLE` `pendingJobsCount`

- **Line:** 125

---

### `VARIABLE` `uniqueCustomersCount`

- **Line:** 126

---

### `VARIABLE` `jobRowsHtml`

- **Line:** 128

---

### `VARIABLE` `isCompleted`

- **Line:** 129

---

### `VARIABLE` `statusBadgeColor`

- **Line:** 130

---

### `VARIABLE` `statusBadgeBg`

- **Line:** 131

---

### `VARIABLE` `statusBadgeBorder`

- **Line:** 132

---

### `VARIABLE` `emailHtml`

- **Line:** 160

---

### `VARIABLE` `dailyLocalMileJobsReport`

- **Line:** 259

---

### `VARIABLE` `db`

- **Line:** 265

---

### `VARIABLE` `recipients`

- **Line:** 267
- **Signature:** `string[]`

---

### `VARIABLE` `frequency`

- **Line:** 268

---

### `VARIABLE` `fromAddress`

- **Line:** 269

---

### `VARIABLE` `doc`

- **Line:** 272

---

### `VARIABLE` `data`

- **Line:** 274

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 302

---

### `VARIABLE` `currentHour`

- **Line:** 308

---

### `VARIABLE` `targetHour`

- **Line:** 309

---

### `VARIABLE` `dateString`

- **Line:** 316

---

