# Module: `src/components/admin/lifecycle-dashboard.tsx`

- **Language:** TypeScript
- **Total Lines:** 1387
- **Direct Dependencies:** 19 modules imported

## Exported Symbols & API

### `TYPE` `LifecycleType`

- **Line:** 59
- **Signature:** `'localmile' | 'shipmate' | 'quotes'`

---

### `TYPE` `SortField`

- **Line:** 60
- **Signature:** `'companyName' | 'status' | 'franchisee' | 'assignee' | 'dateLeadEntered'`

---

### `TYPE` `SortOrder`

- **Line:** 61
- **Signature:** `'asc' | 'desc'`

---

### `TYPE` `KpiCardType`

- **Line:** 62
- **Signature:** `| 'total' 
  | 'active' 
  | 'lm_opportunity'
  | 'lm_pending'
  | 'trialing_lm'
  | 'won' 
  | 'lost' 
  | 'lm_converted_other'
  | 'lm_stopped'
  | 'conversion' 
  | 'nurtures' 
  | null`

---

### `FUNCTION` `formatBucketName`

- **Line:** 76
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `raw` | `string` | No | - | - |

---

### `VARIABLE` `formatted`

- **Line:** 78

---

### `FUNCTION` `isLmOpportunity`

- **Line:** 83

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `isLmPending`

- **Line:** 84

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `isTrialingLm`

- **Line:** 85

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `s`

- **Line:** 86

---

### `FUNCTION` `checkStartedLocalMile`

- **Line:** 90

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `details` | `{ activities: Activity[], bucketHistory: BucketHistory[] }` | No | - | - |

---

### `VARIABLE` `s`

- **Line:** 91

---

### `VARIABLE` `hasHistory`

- **Line:** 95

---

### `VARIABLE` `hasAct`

- **Line:** 96

---

### `FUNCTION` `checkConvertedOtherService`

- **Line:** 102

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `details` | `{ activities: Activity[], bucketHistory: BucketHistory[] }` | No | - | - |

---

### `VARIABLE` `s`

- **Line:** 103

---

### `VARIABLE` `startedLM`

- **Line:** 106

---

### `VARIABLE` `isPureLM`

- **Line:** 109

---

### `VARIABLE` `journeys`

- **Line:** 110

---

### `VARIABLE` `campaign`

- **Line:** 111

---

### `FUNCTION` `checkLmTrialStopped`

- **Line:** 116

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `details` | `{ activities: Activity[], bucketHistory: BucketHistory[] }` | No | - | - |

---

### `VARIABLE` `s`

- **Line:** 117

---

### `VARIABLE` `reason`

- **Line:** 120

---

### `FUNCTION` `LifecycleDashboard`

- **Line:** 128
- **Returns:** `void`

---

### `VARIABLE` `isFranchisee`

- **Line:** 130

---

### `VARIABLE` `fetchUsers`

- **Line:** 158

---

### `VARIABLE` `snap`

- **Line:** 160

---

### `VARIABLE` `list`

- **Line:** 161

---

### `VARIABLE` `fetchLeadsData`

- **Line:** 168

---

### `VARIABLE` `leadsSnap`

- **Line:** 171

---

### `VARIABLE` `fetchedLeads`

- **Line:** 172

---

### `VARIABLE` `data`

- **Line:** 174

---

### `VARIABLE` `leadId`

- **Line:** 175

---

### `VARIABLE` `leadData`

- **Line:** 178

---

### `FUNCTION` `toggleExpand`

