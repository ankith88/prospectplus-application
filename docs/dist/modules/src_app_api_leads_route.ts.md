# Module: `src/app/api/leads/route.ts`

- **Language:** TypeScript
- **Total Lines:** 722
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `VARIABLE` `API_KEY`

- **Line:** 11

---

### `FUNCTION` `generateUniqueProspectPlusId`

- **Line:** 13
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `db` | `FirebaseFirestore.Firestore` | **Yes** | - | - |

---

### `VARIABLE` `unique`

- **Line:** 14

---

### `VARIABLE` `candidate`

- **Line:** 15

---

### `VARIABLE` `attempts`

- **Line:** 16

---

### `VARIABLE` `leadsSnap`

- **Line:** 20

---

### `VARIABLE` `companiesSnap`

- **Line:** 22

---

### `FUNCTION` `unwrapValue`

- **Line:** 29
- **Returns:** `any`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 37
- **Signature:** `any`

---

### `FUNCTION` `POST`

- **Line:** 49
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `apiKeyHeader`

- **Line:** 50

---

### `VARIABLE` `rawBody`

- **Line:** 57

---

### `VARIABLE` `body`

- **Line:** 60
- **Signature:** `any`

---

### `VARIABLE` `finalPageUrl`

- **Line:** 104

---

### `VARIABLE` `finalUtmSource`

- **Line:** 107

---

### `VARIABLE` `finalUtmMedium`

- **Line:** 108

---

### `VARIABLE` `finalUtmCampaign`

- **Line:** 109

---

### `VARIABLE` `finalUtmContent`

- **Line:** 110

---

### `VARIABLE` `finalUtmTerm`

- **Line:** 111

---

### `VARIABLE` `finalAdClickId`

- **Line:** 112

---

### `VARIABLE` `finalReferrer`

- **Line:** 113

---

### `VARIABLE` `finalPhDistinctId`

- **Line:** 114

---

### `VARIABLE` `finalPhSessionId`

- **Line:** 115

---

### `VARIABLE` `finalPhSessionUrl`

- **Line:** 117

---

### `VARIABLE` `finalChannel`

- **Line:** 122

---

### `VARIABLE` `mergedAttribution`

- **Line:** 139

---

### `VARIABLE` `finalZip`

- **Line:** 155

---

### `VARIABLE` `finalCity`

- **Line:** 156

---

### `VARIABLE` `db`

- **Line:** 162

---

### `VARIABLE` `matchedFranchiseeIds`

- **Line:** 165
- **Signature:** `string[]`

---

### `VARIABLE` `matchedFranchiseeNames`

- **Line:** 166
- **Signature:** `string[]`

---

### `VARIABLE` `routingNote`

- **Line:** 167

---

### `VARIABLE` `zipTrimmed`

- **Line:** 170

---

### `VARIABLE` `cityTrimmed`

- **Line:** 171

---

### `VARIABLE` `franchiseesSnap`

- **Line:** 173

---

### `VARIABLE` `data`

- **Line:** 176

---

### `VARIABLE` `territories`

- **Line:** 177

---

### `VARIABLE` `matches`

- **Line:** 178

---

### `VARIABLE` `assignedFranchisee`

- **Line:** 186

---

### `VARIABLE` `assignedFranchiseeName`

- **Line:** 187

---

### `VARIABLE` `potentialFranchisees`

- **Line:** 188
- **Signature:** `string[] | undefined`

---

### `VARIABLE` `initialStatus`

- **Line:** 189

---

### `VARIABLE` `isMultisite`

- **Line:** 203

---

### `VARIABLE` `assignedAccountManager`

- **Line:** 206

---

### `VARIABLE` `accountManagerName`

- **Line:** 207
- **Signature:** `string | null`

---

### `VARIABLE` `accountManagerCalendly`

- **Line:** 208
- **Signature:** `string | null`

---

### `VARIABLE` `accountManagerEmail`

- **Line:** 209
- **Signature:** `string | null`

---

### `VARIABLE` `usersRef`

- **Line:** 212

---

### `VARIABLE` `amSnap`

- **Line:** 215

---

### `VARIABLE` `amUsers`

- **Line:** 217

---

### `VARIABLE` `randomAm`

- **Line:** 219

---

### `VARIABLE` `amDoc`

- **Line:** 233

---

### `VARIABLE` `data`

- **Line:** 235

---

### `VARIABLE` `nameSnap`

- **Line:** 241

---

### `VARIABLE` `data`

- **Line:** 243

---

### `VARIABLE` `rawSource`

- **Line:** 260

---

### `VARIABLE` `isWebsiteSource`

- **Line:** 261

---

### `VARIABLE` `prospectPlusId`

- **Line:** 264

---

