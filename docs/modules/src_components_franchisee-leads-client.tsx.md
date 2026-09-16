# Module: `src/components/franchisee-leads-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1658
- **Direct Dependencies:** 19 modules imported

## Exported Symbols & API

### `VARIABLE` `QUOTE_SENT_ACCEPTED_STATUSES`

- **Line:** 51
- **Signature:** `string[]`

---

### `VARIABLE` `LOCALMILE_TRIAL_STATUSES`

- **Line:** 55
- **Signature:** `string[]`

---

### `VARIABLE` `SHIPMATE_TRIAL_STATUSES`

- **Line:** 59
- **Signature:** `string[]`

---

### `VARIABLE` `WORK_IN_PROGRESS_STATUSES`

- **Line:** 63
- **Signature:** `string[]`

---

### `VARIABLE` `HOT_PRIORITY_STATUSES`

- **Line:** 67
- **Signature:** `string[]`

---

### `VARIABLE` `NEW_STATUSES`

- **Line:** 71
- **Signature:** `string[]`

---

### `VARIABLE` `WON_STATUSES`

- **Line:** 75
- **Signature:** `string[]`

---

### `VARIABLE` `LOST_STATUSES`

- **Line:** 79
- **Signature:** `string[]`

---

### `FUNCTION` `FranchiseeLeadsClientPage`

- **Line:** 83
- **Returns:** `void`

---

### `VARIABLE` `isFranchisee`

- **Line:** 85

---

### `FUNCTION` `resolveAccountManager`

- **Line:** 120

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `amName`

- **Line:** 121

---

### `VARIABLE` `cleanName`

- **Line:** 128

---

### `VARIABLE` `parts`

- **Line:** 129

---

### `VARIABLE` `targetFirst`

- **Line:** 130

---

### `VARIABLE` `targetLast`

- **Line:** 131

---

### `VARIABLE` `amUser`

- **Line:** 134

---

### `VARIABLE` `uFirst`

- **Line:** 135

---

### `VARIABLE` `uLast`

- **Line:** 136

---

### `VARIABLE` `uDisplay`

- **Line:** 137

---

### `VARIABLE` `uFull`

- **Line:** 138

---

### `VARIABLE` `uEmail`

- **Line:** 139

---

### `VARIABLE` `email`

- **Line:** 160

---

### `VARIABLE` `mobile`

- **Line:** 166

---

### `FUNCTION` `openAmContactModal`

- **Line:** 176

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `am`

- **Line:** 177

---

### `VARIABLE` `displayId`

- **Line:** 178

---

### `FUNCTION` `handleSendAmEmail`

- **Line:** 185
- **Async:** Yes

---

### `VARIABLE` `am`

- **Line:** 187

---

### `VARIABLE` `res`

- **Line:** 191

---

### `VARIABLE` `data`

- **Line:** 209

---

### `VARIABLE` `franchiseeName`

- **Line:** 229

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 230

---

### `FUNCTION` `fetchData`

- **Line:** 232
- **Async:** Yes

---

### `VARIABLE` `filteredLeads`

- **Line:** 243

---

### `VARIABLE` `normFranchisee`

- **Line:** 246

---

### `VARIABLE` `leadsOnly`

- **Line:** 253

---

### `VARIABLE` `metrics`

- **Line:** 289

---

### `VARIABLE` `total`

- **Line:** 290

---

### `VARIABLE` `quoteSentAccepted`

- **Line:** 292

---

### `VARIABLE` `localMileTrial`

- **Line:** 296

---

### `VARIABLE` `shipMateTrial`

- **Line:** 301

---

### `VARIABLE` `workInProgress`

- **Line:** 306

---

### `VARIABLE` `hotPriorityLeads`

- **Line:** 310

---

### `VARIABLE` `newLeads`

- **Line:** 316

---

### `VARIABLE` `priorityQuoteTrialLeads`

- **Line:** 332

---

### `VARIABLE` `statusStr`

- **Line:** 334

---

### `VARIABLE` `trialTypeStr`

- **Line:** 335

---

### `VARIABLE` `isQuote`

- **Line:** 336

---

### `VARIABLE` `isTrial`

- **Line:** 339

---

### `VARIABLE` `availableCustomerSources`

- **Line:** 353

---

### `VARIABLE` `srcSet`

- **Line:** 354

---

### `VARIABLE` `src`

- **Line:** 356

---

### `VARIABLE` `availableBuckets`

- **Line:** 365

---

### `VARIABLE` `bSet`

- **Line:** 366

---

### `VARIABLE` `b`

- **Line:** 368

---

### `VARIABLE` `availableStatuses`

- **Line:** 377

---

