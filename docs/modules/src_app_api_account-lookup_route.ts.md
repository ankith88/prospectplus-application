# Module: `src/app/api/account-lookup/route.ts`

- **Language:** TypeScript
- **Total Lines:** 1046
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 8

---

### `FUNCTION` `resolveAddress`

- **Line:** 10

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `FUNCTION` `getPhoneVariations`

- **Line:** 42
- **Returns:** `string[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNum` | `string` | **Yes** | - | - |

---

### `VARIABLE` `digits`

- **Line:** 43

---

### `VARIABLE` `variations`

- **Line:** 44

---

### `VARIABLE` `localPart`

- **Line:** 49

---

### `VARIABLE` `localPart`

- **Line:** 53

---

### `FUNCTION` `safeResolve`

- **Line:** 67
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `promises` | `Promise<any>[]` | **Yes** | - | - |

---

### `VARIABLE` `results`

- **Line:** 68

---

### `FUNCTION` `GET`

- **Line:** 79
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `q`

- **Line:** 82

---

### `VARIABLE` `db`

- **Line:** 88

---

### `VARIABLE` `authHeader`

- **Line:** 91

---

### `VARIABLE` `activeRoleHeader`

- **Line:** 92

---

### `VARIABLE` `isFranchisee`

- **Line:** 93

---

### `VARIABLE` `userFranchiseeNames`

- **Line:** 94

---

### `VARIABLE` `userFranchiseeIds`

- **Line:** 95

---

### `VARIABLE` `userIdentities`

- **Line:** 96

---

### `VARIABLE` `idToken`

- **Line:** 99

---

### `VARIABLE` `decodedToken`

- **Line:** 101

---

### `VARIABLE` `uid`

- **Line:** 102

---

### `VARIABLE` `userDoc`

- **Line:** 103

---

### `VARIABLE` `userProfile`

- **Line:** 105

---

### `VARIABLE` `role`

- **Line:** 106

---

### `VARIABLE` `fullName`

- **Line:** 145

---

### `FUNCTION` `matchesUserFranchisee`

- **Line:** 153

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `franName`

- **Line:** 157

---

### `VARIABLE` `franId`

- **Line:** 158

---

### `VARIABLE` `hasLinkedMatch`

- **Line:** 164

---

### `VARIABLE` `norm`

- **Line:** 166

---

### `VARIABLE` `nameNorm`

- **Line:** 169

---

### `VARIABLE` `idNorm`

- **Line:** 170

---

### `FUNCTION` `isAssigned`

- **Line:** 179

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `type`

- **Line:** 198

---

### `VARIABLE` `digitsOnly`

- **Line:** 201

---

### `VARIABLE` `isEmail`

- **Line:** 202

---

### `VARIABLE` `phoneVariations`

- **Line:** 203

---

### `VARIABLE` `STOP_WORDS`

- **Line:** 206

---

### `VARIABLE` `rawWords`

- **Line:** 209

---

### `VARIABLE` `queryWords`

- **Line:** 210

---

### `VARIABLE` `significantQueryWords`

- **Line:** 211

---

### `VARIABLE` `extractedId`

- **Line:** 214

---

### `VARIABLE` `urlPath`

- **Line:** 217

---

### `VARIABLE` `segments`

- **Line:** 218

---

### `VARIABLE` `strippedInvId`

- **Line:** 227

---

### `VARIABLE` `possibleIds`

- **Line:** 229

---

### `VARIABLE` `baseSearchStrings`

- **Line:** 237

---

### `VARIABLE` `searchStrings`

- **Line:** 257

---

### `VARIABLE` `leadPromises`

- **Line:** 265
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `companyPromises`

- **Line:** 266
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `contactPromises`

- **Line:** 267
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `ticketPromises`

- **Line:** 268
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `invoicePromises`

- **Line:** 269
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `rawLowerQuery`

- **Line:** 282

---

### `VARIABLE` `queryBigrams`

- **Line:** 283
- **Signature:** `string[]`

---

### `VARIABLE` `w1`

- **Line:** 285

---

### `VARIABLE` `w2`

- **Line:** 286

---

### `VARIABLE` `nonStopWords`

- **Line:** 292

---

### `VARIABLE` `arrayQueryWords`

- **Line:** 294

---

### `VARIABLE` `prefixes`

- **Line:** 428

---

### `VARIABLE` `invoiceFields`

- **Line:** 516

---

### `VARIABLE` `rawMatchedDocs`

- **Line:** 590

---

### `VARIABLE` `parentFetchItems`

- **Line:** 612
- **Signature:** `{ ref: any; type: 'lead' | 'company'; matchedInvoice?: string }[]`

---

### `VARIABLE` `parentRef`

- **Line:** 617

---

### `VARIABLE` `type`

- **Line:** 619

---

### `VARIABLE` `key`

- **Line:** 620

---

### `VARIABLE` `invData`

- **Line:** 632

---

### `VARIABLE` `invDocId`

- **Line:** 633

---

### `VARIABLE` `parentRef`

- **Line:** 634

---

### `VARIABLE` `type`

- **Line:** 636

---

### `VARIABLE` `key`

- **Line:** 637

---

### `VARIABLE` `existing`

- **Line:** 641

---

### `VARIABLE` `parentSnaps`

- **Line:** 652

