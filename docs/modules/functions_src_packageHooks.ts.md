# Module: `functions/src/packageHooks.ts`

- **Language:** TypeScript
- **Total Lines:** 534
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 4

---

### `VARIABLE` `onPackageWrite`

- **Line:** 6

---

### `VARIABLE` `afterData`

- **Line:** 10

---

### `VARIABLE` `beforeData`

- **Line:** 11

---

### `VARIABLE` `packageId`

- **Line:** 12

---

### `VARIABLE` `isDelivered`

- **Line:** 21

---

### `VARIABLE` `customerNsId`

- **Line:** 27

---

### `VARIABLE` `scanWithNsId`

- **Line:** 29

---

### `VARIABLE` `latestScanAt`

- **Line:** 36

---

### `VARIABLE` `connoteNumbers`

- **Line:** 37
- **Signature:** `string[]`

---

### `VARIABLE` `latestConnoteNumber`

- **Line:** 38

---

### `VARIABLE` `latestScan`

- **Line:** 40

---

### `VARIABLE` `previousCustomerNsId`

- **Line:** 58

---

### `VARIABLE` `needsDenormalization`

- **Line:** 59

---

### `VARIABLE` `updatePayload`

- **Line:** 61
- **Signature:** `any`

---

### `VARIABLE` `hasConnoteNumbersChanged`

- **Line:** 66

---

### `VARIABLE` `customerName`

- **Line:** 78

---

### `VARIABLE` `franchiseeName`

- **Line:** 79

---

### `VARIABLE` `companyFound`

- **Line:** 83

---

### `VARIABLE` `companiesQuery`

- **Line:** 85

---

### `VARIABLE` `compData`

- **Line:** 87

---

### `VARIABLE` `companiesQueryStr`

- **Line:** 93

---

### `VARIABLE` `compData`

- **Line:** 95

---

### `VARIABLE` `leadsQuery`

- **Line:** 103

---

### `VARIABLE` `leadData`

- **Line:** 105

---

### `VARIABLE` `leadsQueryStr`

- **Line:** 109

---

### `VARIABLE` `leadData`

- **Line:** 111

---

### `VARIABLE` `aggregateScanMetrics`

- **Line:** 135

---

### `VARIABLE` `today`

- **Line:** 143

---

### `VARIABLE` `firstDayOfMonth`

- **Line:** 144

---

### `VARIABLE` `packagesRef`

- **Line:** 147

---

### `VARIABLE` `snapshot`

- **Line:** 148

---

### `VARIABLE` `totalPackages`

- **Line:** 150

---

### `VARIABLE` `totalScans`

- **Line:** 151

---

### `VARIABLE` `onTimeDeliveryCount`

- **Line:** 152

---

### `VARIABLE` `totalDeliveredWithSyncDate`

- **Line:** 153

---

### `VARIABLE` `exceptionCount`

- **Line:** 154

---

### `VARIABLE` `courierCount`

- **Line:** 156
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `statusCount`

- **Line:** 157
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `pkg`

- **Line:** 160

---

### `VARIABLE` `updatedAtDate`

- **Line:** 163

---

### `VARIABLE` `scanLen`

- **Line:** 167

---

### `VARIABLE` `rtStatus`

- **Line:** 170

---

### `VARIABLE` `courier`

- **Line:** 183

---

### `VARIABLE` `refreshTopUsersReportDaily`

> Scheduled function that runs daily at 7 AM Sydney time.
Automatically recalculates and caches the Top 100 Barcode Users report
for all preset date ranges in Firestore.

- **Line:** 214

---

### `FUNCTION` `cacheTopUsersReport`

- **Line:** 225
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `db` | `admin.firestore.Firestore` | **Yes** | - | - |

---

### `VARIABLE` `todayForLimit`

- **Line:** 229

---

### `VARIABLE` `limitDate`

- **Line:** 231

---

### `VARIABLE` `limitDateStr`

- **Line:** 232

---

### `VARIABLE` `packagesSnap`

- **Line:** 234