- **Line:** 228
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isExpanded`

- **Line:** 229

---

### `VARIABLE` `activities`

- **Line:** 239

---

### `VARIABLE` `bucketHistory`

- **Line:** 242

---

### `VARIABLE` `ensureActivitiesLoaded`

- **Line:** 256

---

### `VARIABLE` `missingLeads`

- **Line:** 257

---

### `VARIABLE` `results`

- **Line:** 262

---

### `VARIABLE` `activities`

- **Line:** 270

---

### `VARIABLE` `bucketHistory`

- **Line:** 273

---

### `VARIABLE` `next`

- **Line:** 285

---

### `VARIABLE` `filteredLifecycleLeads`

- **Line:** 305

---

### `VARIABLE` `status`

- **Line:** 307

---

### `VARIABLE` `matchesLifecycle`

- **Line:** 310

---

### `VARIABLE` `bucket`

- **Line:** 322

---

### `VARIABLE` `leadStatus`

- **Line:** 336

---

### `VARIABLE` `repName`

- **Line:** 342

---

### `VARIABLE` `parsed`

- **Line:** 346

---

### `VARIABLE` `parsed`

- **Line:** 350

---

### `VARIABLE` `details`

- **Line:** 355

---

### `VARIABLE` `matches`

- **Line:** 363

---

### `VARIABLE` `q`

- **Line:** 369

---

### `VARIABLE` `matchesName`

- **Line:** 370

---

### `VARIABLE` `matchesStatus`

- **Line:** 371

---

### `VARIABLE` `matchesFranchisee`

- **Line:** 372

---

### `FUNCTION` `handleSort`

- **Line:** 381

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `field` | `SortField` | **Yes** | - | - |

---

### `VARIABLE` `sortedLifecycleLeads`

- **Line:** 396

---

### `VARIABLE` `valA`

- **Line:** 400

---

### `VARIABLE` `valB`

- **Line:** 401

---

### `VARIABLE` `comparison`

- **Line:** 420

---

### `VARIABLE` `stageStats`

- **Line:** 426

---

### `VARIABLE` `stats`

- **Line:** 427
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `status`

- **Line:** 429

---

### `VARIABLE` `kpis`

- **Line:** 436

---

### `VARIABLE` `total`

- **Line:** 437

---

### `VARIABLE` `lmOpportunity`

- **Line:** 438

---

### `VARIABLE` `lmPending`

- **Line:** 439

---

### `VARIABLE` `trialingLm`

- **Line:** 440

---

### `VARIABLE` `active`

- **Line:** 441

---

### `VARIABLE` `s`

- **Line:** 442

---

### `VARIABLE` `won`

- **Line:** 445

---

### `VARIABLE` `lost`

- **Line:** 446

---

### `VARIABLE` `lmConvertedOther`

- **Line:** 447

---

### `VARIABLE` `lmStopped`

- **Line:** 448

---

### `VARIABLE` `nurtures`

- **Line:** 449

---

### `VARIABLE` `modalLeads`

- **Line:** 468

---

### `VARIABLE` `s`

- **Line:** 473

---

### `VARIABLE` `missingLeads`

- **Line:** 507

---

### `VARIABLE` `activities`

- **Line:** 517

---

### `VARIABLE` `bucketHistory`

- **Line:** 519

---

### `VARIABLE` `next`

- **Line:** 528

---

### `VARIABLE` `getLeadBucketDetails`

- **Line:** 542

---

### `VARIABLE` `details`

- **Line:** 543

---

### `VARIABLE` `originBucket`

- **Line:** 544

---

### `VARIABLE` `currentBucket`

- **Line:** 545

---

### `VARIABLE` `sortedAsc`

- **Line:** 548

---

### `VARIABLE` `sortedDesc`

- **Line:** 552

---

### `VARIABLE` `searchedModalLeads`

- **Line:** 565

---

### `VARIABLE` `q`

- **Line:** 567

---

### `VARIABLE` `assignee`

- **Line:** 570

---

### `VARIABLE` `reason`

- **Line:** 571

---

### `VARIABLE` `kpiModalTitle`

- **Line:** 585

---

### `VARIABLE` `uniqueStatuses`

- **Line:** 601

---

### `VARIABLE` `set`

- **Line:** 602

---

### `VARIABLE` `s`

- **Line:** 604

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 610

---

### `VARIABLE` `set`

- **Line:** 611

---

### `VARIABLE` `uniqueReps`

- **Line:** 616

---

### `VARIABLE` `set`

- **Line:** 617

---

### `VARIABLE` `rep`

- **Line:** 619

---

### `FUNCTION` `exportToCsv`

- **Line:** 625

---

### `VARIABLE` `headers`

- **Line:** 630

---

### `VARIABLE` `rows`

- **Line:** 631

---

### `VARIABLE` `csvContent`

- **Line:** 640

---

### `VARIABLE` `blob`

- **Line:** 641

---

### `VARIABLE` `link`

- **Line:** 642

---

### `VARIABLE` `isExpanded`

- **Line:** 1078

---

### `VARIABLE` `details`

- **Line:** 1079

---

### `VARIABLE` `assignee`

- **Line:** 1080

---

### `VARIABLE` `leadStatus`

- **Line:** 1081

---

### `VARIABLE` `profileUrl`

- **Line:** 1082

---

### `VARIABLE` `assignee`

- **Line:** 1300

---

### `VARIABLE` `leadStatus`

- **Line:** 1301

---

### `VARIABLE` `profileUrl`

- **Line:** 1302

---