### `VARIABLE` `leadData`

- **Line:** 265
- **Signature:** `any`

---

### `VARIABLE` `coreBrand`

- **Line:** 317

---

### `VARIABLE` `checkedCandidateIds`

- **Line:** 318

---

### `VARIABLE` `exactLeadsPromise`

- **Line:** 320

---

### `VARIABLE` `prefixLeadsPromise`

- **Line:** 321

---

### `VARIABLE` `coreUpper`

- **Line:** 323

---

### `VARIABLE` `companiesSnapPromise`

- **Line:** 330

---

### `VARIABLE` `isDuplicate`

- **Line:** 338

---

### `VARIABLE` `isExistingCustomerMatch`

- **Line:** 339

---

### `VARIABLE` `matchingCustomerId`

- **Line:** 340
- **Signature:** `string | null`

---

### `VARIABLE` `similarLeads`

- **Line:** 341
- **Signature:** `string[]`

---

### `VARIABLE` `topConfidence`

- **Line:** 342
- **Signature:** `'High' | 'Medium' | 'Low' | 'None'`

---

### `VARIABLE` `topReasons`

- **Line:** 343
- **Signature:** `string[]`

---

### `VARIABLE` `topScore`

- **Line:** 344

---

### `VARIABLE` `allCandidateDocs`

- **Line:** 346

---

### `VARIABLE` `candidateLead`

- **Line:** 350

---

### `VARIABLE` `evalResult`

- **Line:** 351

---

### `VARIABLE` `evalResult`

- **Line:** 365

---

### `VARIABLE` `netSuitePayload`

- **Line:** 387

---

### `VARIABLE` `docRef`

- **Line:** 420
- **Signature:** `any`

---

### `VARIABLE` `netSuiteSuccess`

- **Line:** 421

---

### `VARIABLE` `netSuiteId`

- **Line:** 422
- **Signature:** `string | null`

---

### `VARIABLE` `nsResult`

- **Line:** 426

---

### `VARIABLE` `internalid`

- **Line:** 438
- **Signature:** `string | undefined`

---

### `VARIABLE` `customerEntityId`

- **Line:** 439
- **Signature:** `string | undefined`

---

### `VARIABLE` `bookingUrlId`

- **Line:** 440
- **Signature:** `string | undefined`

---

### `VARIABLE` `leadRef`

- **Line:** 448

---

### `VARIABLE` `leadDoc`

- **Line:** 449

---

### `VARIABLE` `netSuiteLeadData`

- **Line:** 451

---

### `VARIABLE` `updates`

- **Line:** 458
- **Signature:** `any`

---

### `VARIABLE` `targetBucket`

- **Line:** 461

---

### `VARIABLE` `localMilePlusAuthLink`

- **Line:** 493
- **Signature:** `string | undefined`

---

### `VARIABLE` `emailHtml`

- **Line:** 500

---

### `VARIABLE` `contact`

- **Line:** 523

---

### `VARIABLE` `contactFirstName`

- **Line:** 524

---

### `VARIABLE` `contactLastName`

- **Line:** 525

---

### `VARIABLE` `contactEmail`

- **Line:** 526

---

### `VARIABLE` `contactPhone`

- **Line:** 527

---

### `VARIABLE` `trialResult`

- **Line:** 529

---

### `VARIABLE` `leadRef`

- **Line:** 546

---

### `VARIABLE` `contactsRef`

- **Line:** 557

---

### `VARIABLE` `contactsSnap`

- **Line:** 558

---

### `VARIABLE` `firstContactDoc`

- **Line:** 560

---

### `VARIABLE` `activityRef`

- **Line:** 577

---

### `VARIABLE` `contactsSubRef`

- **Line:** 595

---

### `VARIABLE` `firstContactId`

- **Line:** 596
- **Signature:** `string | undefined`

---

### `VARIABLE` `contactRef`

- **Line:** 599

---

### `VARIABLE` `activityRef`

- **Line:** 614

---

### `VARIABLE` `finalLpoLeadId`

- **Line:** 624

---

### `VARIABLE` `createdLeadId`

- **Line:** 626

---

### `VARIABLE` `createdLeadId`

- **Line:** 645

---

### `VARIABLE` `bucketHistoryRef`

- **Line:** 649

---

### `VARIABLE` `existingBhSnap`

- **Line:** 650

---

### `VARIABLE` `nowIso`

- **Line:** 652

---

### `VARIABLE` `bhEntry`

- **Line:** 653

---

### `VARIABLE` `leadDocSnap`

- **Line:** 673

---

### `VARIABLE` `leadDocData`

- **Line:** 675

---

### `VARIABLE` `payloadObject`

- **Line:** 676
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `apiKey`

- **Line:** 686

---

