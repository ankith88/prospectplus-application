# Module: `functions/lib/overdueHotLeadsReport.js`

- **Language:** JavaScript
- **Total Lines:** 402

## Exported Symbols & API

### `VARIABLE` `__createBinding`

- **Line:** 2

---

### `VARIABLE` `desc`

- **Line:** 4

---

### `VARIABLE` `__setModuleDefault`

- **Line:** 13

---

### `VARIABLE` `__importStar`

- **Line:** 18

---

### `FUNCTION` `ownKeys`

- **Line:** 19

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `o` | `any` | **Yes** | - | - |

---

### `VARIABLE` `ar`

- **Line:** 21

---

### `VARIABLE` `result`

- **Line:** 29

---

### `VARIABLE` `functions`

- **Line:** 38

---

### `VARIABLE` `admin`

- **Line:** 39

---

### `VARIABLE` `emailDispatcher_1`

- **Line:** 40

---

### `FUNCTION` `getSydneyLocal`

- **Line:** 41
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `any` | **Yes** | - | - |

---

### `VARIABLE` `formatter`

- **Line:** 42

---

### `VARIABLE` `parts`

- **Line:** 52

---

### `VARIABLE` `partObj`

- **Line:** 53

---

### `FUNCTION` `calculateBusinessHoursSydney`

- **Line:** 59
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `start` | `any` | **Yes** | - | - |
| `end` | `any` | **Yes** | - | - |

---

### `VARIABLE` `startSyd`

- **Line:** 62

---

### `VARIABLE` `endSyd`

- **Line:** 63

---

### `VARIABLE` `startDay`

- **Line:** 64

---

### `VARIABLE` `endDay`

- **Line:** 65

---

### `VARIABLE` `msPerDay`

- **Line:** 66

---

### `VARIABLE` `dayOfWeek`

- **Line:** 68

---

### `VARIABLE` `businessStart`

- **Line:** 71

---

### `VARIABLE` `businessEnd`

- **Line:** 73

---

### `VARIABLE` `clampedStart`

- **Line:** 75

---

### `VARIABLE` `clampedEnd`

- **Line:** 76

---

### `VARIABLE` `totalMs`

- **Line:** 79

---

### `VARIABLE` `startDayOfWeek`

- **Line:** 81

---

### `VARIABLE` `businessStart`

- **Line:** 83

---

### `VARIABLE` `businessEnd`

- **Line:** 85

---

### `VARIABLE` `clampedStart`

- **Line:** 87

---

### `VARIABLE` `currentDay`

- **Line:** 91

---

### `VARIABLE` `dayOfWeek`

- **Line:** 93

---

### `VARIABLE` `endDayOfWeek`

- **Line:** 100

---

### `VARIABLE` `businessStart`

- **Line:** 102

---

### `VARIABLE` `businessEnd`

- **Line:** 104

---

### `VARIABLE` `clampedEnd`

- **Line:** 106

---

### `FUNCTION` `parseLeadDate`

- **Line:** 111
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parts`

- **Line:** 124

---

### `VARIABLE` `parsed`

- **Line:** 131

---

### `FUNCTION` `runOverdueHotLeadsReport`

- **Line:** 137
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `recipients` | `any` | **Yes** | - | - |
| `fromAddress` | `any` | **Yes** | - | - |

---

### `VARIABLE` `db`

- **Line:** 143

---

### `VARIABLE` `now`

- **Line:** 144

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 145

---

### `VARIABLE` `parts`

- **Line:** 151

---

### `VARIABLE` `day`

- **Line:** 152

---

### `VARIABLE` `month`

- **Line:** 153

---

### `VARIABLE` `year`

- **Line:** 154

---

### `VARIABLE` `displayDateString`

- **Line:** 155

---

### `VARIABLE` `leadDocsMap`

- **Line:** 160

---

### `VARIABLE` `allHotLeadsDocs`

- **Line:** 163

---

### `VARIABLE` `overdueLeads`

- **Line:** 164

---

### `VARIABLE` `amCounts`

- **Line:** 165

---

### `VARIABLE` `lead`

- **Line:** 167

---

### `VARIABLE` `statusStr`

- **Line:** 169

---

### `VARIABLE` `isHotLead`

- **Line:** 170

---

### `VARIABLE` `normStatus`

- **Line:** 174

---

### `VARIABLE` `isClosed`

- **Line:** 175

---

### `VARIABLE` `bucket`

- **Line:** 186

---

### `VARIABLE` `source`

- **Line:** 187

---

### `VARIABLE` `isInbound`

- **Line:** 188

---

### `VARIABLE` `enteredDate`

- **Line:** 192

---

### `VARIABLE` `cutoffDate`

- **Line:** 196

---

### `VARIABLE` `lastAction`

- **Line:** 199

---

### `VARIABLE` `actDates`

- **Line:** 201

---

### `VARIABLE` `bizHoursElapsed`

- **Line:** 210

---

### `VARIABLE` `calendarDaysOverdue`

- **Line:** 213

---

### `VARIABLE` `bizHoursOverdueVal`

- **Line:** 214

---

### `VARIABLE` `amAssigned`

- **Line:** 215

---

### `VARIABLE` `dayStr`

- **Line:** 216

---

### `VARIABLE` `monthStr`

- **Line:** 217

---

### `VARIABLE` `formattedEntered`

- **Line:** 218

---

### `VARIABLE` `amReport`

- **Line:** 230

---

### `VARIABLE` `leadRowsHtml`

- **Line:** 233

---

### `VARIABLE` `amRowsHtml`

- **Line:** 244

---

### `VARIABLE` `emailHtml`

- **Line:** 251

---

### `VARIABLE` `db`

- **Line:** 348

---

### `VARIABLE` `recipients`

- **Line:** 349

---

### `VARIABLE` `frequency`

- **Line:** 350

---

### `VARIABLE` `fromAddress`

- **Line:** 351

---

### `VARIABLE` `configDoc`

- **Line:** 353

---

### `VARIABLE` `data`

- **Line:** 355

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 383

---

### `VARIABLE` `currentHour`

- **Line:** 388

---

### `VARIABLE` `targetHour`

- **Line:** 389

---

