# Module: `src/app/api/scans/report/route.ts`

- **Language:** TypeScript
- **Total Lines:** 832
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 6

---

### `INTERFACE` `ScanRecord`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | No | - |
| `scan_type` | `string` | No | - |
| `courier` | `string` | No | - |
| `updated_at` | `string` | No | - |
| `customer_ns_id` | `string` | Yes | - |
| `delivery_speed` | `string` | Yes | - |
| `product_type` | `string` | Yes | - |
| `depot_id` | `string` | Yes | - |

---

### `INTERFACE` `PackageRecord`

- **Line:** 19

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `code` | `string` | No | - |
| `order_number` | `string` | No | - |
| `sync_date` | `string` | No | - |
| `scans` | `ScanRecord[]` | No | - |
| `real_time_status` | `{
    status: string;
    last_location?: string;
    estimated_delivery_date?: string;
    updated_at: string;
  }` | Yes | - |
| `latest_scan_at` | `string` | Yes | - |
| `franchisee_name` | `string` | Yes | - |
| `customer_name` | `string` | Yes | - |
| `connote_number` | `string` | Yes | - |
| `connote_numbers` | `string[]` | Yes | - |

---

### `VARIABLE` `AU_HOLIDAYS`

- **Line:** 37

---

### `FUNCTION` `parseDateString`

- **Line:** 44

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `FUNCTION` `toYMD`

- **Line:** 61

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `d` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `yyyy`

- **Line:** 62

---

### `VARIABLE` `mm`

- **Line:** 63

---

### `VARIABLE` `dd`

- **Line:** 64

---

### `FUNCTION` `getFormattedDateDDMMYYYY`

- **Line:** 68

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 70

---

### `VARIABLE` `yyyy`

- **Line:** 72

---

### `VARIABLE` `mm`

- **Line:** 73

---

### `VARIABLE` `dd`

- **Line:** 74

---

### `FUNCTION` `addWorkingDays`

- **Line:** 78

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `startDate` | `Date | string` | **Yes** | - | - |
| `days` | `number` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 79

---

### `VARIABLE` `count`

- **Line:** 82

---

### `VARIABLE` `dayOfWeek`

- **Line:** 85

---

### `FUNCTION` `getLocalIsoDate`

- **Line:** 95

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateString` | `string` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 97

---

### `VARIABLE` `yyyy`

- **Line:** 99

---

### `VARIABLE` `mm`

- **Line:** 100

---

### `VARIABLE` `dd`

- **Line:** 101

---

### `FUNCTION` `getSortableTime`

- **Line:** 105

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `str` | `string` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 107

---

### `VARIABLE` `match`

- **Line:** 109

---

### `FUNCTION` `normalizeStatus`

- **Line:** 117

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `lower`

- **Line:** 119

---

### `FUNCTION` `getPeriods`

- **Line:** 148

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterDateRange` | `string` | **Yes** | - | - |
| `customStartDate` | `string` | **Yes** | - | - |
| `customEndDate` | `string` | **Yes** | - | - |

---

### `VARIABLE` `today`

- **Line:** 149

---

### `VARIABLE` `todayStart`

- **Line:** 152

---

### `VARIABLE` `currentStart`

- **Line:** 155

---

### `VARIABLE` `currentEnd`

- **Line:** 156

---

### `VARIABLE` `prevStart`

- **Line:** 157

---

### `VARIABLE` `prevEnd`

- **Line:** 158

---

### `VARIABLE` `helperParam`

- **Line:** 161

---

### `VARIABLE` `range`

- **Line:** 162

---

### `VARIABLE` `diffTime`

- **Line:** 166

---

### `VARIABLE` `diffTime`

- **Line:** 180

---

### `VARIABLE` `COLORS`

- **Line:** 192

---

### `FUNCTION` `GET`

- **Line:** 194
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `filterBarcode`

- **Line:** 199

---

### `VARIABLE` `filterConnoteNumber`

- **Line:** 200

---

### `VARIABLE` `filterCustomer`

- **Line:** 201

---

### `VARIABLE` `filterUnlinked`

- **Line:** 202

---

### `VARIABLE` `filterDateRange`

- **Line:** 203

---

### `VARIABLE` `customStartDate`

- **Line:** 204

---

### `VARIABLE` `customEndDate`

- **Line:** 205

---

### `VARIABLE` `selectedSpeed`

- **Line:** 208

---

### `VARIABLE` `selectedScanType`

- **Line:** 209

---

### `VARIABLE` `selectedCourier`

- **Line:** 210

---

### `VARIABLE` `selectedFranchise`

- **Line:** 211

---

### `VARIABLE` `db`

- **Line:** 213

---

### `VARIABLE` `now`

- **Line:** 214

---

### `VARIABLE` `dateLimit`

- **Line:** 217

---