---

### `VARIABLE` `item`

- **Line:** 663

---

### `VARIABLE` `data`

- **Line:** 664

---

### `VARIABLE` `matchedDocs`

- **Line:** 674

---

### `VARIABLE` `data`

- **Line:** 676

---

### `VARIABLE` `isDirectIdMatch`

- **Line:** 679

---

### `VARIABLE` `companyNameStr`

- **Line:** 695

---

### `VARIABLE` `prospectPlusIdStr`

- **Line:** 696

---

### `VARIABLE` `entityIdStr`

- **Line:** 697

---

### `VARIABLE` `emailFieldStr`

- **Line:** 698

---

### `VARIABLE` `phoneFieldStr`

- **Line:** 699

---

### `VARIABLE` `phoneDigits`

- **Line:** 700

---

### `VARIABLE` `matchedInvoiceStr`

- **Line:** 702

---

### `VARIABLE` `lastInvoiceNumberStr`

- **Line:** 703

---

### `VARIABLE` `resolvedAddr`

- **Line:** 705

---

### `VARIABLE` `addressStr`

- **Line:** 706

---

### `VARIABLE` `fullCombinedStr`

- **Line:** 710

---

### `VARIABLE` `checkWords`

- **Line:** 712

---

### `VARIABLE` `matches`

- **Line:** 716

---

### `VARIABLE` `matches`

- **Line:** 719

---

### `VARIABLE` `cleanW`

- **Line:** 720

---

### `VARIABLE` `matches`

- **Line:** 725

---

### `VARIABLE` `cleanW`

- **Line:** 726

---

### `VARIABLE` `matches`

- **Line:** 731

---

### `VARIABLE` `matches`

- **Line:** 734

---

### `VARIABLE` `matchesPhone`

- **Line:** 738

---

### `VARIABLE` `vDigits`

- **Line:** 739

---

### `VARIABLE` `matches`

- **Line:** 744

---

### `VARIABLE` `matches`

- **Line:** 749

---

### `VARIABLE` `cleanW`

- **Line:** 750

---

### `VARIABLE` `score`

- **Line:** 756

---

### `VARIABLE` `parentIdsToFetch`

- **Line:** 763

---

### `VARIABLE` `groupItemsMap`

- **Line:** 771

---

### `VARIABLE` `groupDetailsMap`

- **Line:** 772

---

### `VARIABLE` `groupQueries`

- **Line:** 775
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `groupSnaps`

- **Line:** 810

---

### `VARIABLE` `snapIdx`

- **Line:** 811

---

### `VARIABLE` `siblingLeadsSnap`

- **Line:** 813

---

### `VARIABLE` `siblingCompaniesSnap`

- **Line:** 814

---

### `VARIABLE` `parentLeadInternalSnap`

- **Line:** 815

---

### `VARIABLE` `parentCompanyInternalSnap`

- **Line:** 816

---

### `VARIABLE` `parentLeadInternalIDSnap`

- **Line:** 817

---

### `VARIABLE` `parentCompanyInternalIDSnap`

- **Line:** 818

---

### `VARIABLE` `parentLeadDocSnap`

- **Line:** 819

---

### `VARIABLE` `parentCompanyDocSnap`

- **Line:** 820

---

### `VARIABLE` `parentName`

- **Line:** 822

---

### `FUNCTION` `getCompanyName`

- **Line:** 824

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `snap` | `any` | **Yes** | - | - |

---

### `VARIABLE` `siblingParent`

- **Line:** 846

---

### `VARIABLE` `matchedItem`

- **Line:** 852

---

### `VARIABLE` `groupItems`

- **Line:** 861
- **Signature:** `any[]`

---

### `VARIABLE` `seenIds`

- **Line:** 862

---

### `VARIABLE` `groups`

- **Line:** 885
- **Signature:** `any[]`

---

### `VARIABLE` `individualItems`

- **Line:** 886
- **Signature:** `any[]`

---

### `VARIABLE` `parentId`

- **Line:** 890

---

### `VARIABLE` `siblingItems`

- **Line:** 894

---

### `VARIABLE` `groupDetails`

- **Line:** 900

---

### `VARIABLE` `servicedCount`

- **Line:** 902

---

### `VARIABLE` `opportunityCount`

- **Line:** 903

---

### `VARIABLE` `companyIdsSet`

- **Line:** 958

---

### `FUNCTION` `getDocIds`

- **Line:** 959

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `doc` | `any` | **Yes** | - | - |

---

### `VARIABLE` `ids`

- **Line:** 960

---

### `VARIABLE` `ids`

- **Line:** 975

---

### `VARIABLE` `deduplicatedIndividualItems`

- **Line:** 980

---

### `VARIABLE` `leadIds`

- **Line:** 982

---

### `VARIABLE` `ticketItems`

- **Line:** 992
- **Signature:** `any[]`

---

### `VARIABLE` `seenTicketIds`

- **Line:** 993

---

### `FUNCTION` `processTicketDoc`

- **Line:** 996

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `ticketNumberStr`

- **Line:** 1000

---

### `VARIABLE` `companyStr`

- **Line:** 1001

---

### `VARIABLE` `enquiryStr`

- **Line:** 1002

---

### `VARIABLE` `combinedTicket`

- **Line:** 1003

---

