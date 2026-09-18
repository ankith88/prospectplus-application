# Module: `src/app/admin/marketing/nurture-journeys/[id]/enroll/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 875
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `FUNCTION` `EnrollLeadsPage`

- **Line:** 20
- **Returns:** `void`

---

### `VARIABLE` `params`

- **Line:** 22

---

### `VARIABLE` `router`

- **Line:** 23

---

### `VARIABLE` `journeyId`

- **Line:** 26

---

### `FUNCTION` `parseLeadDate`

- **Line:** 53
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parsed`

- **Line:** 58

---

### `FUNCTION` `getFieldValue`

- **Line:** 64

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `field` | `string` | **Yes** | - | - |
| `leadData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `isComp`

- **Line:** 69

---

### `FUNCTION` `evaluateCondition`

- **Line:** 81

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cond` | `any` | **Yes** | - | - |
| `leadData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `op`

- **Line:** 83

---

### `VARIABLE` `leadDate`

- **Line:** 86

---

### `VARIABLE` `leadTime`

- **Line:** 91

---

### `VARIABLE` `fromStr`

- **Line:** 92

---

### `VARIABLE` `toStr`

- **Line:** 93

---

### `VARIABLE` `parts`

- **Line:** 96

---

### `VARIABLE` `match`

- **Line:** 104

---

### `VARIABLE` `fromTime`

- **Line:** 106

---

### `VARIABLE` `toTime`

- **Line:** 110

---

### `VARIABLE` `fromTime`

- **Line:** 118

---

### `VARIABLE` `targetStr`

- **Line:** 123

---

### `VARIABLE` `toTime`

- **Line:** 125

---

### `VARIABLE` `fromTime`

- **Line:** 131

---

### `VARIABLE` `toTime`

- **Line:** 132

---

### `VARIABLE` `fromTime`

- **Line:** 138

---

### `VARIABLE` `toTime`

- **Line:** 139

---

### `VARIABLE` `val`

- **Line:** 145

---

### `VARIABLE` `val`

- **Line:** 152

---

### `VARIABLE` `leadNum`

- **Line:** 159

---

### `VARIABLE` `targetNum`

- **Line:** 160

---

### `VARIABLE` `isAccepted`

- **Line:** 165

---

### `VARIABLE` `targetValue`

- **Line:** 166

---

### `VARIABLE` `leadVal`

- **Line:** 170

---

### `VARIABLE` `targetVal`

- **Line:** 171

---

### `FUNCTION` `fetchJourneyAndEvaluate`

- **Line:** 179
- **Async:** Yes

---

### `VARIABLE` `jDoc`

- **Line:** 183

---

### `VARIABLE` `jData`

- **Line:** 190

---

### `VARIABLE` `triggerNode`

- **Line:** 194

---

### `VARIABLE` `conditionGroups`

- **Line:** 205

---

### `VARIABLE` `leadsSnap`

- **Line:** 208

---

### `VARIABLE` `allLeads`

- **Line:** 209

---

### `VARIABLE` `matched`

- **Line:** 213

---

### `VARIABLE` `currentActive`

- **Line:** 215

---

### `FUNCTION` `startEnrollment`

- **Line:** 233
- **Async:** Yes

---

### `VARIABLE` `cancelOtherJourneys`

- **Line:** 238

---

### `VARIABLE` `batchSize`

- **Line:** 239

---

### `VARIABLE` `processed`

- **Line:** 240

---

### `VARIABLE` `author`

- **Line:** 242

---

### `VARIABLE` `nowStr`

- **Line:** 243

---

### `VARIABLE` `batchLeads`

- **Line:** 246

---

### `VARIABLE` `batch`

- **Line:** 247

---

### `VARIABLE` `leadRef`

- **Line:** 250

---

### `VARIABLE` `currentActive`

- **Line:** 251

---

### `VARIABLE` `journeysToKeep`

- **Line:** 253

---

### `VARIABLE` `activityRef`