### `VARIABLE` `queryDateLimit`

- **Line:** 228

---

### `VARIABLE` `partnerLocationMap`

- **Line:** 234
- **Signature:** `Record<string, { id: string, name: string }>`

---

### `VARIABLE` `companyLookupMap`

- **Line:** 235

---

### `VARIABLE` `data`

- **Line:** 244

---

### `VARIABLE` `key`

- **Line:** 246

---

### `VARIABLE` `data`

- **Line:** 252

---

### `VARIABLE` `info`

- **Line:** 254

---

### `VARIABLE` `data`

- **Line:** 264

---

### `VARIABLE` `key`

- **Line:** 266

---

### `VARIABLE` `info`

- **Line:** 268

---

### `VARIABLE` `courierCount`

- **Line:** 278
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `speedCount`

- **Line:** 279
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `speedCustomerCount`

- **Line:** 280
- **Signature:** `Record<string, Set<string>>`

---

### `VARIABLE` `franchiseeCount`

- **Line:** 281
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `partnerLocationCount`

- **Line:** 282
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `customerCount`

- **Line:** 283
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `dateCount`

- **Line:** 284
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `productTypeDaily`

- **Line:** 285
- **Signature:** `Record<string, Record<string, number>>`

---

### `VARIABLE` `uniqueProductTypes`

- **Line:** 286

---

### `VARIABLE` `statusCount`

- **Line:** 287
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `locationCount`

- **Line:** 288
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `totalTransitDays`

- **Line:** 289

---

### `VARIABLE` `deliveredWithTransitTimeCount`

- **Line:** 290

---

### `VARIABLE` `onTimeDeliveryCount`

- **Line:** 291

---

### `VARIABLE` `totalDeliveredWithSyncDate`

- **Line:** 292

---

### `VARIABLE` `exceptionCount`

- **Line:** 293

---

### `VARIABLE` `missingRealTimeStatusCount`

- **Line:** 294

---

### `VARIABLE` `notDeliveredCount`

- **Line:** 295

---

### `VARIABLE` `etaVarianceSum`

- **Line:** 296

---

### `VARIABLE` `totalScans`

- **Line:** 297

---

### `VARIABLE` `lateDeliveries`

- **Line:** 298
- **Signature:** `Array<any>`

---

### `VARIABLE` `activeExceptions`

- **Line:** 299
- **Signature:** `Array<any>`

---

### `VARIABLE` `uniqueScanTypesSet`

- **Line:** 302

---

### `VARIABLE` `uniqueCouriersSet`

- **Line:** 303

---

### `VARIABLE` `uniqueSpeedsSet`

- **Line:** 304

---

### `VARIABLE` `uniqueFranchiseesSet`

- **Line:** 305

---

### `VARIABLE` `customerUsage`

- **Line:** 308
- **Signature:** `Record<string, {
      name: string;
      companyId: string | null;
      firstScanDate: Date | null;
      lastScanDate: Date | null;
      currentPeriodScans: number;
      prevPeriodScans: number;
      currentPeriodUniquePackages: Set<string>;
    }>`

---

### `VARIABLE` `filteredCount`

- **Line:** 318

---

### `FUNCTION` `getCompanyInfo`

