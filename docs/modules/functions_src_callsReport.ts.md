# Module: `functions/src/callsReport.ts`

- **Language:** TypeScript
- **Total Lines:** 511
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `FUNCTION` `parseDuration`

- **Line:** 5
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `durationStr` | `string` | No | - | - |

---

### `VARIABLE` `minutesMatch`

- **Line:** 7

---

### `VARIABLE` `secondsMatch`

- **Line:** 8

---

### `VARIABLE` `minutes`

- **Line:** 9

---

### `VARIABLE` `seconds`

- **Line:** 10

---

### `FUNCTION` `formatDurationSeconds`

- **Line:** 14
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `totalSeconds` | `number` | **Yes** | - | - |

---

### `VARIABLE` `m`

- **Line:** 15

---

### `VARIABLE` `s`

- **Line:** 16

---

### `FUNCTION` `runCallsReport`

- **Line:** 21
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

- **Line:** 22

---

### `VARIABLE` `targetStart`

- **Line:** 27

---

### `VARIABLE` `targetEnd`

- **Line:** 28

---

### `VARIABLE` `snapshot`

- **Line:** 31

---

### `VARIABLE` `rawCalls`

- **Line:** 33

---

### `VARIABLE` `data`

- **Line:** 34

---

### `VARIABLE` `callDate`

- **Line:** 42

---

### `VARIABLE` `noCallsHtml`

- **Line:** 49

---

### `VARIABLE` `leadIds`

- **Line:** 93

---

### `VARIABLE` `leadsData`

- **Line:** 94
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `chunk`

- **Line:** 97

---

### `VARIABLE` `leadsSnap`

- **Line:** 98

---

### `VARIABLE` `missingIds`

- **Line:** 104

---

### `VARIABLE` `chunk`

- **Line:** 107

---

### `VARIABLE` `companiesSnap`

- **Line:** 108

---

### `VARIABLE` `populatedCalls`

- **Line:** 116

---

### `VARIABLE` `lead`

- **Line:** 117

---

### `VARIABLE` `finalCalls`

- **Line:** 127
- **Signature:** `any[]`

---

### `VARIABLE` `callsByLead`

- **Line:** 128
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `outcomes`

- **Line:** 135

---

### `VARIABLE` `attempts`

- **Line:** 136

---

### `VARIABLE` `attemptTime`

- **Line:** 139

---

### `VARIABLE` `matched`

- **Line:** 140

---

### `VARIABLE` `uniqueCallIdCalls`

- **Line:** 146

---

### `VARIABLE` `seenCallIds`

- **Line:** 147

---

### `VARIABLE` `uniqueCallIdCallsDeduplicated`

- **Line:** 148

---

### `VARIABLE` `uniqueCallIdsCount`

- **Line:** 153

---

### `VARIABLE` `uniqueLeads`

- **Line:** 156

---

### `VARIABLE` `uniqueLeadsCount`

- **Line:** 157

---

### `VARIABLE` `uniqueCallIdsPerUser`

- **Line:** 160
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `callsByUser`

- **Line:** 161
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `durationByUser`

- **Line:** 162
- **Signature:** `Record<string, number[]>`

---

### `VARIABLE` `callsByBucket`

- **Line:** 164
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `uniqueCallIdsPerBucket`

- **Line:** 165
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `durationByBucket`

- **Line:** 166
- **Signature:** `Record<string, number[]>`

---

### `VARIABLE` `callsByUserBucket`

- **Line:** 168
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `uniqueCallIdsPerUserBucket`

- **Line:** 169
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `durationByUserBucket`

- **Line:** 170
- **Signature:** `Record<string, number[]>`

---

### `VARIABLE` `user`

- **Line:** 173

---

### `VARIABLE` `bucket`

- **Line:** 174

---

### `VARIABLE` `userBucketKey`

- **Line:** 175

---

### `VARIABLE` `user`

- **Line:** 183

---

### `VARIABLE` `bucket`

- **Line:** 184

---

### `VARIABLE` `userBucketKey`

- **Line:** 185

---

### `VARIABLE` `seconds`

- **Line:** 196

---

### `VARIABLE` `durations`

- **Line:** 210

---

### `VARIABLE` `avgDurationOverall`

- **Line:** 211

---

### `VARIABLE` `avgDurationPerUser`

- **Line:** 214
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `avg`

- **Line:** 216

---

### `VARIABLE` `avgDurationPerBucket`

- **Line:** 220
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `avg`

- **Line:** 222

---

### `VARIABLE` `avgDurationPerUserBucket`

- **Line:** 226
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `avg`

- **Line:** 228

---

### `VARIABLE` `bucketNamesMap`

- **Line:** 232
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `formatBucketLabel`

- **Line:** 243
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `bucketKey` | `string` | **Yes** | - | - |

---

### `VARIABLE` `key`

- **Line:** 245

---

### `VARIABLE` `userBreakdownRowsHtml`

- **Line:** 251

---

### `VARIABLE` `callsCount`

- **Line:** 252

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 253

---

### `VARIABLE` `avgDur`

- **Line:** 254

---

### `VARIABLE` `bucketBreakdownRowsHtml`

- **Line:** 264

---

### `VARIABLE` `callsCount`

- **Line:** 267

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 268

---

### `VARIABLE` `avgDur`

- **Line:** 269

---

### `VARIABLE` `userBucketBreakdownRowsHtml`

- **Line:** 279

---

### `VARIABLE` `callsCount`

- **Line:** 288

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 289

---

### `VARIABLE` `avgDur`

- **Line:** 290

---

### `VARIABLE` `emailHtml`

- **Line:** 301

---

### `VARIABLE` `sendDailyCallsReport`

> Scheduled Cloud Function that runs daily at the selected time.

- **Line:** 436

---

### `VARIABLE` `db`

- **Line:** 443

---

### `VARIABLE` `recipients`

- **Line:** 444

---

### `VARIABLE` `frequency`

- **Line:** 445

---

### `VARIABLE` `fromAddress`

- **Line:** 446

---

### `VARIABLE` `configDoc`

- **Line:** 449

---

### `VARIABLE` `data`

- **Line:** 451

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 474

---

### `VARIABLE` `currentHour`

- **Line:** 480

---

### `VARIABLE` `targetHour`

- **Line:** 481

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 488

---

### `VARIABLE` `now`

- **Line:** 495

---

### `VARIABLE` `parts`

- **Line:** 498

---

### `VARIABLE` `day`

- **Line:** 499

---

### `VARIABLE` `month`

- **Line:** 500

---

### `VARIABLE` `year`

- **Line:** 501

---

### `VARIABLE` `dateString`

- **Line:** 503

---

