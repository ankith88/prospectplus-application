# Module: `src/components/customer-success/cancellation-reporting-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1587
- **Direct Dependencies:** 27 modules imported

## Exported Symbols & API

### `FUNCTION` `safeFormatDate`

- **Line:** 61
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string | null` | No | - | - |
| `formatPattern` | `string` | No | `'dd MMM yyyy'` | - |
| `fallback` | `string` | No | `'N/A'` | - |

---

### `VARIABLE` `dt`

- **Line:** 64

---

### `FUNCTION` `calculateMRR`

- **Line:** 77

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `services` | `ServiceSelection[]` | **Yes** | - | - |

---

### `VARIABLE` `mrr`

- **Line:** 79

---

### `VARIABLE` `rate`

- **Line:** 82

---

### `VARIABLE` `weeklyDays`

- **Line:** 86

---

### `FUNCTION` `getLostMRR`

- **Line:** 97
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `r` | `CancellationRequest` | **Yes** | - | - |

---

### `FUNCTION` `getSavedMRR`

- **Line:** 110
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `r` | `CancellationRequest` | **Yes** | - | - |

---

### `FUNCTION` `CancellationReportingClient`

- **Line:** 120
- **Returns:** `void`

---

### `VARIABLE` `activeRoleLower`

- **Line:** 150

---

### `VARIABLE` `isAuthorized`

- **Line:** 151

---

### `FUNCTION` `fetchRequests`

- **Line:** 164
- **Async:** Yes

---

### `VARIABLE` `cancelSnap`

- **Line:** 168

---

### `VARIABLE` `cancelList`

- **Line:** 169
- **Signature:** `CancellationRequest[]`

---

### `VARIABLE` `data`

- **Line:** 170

---

### `VARIABLE` `csSnap`

- **Line:** 179

---

### `VARIABLE` `csList`

- **Line:** 180
- **Signature:** `CancellationRequest[]`

---

### `VARIABLE` `data`

- **Line:** 182

---

### `VARIABLE` `combinedMap`

- **Line:** 224

---

### `VARIABLE` `key`

- **Line:** 226

---

### `VARIABLE` `existing`

- **Line:** 230

---

### `VARIABLE` `mergedList`

- **Line:** 235

---

### `VARIABLE` `dateA`

- **Line:** 236

---

### `VARIABLE` `dateB`

- **Line:** 237

---

### `FUNCTION` `enrichRequestsWithInvoicesAndFranchisee`

- **Line:** 251
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `list` | `CancellationRequest[]` | **Yes** | - | - |

---

### `VARIABLE` `uncalculated`

- **Line:** 252

---

### `VARIABLE` `BATCH_SIZE`

- **Line:** 260

---

### `VARIABLE` `enrichedMap`

- **Line:** 261

---

### `VARIABLE` `batch`

- **Line:** 264

---

### `VARIABLE` `updates`

- **Line:** 268
- **Signature:** `Partial<CancellationRequest>`

---

### `VARIABLE` `res`

- **Line:** 269

---

### `VARIABLE` `compSnap`

- **Line:** 286

---

### `VARIABLE` `leadSnap`

- **Line:** 287

---

### `VARIABLE` `leadData`

- **Line:** 289

---

### `VARIABLE` `updates`

- **Line:** 308

---

### `FUNCTION` `handleQuickDateChange`

- **Line:** 314

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 316

---

### `FUNCTION` `handleToggleFranchiseeCancelled`

- **Line:** 331
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `reqId` | `string` | **Yes** | - | - |
| `currentVal` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `newVal`

- **Line:** 332

---

### `FUNCTION` `handleToggleReductionSave`

- **Line:** 357
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `reqId` | `string` | **Yes** | - | - |
| `currentVal` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `newVal`

- **Line:** 358

---

### `VARIABLE` `availableOptions`

- **Line:** 380

---

### `VARIABLE` `themes`

- **Line:** 381

---

### `VARIABLE` `whys`

- **Line:** 382

---

### `VARIABLE` `reasons`

- **Line:** 383

---

### `VARIABLE` `strategies`

- **Line:** 384

---

### `VARIABLE` `franchisees`

- **Line:** 385

---

### `VARIABLE` `why`

- **Line:** 390

---

### `VARIABLE` `strat`

- **Line:** 393

---

### `FUNCTION` `resetFilters`

- **Line:** 409

---

### `VARIABLE` `filteredRequests`

- **Line:** 424

---

### `VARIABLE` `q`

- **Line:** 428

---

### `VARIABLE` `matchName`

- **Line:** 429

---

### `VARIABLE` `matchContact`

- **Line:** 430

---

### `VARIABLE` `matchReason`

- **Line:** 431

---

### `VARIABLE` `matchTheme`

- **Line:** 432

---

### `VARIABLE` `matchWhy`

- **Line:** 434

---

### `VARIABLE` `matchNotes`

- **Line:** 435

---

### `VARIABLE` `matchBy`

- **Line:** 436

---

### `VARIABLE` `matchFran`

- **Line:** 437

---

### `VARIABLE` `typeInfo`

- **Line:** 450

---

### `VARIABLE` `reqWhy`

- **Line:** 464

---

### `VARIABLE` `targetDateStr`

- **Line:** 490

---

### `VARIABLE` `targetDate`

- **Line:** 493

---

### `VARIABLE` `from`

- **Line:** 498

---

### `VARIABLE` `to`

- **Line:** 499

---

### `VARIABLE` `metrics`

- **Line:** 513

---

### `VARIABLE` `totalRequests`

- **Line:** 514

---

### `VARIABLE` `pendingRequests`

- **Line:** 515

---

### `VARIABLE` `savedRequests`

- **Line:** 516

---

### `VARIABLE` `cancelledRequests`

- **Line:** 517

---

### `VARIABLE` `redTrueCount`

- **Line:** 520

---

### `VARIABLE` `yellowEomCount`

- **Line:** 521

---

### `VARIABLE` `greyDataWashCount`

- **Line:** 522

---

### `VARIABLE` `greenStillCustomerCount`

- **Line:** 523

---

### `VARIABLE` `redTrueMRRLost`

- **Line:** 525

---

### `VARIABLE` `yellowEomMRRLost`

- **Line:** 526

---

### `VARIABLE` `greyDataWashMRR`

- **Line:** 527

---

### `VARIABLE` `typeInfo`

- **Line:** 530

---

### `VARIABLE` `mrr`

- **Line:** 531

---

### `VARIABLE` `totalProcessed`

- **Line:** 546

---

### `VARIABLE` `saveRate`

- **Line:** 547

---

### `VARIABLE` `totalMRRSaved`

- **Line:** 550

---

### `VARIABLE` `totalMRRLost`

- **Line:** 551

---

### `VARIABLE` `reductionSavesCount`

- **Line:** 552

---

### `VARIABLE` `reductionMRRSaved`

- **Line:** 553

---

### `VARIABLE` `savedAmount`

- **Line:** 556

---

### `VARIABLE` `franchiseeMap`

- **Line:** 569
- **Signature:** `Record<string, {
      total: number;
      savedCount: number;
      cancelledCount: number;
      redCount: number;
      yellowCount: number;
      greyCount: number;
      greenCount: number;
      mrrSaved: number;
      mrrLost: number;
    }>`

---

### `VARIABLE` `fran`

- **Line:** 582

---

### `VARIABLE` `typeInfo`

- **Line:** 598

---

### `VARIABLE` `franchiseeData`

- **Line:** 613

---

### `VARIABLE` `weekMap`

- **Line:** 623
- **Signature:** `Record<string, {
      weekLabel: string;
      total: number;
      savedCount: number;
      cancelledCount: number;
      redCount: number;
      yellowCount: number;
      greyCount: number;
      greenCount: number;
      mrrSaved: number;
      mrrLost: number;
    }>`

---

### `VARIABLE` `dStr`

- **Line:** 637

---

### `VARIABLE` `weekKey`

- **Line:** 638

---

### `VARIABLE` `weekLabel`

- **Line:** 639

---

### `VARIABLE` `dt`

- **Line:** 642

---

### `VARIABLE` `wStart`

- **Line:** 647

---

### `VARIABLE` `wEnd`

- **Line:** 648

---

### `VARIABLE` `typeInfo`

- **Line:** 673

---

### `VARIABLE` `weeklySplitData`

- **Line:** 688

---

### `VARIABLE` `classificationPieData`

- **Line:** 701

---

### `FUNCTION` `handleGenerateAISummary`

- **Line:** 734
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 737

---

### `VARIABLE` `data`

- **Line:** 746

---

### `FUNCTION` `exportToCSV`

- **Line:** 769

---

### `VARIABLE` `headers`

- **Line:** 772

---

### `VARIABLE` `rows`

- **Line:** 795

---

### `VARIABLE` `typeInfo`

- **Line:** 796

---

### `VARIABLE` `isSigned`

- **Line:** 797

---

### `VARIABLE` `avg3Month`

- **Line:** 798

---

### `VARIABLE` `origMRR`

- **Line:** 799

---

### `VARIABLE` `savedMRR`

- **Line:** 800

---

### `VARIABLE` `mrrLost`

- **Line:** 801

---

### `VARIABLE` `csvContent`

- **Line:** 828

---

### `VARIABLE` `encodedUri`

- **Line:** 829

---

### `VARIABLE` `link`

- **Line:** 830

---

### `VARIABLE` `typeInfo`

- **Line:** 1210

---

### `VARIABLE` `mrrLost`

- **Line:** 1211

---

### `VARIABLE` `mrrSaved`

- **Line:** 1212

---

