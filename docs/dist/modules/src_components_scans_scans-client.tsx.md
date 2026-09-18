# Module: `src/components/scans/scans-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1215
- **Direct Dependencies:** 17 modules imported

## Exported Symbols & API

### `INTERFACE` `Scan`

- **Line:** 28

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | No | - |
| `scan_type` | `string` | No | - |
| `courier` | `string` | No | - |
| `updated_at` | `string` | No | - |
| `receiver_name` | `string` | Yes | - |
| `receiver_suburb` | `string` | Yes | - |
| `futile_reason` | `string` | Yes | - |
| `customer_ns_id` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `post_code` | `string` | Yes | - |
| `state` | `string` | Yes | - |
| `address1` | `string` | Yes | - |
| `address2` | `string` | Yes | - |
| `phone` | `string` | Yes | - |
| `delivery_speed` | `string` | Yes | - |
| `product_type` | `string` | Yes | - |
| `depot_id` | `string` | Yes | - |
| `delivery_zone` | `string` | Yes | - |
| `operator_ns_id` | `string` | Yes | - |
| `connote_number` | `string` | Yes | - |

---

### `INTERFACE` `PackageRecord`

- **Line:** 51

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `code` | `string` | No | - |
| `manifested_at` | `string | null` | No | - |
| `weight` | `string` | No | - |
| `order_number` | `string` | No | - |
| `connote_number` | `string` | Yes | - |
| `connote_numbers` | `string[]` | Yes | - |
| `sync_date` | `string` | No | - |
| `scans` | `Scan[]` | No | - |
| `real_time_status` | `{ 
    status: string; 
    updated_at: string; 
    delivered: boolean;
    estimated_delivery_date?: string | null;
    last_location?: string | null;
  }` | Yes | - |
| `operator_ns_id` | `string` | Yes | - |

---

### `FUNCTION` `parseDateString`

- **Line:** 70

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getBadgeColor`

- **Line:** 87

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

### `VARIABLE` `t`

- **Line:** 88

---

### `FUNCTION` `isMissingRealTimeStatus`

- **Line:** 95

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pkg` | `PackageRecord` | **Yes** | - | - |

---

### `VARIABLE` `statusLower`

- **Line:** 97

---

### `FUNCTION` `ScansClient`

- **Line:** 101
- **Returns:** `void`

---

### `VARIABLE` `itemsPerPage`

- **Line:** 126

---

### `VARIABLE` `params`

- **Line:** 130

---

### `VARIABLE` `barcode`

- **Line:** 131

---

### `VARIABLE` `handler`

- **Line:** 147

---

### `VARIABLE` `handler`

- **Line:** 154

---

### `FUNCTION` `fetchData`

- **Line:** 161
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `pkgs`

- **Line:** 164
- **Signature:** `PackageRecord[]`

---

### `VARIABLE` `q`

- **Line:** 168

---

### `VARIABLE` `snap`

- **Line:** 172

---

### `VARIABLE` `q`

- **Line:** 176

---

### `VARIABLE` `snap`

- **Line:** 180

---

### `VARIABLE` `rangeNameMap`

- **Line:** 184
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `actualStart`

- **Line:** 193
- **Signature:** `Date`

---

### `VARIABLE` `actualEnd`

- **Line:** 194
- **Signature:** `Date | null`

---

### `VARIABLE` `now`

- **Line:** 195

---

### `VARIABLE` `mappedName`

- **Line:** 198

---

### `VARIABLE` `range`

- **Line:** 200

---

### `VARIABLE` `startD`

- **Line:** 206

---

### `VARIABLE` `endD`

- **Line:** 209

---

### `VARIABLE` `queryStart`

- **Line:** 218

---

### `VARIABLE` `q`

- **Line:** 223

---

### `VARIABLE` `snap`

- **Line:** 235

---

### `VARIABLE` `searchBarcode`

- **Line:** 240
- **Signature:** `string | null`

---

### `VARIABLE` `params`

- **Line:** 242

---

### `VARIABLE` `hasBarcode`

- **Line:** 246

---

### `VARIABLE` `barcodeQ`

- **Line:** 248

---

### `VARIABLE` `barcodeSnap`

- **Line:** 252

