# Module: `src/app/field-activity-report/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 2012
- **Direct Dependencies:** 33 modules imported

## Exported Symbols & API

### `VARIABLE` `COLORS`

- **Line:** 69

---

### `VARIABLE` `OUTCOME_COLORS`

- **Line:** 71
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `getOutcomeColor`

- **Line:** 85

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

### `FUNCTION` `StatCard`

- **Line:** 90

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ title, value, icon: Icon, description, onClick }` | `{ title: string; value: string | number; icon: React.ElementType; description?: string; onClick?: () => void }` | **Yes** | - | - |

---

### `FUNCTION` `FieldActivityReportPage`

- **Line:** 103
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 135

---

### `VARIABLE` `isFranchisee`

- **Line:** 146

---

### `VARIABLE` `hasAccess`

- **Line:** 147

---

### `VARIABLE` `fetchData`

- **Line:** 149

---

### `VARIABLE` `canSeeAll`

- **Line:** 154

---

### `VARIABLE` `notesPromise`

- **Line:** 155

---

### `FUNCTION` `handleFilterChange`

- **Line:** 186

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 190

---

### `VARIABLE` `leadsMap`

- **Line:** 194

---

### `VARIABLE` `visibleVisitNotes`

- **Line:** 196

---

### `VARIABLE` `isCapturedByMe`

- **Line:** 201

---

### `VARIABLE` `isLinkedToMyFranchise`

- **Line:** 202

---

### `VARIABLE` `linkedRecord`

- **Line:** 204

---

### `VARIABLE` `filteredVisitNotes`

- **Line:** 213

---

### `VARIABLE` `capturedByUserMatch`

- **Line:** 215

---

### `VARIABLE` `outcomeMatch`

- **Line:** 216

---

### `VARIABLE` `lead`

- **Line:** 218

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 219

---

### `VARIABLE` `dateMatch`

- **Line:** 221

---

### `VARIABLE` `noteDate`

- **Line:** 223

---

### `VARIABLE` `fromDate`

- **Line:** 224

---

### `VARIABLE` `toDate`

- **Line:** 225

---

### `VARIABLE` `isDashback`

- **Line:** 229

---

### `VARIABLE` `dashbackMatch`

- **Line:** 230

---

### `VARIABLE` `filteredUpsells`

- **Line:** 236

---

### `VARIABLE` `userMatch`

- **Line:** 238

---

### `VARIABLE` `dateMatch`

- **Line:** 239

---

### `VARIABLE` `upsellDate`

- **Line:** 241

---

### `VARIABLE` `fromDate`

- **Line:** 242

---

### `VARIABLE` `toDate`

- **Line:** 243

---

### `VARIABLE` `stats`

- **Line:** 250

---

### `VARIABLE` `totalVisitsCount`

- **Line:** 251

---

### `VARIABLE` `convertedNotes`

- **Line:** 252

---

### `VARIABLE` `rejectedNotes`

- **Line:** 253

---

### `VARIABLE` `pendingNotes`

- **Line:** 254

---

### `VARIABLE` `totalPending`

- **Line:** 255

---

### `VARIABLE` `linkedToExistingNotes`

- **Line:** 257

---

### `VARIABLE` `conversionRate`

- **Line:** 259

---

### `VARIABLE` `appointmentOutcomes`

- **Line:** 261

---

### `VARIABLE` `miscProcessingOutcomes`

- **Line:** 262

---

### `VARIABLE` `appointmentVisits`

- **Line:** 264

---

### `VARIABLE` `pendingApptConversionVisits`

- **Line:** 268

---

### `VARIABLE` `apptConvertedVisits`

- **Line:** 270

---

### `VARIABLE` `apptConvertedLeads`

- **Line:** 271

---

### `VARIABLE` `leadsWithAnyApptIds`

- **Line:** 280

---

### `VARIABLE` `leadsProcessedWithMisc`

- **Line:** 282

---

### `VARIABLE` `leadActivities`

- **Line:** 284

---

### `VARIABLE` `lead`

- **Line:** 290

---

### `VARIABLE` `activity`

- **Line:** 291

---

### `VARIABLE` `miscProcessedIds`

- **Line:** 304

---

### `VARIABLE` `leadsConvertedWithAppt`

- **Line:** 306

---

### `VARIABLE` `lead`

- **Line:** 309

---

### `VARIABLE` `appt`

- **Line:** 310

---

### `VARIABLE` `leadsConvertedWithoutAppt`

- **Line:** 322

---

### `VARIABLE` `callOutcomesData`

- **Line:** 332

---

### `VARIABLE` `type`

- **Line:** 333

---

### `VARIABLE` `existing`

- **Line:** 334

---

### `VARIABLE` `visitsByUserData`

- **Line:** 340

---

### `VARIABLE` `name`

- **Line:** 341

---

### `VARIABLE` `visits`

- **Line:** 342

---

### `VARIABLE` `repOutcomeEfficiency`

- **Line:** 346

---

### `VARIABLE` `name`

- **Line:** 347

---

### `VARIABLE` `userNotes`

- **Line:** 348

---

### `VARIABLE` `totalVisits`

- **Line:** 349

---

### `VARIABLE` `outcomesCount`

- **Line:** 352

---

### `VARIABLE` `type`

- **Line:** 353

---

### `VARIABLE` `commissionEligibleEvents`

- **Line:** 370
- **Signature:** `any[]`

---

### `VARIABLE` `performanceStats`

- **Line:** 371

---

### `VARIABLE` `name`

- **Line:** 372

---

### `VARIABLE` `userNotes`

- **Line:** 373

---

### `VARIABLE` `userConvertedNotes`

- **Line:** 374

---

### `VARIABLE` `userUpsells`

- **Line:** 375

---

### `VARIABLE` `apptSuccessCount`

- **Line:** 377

---

### `VARIABLE` `outboundWinsCount`

- **Line:** 378

---

### `VARIABLE` `upsellCount`

- **Line:** 379

---

### `VARIABLE` `lead`

- **Line:** 382

---

### `VARIABLE` `hasCompletedAppt`

- **Line:** 385

---

### `VARIABLE` `isOutboundWin`

- **Line:** 399

---

### `VARIABLE` `totalCommissionEligible`

- **Line:** 433

---

### `VARIABLE` `wonLeadsList`

- **Line:** 435

---

### `VARIABLE` `wonCountForRatio`

- **Line:** 438

---

### `VARIABLE` `qualifiedLeadsList`

- **Line:** 440

---

### `VARIABLE` `qualifiedCountForRatio`

- **Line:** 443

---

### `VARIABLE` `quoteLeadsList`

- **Line:** 445

---

### `VARIABLE` `quoteCountForRatio`

- **Line:** 448

---

### `VARIABLE` `convertedLeadStatusDist`

- **Line:** 450

---

### `VARIABLE` `lead`

- **Line:** 451

---

### `VARIABLE` `status`

- **Line:** 452

---

### `VARIABLE` `existing`

- **Line:** 453

---

### `VARIABLE` `convertedLeadIds`

- **Line:** 459

---

### `VARIABLE` `leadToCapturerMap`

- **Line:** 460

---

### `VARIABLE` `sourcedAppts`

- **Line:** 461

---

### `VARIABLE` `lead`

- **Line:** 464

---

### `VARIABLE` `sourcedApptOutcomeDist`

- **Line:** 473

---

### `VARIABLE` `status`

- **Line:** 474

---

### `VARIABLE` `existing`

- **Line:** 475

---

### `VARIABLE` `convertedLeadsByFranchiseeData`

- **Line:** 481

---

### `VARIABLE` `lead`

- **Line:** 483

---

### `VARIABLE` `franchisee`

- **Line:** 484

---

### `VARIABLE` `visitToApptRate`

- **Line:** 492

---

### `VARIABLE` `completedSourcedAppts`

- **Line:** 493

---

### `VARIABLE` `apptSuccessRate`

- **Line:** 494

---

### `VARIABLE` `wonSourcedAppts`

- **Line:** 495

---

### `VARIABLE` `apptToWonRate`

- **Line:** 496

---

### `VARIABLE` `isAfterHours`

- **Line:** 538

---

### `VARIABLE` `isPriority`

- **Line:** 539

---

### `VARIABLE` `type`

- **Line:** 544

---

### `VARIABLE` `userOptions`

- **Line:** 551
- **Signature:** `Option[]`

---

### `VARIABLE` `users`

- **Line:** 552

---

### `VARIABLE` `outcomeOptions`

- **Line:** 556
- **Signature:** `Option[]`

---

### `VARIABLE` `outcomes`

- **Line:** 557

---

### `VARIABLE` `franchiseeOptions`

- **Line:** 561
- **Signature:** `Option[]`

---

### `VARIABLE` `leadIds`

- **Line:** 562

---

### `VARIABLE` `franchisees`

- **Line:** 563

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 567

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 569

---

### `FUNCTION` `handleExportList`

- **Line:** 576

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any[]` | **Yes** | - | - |
| `headers` | `string[]` | **Yes** | - | - |
| `filename` | `string` | **Yes** | - | - |
| `rowMapper` | `(item: any) => string[]` | **Yes** | - | - |

---

### `VARIABLE` `csvContent`

- **Line:** 581

---

### `VARIABLE` `blob`

- **Line:** 582

---

### `VARIABLE` `link`

- **Line:** 583

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 594

---

### `VARIABLE` `filteredSourcedAppts`

- **Line:** 596

---

### `VARIABLE` `companyIds`

- **Line:** 600

---

### `VARIABLE` `linkedRecord`

- **Line:** 1229

---

### `FUNCTION` `EfficiencyDrilldownDialog`

- **Line:** 1909
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange, title, leads }` | `{ isOpen: boolean, onOpenChange: (open: boolean) => void, title: string, leads: any[] }` | **Yes** | - | - |

---

### `VARIABLE` `filteredLeads`

- **Line:** 1914

---

### `VARIABLE` `res`

- **Line:** 1915

---

### `VARIABLE` `headers`

- **Line:** 1939

---

### `VARIABLE` `csvContent`

- **Line:** 1940

---

### `VARIABLE` `blob`

- **Line:** 1941

---

### `VARIABLE` `link`

- **Line:** 1942

---