---

### `VARIABLE` `packages`

- **Line:** 239

---

### `VARIABLE` `presets`

- **Line:** 242

---

### `FUNCTION` `parseDateString`

- **Line:** 253

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 270

---

### `FUNCTION` `getDatesForPreset`

- **Line:** 272

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `preset` | `string` | **Yes** | - | - |

---

### `VARIABLE` `today`

- **Line:** 273

---

### `FUNCTION` `startOfDay`

- **Line:** 276

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `r`

- **Line:** 276

---

### `FUNCTION` `endOfDay`

- **Line:** 277

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `r`

- **Line:** 277

---

### `FUNCTION` `subDays`

- **Line:** 278

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |
| `n` | `number` | **Yes** | - | - |

---

### `VARIABLE` `r`

- **Line:** 278

---

### `VARIABLE` `yesterday`

- **Line:** 284

---

### `VARIABLE` `start`

- **Line:** 288

---

### `VARIABLE` `day`

- **Line:** 289

---

### `VARIABLE` `diff`

- **Line:** 290

---

### `VARIABLE` `start`

- **Line:** 295

---

### `VARIABLE` `start`

- **Line:** 299

---

### `VARIABLE` `start`

- **Line:** 303

---

### `VARIABLE` `start`

- **Line:** 307

---

### `VARIABLE` `end`

- **Line:** 308

---

### `VARIABLE` `start`

- **Line:** 312

---

### `VARIABLE` `t`

- **Line:** 323

---

### `VARIABLE` `currentWeekStart`

- **Line:** 324

---

### `VARIABLE` `currentMonthStart`

- **Line:** 325

---

### `VARIABLE` `weeklyAvgStart`

- **Line:** 327

---

### `VARIABLE` `weeklyAvgEnd`

- **Line:** 328

---

### `VARIABLE` `monthlyAvgStart`

- **Line:** 330

---

### `VARIABLE` `monthlyAvgEnd`

- **Line:** 331

---

### `VARIABLE` `statsMap`

- **Line:** 333
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `hasExcludedScan`

- **Line:** 336

---

### `VARIABLE` `type`

- **Line:** 337

---

### `VARIABLE` `customerNsId`

- **Line:** 342

---

### `VARIABLE` `scanWithNsId`

- **Line:** 344

---

### `VARIABLE` `scanDate`

- **Line:** 365

---

### `VARIABLE` `st`

- **Line:** 374

---

### `VARIABLE` `currentLastScan`

- **Line:** 376

---

### `VARIABLE` `seenSpeeds`

- **Line:** 384

---

### `VARIABLE` `top100`

- **Line:** 407

---

### `VARIABLE` `top100NsIds`

- **Line:** 412

---

### `VARIABLE` `companyMap`

- **Line:** 413
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `companyPromises`

- **Line:** 416

---

### `VARIABLE` `leadPromises`

- **Line:** 417

---

### `VARIABLE` `chunk`

- **Line:** 419

---

### `VARIABLE` `chunkNum`

- **Line:** 420

---

### `FUNCTION` `processDocs`

- **Line:** 437

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `snaps` | `any[]` | **Yes** | - | - |
| `type` | `'companies' | 'leads'` | **Yes** | - | - |

---

### `VARIABLE` `data`

- **Line:** 440

---

### `VARIABLE` `internalId`

- **Line:** 441

---

### `VARIABLE` `prospectPlusId`

- **Line:** 442

---

### `VARIABLE` `primaryContact`

- **Line:** 443

---

### `VARIABLE` `contactName`

- **Line:** 444

---

### `VARIABLE` `phone`

- **Line:** 445

---

### `VARIABLE` `email`

- **Line:** 446

---

### `VARIABLE` `entry`

- **Line:** 448

---

### `VARIABLE` `company`

- **Line:** 472

---

### `VARIABLE` `activitySnap`

- **Line:** 495

---

### `VARIABLE` `activities`

- **Line:** 502

---

### `VARIABLE` `act`

- **Line:** 504

---

