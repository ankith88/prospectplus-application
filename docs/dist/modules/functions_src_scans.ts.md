# Module: `functions/src/scans.ts`

- **Language:** TypeScript
- **Total Lines:** 567
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 8

---

### `VARIABLE` `syncScansDaily`

> Scheduled function that runs daily at 4 AM Sydney time.
It fetches the previous day's scan data from the MailPlus API
and syncs it to the Firestore `packages` collection.

- **Line:** 15

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 25

---

### `VARIABLE` `now`

- **Line:** 32

---

### `VARIABLE` `parts`

- **Line:** 35

---

### `VARIABLE` `day`

- **Line:** 36

---

### `VARIABLE` `month`

- **Line:** 37

---

### `VARIABLE` `year`

- **Line:** 38

---

### `VARIABLE` `dateString`

- **Line:** 41

---

### `VARIABLE` `apiUrl`

- **Line:** 44

---

### `VARIABLE` `options`

- **Line:** 46

---

### `VARIABLE` `response`

- **Line:** 56

---

### `VARIABLE` `responseData`

- **Line:** 62
- **Signature:** `any`

---

### `VARIABLE` `barcodes`

- **Line:** 69

---

### `VARIABLE` `MAX_BATCH_SIZE`

- **Line:** 73

---

### `VARIABLE` `batch`

- **Line:** 74

---

### `VARIABLE` `operationCount`

- **Line:** 75

---

### `VARIABLE` `batchCount`

- **Line:** 76

---

### `VARIABLE` `packageRef`

- **Line:** 84

---

### `VARIABLE` `scans`

- **Line:** 86

---

### `VARIABLE` `latest_scan_at`

- **Line:** 87

---

### `VARIABLE` `maxScan`

- **Line:** 89

---

### `VARIABLE` `updatePayload`

- **Line:** 99
- **Signature:** `any`

---

### `VARIABLE` `trackActivePackages`

> Scheduled function that runs hourly between 7 AM and 7 PM Sydney time.
It checks active packages and updates their real-time status
by querying our tracking endpoint logic.

- **Line:** 145

---

### `VARIABLE` `allPackagesSnapshot`

- **Line:** 157

---

### `VARIABLE` `activePackages`

- **Line:** 161

---

### `VARIABLE` `batch`

- **Line:** 165

---

### `VARIABLE` `operationCount`

- **Line:** 166

---

### `VARIABLE` `batchCount`

- **Line:** 167

---

### `VARIABLE` `CONCURRENCY_LIMIT`

- **Line:** 168

---

### `VARIABLE` `chunk`

- **Line:** 171

---

### `VARIABLE` `pkg`

- **Line:** 174

---

### `VARIABLE` `identifier`

- **Line:** 175

---

### `VARIABLE` `status`

- **Line:** 180

---

### `VARIABLE` `delivered`

- **Line:** 181

---

### `VARIABLE` `estimated_delivery_date`

- **Line:** 182
- **Signature:** `string | null`

---

### `VARIABLE` `last_location`

- **Line:** 183
- **Signature:** `string | null`

---

### `VARIABLE` `updated_at`

- **Line:** 184

---

### `VARIABLE` `apiUrl`

- **Line:** 186

---

### `VARIABLE` `options`

- **Line:** 187

---

### `VARIABLE` `response`

- **Line:** 196

---

### `VARIABLE` `responseData`

- **Line:** 200
- **Signature:** `any`

---

### `VARIABLE` `event`

- **Line:** 202

---

### `FUNCTION` `runBarcodeReport`

> Core logic to generate daily report data, build a compliant email template,
and dispatch it via the automated email service.

- **Line:** 255
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

- **Line:** 256

---

### `VARIABLE` `snapshot`

- **Line:** 261

---

### `VARIABLE` `packages`

- **Line:** 265

---

### `VARIABLE` `filteredPackages`

- **Line:** 269

---

### `VARIABLE` `type`

- **Line:** 271

---

### `VARIABLE` `speedCounts`

- **Line:** 279
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `speedCustomerSets`

- **Line:** 280
- **Signature:** `Record<string, Set<string>>`

---

### `VARIABLE` `groupCounts`

- **Line:** 284
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `speed`

- **Line:** 288

---

### `VARIABLE` `targetScan`

- **Line:** 289

---

### `VARIABLE` `type`

- **Line:** 290

---

### `VARIABLE` `anySpeed`

- **Line:** 297

---

### `VARIABLE` `customer`

- **Line:** 315

---

### `VARIABLE` `franchisee`

- **Line:** 322

---

### `VARIABLE` `groupKey`

- **Line:** 323

---

### `VARIABLE` `customerTotals`

- **Line:** 328
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `speedReport`

- **Line:** 334

---

### `VARIABLE` `groupReport`

- **Line:** 340

---

### `VARIABLE` `totalA`

- **Line:** 344

---

### `VARIABLE` `totalB`

- **Line:** 345

---

### `VARIABLE` `cComp`

- **Line:** 352

---

### `VARIABLE` `speedRowsHtml`

- **Line:** 360

---

### `VARIABLE` `groupRowsHtml`

- **Line:** 369

---

### `VARIABLE` `emailHtml`

- **Line:** 379

---

### `VARIABLE` `toStr`

- **Line:** 467

---

### `VARIABLE` `dispatchResult`

- **Line:** 468

---

### `VARIABLE` `sendDailyBarcodeReport`

> Scheduled Cloud Function that runs daily at 6:00 AM Sydney time.
Exposes a report showing unique package counts by delivery speed
and per franchisee/customer/delivery speed.

- **Line:** 491

---

### `VARIABLE` `db`

- **Line:** 498

---

### `VARIABLE` `recipients`

- **Line:** 499

---

### `VARIABLE` `frequency`

- **Line:** 500

---

### `VARIABLE` `fromAddress`

- **Line:** 501

---

### `VARIABLE` `configDoc`

- **Line:** 504

---

### `VARIABLE` `data`

- **Line:** 506

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 529

---

### `VARIABLE` `currentHour`

- **Line:** 535

---

### `VARIABLE` `targetHour`

- **Line:** 536

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 544

---

### `VARIABLE` `now`

- **Line:** 551

---

### `VARIABLE` `parts`

- **Line:** 554

---

### `VARIABLE` `day`

- **Line:** 555

---

### `VARIABLE` `month`

- **Line:** 556

---

### `VARIABLE` `year`

- **Line:** 557

---

### `VARIABLE` `dateString`

- **Line:** 559

---