### `VARIABLE` `sSet`

- **Line:** 378

---

### `VARIABLE` `filteredLeads`

- **Line:** 386

---

### `VARIABLE` `query`

- **Line:** 390

---

### `VARIABLE` `comp`

- **Line:** 391

---

### `VARIABLE` `contactName`

- **Line:** 392

---

### `VARIABLE` `email`

- **Line:** 393

---

### `VARIABLE` `phone`

- **Line:** 394

---

### `VARIABLE` `city`

- **Line:** 395

---

### `VARIABLE` `state`

- **Line:** 396

---

### `VARIABLE` `leadId`

- **Line:** 397

---

### `VARIABLE` `custSource`

- **Line:** 398

---

### `VARIABLE` `bucketVal`

- **Line:** 399

---

### `VARIABLE` `matchesQuery`

- **Line:** 401

---

### `VARIABLE` `isLM`

- **Line:** 417

---

### `VARIABLE` `isSM`

- **Line:** 420

---

### `VARIABLE` `isHot`

- **Line:** 425

---

### `VARIABLE` `isNew`

- **Line:** 428

---

### `VARIABLE` `isInbound`

- **Line:** 439

---

### `VARIABLE` `isInbound`

- **Line:** 442

---

### `VARIABLE` `b`

- **Line:** 448

---

### `VARIABLE` `src`

- **Line:** 454

---

### `FUNCTION` `getStatusSortWeight`

- **Line:** 470
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `statusStr`

- **Line:** 471

---

### `VARIABLE` `trialTypeStr`

- **Line:** 472

---

### `FUNCTION` `canShowEmailAm`

- **Line:** 533

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `statusWeight`

- **Line:** 534

---

### `VARIABLE` `bucketVal`

- **Line:** 535

---

### `VARIABLE` `isQuoteOrTrial`

- **Line:** 537

---

### `VARIABLE` `isAmBucket`

- **Line:** 538

---

### `FUNCTION` `isPriorityLead`

- **Line:** 549

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `sortedLeads`

- **Line:** 554

---

### `VARIABLE` `weightA`

- **Line:** 556

---

### `VARIABLE` `weightB`

- **Line:** 557

---

### `VARIABLE` `aVal`

- **Line:** 565
- **Signature:** `any`

---

### `VARIABLE` `bVal`

- **Line:** 566
- **Signature:** `any`

---

### `VARIABLE` `totalPages`

- **Line:** 589

---

### `VARIABLE` `safeCurrentPage`

- **Line:** 590

---

### `VARIABLE` `paginatedLeads`

- **Line:** 592

---

### `VARIABLE` `start`

- **Line:** 594

---

### `FUNCTION` `handleSort`

- **Line:** 598

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `field` | `keyof Lead | 'bucket' | 'customerSource'` | **Yes** | - | - |

---

### `FUNCTION` `handleClearFilters`

- **Line:** 608

---

### `FUNCTION` `isOutboundBucketLead`

- **Line:** 618

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `bucket`

- **Line:** 619

---

### `FUNCTION` `isAccountManagerBucketLead`

- **Line:** 624

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `bucket`

- **Line:** 625

---

### `FUNCTION` `handleOpenOutboundStatusInfo`

- **Line:** 630

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `formatDateDisplay`

- **Line:** 636

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 639

---

### `FUNCTION` `getStatusMeaningExplanation`

- **Line:** 648
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `normalized`

- **Line:** 649

---

### `FUNCTION` `renderPipelineStatusNotice`

- **Line:** 707

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 708

---

### `VARIABLE` `UNCONTACTED_STATUSES`

- **Line:** 709

---

### `VARIABLE` `isUncontacted`

- **Line:** 710

---

### `VARIABLE` `isLost`

- **Line:** 711

---

### `VARIABLE` `isWon`

- **Line:** 712

---

### `FUNCTION` `getStatusBadgeVariant`

- **Line:** 800

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getBucketBadge`

- **Line:** 812

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `bucket`

- **Line:** 813

---

### `VARIABLE` `lower`

- **Line:** 817

---

### `FUNCTION` `getCustomerSourceDisplay`

- **Line:** 834

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `source`

- **Line:** 835

---

### `VARIABLE` `activeFiltersCount`

- **Line:** 848

---

### `VARIABLE` `cityState`

- **Line:** 1233

---

### `VARIABLE` `contactName`

- **Line:** 1235

---

### `VARIABLE` `contactEmail`

- **Line:** 1236

---

### `VARIABLE` `am`

- **Line:** 1237

---

### `VARIABLE` `isPriority`

- **Line:** 1238

---

### `VARIABLE` `am`

- **Line:** 1568

---

