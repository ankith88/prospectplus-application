# Module: `src/lib/lead-stage-analytics.ts`

- **Language:** TypeScript
- **Total Lines:** 615
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `StageDurationMetrics`

- **Line:** 4

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `currentStatus` | `string` | No | - |
| `currentStatusDurationDays` | `number` | No | - |
| `appointmentBookedDate` | `Date | null` | No | - |
| `quoteSentDate` | `Date | null` | No | - |
| `signedDate` | `Date | null` | No | - |
| `timeToQuoteSentDays` | `number | null` | No | - |
| `timeToSignedDays` | `number | null` | No | - |
| `totalConversionDays` | `number | null` | No | - |

---

### `INTERFACE` `OriginMetric`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `origin` | `string` | No | - |
| `total` | `number` | No | - |
| `quoteSent` | `number` | No | - |
| `won` | `number` | No | - |
| `conversionRate` | `number` | No | - |

---

### `INTERFACE` `AmStageMetrics`

- **Line:** 23

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `amName` | `string` | No | - |
| `totalLeads` | `number` | No | - |
| `activeLeads` | `number` | No | - |
| `appointmentBookedCount` | `number` | No | - |
| `quoteSentCount` | `number` | No | - |
| `wonSignedCount` | `number` | No | - |
| `avgDaysInAppointmentBooked` | `number | null` | No | - |
| `avgDaysInQuoteSent` | `number | null` | No | - |
| `avgTotalConversionDays` | `number | null` | No | - |
| `avgDaysByStatus` | `Record<string, number>` | No | - |
| `statusLeadCounts` | `Record<string, number>` | No | - |
| `conversionRateApptToQuote` | `number` | No | - |
| `conversionRateQuoteToSigned` | `number` | No | - |
| `overallConversionRate` | `number` | No | - |
| `projectedConversions` | `number` | No | - |
| `staleLeads` | `Array<{ lead: Lead; daysInStatus: number; status: string }>` | No | - |
| `originBreakdown` | `Record<string, OriginMetric>` | No | - |

---

### `VARIABLE` `BUCKET_LABEL_MAP`

- **Line:** 43
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `formatBucketLabel`

- **Line:** 60
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `bucketKey` | `string` | No | - | - |

---

### `VARIABLE` `cleanKey`

- **Line:** 62

---

### `FUNCTION` `normalizeStatusLabel`

- **Line:** 71
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `statusName` | `string` | No | - | - |

---

### `VARIABLE` `clean`

- **Line:** 73

---

### `FUNCTION` `isLeadTransferred`

> Determines whether a lead has transferred from a different initial origin bucket
to its current bucket (returns true IF AND ONLY IF initial origin bucket !== current bucket).

- **Line:** 85
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `origin`

- **Line:** 87

---

### `VARIABLE` `currentBucketLabel`

- **Line:** 88

---

### `FUNCTION` `getLeadInitialBucket`

> Resolves the initial bucket of a lead before it was moved to Account Manager

- **Line:** 95
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `sourceStr`

- **Line:** 99

---

### `VARIABLE` `sorted`

- **Line:** 118

---

### `VARIABLE` `amTransition`

- **Line:** 119

---

### `VARIABLE` `earliestNonAm`

- **Line:** 123

---

### `FUNCTION` `safeParseDate`

- **Line:** 169
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 179

---

### `FUNCTION` `getAmEntryDate`

> Resolves the exact date when a lead entered the Account Manager bucket / pipeline.
- PRIORITY 1: Check bucketHistory for explicit transition to account_manager (e.g. Moved from Customer Success to Account Manager).
- PRIORITY 2: Check explicit AM assignment timestamps (accountManagerAssignedAt / assignedToAmAt).
- PRIORITY 3: Check earliest appointment booked date.
- PRIORITY 4: Check statusHistory for 'Appointment Booked' or 'Account Manager'.
- PRIORITY 5: If lead is a Website lead without a subsequent bucket transfer in bucketHistory, use dateLeadEntered.
- PRIORITY 6: Fallback to recent update/activity date.

- **Line:** 194
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `sortedBucketHist`

- **Line:** 199

---

### `VARIABLE` `nb`

- **Line:** 201

---

### `VARIABLE` `assignedAt`

- **Line:** 214

---

### `VARIABLE` `sortedAppts`

- **Line:** 219

---

### `VARIABLE` `apptHist`

- **Line:** 230

---

### `VARIABLE` `sourceStr`

- **Line:** 242

---

### `VARIABLE` `isWebsiteSource`

- **Line:** 243

---

### `VARIABLE` `recentUpdate`

- **Line:** 250

---

### `FUNCTION` `calculateLeadStageDurations`

> Calculate stage durations and key milestone dates for a single lead

- **Line:** 260
- **Returns:** `StageDurationMetrics`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `now` | `Date` | No | `new Date()` | - |

---

### `VARIABLE` `rawStatus`

- **Line:** 261

---

### `VARIABLE` `currentStatus`

- **Line:** 262

---

