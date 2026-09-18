# Module: `functions/src/overdueHotLeadsReport.ts`

- **Language:** TypeScript
- **Total Lines:** 413
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `FUNCTION` `getSydneyLocal`

- **Line:** 5
- **Returns:** `Date`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `formatter`

- **Line:** 6

---

### `VARIABLE` `parts`

- **Line:** 16

---

### `VARIABLE` `partObj`

- **Line:** 17
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `calculateBusinessHoursSydney`

- **Line:** 31
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `start` | `Date` | **Yes** | - | - |
| `end` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `startSyd`

- **Line:** 34

---

### `VARIABLE` `endSyd`

- **Line:** 35

---

### `VARIABLE` `startDay`

- **Line:** 37

---

### `VARIABLE` `endDay`

- **Line:** 38

---

### `VARIABLE` `msPerDay`

- **Line:** 40

---

### `VARIABLE` `dayOfWeek`

- **Line:** 43

---

### `VARIABLE` `businessStart`

- **Line:** 46

---

### `VARIABLE` `businessEnd`

- **Line:** 48

---

### `VARIABLE` `clampedStart`

- **Line:** 51

---

### `VARIABLE` `clampedEnd`

- **Line:** 52

---

### `VARIABLE` `totalMs`

- **Line:** 57

---

### `VARIABLE` `startDayOfWeek`

- **Line:** 60

---

### `VARIABLE` `businessStart`

- **Line:** 62

---

### `VARIABLE` `businessEnd`

- **Line:** 64

---

### `VARIABLE` `clampedStart`

- **Line:** 67

---

### `VARIABLE` `currentDay`

- **Line:** 72

---

### `VARIABLE` `dayOfWeek`

- **Line:** 74

---

### `VARIABLE` `endDayOfWeek`

- **Line:** 82

---

### `VARIABLE` `businessStart`

- **Line:** 84

---

### `VARIABLE` `businessEnd`

- **Line:** 86

---

### `VARIABLE` `clampedEnd`

- **Line:** 89

---

### `FUNCTION` `parseLeadDate`

- **Line:** 96
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parts`

- **Line:** 105

---

### `VARIABLE` `parsed`

- **Line:** 111

---

### `FUNCTION` `runOverdueHotLeadsReport`

- **Line:** 117
- **Async:** Yes
- **Returns:** `Promise<any>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `recipients` | `string[]` | **Yes** | - | - |
| `fromAddress` | `string` | No | - | - |

---

### `VARIABLE` `db`

- **Line:** 123

---

### `VARIABLE` `now`

- **Line:** 124

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 126

---

### `VARIABLE` `parts`

- **Line:** 133

---

### `VARIABLE` `day`

- **Line:** 134

---

### `VARIABLE` `month`

- **Line:** 135

---

### `VARIABLE` `year`

- **Line:** 136

---

### `VARIABLE` `displayDateString`

- **Line:** 137

---

### `VARIABLE` `leadDocsMap`

- **Line:** 144

---

### `VARIABLE` `allHotLeadsDocs`

- **Line:** 147

---

### `INTERFACE` `OverdueLeadItem`

- **Line:** 149

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

- **Line:** 158
- **Signature:** `OverdueLeadItem[]`

---

### `VARIABLE` `amCounts`

- **Line:** 159
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `lead`

- **Line:** 162

---

### `VARIABLE` `statusStr`

- **Line:** 165

---

### `VARIABLE` `isHotLead`

- **Line:** 166

---

### `VARIABLE` `normStatus`

- **Line:** 170

---

### `VARIABLE` `isClosed`

- **Line:** 171

---

### `VARIABLE` `bucket`

- **Line:** 183

---

### `VARIABLE` `source`

- **Line:** 184

---

### `VARIABLE` `isInbound`

- **Line:** 185

---

### `VARIABLE` `enteredDate`

- **Line:** 189

---

### `VARIABLE` `cutoffDate`

- **Line:** 193

---

### `VARIABLE` `lastAction`

- **Line:** 196

---

### `VARIABLE` `actDates`

- **Line:** 198

---

### `VARIABLE` `bizHoursElapsed`

- **Line:** 208

---

### `VARIABLE` `calendarDaysOverdue`

- **Line:** 211

---

### `VARIABLE` `bizHoursOverdueVal`

- **Line:** 212

---

### `VARIABLE` `amAssigned`

- **Line:** 213

---

### `VARIABLE` `dayStr`

- **Line:** 215

---

### `VARIABLE` `monthStr`

- **Line:** 216

---

### `VARIABLE` `formattedEntered`

- **Line:** 217

---

### `VARIABLE` `amReport`

- **Line:** 233

---

### `VARIABLE` `leadRowsHtml`

- **Line:** 237

---

### `VARIABLE` `amRowsHtml`

- **Line:** 249

---

### `VARIABLE` `emailHtml`

- **Line:** 257

---

### `VARIABLE` `dailyOverdueHotLeadsReport`

- **Line:** 351

---

### `VARIABLE` `db`

- **Line:** 356

---

### `VARIABLE` `recipients`

- **Line:** 357
- **Signature:** `string[]`

---

### `VARIABLE` `frequency`

- **Line:** 358

---

### `VARIABLE` `fromAddress`

- **Line:** 359

---

### `VARIABLE` `configDoc`

- **Line:** 362

---

### `VARIABLE` `data`

- **Line:** 364

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 392

---

### `VARIABLE` `currentHour`

- **Line:** 398

---

### `VARIABLE` `targetHour`

- **Line:** 399

---

