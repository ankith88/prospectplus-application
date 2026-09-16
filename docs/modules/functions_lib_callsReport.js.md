# Module: `functions/lib/callsReport.js`

- **Language:** JavaScript
- **Total Lines:** 514

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

### `FUNCTION` `parseDuration`

- **Line:** 41
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `durationStr` | `any` | **Yes** | - | - |

---

### `VARIABLE` `minutesMatch`

- **Line:** 44

---

### `VARIABLE` `secondsMatch`

- **Line:** 45

---

### `VARIABLE` `minutes`

- **Line:** 46

---

### `VARIABLE` `seconds`

- **Line:** 47

---

### `FUNCTION` `formatDurationSeconds`

- **Line:** 50
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `totalSeconds` | `any` | **Yes** | - | - |

---

### `VARIABLE` `m`

- **Line:** 51

---

### `VARIABLE` `s`

- **Line:** 52

---

### `FUNCTION` `runCallsReport`

- **Line:** 57
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `any` | **Yes** | - | - |
| `recipients` | `any` | **Yes** | - | - |
| `fromAddress` | `any` | **Yes** | - | - |

---

### `VARIABLE` `db`

- **Line:** 58

---

### `VARIABLE` `targetStart`

- **Line:** 62

---

### `VARIABLE` `targetEnd`

- **Line:** 63

---

### `VARIABLE` `snapshot`

- **Line:** 65

---

### `VARIABLE` `rawCalls`

- **Line:** 66

---

### `VARIABLE` `data`

- **Line:** 67

---

### `VARIABLE` `callDate`

- **Line:** 76

---

### `VARIABLE` `noCallsHtml`

- **Line:** 82

---

### `VARIABLE` `leadIds`

- **Line:** 124

---

### `VARIABLE` `leadsData`

- **Line:** 125

---

### `VARIABLE` `chunk`

- **Line:** 127

---

### `VARIABLE` `leadsSnap`

- **Line:** 128

---

### `VARIABLE` `missingIds`

- **Line:** 133

---

### `VARIABLE` `chunk`

- **Line:** 136

---

### `VARIABLE` `companiesSnap`

- **Line:** 137

---

### `VARIABLE` `populatedCalls`

- **Line:** 144

---

### `VARIABLE` `lead`

- **Line:** 145

---

### `VARIABLE` `finalCalls`

- **Line:** 154

---

### `VARIABLE` `callsByLead`

- **Line:** 155

---

### `VARIABLE` `outcomes`

- **Line:** 162

---

### `VARIABLE` `attempts`

- **Line:** 163

---

### `VARIABLE` `attemptTime`

- **Line:** 166

---

### `VARIABLE` `matched`

- **Line:** 167

---

### `VARIABLE` `uniqueCallIdCalls`

- **Line:** 173

---

### `VARIABLE` `seenCallIds`

- **Line:** 174

---

### `VARIABLE` `uniqueCallIdCallsDeduplicated`

- **Line:** 175

---

### `VARIABLE` `uniqueCallIdsCount`

- **Line:** 181

---

### `VARIABLE` `uniqueLeads`

- **Line:** 183

---

### `VARIABLE` `uniqueLeadsCount`

- **Line:** 184

---

### `VARIABLE` `uniqueCallIdsPerUser`

- **Line:** 186

---

### `VARIABLE` `callsByUser`

- **Line:** 187

---

### `VARIABLE` `durationByUser`

- **Line:** 188

---

### `VARIABLE` `callsByBucket`

- **Line:** 189

---

### `VARIABLE` `uniqueCallIdsPerBucket`

- **Line:** 190

---

### `VARIABLE` `durationByBucket`

- **Line:** 191

---

### `VARIABLE` `callsByUserBucket`

- **Line:** 192

---

### `VARIABLE` `uniqueCallIdsPerUserBucket`

- **Line:** 193

---

### `VARIABLE` `durationByUserBucket`

- **Line:** 194

---

### `VARIABLE` `user`

- **Line:** 196

---

### `VARIABLE` `bucket`

- **Line:** 197

---

### `VARIABLE` `userBucketKey`

- **Line:** 198

---

### `VARIABLE` `user`

- **Line:** 204

---

### `VARIABLE` `bucket`

- **Line:** 205

---

### `VARIABLE` `userBucketKey`

- **Line:** 206

---

### `VARIABLE` `seconds`

- **Line:** 216

---

### `VARIABLE` `durations`

- **Line:** 230

---

### `VARIABLE` `avgDurationOverall`

- **Line:** 231

---

### `VARIABLE` `avgDurationPerUser`

- **Line:** 233

---

### `VARIABLE` `avg`

- **Line:** 235

---

### `VARIABLE` `avgDurationPerBucket`

- **Line:** 238

---

### `VARIABLE` `avg`

- **Line:** 240

---

### `VARIABLE` `avgDurationPerUserBucket`

- **Line:** 243

---

### `VARIABLE` `avg`

- **Line:** 245

---

### `VARIABLE` `bucketNamesMap`

- **Line:** 248

---

### `FUNCTION` `formatBucketLabel`

- **Line:** 258

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `bucketKey` | `any` | **Yes** | - | - |

---

### `VARIABLE` `key`

- **Line:** 261

---

### `VARIABLE` `userBreakdownRowsHtml`

- **Line:** 267

---

### `VARIABLE` `callsCount`

- **Line:** 268

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 269

---

### `VARIABLE` `avgDur`

- **Line:** 270

---

### `VARIABLE` `bucketBreakdownRowsHtml`

- **Line:** 279

---

### `VARIABLE` `callsCount`

- **Line:** 282

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 283

---

### `VARIABLE` `avgDur`

- **Line:** 284

---

### `VARIABLE` `userBucketBreakdownRowsHtml`

- **Line:** 293

---

### `VARIABLE` `callsCount`

- **Line:** 303

---

### `VARIABLE` `uniqueCallIds`

- **Line:** 304

---

### `VARIABLE` `avgDur`

- **Line:** 305

---

### `VARIABLE` `emailHtml`

- **Line:** 315

---

### `VARIABLE` `db`

- **Line:** 454

---

### `VARIABLE` `recipients`

- **Line:** 455

---

### `VARIABLE` `frequency`

- **Line:** 456

---

### `VARIABLE` `fromAddress`

- **Line:** 457

---

### `VARIABLE` `configDoc`

- **Line:** 459

---

### `VARIABLE` `data`

- **Line:** 461

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 483

---

### `VARIABLE` `currentHour`

- **Line:** 488

---

### `VARIABLE` `targetHour`

- **Line:** 489

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 494

---

### `VARIABLE` `now`

- **Line:** 500

---

### `VARIABLE` `parts`

- **Line:** 502

---

### `VARIABLE` `day`

- **Line:** 503

---

### `VARIABLE` `month`

- **Line:** 504

---

### `VARIABLE` `year`

- **Line:** 505

---

### `VARIABLE` `dateString`

- **Line:** 506

---