---

### `VARIABLE` `extraPkgs`

- **Line:** 254

---

### `VARIABLE` `pLocMap`

- **Line:** 260
- **Signature:** `Record<string, { id: string, name: string }>`

---

### `VARIABLE` `pLocSnap`

- **Line:** 261

---

### `VARIABLE` `data`

- **Line:** 263

---

### `VARIABLE` `key`

- **Line:** 265

---

### `FUNCTION` `toggleRow`

- **Line:** 284

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `code` | `string` | **Yes** | - | - |

---

### `VARIABLE` `newExpanded`

- **Line:** 285

---

### `FUNCTION` `exportToCSV`

- **Line:** 294

---

### `VARIABLE` `headers`

- **Line:** 295

---

### `VARIABLE` `rows`

- **Line:** 296

---

### `VARIABLE` `customerNsId`

- **Line:** 297

---

### `VARIABLE` `scanWithNsId`

- **Line:** 299

---

### `VARIABLE` `company`

- **Line:** 302

---

### `VARIABLE` `latestScan`

- **Line:** 304

---

### `VARIABLE` `courierSpeed`

- **Line:** 311

---

### `VARIABLE` `recDetails`

- **Line:** 312

---

### `VARIABLE` `operatorNsId`

- **Line:** 314

---

### `VARIABLE` `scanWithOpNsId`

- **Line:** 316

---

### `VARIABLE` `operator`

- **Line:** 320

---

### `VARIABLE` `operatorName`

- **Line:** 321

---

### `VARIABLE` `csvContent`

- **Line:** 339

---

### `VARIABLE` `blob`

- **Line:** 340

---

### `VARIABLE` `url`

- **Line:** 341

---

### `VARIABLE` `link`

- **Line:** 342

---

### `FUNCTION` `handleCheckStatus`

- **Line:** 350
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pkg` | `PackageRecord` | **Yes** | - | - |

---

### `VARIABLE` `identifier`

- **Line:** 353

---

### `VARIABLE` `res`

- **Line:** 355

---

### `VARIABLE` `data`

- **Line:** 357

---

### `FUNCTION` `handleBulkCheckStatus`

- **Line:** 381
- **Async:** Yes

---

### `VARIABLE` `barcodesArray`

- **Line:** 385

---

### `VARIABLE` `jobsRef`

- **Line:** 386

---

### `FUNCTION` `getPackageCompanyInfo`

- **Line:** 403

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pkg` | `PackageRecord` | **Yes** | - | - |

---

### `VARIABLE` `customerNsId`

- **Line:** 404

---

### `VARIABLE` `scanWithNsId`

- **Line:** 406

---

### `VARIABLE` `company`

- **Line:** 409

---

### `VARIABLE` `companyName`

- **Line:** 410

---

### `VARIABLE` `franchisee`

- **Line:** 411

---

### `FUNCTION` `matchesCustomDate`

- **Line:** 415

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string | null | undefined` | **Yes** | - | - |
| `targetYYYYMMDD` | `string` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 417

---

### `VARIABLE` `localIso`

- **Line:** 421

---

### `VARIABLE` `utcIso`

- **Line:** 425

---

### `VARIABLE` `uniqueScanTypes`

- **Line:** 432

---

### `VARIABLE` `uniqueCouriers`

- **Line:** 434

---

### `VARIABLE` `uniqueSpeeds`

- **Line:** 436

---

### `VARIABLE` `uniqueProductTypes`

- **Line:** 438

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 440

---

### `VARIABLE` `filteredPackages`

- **Line:** 443

---

### `VARIABLE` `companyNameLower`

- **Line:** 445

---

### `FUNCTION` `hasExcludedScans`

- **Line:** 447

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `p` | `PackageRecord` | **Yes** | - | - |

---

### `VARIABLE` `type`

- **Line:** 449

---

### `VARIABLE` `isLinked`

- **Line:** 454

---

### `VARIABLE` `hasConnoteMatch`

- **Line:** 461

---

### `VARIABLE` `latestScanFilter`

- **Line:** 474

---

### `FUNCTION` `checkDate`

- **Line:** 485

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 487

---

### `VARIABLE` `rangeNameMap`

- **Line:** 490
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `mappedName`

- **Line:** 500

---

### `VARIABLE` `range`

- **Line:** 502

---

### `VARIABLE` `scanTime`

- **Line:** 504

---

### `VARIABLE` `hasMatchingScan`

- **Line:** 514

---

### `VARIABLE` `hasMatchingSync`

- **Line:** 515

---

### `VARIABLE` `hasMatchingScan`

- **Line:** 518

---

### `VARIABLE` `rec`

- **Line:** 524

---

### `VARIABLE` `rName`

- **Line:** 525

---

### `VARIABLE` `rSub`

- **Line:** 526

---

### `VARIABLE` `rState`

- **Line:** 527

---

### `VARIABLE` `rPost`

- **Line:** 528

---

### `VARIABLE` `sortedFilteredPackages`

- **Line:** 541

---

### `FUNCTION` `getProps`

- **Line:** 542

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pkg` | `PackageRecord` | **Yes** | - | - |

