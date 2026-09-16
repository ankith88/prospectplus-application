# Module: `src/app/api/admin/scans/send-test-calls-report/route.ts`

- **Language:** TypeScript
- **Total Lines:** 450
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 7

---

### `FUNCTION` `parseDuration`

- **Line:** 9
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `durationStr` | `string` | No | - | - |

---

### `VARIABLE` `minutesMatch`

- **Line:** 11

---

### `VARIABLE` `secondsMatch`

- **Line:** 12

---

### `VARIABLE` `minutes`

- **Line:** 13

---

### `VARIABLE` `seconds`

- **Line:** 14

---

### `FUNCTION` `formatDurationSeconds`

- **Line:** 18
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `totalSeconds` | `number` | **Yes** | - | - |

---

### `VARIABLE` `m`

- **Line:** 19

---

### `VARIABLE` `s`

- **Line:** 20

---

### `FUNCTION` `POST`

- **Line:** 25
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 27

---

### `VARIABLE` `db`

- **Line:** 34

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 36

---

### `VARIABLE` `dateString`

- **Line:** 43
- **Signature:** `string`

---

### `VARIABLE` `targetStart`

- **Line:** 44
- **Signature:** `Date`

---

### `VARIABLE` `targetEnd`

- **Line:** 45
- **Signature:** `Date`

---

### `VARIABLE` `now`

- **Line:** 53

---

### `VARIABLE` `parts`

- **Line:** 55

---

### `VARIABLE` `day`

- **Line:** 56

---

### `VARIABLE` `month`

- **Line:** 57

---

### `VARIABLE` `year`

- **Line:** 58

---

### `VARIABLE` `activityQuery`

- **Line:** 65

---

### `VARIABLE` `snapshot`

- **Line:** 66

---

### `VARIABLE` `rawCalls`

- **Line:** 68

---

### `VARIABLE` `data`

- **Line:** 69

---

### `VARIABLE` `callDate`

- **Line:** 77

---

### `VARIABLE` `leadIds`

- **Line:** 86

---

### `VARIABLE` `leadsData`

- **Line:** 87
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `chunk`

- **Line:** 90

---

### `VARIABLE` `leadsSnap`

- **Line:** 91

---

### `VARIABLE` `missingIds`

- **Line:** 97

---

### `VARIABLE` `chunk`

- **Line:** 100

---

### `VARIABLE` `companiesSnap`

- **Line:** 101

---

### `VARIABLE` `populatedCalls`

- **Line:** 109

---

### `VARIABLE` `lead`

- **Line:** 110

---

### `VARIABLE` `finalCalls`

- **Line:** 120
- **Signature:** `any[]`

---

### `VARIABLE` `callsByLead`

- **Line:** 121
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `outcomes`

- **Line:** 128

---

### `VARIABLE` `attempts`

- **Line:** 129

---

### `VARIABLE` `attemptTime`

- **Line:** 132

---

### `VARIABLE` `matched`

- **Line:** 133

---

### `VARIABLE` `uniqueCallIdCalls`

- **Line:** 139

---

### `VARIABLE` `seenCallIds`

- **Line:** 142

---

### `VARIABLE` `uniqueCallIdCallsDeduplicated`

- **Line:** 143

---

### `VARIABLE` `uniqueCallIdsCount`

- **Line:** 149

---

### `VARIABLE` `uniqueLeads`

- **Line:** 152

---

### `VARIABLE` `uniqueLeadsCount`

- **Line:** 153

---

### `VARIABLE` `uniqueCallIdsPerUser`

- **Line:** 156
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `callsByUser`

- **Line:** 157
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `durationByUser`

- **Line:** 158
- **Signature:** `Record<string, number[]>`

---

### `VARIABLE` `callsByBucket`

- **Line:** 160
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `uniqueCallIdsPerBucket`

- **Line:** 161
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `durationByBucket`

- **Line:** 162
- **Signature:** `Record<string, number[]>`

---

### `VARIABLE` `callsByUserBucket`

- **Line:** 164
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `uniqueCallIdsPerUserBucket`

- **Line:** 165
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `durationByUserBucket`

- **Line:** 166
- **Signature:** `Record<string, number[]>`

---

### `VARIABLE` `user`

- **Line:** 169

---

### `VARIABLE` `bucket`

- **Line:** 170

---

### `VARIABLE` `userBucketKey`

- **Line:** 171

---

### `VARIABLE` `user`

- **Line:** 180

---

### `VARIABLE` `bucket`

- **Line:** 181

---

### `VARIABLE` `userBucketKey`

- **Line:** 182

---

### `VARIABLE` `seconds`

- **Line:** 193

---

### `VARIABLE` `durations`

- **Line:** 207

---

### `VARIABLE` `avgDurationOverall`

- **Line:** 208

---

### `VARIABLE` `avgDurationPerUser`

- **Line:** 211
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `avg`

- **Line:** 213

---

### `VARIABLE` `avgDurationPerBucket`

- **Line:** 217
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `avg`

- **Line:** 219

---

### `VARIABLE` `avgDurationPerUserBucket`

- **Line:** 223
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `avg`

- **Line:** 225

---

### `VARIABLE` `bucketNamesMap`

- **Line:** 229
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `formatBucketLabel`

- **Line:** 240
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `bucketKey` | `string` | **Yes** | - | - |

---

### `VARIABLE` `key`

- **Line:** 242

---

### `VARIABLE` `userBreakdownRowsHtml`

- **Line:** 248

---

### `VARIABLE` `callsCount`

- **Line:** 249

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 250

---

### `VARIABLE` `avgDur`

- **Line:** 251

---

### `VARIABLE` `bucketBreakdownRowsHtml`

- **Line:** 261

---

### `VARIABLE` `callsCount`

- **Line:** 264

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 265

---

### `VARIABLE` `avgDur`

- **Line:** 266

---

### `VARIABLE` `userBucketBreakdownRowsHtml`

- **Line:** 276

---

### `VARIABLE` `callsCount`

- **Line:** 285

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 286

---

### `VARIABLE` `avgDur`

- **Line:** 287

---

### `VARIABLE` `emailHtml`

- **Line:** 298

---

### `VARIABLE` `fromAddress`

- **Line:** 421

---

### `VARIABLE` `configDoc`

- **Line:** 423

---

### `VARIABLE` `toStr`

- **Line:** 431

---

### `VARIABLE` `result`

- **Line:** 433

---

