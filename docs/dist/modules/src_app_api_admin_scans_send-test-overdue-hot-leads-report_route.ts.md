# Module: `src/app/api/admin/scans/send-test-overdue-hot-leads-report/route.ts`

- **Language:** TypeScript
- **Total Lines:** 390
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 6

---

### `FUNCTION` `getSydneyLocal`

- **Line:** 8
- **Returns:** `Date`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `formatter`

- **Line:** 9

---

### `VARIABLE` `parts`

- **Line:** 19

---

### `VARIABLE` `partObj`

- **Line:** 20
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `calculateBusinessHoursSydney`

- **Line:** 34
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `start` | `Date` | **Yes** | - | - |
| `end` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `startSyd`

- **Line:** 37

---

### `VARIABLE` `endSyd`

- **Line:** 38

---

### `VARIABLE` `startDay`

- **Line:** 40

---

### `VARIABLE` `endDay`

- **Line:** 41

---

### `VARIABLE` `msPerDay`

- **Line:** 43

---

### `VARIABLE` `dayOfWeek`

- **Line:** 46

---

### `VARIABLE` `businessStart`

- **Line:** 49

---

### `VARIABLE` `businessEnd`

- **Line:** 51

---

### `VARIABLE` `clampedStart`

- **Line:** 54

---

### `VARIABLE` `clampedEnd`

- **Line:** 55

---

### `VARIABLE` `totalMs`

- **Line:** 60

---

### `VARIABLE` `startDayOfWeek`

- **Line:** 63

---

### `VARIABLE` `businessStart`

- **Line:** 65

---

### `VARIABLE` `businessEnd`

- **Line:** 67

---

### `VARIABLE` `clampedStart`

- **Line:** 70

---

### `VARIABLE` `currentDay`

- **Line:** 75

---

### `VARIABLE` `dayOfWeek`

- **Line:** 77

---

### `VARIABLE` `endDayOfWeek`

- **Line:** 85

---

### `VARIABLE` `businessStart`

- **Line:** 87

---

### `VARIABLE` `businessEnd`

- **Line:** 89

---

### `VARIABLE` `clampedEnd`

- **Line:** 92

---

### `FUNCTION` `parseLeadDate`

- **Line:** 99
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parts`

- **Line:** 108

---

### `VARIABLE` `parsed`

- **Line:** 114

---

### `FUNCTION` `POST`

- **Line:** 120
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 122

---

### `VARIABLE` `db`

- **Line:** 129

---

### `VARIABLE` `now`

- **Line:** 130

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 132

---

### `VARIABLE` `displayDateString`

- **Line:** 139
- **Signature:** `string`

---

### `VARIABLE` `parts`

- **Line:** 144

---

### `VARIABLE` `day`

- **Line:** 145

---

### `VARIABLE` `month`

- **Line:** 146

---

### `VARIABLE` `year`

- **Line:** 147

---

### `VARIABLE` `leadDocsMap`

- **Line:** 157

---

### `VARIABLE` `allHotLeadsDocs`

- **Line:** 160

---

### `INTERFACE` `OverdueLeadItem`

- **Line:** 162

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `companyName` | `string` | No | - |
| `accountManager` | `string` | No | - |
| `dateEnteredStr` | `string` | No | - |
| `calendarDaysOverdue` | `number` | No | - |
| `bizHoursOverdue` | `number` | No | - |

---

### `VARIABLE` `overdueLeads`

- **Line:** 171
- **Signature:** `OverdueLeadItem[]`

---

### `VARIABLE` `amCounts`

- **Line:** 172
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `lead`

- **Line:** 175

---

### `VARIABLE` `statusStr`

- **Line:** 178

---

### `VARIABLE` `isHotLead`

- **Line:** 179

---

### `VARIABLE` `normStatus`

- **Line:** 183

---

### `VARIABLE` `isClosed`

- **Line:** 184

---

### `VARIABLE` `bucket`

- **Line:** 196

---

### `VARIABLE` `source`

- **Line:** 197

---

### `VARIABLE` `isInbound`

- **Line:** 198

---

### `VARIABLE` `enteredDate`

- **Line:** 202

---

### `VARIABLE` `cutoffDate`

- **Line:** 206

---

### `VARIABLE` `lastAction`

- **Line:** 210

---

### `VARIABLE` `actDates`

- **Line:** 212

---

### `VARIABLE` `bizHoursElapsed`

- **Line:** 222

---

### `VARIABLE` `calendarDaysOverdue`

- **Line:** 225

---

### `VARIABLE` `bizHoursOverdueVal`

- **Line:** 226

---

### `VARIABLE` `amAssigned`

- **Line:** 227

---

### `VARIABLE` `dayStr`

- **Line:** 229

---

### `VARIABLE` `monthStr`

- **Line:** 230

---

### `VARIABLE` `formattedEntered`

- **Line:** 231

---

### `VARIABLE` `amReport`

- **Line:** 248

---

### `VARIABLE` `leadRowsHtml`

- **Line:** 252

---

### `VARIABLE` `amRowsHtml`

- **Line:** 264

---

### `VARIABLE` `emailHtml`

- **Line:** 272

---

### `VARIABLE` `toStr`

- **Line:** 358

---

### `VARIABLE` `fromAddress`

- **Line:** 359

---

### `VARIABLE` `configDoc`

- **Line:** 361

---

### `VARIABLE` `result`

- **Line:** 369

---