---

### `VARIABLE` `latest`

- **Line:** 543

---

### `VARIABLE` `scanDate`

- **Line:** 547

---

### `VARIABLE` `customerName`

- **Line:** 548

---

### `VARIABLE` `courierSpeed`

- **Line:** 549

---

### `VARIABLE` `weightStr`

- **Line:** 551

---

### `VARIABLE` `weight`

- **Line:** 552

---

### `VARIABLE` `propsA`

- **Line:** 557

---

### `VARIABLE` `propsB`

- **Line:** 558

---

### `VARIABLE` `totalPages`

- **Line:** 572

---

### `VARIABLE` `paginatedPackages`

- **Line:** 573

---

### `FUNCTION` `loadVisibleMetadata`

- **Line:** 579
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `uniqueNsIds`

- **Line:** 580

---

### `VARIABLE` `uniqueOpIds`

- **Line:** 581

---

### `VARIABLE` `customerNsId`

- **Line:** 585

---

### `VARIABLE` `scanWithNsId`

- **Line:** 587

---

### `VARIABLE` `operatorNsId`

- **Line:** 595

---

### `VARIABLE` `scanWithOpNsId`

- **Line:** 597

---

### `VARIABLE` `nsIdArray`

- **Line:** 605

---

### `VARIABLE` `opIdArray`

- **Line:** 606

---

### `VARIABLE` `companyPromises`

- **Line:** 611

---

### `VARIABLE` `leadPromises`

- **Line:** 612

---

### `VARIABLE` `operatorPromises`

- **Line:** 613

---

### `VARIABLE` `queryTerms`

- **Line:** 616
- **Signature:** `(string | number)[]`

---

### `VARIABLE` `num`

- **Line:** 619

---

### `VARIABLE` `chunk`

- **Line:** 627

---

### `VARIABLE` `chunk`

- **Line:** 634

---

### `VARIABLE` `newCMap`

- **Line:** 644
- **Signature:** `Record<string, { id: string, name: string, franchisee?: string }>`

---

### `FUNCTION` `processDocs`

- **Line:** 645

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `snap` | `any` | **Yes** | - | - |

---

### `VARIABLE` `data`

- **Line:** 647

---

### `VARIABLE` `keys`

- **Line:** 648

---

### `VARIABLE` `newOMap`

- **Line:** 667
- **Signature:** `Record<string, Operator>`

---

### `VARIABLE` `data`

- **Line:** 670

---

### `VARIABLE` `type`

- **Line:** 755

---

### `VARIABLE` `newSelected`

- **Line:** 868

---

### `VARIABLE` `isExpanded`

- **Line:** 900

---

### `VARIABLE` `customerNsId`

- **Line:** 903

---

### `VARIABLE` `scanWithNsId`

- **Line:** 905

---

### `VARIABLE` `company`

- **Line:** 909

---

### `VARIABLE` `latestScan`

- **Line:** 912

---

### `VARIABLE` `newSelected`

- **Line:** 926

---

### `VARIABLE` `connote`

- **Line:** 969

---

### `VARIABLE` `operatorNsId`

- **Line:** 1063

---

### `VARIABLE` `scanWithOpNsId`

- **Line:** 1065

---

### `VARIABLE` `op`

- **Line:** 1069

---

