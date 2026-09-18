# Module: `src/components/calls-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1268
- **Direct Dependencies:** 32 modules imported

## Exported Symbols & API

### `TYPE` `CallActivity`

- **Line:** 65
- **Signature:** `Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string; accountManagerAssigned?: string; leadBucket?: string; movedFromBucket?: string; movedToBucket?: string; movedFromStatus?: LeadStatus; movedToStatus?: LeadStatus }`

---

### `VARIABLE` `reviewCategories`

- **Line:** 66
- **Signature:** `ReviewCategory[]`

---

### `TYPE` `SortableCallKeys`

- **Line:** 68
- **Signature:** `'leadName' | 'dialerAssigned' | 'leadStatus' | 'leadBucket' | 'date' | 'duration'`

---

### `VARIABLE` `CALLS_PER_PAGE`

- **Line:** 70

---

### `VARIABLE` `leadStatuses`

- **Line:** 71
- **Signature:** `LeadStatus[]`

---

### `VARIABLE` `bucketNames`

- **Line:** 73
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `cleanCallNotes`

- **Line:** 83
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `notes` | `string` | **Yes** | - | - |

---

### `VARIABLE` `cleaned`

- **Line:** 85

---

### `FUNCTION` `CallsClientPage`

- **Line:** 91
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 123

---

### `FUNCTION` `fetchInitialData`

- **Line:** 127
- **Async:** Yes

---

### `VARIABLE` `dialers`

- **Line:** 134

---

### `FUNCTION` `fetchCallsData`

- **Line:** 143
- **Async:** Yes

---

### `VARIABLE` `fromStr`

- **Line:** 146

---

### `VARIABLE` `toStr`

- **Line:** 147

---

### `VARIABLE` `fetchedCalls`

- **Line:** 148

---

### `FUNCTION` `handlePendingFilterChange`

- **Line:** 175

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof pendingFilters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `applyFilters`

- **Line:** 179

---

### `FUNCTION` `clearFilters`

- **Line:** 184

---

### `VARIABLE` `cleared`

- **Line:** 185

---

### `FUNCTION` `parseDuration`

- **Line:** 201
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `durationStr` | `string` | No | - | - |

---

### `VARIABLE` `minutesMatch`

- **Line:** 203

---

### `VARIABLE` `secondsMatch`

- **Line:** 204

---

### `VARIABLE` `minutes`

- **Line:** 205

---

### `VARIABLE` `seconds`

- **Line:** 206

---

### `VARIABLE` `filteredCalls`

- **Line:** 210

---

### `VARIABLE` `callsToFilter`

- **Line:** 211

---

### `VARIABLE` `seenCallIds`

- **Line:** 214

---

### `VARIABLE` `isAm`

- **Line:** 225

---

### `VARIABLE` `isAdminRole`

- **Line:** 226

---

### `VARIABLE` `callUser`

- **Line:** 240

---

### `VARIABLE` `userMatch`

- **Line:** 241

---

### `VARIABLE` `dateMatch`

- **Line:** 243

---

### `VARIABLE` `callDate`

- **Line:** 245

---

### `VARIABLE` `fromDate`

- **Line:** 246

---

### `VARIABLE` `toDate`

- **Line:** 247

---

### `VARIABLE` `durationInSeconds`

- **Line:** 251

---

### `FUNCTION` `durationMatch`

- **Line:** 252

---

### `VARIABLE` `leadNameMatch`

- **Line:** 262

---

### `VARIABLE` `statusMatch`

- **Line:** 263

---

### `VARIABLE` `bucketMatch`

- **Line:** 264

---

### `VARIABLE` `reviewedMatch`

- **Line:** 266

---

### `VARIABLE` `reviewedByMatch`

- **Line:** 270

---

### `VARIABLE` `reviewCategoryMatch`

- **Line:** 271

---

### `VARIABLE` `finalUserMatch`

- **Line:** 273

---

### `VARIABLE` `sortedCalls`

- **Line:** 279

---

### `VARIABLE` `sortableItems`

- **Line:** 280

---

### `VARIABLE` `aValue`

- **Line:** 283

---

### `VARIABLE` `bValue`

- **Line:** 283

---

### `FUNCTION` `requestSort`

- **Line:** 308

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableCallKeys` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 309
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 316

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableCallKeys` | **Yes** | - | - |

---

### `VARIABLE` `tabFilteredCalls`

- **Line:** 323

---

### `VARIABLE` `uniqueLeadsCount`

- **Line:** 331

---

### `VARIABLE` `agentStats`

- **Line:** 335

---

### `VARIABLE` `counts`

- **Line:** 336
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `agent`