- **Line:** 320

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `nsId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `key`

- **Line:** 321

---

### `VARIABLE` `query`

- **Line:** 326

---

### `VARIABLE` `packagesStream`

- **Line:** 330

---

### `VARIABLE` `pkg`

- **Line:** 333

---

### `VARIABLE` `customerNsId`

- **Line:** 345

---

### `VARIABLE` `scanWithNsId`

- **Line:** 347

---

### `VARIABLE` `companyName`

- **Line:** 351

---

### `VARIABLE` `franchisee`

- **Line:** 352

---

### `VARIABLE` `companyId`

- **Line:** 353
- **Signature:** `string | null`

---

### `VARIABLE` `rawStatus`

- **Line:** 356

---

### `VARIABLE` `rtStatus`

- **Line:** 357

---

### `VARIABLE` `isDelivered`

- **Line:** 358

---

### `VARIABLE` `isException`

- **Line:** 359

---

### `VARIABLE` `needsLookup`

- **Line:** 361

---

### `VARIABLE` `company`

- **Line:** 364

---

### `VARIABLE` `companyLower`

- **Line:** 372

---

### `VARIABLE` `matchesFilter`

- **Line:** 375

---

### `VARIABLE` `hasConnoteMatch`

- **Line:** 381

---

### `VARIABLE` `isSpecificSearch`

- **Line:** 393

---

### `FUNCTION` `checkDate`

- **Line:** 396

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 398

---

### `VARIABLE` `start`

- **Line:** 404

---

### `VARIABLE` `end`

- **Line:** 406

---

### `VARIABLE` `helperParam`

- **Line:** 415

---

### `VARIABLE` `range`

- **Line:** 416

---

### `VARIABLE` `fromDate`

- **Line:** 417

---

### `VARIABLE` `toDate`

- **Line:** 419

---

### `VARIABLE` `hasMatchingScan`

- **Line:** 425

---

### `VARIABLE` `latestScanFilter`

- **Line:** 431

---

### `VARIABLE` `hasExcludedScan`

- **Line:** 445

---

### `VARIABLE` `type`

- **Line:** 446

---

### `VARIABLE` `custHealthName`

- **Line:** 455

---

### `VARIABLE` `allDates`

- **Line:** 470
- **Signature:** `Date[]`

---

### `VARIABLE` `seenDates`

- **Line:** 496

---

### `VARIABLE` `seenDateProd`

- **Line:** 497

---

### `VARIABLE` `seenCouriers`

- **Line:** 498

---

### `VARIABLE` `seenSpeeds`

- **Line:** 499

---

### `VARIABLE` `scanLen`

- **Line:** 500

---

### `VARIABLE` `latestScan`

- **Line:** 507

---

### `VARIABLE` `depotId`

- **Line:** 514

---

### `VARIABLE` `locName`

- **Line:** 516

---

### `VARIABLE` `isMissingRealTime`

- **Line:** 523

---

### `VARIABLE` `loc`

- **Line:** 548

---

### `VARIABLE` `firstScan`

- **Line:** 553

---

### `VARIABLE` `firstScanDate`

- **Line:** 557

---

### `VARIABLE` `deliveredDate`

- **Line:** 558

---

### `VARIABLE` `diffTime`

- **Line:** 561

---

### `VARIABLE` `diffDays`

- **Line:** 563

---

### `VARIABLE` `syncDateObj`

- **Line:** 570

---

### `VARIABLE` `expectedDeliveryDate`

- **Line:** 571

---

### `VARIABLE` `dDateOnly`

- **Line:** 572

---

### `VARIABLE` `diffDays`

- **Line:** 590

---

### `VARIABLE` `courier`

- **Line:** 597

---

### `VARIABLE` `speed`

- **Line:** 603

---

### `VARIABLE` `custName`

- **Line:** 609

---

### `VARIABLE` `date`

- **Line:** 615

---

### `VARIABLE` `prodType`

- **Line:** 621

---

### `VARIABLE` `dateProdKey`

- **Line:** 623

---

### `VARIABLE` `activeCustomers`

- **Line:** 632
- **Signature:** `any[]`

---

### `VARIABLE` `newCustomers`

- **Line:** 633
- **Signature:** `any[]`

---

### `VARIABLE` `droppedCustomers`

- **Line:** 634
- **Signature:** `any[]`

---

### `VARIABLE` `atRiskCustomers`

- **Line:** 635
- **Signature:** `any[]`

---

### `VARIABLE` `todayEnd`

- **Line:** 638

---

### `VARIABLE` `twelveWeeksData`

- **Line:** 640
- **Signature:** `{ weekLabel: string, startDate: Date, endDate: Date, newCount: number, lostCount: number }[]`

---

### `VARIABLE` `wEnd`

- **Line:** 642

---

### `VARIABLE` `wStart`

- **Line:** 644

---

### `VARIABLE` `newCustomersLast12Weeks`

- **Line:** 657
- **Signature:** `any[]`

---

### `VARIABLE` `lostCustomersLast12Weeks`

- **Line:** 658
- **Signature:** `any[]`

---

### `VARIABLE` `totalActiveCurrentScans`

- **Line:** 660

---

### `VARIABLE` `totalActiveCurrentUniquePackages`

- **Line:** 661

---

### `VARIABLE` `weekNew`

- **Line:** 668

---

### `VARIABLE` `lostDate`

- **Line:** 680

---

### `VARIABLE` `weekLost`

- **Line:** 683

---

### `VARIABLE` `avgUniqueBarcodesPerActive`

- **Line:** 733

---

### `VARIABLE` `prevActiveCount`

- **Line:** 735

---

### `VARIABLE` `retainedCount`

- **Line:** 736

---

### `VARIABLE` `retentionRate`

- **Line:** 746

---

### `FUNCTION` `toChartData`

- **Line:** 748

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `obj` | `Record<string, number>` | **Yes** | - | - |
| `limit` | `any` | No | `20` | - |

---

### `VARIABLE` `productTypeDailyArr`

- **Line:** 755

---

### `VARIABLE` `timelineArr`

- **Line:** 760

---

### `VARIABLE` `scanTypes`

- **Line:** 766

---

### `VARIABLE` `couriers`

- **Line:** 768

---

### `VARIABLE` `speeds`

- **Line:** 770

---

### `VARIABLE` `franchisees`

- **Line:** 772

---

### `VARIABLE` `responseData`

- **Line:** 775

---

