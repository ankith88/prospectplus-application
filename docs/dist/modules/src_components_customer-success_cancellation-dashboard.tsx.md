# Module: `src/components/customer-success/cancellation-dashboard.tsx`

- **Language:** TypeScript
- **Total Lines:** 1193
- **Direct Dependencies:** 25 modules imported

## Exported Symbols & API

### `VARIABLE` `REASONS`

- **Line:** 45

---

### `VARIABLE` `COLORS`

- **Line:** 46

---

### `FUNCTION` `CancellationDashboard`

- **Line:** 48
- **Returns:** `void`

---

### `FUNCTION` `handleOpenResellDialog`

- **Line:** 83
- **Async:** Yes

---

### `VARIABLE` `compSnap`

- **Line:** 87

---

### `VARIABLE` `leadSnap`

- **Line:** 88

---

### `FUNCTION` `handleResellSuccess`

- **Line:** 107
- **Async:** Yes

---

### `VARIABLE` `userDisplayName`

- **Line:** 110

---

### `VARIABLE` `processedAt`

- **Line:** 111

---

### `VARIABLE` `compRef`

- **Line:** 121

---

### `VARIABLE` `leadRef`

- **Line:** 122

---

### `VARIABLE` `updates`

- **Line:** 128

---

### `FUNCTION` `fetchHierarchy`

- **Line:** 169
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 171

---

### `FUNCTION` `fetchRequests`

- **Line:** 180
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 183

---

### `VARIABLE` `list`

- **Line:** 184

---

### `VARIABLE` `sorted`

- **Line:** 186

---

### `FUNCTION` `handleOpenProcess`

- **Line:** 199
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `CancellationRequest` | **Yes** | - | - |

---

### `VARIABLE` `leadDoc`

- **Line:** 219

---

### `VARIABLE` `compDoc`

- **Line:** 220

---

### `VARIABLE` `leadData`

- **Line:** 221

---

### `VARIABLE` `statusStr`

- **Line:** 222

---

### `VARIABLE` `isSigned`

- **Line:** 223

---

### `VARIABLE` `invoiceRes`

- **Line:** 228

---

### `FUNCTION` `calculateMRR`

- **Line:** 242

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `services` | `ServiceSelection[]` | **Yes** | - | - |

---

### `VARIABLE` `mrr`

- **Line:** 244

---

### `VARIABLE` `weeklyDays`

- **Line:** 250

---

### `FUNCTION` `handleInitiateCall`

- **Line:** 259
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `CancellationRequest` | **Yes** | - | - |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `newCallsCount`

- **Line:** 263

---

### `VARIABLE` `userDisplayName`

- **Line:** 274

---

### `FUNCTION` `handleSaveCustomer`

- **Line:** 285
- **Async:** Yes

---

### `VARIABLE` `userDisplayName`

- **Line:** 289

---

### `VARIABLE` `processedAt`

- **Line:** 290

---

### `VARIABLE` `finalServices`

- **Line:** 293

---

### `VARIABLE` `originalServices`

- **Line:** 299

---

### `VARIABLE` `serviceRateChanged`

- **Line:** 300

---

### `VARIABLE` `serviceFrequencyChanged`

- **Line:** 301

---

### `VARIABLE` `serviceDeleted`

- **Line:** 302

---

### `VARIABLE` `match`

- **Line:** 305

---

### `VARIABLE` `origFreqStr`

- **Line:** 312

---

### `VARIABLE` `matchFreqStr`

- **Line:** 313

---

### `VARIABLE` `newInvoiceMRR`

- **Line:** 324

---

### `VARIABLE` `savedMRR`

- **Line:** 325

---

### `VARIABLE` `baselineAvg`

- **Line:** 326

---

### `VARIABLE` `saveCompRef`

- **Line:** 329

---

### `VARIABLE` `saveLeadRef`

- **Line:** 330

---

### `VARIABLE` `saveUpdates`

- **Line:** 336

---

### `VARIABLE` `cancelReqRef`

- **Line:** 364

---

### `FUNCTION` `handleCancelCustomer`

- **Line:** 394
- **Async:** Yes

---

### `VARIABLE` `userDisplayName`

- **Line:** 398

---

### `VARIABLE` `processedAt`

- **Line:** 399

---

### `VARIABLE` `selectedThemeObj`

- **Line:** 401

---

### `VARIABLE` `selectedWhyObj`

- **Line:** 402

---

### `VARIABLE` `selectedReasonObj`

- **Line:** 403

---

### `VARIABLE` `compRef`

- **Line:** 406

---

### `VARIABLE` `leadRef`

- **Line:** 407

---

### `VARIABLE` `cancellationUpdates`

- **Line:** 413

---

### `VARIABLE` `originalServices`

- **Line:** 450

---

### `VARIABLE` `lostMRR`

- **Line:** 451

---

### `VARIABLE` `cancelReqRef`

- **Line:** 454

---

### `VARIABLE` `leadData`

- **Line:** 475

---

### `FUNCTION` `handleUpdateServiceRate`

- **Line:** 521

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `rate` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleUpdateServiceFreq`

- **Line:** 525

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `day` | `'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Adhoc'` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `currentFreq`

- **Line:** 531

---

### `FUNCTION` `handleRemoveService`

- **Line:** 541

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `VARIABLE` `stats`

- **Line:** 546

---

### `VARIABLE` `total`

- **Line:** 547

---

### `VARIABLE` `pending`

- **Line:** 548

---

### `VARIABLE` `saved`

- **Line:** 549

---

### `VARIABLE` `cancelled`

- **Line:** 550

---

### `VARIABLE` `successRate`

- **Line:** 551

---

### `VARIABLE` `reasonsMap`

- **Line:** 554
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `reason`

- **Line:** 556

---

### `VARIABLE` `reasonsData`

- **Line:** 559

---

### `VARIABLE` `strategyMap`

- **Line:** 562
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `strategy`

- **Line:** 564

---

### `VARIABLE` `strategyData`

- **Line:** 567

---

### `VARIABLE` `dateMap`

- **Line:** 570
- **Signature:** `Record<string, { requested: number; cancelled: number }>`

---

### `VARIABLE` `reqDate`

- **Line:** 572

---

### `VARIABLE` `cancelDate`

- **Line:** 577

---

### `VARIABLE` `trendData`

- **Line:** 582

---