### `VARIABLE` `sourceStr`

- **Line:** 263

---

### `VARIABLE` `isWebsiteSource`

- **Line:** 264

---

### `VARIABLE` `amEntryDate`

- **Line:** 267

---

### `VARIABLE` `appointmentBookedDate`

- **Line:** 270
- **Signature:** `Date | null`

---

### `VARIABLE` `sortedAppts`

- **Line:** 272

---

### `VARIABLE` `apptHist`

- **Line:** 282

---

### `VARIABLE` `quoteSentDate`

- **Line:** 289
- **Signature:** `Date | null`

---

### `VARIABLE` `quoteHist`

- **Line:** 291

---

### `VARIABLE` `sortedScf`

- **Line:** 297

---

### `VARIABLE` `signedDate`

- **Line:** 307
- **Signature:** `Date | null`

---

### `VARIABLE` `signedHist`

- **Line:** 309

---

### `VARIABLE` `amCycleStartDate`

- **Line:** 318

---

### `VARIABLE` `lastStatusChangeDate`

- **Line:** 321
- **Signature:** `Date | null`

---

### `VARIABLE` `sortedHistory`

- **Line:** 323

---

### `VARIABLE` `match`

- **Line:** 324

---

### `VARIABLE` `statusAct`

- **Line:** 334

---

### `VARIABLE` `currentStatusDurationDays`

- **Line:** 368

---

### `VARIABLE` `timeToQuoteSentDays`

- **Line:** 373
- **Signature:** `number | null`

---

### `VARIABLE` `timeToSignedDays`

- **Line:** 380
- **Signature:** `number | null`

---

### `VARIABLE` `totalConversionDays`

- **Line:** 385
- **Signature:** `number | null`

---

### `FUNCTION` `calculateAmStageMetrics`

> Aggregates AM stage duration and conversion metrics across leads

- **Line:** 407
- **Returns:** `{
  byAm: Record<string, AmStageMetrics>;
  summary: AmStageMetrics;
  originTotals: Record<string, OriginMetric>;
}`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | **Yes** | - | - |
| `accountManagers` | `UserProfile[]` | **Yes** | - | - |
| `selectedAmFilter` | `string` | No | `'all'` | - |

---

### `FUNCTION` `getAmDisplayName`

- **Line:** 416

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `am` | `UserProfile` | **Yes** | - | - |

---

### `VARIABLE` `amNames`

- **Line:** 420

---

### `FUNCTION` `createEmptyAmMetrics`

- **Line:** 427
- **Returns:** `AmStageMetrics`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | - | - |

---

### `VARIABLE` `amMap`

- **Line:** 447
- **Signature:** `Record<string, AmStageMetrics>`

---

### `VARIABLE` `summary`

- **Line:** 452

---

### `VARIABLE` `originTotals`

- **Line:** 453
- **Signature:** `Record<string, OriginMetric>`

---

### `VARIABLE` `timeToQuoteSentList`

- **Line:** 455
- **Signature:** `Record<string, number[]>`

---

### `VARIABLE` `timeToSignedList`

- **Line:** 456
- **Signature:** `Record<string, number[]>`

---

### `VARIABLE` `totalConversionList`

- **Line:** 457
- **Signature:** `Record<string, number[]>`

---

### `VARIABLE` `statusDurationByAmList`

- **Line:** 458
- **Signature:** `Record<string, Record<string, number[]>>`

---

### `VARIABLE` `now`

- **Line:** 460

---

### `VARIABLE` `targetLeads`

- **Line:** 462

---

### `VARIABLE` `amName`

- **Line:** 467

---

### `VARIABLE` `amMetrics`

- **Line:** 471

---

### `VARIABLE` `rawStatus`

- **Line:** 473

---

### `VARIABLE` `status`

- **Line:** 474

---

### `VARIABLE` `isWon`

- **Line:** 475

---

### `VARIABLE` `isQuoteSent`

- **Line:** 476

---

### `VARIABLE` `isApptBooked`

- **Line:** 477

---

### `VARIABLE` `isLost`

- **Line:** 478

---

### `VARIABLE` `origin`

- **Line:** 480

---

### `VARIABLE` `stageMetrics`

- **Line:** 517

---

### `VARIABLE` `staleItem`

- **Line:** 548

---

### `FUNCTION` `calculateAverages`

- **Line:** 554

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `metrics` | `AmStageMetrics` | **Yes** | - | - |
| `key` | `string` | **Yes** | - | - |

---

### `VARIABLE` `qList`

- **Line:** 555

---

### `VARIABLE` `sList`

- **Line:** 560

---

### `VARIABLE` `cList`

- **Line:** 565

---

### `VARIABLE` `amStatusMap`

- **Line:** 571

---

### `VARIABLE` `currentQuoteSent`

- **Line:** 594

---

### `VARIABLE` `currentApptBookedOnly`

- **Line:** 595

---

### `VARIABLE` `projQuote`

- **Line:** 597

---

### `VARIABLE` `projAppt`

- **Line:** 598

---

