# Module: `functions/lib/scans.js`

- **Language:** JavaScript
- **Total Lines:** 541

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

### `VARIABLE` `scheduler_1`

- **Line:** 39

---

### `VARIABLE` `admin`

- **Line:** 40

---

### `VARIABLE` `fetch`

- **Line:** 41

---

### `VARIABLE` `emailDispatcher_1`

- **Line:** 42

---

### `VARIABLE` `db`

- **Line:** 44

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 59

---

### `VARIABLE` `now`

- **Line:** 65

---

### `VARIABLE` `parts`

- **Line:** 67

---

### `VARIABLE` `day`

- **Line:** 68

---

### `VARIABLE` `month`

- **Line:** 69

---

### `VARIABLE` `year`

- **Line:** 70

---

### `VARIABLE` `dateString`

- **Line:** 72

---

### `VARIABLE` `apiUrl`

- **Line:** 74

---

### `VARIABLE` `options`

- **Line:** 75

---

### `VARIABLE` `response`

- **Line:** 84

---

### `VARIABLE` `responseData`

- **Line:** 88

---

### `VARIABLE` `barcodes`

- **Line:** 93

---

### `VARIABLE` `MAX_BATCH_SIZE`

- **Line:** 96

---

### `VARIABLE` `batch`

- **Line:** 97

---

### `VARIABLE` `operationCount`

- **Line:** 98

---

### `VARIABLE` `batchCount`

- **Line:** 99

---

### `VARIABLE` `packageRef`

- **Line:** 105

---

### `VARIABLE` `scans`

- **Line:** 106

---

### `VARIABLE` `latest_scan_at`

- **Line:** 107

---

### `VARIABLE` `maxScan`

- **Line:** 109

---

### `VARIABLE` `updatePayload`

- **Line:** 120

---

### `VARIABLE` `allPackagesSnapshot`

- **Line:** 171

---

### `VARIABLE` `activePackages`

- **Line:** 175

---

### `VARIABLE` `batch`

- **Line:** 177

---

### `VARIABLE` `operationCount`

- **Line:** 178

---

### `VARIABLE` `batchCount`

- **Line:** 179

---

### `VARIABLE` `CONCURRENCY_LIMIT`

- **Line:** 180

---

### `VARIABLE` `chunk`

- **Line:** 182

---

### `VARIABLE` `pkg`

- **Line:** 184

---

### `VARIABLE` `identifier`

- **Line:** 185

---

### `VARIABLE` `status`

- **Line:** 189

---

### `VARIABLE` `delivered`

- **Line:** 190

---

### `VARIABLE` `estimated_delivery_date`

- **Line:** 191

---

### `VARIABLE` `last_location`

- **Line:** 192

---

### `VARIABLE` `updated_at`

- **Line:** 193

---

### `VARIABLE` `apiUrl`

- **Line:** 194

---

### `VARIABLE` `options`

- **Line:** 195

---

### `VARIABLE` `response`

- **Line:** 203

---

### `VARIABLE` `responseData`

- **Line:** 208

---

### `VARIABLE` `event`

- **Line:** 210

---

### `FUNCTION` `runBarcodeReport`

> Core logic to generate daily report data, build a compliant email template,
and dispatch it via the automated email service.

- **Line:** 259
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

- **Line:** 260

---

### `VARIABLE` `snapshot`

- **Line:** 263

---

### `VARIABLE` `packages`

- **Line:** 266

---

### `VARIABLE` `filteredPackages`

- **Line:** 269

---

### `VARIABLE` `type`

- **Line:** 271

---

### `VARIABLE` `speedCounts`

- **Line:** 277

---

### `VARIABLE` `speedCustomerSets`

- **Line:** 278

---

### `VARIABLE` `groupCounts`

- **Line:** 281

---

### `VARIABLE` `speed`

- **Line:** 284

---

### `VARIABLE` `targetScan`

- **Line:** 285

---

### `VARIABLE` `type`

- **Line:** 286

---

### `VARIABLE` `anySpeed`

- **Line:** 293

---

### `VARIABLE` `customer`

- **Line:** 309

---

### `VARIABLE` `franchisee`

- **Line:** 315

---

### `VARIABLE` `groupKey`

- **Line:** 316

---

### `VARIABLE` `customerTotals`

- **Line:** 320

---

### `VARIABLE` `speedReport`

- **Line:** 325

---

### `VARIABLE` `groupReport`

- **Line:** 330

---

### `VARIABLE` `totalA`

- **Line:** 334

---

### `VARIABLE` `totalB`

- **Line:** 335

---

### `VARIABLE` `cComp`

- **Line:** 341

---

### `VARIABLE` `speedRowsHtml`

- **Line:** 348

---

### `VARIABLE` `groupRowsHtml`

- **Line:** 356

---

### `VARIABLE` `emailHtml`

- **Line:** 365

---

### `VARIABLE` `toStr`

- **Line:** 452

---

### `VARIABLE` `dispatchResult`

- **Line:** 453

---

### `VARIABLE` `db`

- **Line:** 480

---

### `VARIABLE` `recipients`

- **Line:** 481

---

### `VARIABLE` `frequency`

- **Line:** 482

---

### `VARIABLE` `fromAddress`

- **Line:** 483

---

### `VARIABLE` `configDoc`

- **Line:** 485

---

### `VARIABLE` `data`

- **Line:** 487

---

### `VARIABLE` `sydneyHourStr`

- **Line:** 509

---

### `VARIABLE` `currentHour`

- **Line:** 514

---

### `VARIABLE` `targetHour`

- **Line:** 515

---

### `VARIABLE` `sydneyFormatter`

- **Line:** 521

---

### `VARIABLE` `now`

- **Line:** 527

---

### `VARIABLE` `parts`

- **Line:** 529

---

### `VARIABLE` `day`

- **Line:** 530

---

### `VARIABLE` `month`

- **Line:** 531

---

### `VARIABLE` `year`

- **Line:** 532

---

### `VARIABLE` `dateString`

- **Line:** 533

---