- **Line:** 338

---

### `VARIABLE` `activeUsers`

- **Line:** 346

---

### `VARIABLE` `users`

- **Line:** 347

---

### `VARIABLE` `user`

- **Line:** 349

---

### `VARIABLE` `activeBuckets`

- **Line:** 355

---

### `VARIABLE` `buckets`

- **Line:** 356

---

### `VARIABLE` `b`

- **Line:** 358

---

### `VARIABLE` `activeUserBucketCombos`

- **Line:** 364

---

### `VARIABLE` `combos`

- **Line:** 365

---

### `VARIABLE` `user`

- **Line:** 367

---

### `VARIABLE` `bucket`

- **Line:** 368

---

### `VARIABLE` `totalCallsByBucket`

- **Line:** 382

---

### `VARIABLE` `counts`

- **Line:** 383
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `b`

- **Line:** 385

---

### `VARIABLE` `chartData`

- **Line:** 397

---

### `VARIABLE` `dailyData`

- **Line:** 398
- **Signature:** `Record<string, { 
      date: string; 
      totalCalls: number; 
      uniqueLeads: Set<string>; 
      users: Record<string, number>;
      buckets: Record<string, number>;
      userBuckets: Record<string, number>;
    }>`

---

### `VARIABLE` `d`

- **Line:** 409

---

### `VARIABLE` `dateKey`

- **Line:** 410

---

### `VARIABLE` `dateDisplay`

- **Line:** 411

---

### `VARIABLE` `user`

- **Line:** 412

---

### `VARIABLE` `callBucket`

- **Line:** 413

---

### `VARIABLE` `comboKey`

- **Line:** 414

---

### `VARIABLE` `sortedDates`

- **Line:** 434

---

### `VARIABLE` `userBucketChartData`

- **Line:** 448

---

### `VARIABLE` `userMap`

- **Line:** 449
- **Signature:** `Record<string, Record<string, number>>`

---

### `VARIABLE` `user`

- **Line:** 459

---

### `VARIABLE` `bucket`

- **Line:** 460

---

### `VARIABLE` `totalA`

- **Line:** 470

---

### `VARIABLE` `totalB`

- **Line:** 471

---

### `VARIABLE` `chartColors`

- **Line:** 476

---

### `VARIABLE` `bucketColors`

- **Line:** 487
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `paginatedCalls`

- **Line:** 496

---

### `VARIABLE` `startIndex`

- **Line:** 497

---

### `VARIABLE` `totalPages`

- **Line:** 501

---

### `VARIABLE` `allUsersOptions`

- **Line:** 503
- **Signature:** `Option[]`

---

### `VARIABLE` `users`

- **Line:** 504

---

### `VARIABLE` `allReviewersOptions`

- **Line:** 508
- **Signature:** `Option[]`

---

### `VARIABLE` `reviewers`

- **Line:** 509

---

### `VARIABLE` `leadStatusOptions`

- **Line:** 513
- **Signature:** `Option[]`

---

### `VARIABLE` `reviewCategoryOptions`

- **Line:** 514
- **Signature:** `Option[]`

---

### `VARIABLE` `bucketOptions`

- **Line:** 515
- **Signature:** `Option[]`

---

### `VARIABLE` `transcriptsByCallId`

- **Line:** 517

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 527

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 531

---

### `FUNCTION` `handleExport`

- **Line:** 538

---

### `VARIABLE` `headers`

- **Line:** 539

---

### `VARIABLE` `rows`

- **Line:** 540

---

### `VARIABLE` `csvContent`

- **Line:** 556

---

### `VARIABLE` `blob`

- **Line:** 557

---

### `VARIABLE` `link`

- **Line:** 558

---

### `VARIABLE` `url`

- **Line:** 559

---

### `FUNCTION` `handleGetTranscriptForCall`

- **Line:** 567
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `call` | `CallActivity` | **Yes** | - | - |

---

### `VARIABLE` `authorName`

- **Line:** 569

---

### `VARIABLE` `result`

- **Line:** 572

---

### `FUNCTION` `handleSubmitReview`

- **Line:** 592
- **Async:** Yes

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 627

---

### `FUNCTION` `ReviewCategoryBadge`

- **Line:** 629

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ category }` | `{ category?: ReviewCategory }` | **Yes** | - | - |

---

### `VARIABLE` `colorClass`

- **Line:** 631

---

### `FUNCTION` `renderCallRow`

- **Line:** 639

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `call` | `CallActivity` | **Yes** | - | - |

---

### `VARIABLE` `transcript`

- **Line:** 640

---

### `VARIABLE` `updatedTranscripts`

- **Line:** 1186

---