- **Line:** 262

---

### `FUNCTION` `activateAndStartEnrollment`

- **Line:** 288
- **Async:** Yes

---

### `VARIABLE` `jRef`

- **Line:** 292

---

### `VARIABLE` `emailSteps`

- **Line:** 306

---

### `FUNCTION` `getLeadEmail`

- **Line:** 310
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `FUNCTION` `handleOpenTestModal`

- **Line:** 320

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `VARIABLE` `leadEmail`

- **Line:** 322

---

### `FUNCTION` `handleSendTestEmail`

- **Line:** 330
- **Async:** Yes

---

### `VARIABLE` `stepNode`

- **Line:** 338

---

### `VARIABLE` `stepConfig`

- **Line:** 345

---

### `VARIABLE` `subject`

- **Line:** 346

---

### `VARIABLE` `rawHtml`

- **Line:** 347

---

### `VARIABLE` `tDoc`

- **Line:** 351

---

### `VARIABLE` `tData`

- **Line:** 353

---

### `VARIABLE` `leadName`

- **Line:** 366

---

### `VARIABLE` `companyName`

- **Line:** 367

---

### `VARIABLE` `amName`

- **Line:** 368

---

### `VARIABLE` `amMobile`

- **Line:** 369

---

### `VARIABLE` `amEmail`

- **Line:** 370

---

### `VARIABLE` `amCalendly`

- **Line:** 371

---

### `VARIABLE` `amTrimmed`

- **Line:** 375

---

### `VARIABLE` `userDocById`

- **Line:** 376

---

### `VARIABLE` `matchedUser`

- **Line:** 377
- **Signature:** `any`

---

### `VARIABLE` `usersSnap`

- **Line:** 380

---

### `VARIABLE` `targetLower`

- **Line:** 381

---

### `VARIABLE` `foundDoc`

- **Line:** 382

---

### `VARIABLE` `uData`

- **Line:** 383

---

### `VARIABLE` `fullName`

- **Line:** 384

---

### `VARIABLE` `displayName`

- **Line:** 385

---

### `VARIABLE` `name`

- **Line:** 386

---

### `VARIABLE` `email`

- **Line:** 387

---

### `VARIABLE` `primaryContact`

- **Line:** 404

---

### `VARIABLE` `contactName`

- **Line:** 405

---

### `VARIABLE` `contactFirstName`

- **Line:** 406

---

### `VARIABLE` `localMilePlusAuthLink`

- **Line:** 407

---

### `VARIABLE` `localMileSecurityCode`

- **Line:** 408

---

### `VARIABLE` `scfLink`

- **Line:** 410

---

### `VARIABLE` `sofLink`

- **Line:** 411

---

### `VARIABLE` `localMileLink`

- **Line:** 412

---

### `VARIABLE` `placeholderCtx`

- **Line:** 414

---

### `VARIABLE` `bodyHtml`

- **Line:** 448

---

### `VARIABLE` `leadEmailAddr`

- **Line:** 451

---

### `VARIABLE` `isSentToActualLead`

- **Line:** 452

---

### `VARIABLE` `testBanner`

- **Line:** 455

---

### `VARIABLE` `res`

- **Line:** 463

---

### `VARIABLE` `result`

- **Line:** 474

---

### `VARIABLE` `isDraftOrPaused`

- **Line:** 501

---

### `VARIABLE` `filteredLeads`

- **Line:** 503

---

### `VARIABLE` `q`

- **Line:** 505

---

### `VARIABLE` `companyName`

- **Line:** 506

---

### `VARIABLE` `tradingName`

- **Line:** 507

---

### `VARIABLE` `contactName`

- **Line:** 508

---

### `VARIABLE` `email`

- **Line:** 509

---

### `VARIABLE` `actualLeadEmail`

- **Line:** 747

---

### `VARIABLE` `isActualLeadSelected`

- **Line:** 748

---

### `VARIABLE` `isMyEmailSelected`

- **Line:** 749

---

