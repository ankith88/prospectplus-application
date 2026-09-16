# Module: `src/components/lead-profile.tsx`

- **Language:** TypeScript
- **Total Lines:** 11222
- **Direct Dependencies:** 94 modules imported

## Exported Symbols & API

### `INTERFACE` `LeadProfileProps`

- **Line:** 207

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `initialLead` | `Lead` | No | - |

---

### `FUNCTION` `cleanCallNotes`

- **Line:** 211
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `notes` | `string` | **Yes** | - | - |

---

### `VARIABLE` `cleaned`

- **Line:** 213

---

### `FUNCTION` `extractUrlQueryParam`

- **Line:** 219
- **Returns:** `string | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `urlStr` | `string` | No | - | - |
| `paramName` | `string` | No | - | - |

---

### `VARIABLE` `parsed`

- **Line:** 222

---

### `FUNCTION` `formatAddressString`

- **Line:** 229

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address` | No | - | - |

---

### `VARIABLE` `parts`

- **Line:** 231

---

### `FUNCTION` `parseLocationFromAddress`

- **Line:** 239

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `string` | No | - | - |
| `state` | `string` | No | - | - |

---

### `VARIABLE` `stateUpper`

- **Line:** 240

---

### `VARIABLE` `addr`

- **Line:** 253

---

### `FUNCTION` `hasWord`

- **Line:** 255

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `word` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getLocalTimeDetails`

- **Line:** 282

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `zone` | `string` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 284

---

### `VARIABLE` `timeOptions`

- **Line:** 286
- **Signature:** `Intl.DateTimeFormatOptions`

---

### `VARIABLE` `dayOptions`

- **Line:** 293
- **Signature:** `Intl.DateTimeFormatOptions`

---

### `VARIABLE` `timeStr`

- **Line:** 298

---

### `VARIABLE` `dayStr`

- **Line:** 299

---

### `VARIABLE` `formatter`

- **Line:** 301

---

### `VARIABLE` `parts`

- **Line:** 305

---

### `VARIABLE` `tzPart`

- **Line:** 306

---

### `VARIABLE` `tzAbbr`

- **Line:** 307

---

### `VARIABLE` `locDateStr`

- **Line:** 309

---

### `VARIABLE` `sysDateStr`

- **Line:** 310

---

### `VARIABLE` `locDate`

- **Line:** 311

---

### `VARIABLE` `sysDate`

- **Line:** 312

---

### `VARIABLE` `diffMs`

- **Line:** 313

---

### `VARIABLE` `diffHours`

- **Line:** 314

---

### `VARIABLE` `targetHour`

- **Line:** 316

---

### `VARIABLE` `targetDay`

- **Line:** 317

---

### `VARIABLE` `isOpen`

- **Line:** 318

---

### `FUNCTION` `LeadProfile`

- **Line:** 339
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ initialLead }` | `LeadProfileProps` | **Yes** | - | - |

---

### `VARIABLE` `pathname`

- **Line:** 340

---

### `VARIABLE` `isCompanyProfile`

- **Line:** 341

---

### `VARIABLE` `timer`

- **Line:** 354

---

### `FUNCTION` `handleDismissDuplicate`

- **Line:** 366
- **Async:** Yes

---

### `FUNCTION` `fetchThemes`

- **Line:** 406
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 408

---

### `VARIABLE` `resolvedCancellation`

- **Line:** 419

---

### `VARIABLE` `isLostStatus`

- **Line:** 422

---

### `VARIABLE` `activeHierarchy`

- **Line:** 432

---

### `VARIABLE` `autoMatch`

- **Line:** 433

---

### `VARIABLE` `themeName`

- **Line:** 436

---

### `VARIABLE` `foundTheme`

- **Line:** 438

---

### `VARIABLE` `categoryName`

- **Line:** 446

---

### `VARIABLE` `foundWhy`

- **Line:** 449

---

### `VARIABLE` `reasonName`

- **Line:** 462

---

### `VARIABLE` `foundReason`

- **Line:** 466

---

### `VARIABLE` `hasSpecificDetails`

- **Line:** 483

---

### `VARIABLE` `cancellationDateStr`

- **Line:** 498

---

### `VARIABLE` `typeInfo`

- **Line:** 500

---

### `FUNCTION` `handleSaveLossReason`

- **Line:** 523
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `themeId` | `string` | **Yes** | - | - |
| `whyId` | `string` | **Yes** | - | - |
| `reasonId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `saveAction`

- **Line:** 526
- **Async:** Yes

---

### `VARIABLE` `activeHierarchy`

- **Line:** 529

---

### `VARIABLE` `themeObj`

- **Line:** 530

---

### `VARIABLE` `whyObj`

- **Line:** 531

---

### `VARIABLE` `reasonObj`

- **Line:** 532

---

### `VARIABLE` `updates`

- **Line:** 534
- **Signature:** `Partial<Lead>`

---

### `VARIABLE` `currentStatus`

- **Line:** 556

---

### `FUNCTION` `checkAndPromptPendingItemsForLost`

- **Line:** 560
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetStatus` | `string` | **Yes** | - | - |
| `onProceed` | `() => Promise<void>` | **Yes** | - | - |

---

### `FUNCTION` `handleToggleLpoPlus`

- **Line:** 584
- **Async:** Yes

---

### `VARIABLE` `isLost`

- **Line:** 585

---

### `VARIABLE` `newValue`

- **Line:** 596

---

### `VARIABLE` `oldBucket`

- **Line:** 597

---

### `VARIABLE` `author`

- **Line:** 598

---

### `VARIABLE` `updateData`

- **Line:** 600
- **Signature:** `any`

---

### `VARIABLE` `updatedHistory`

- **Line:** 622

---

### `FUNCTION` `handleSyncLpoNetSuite`

- **Line:** 665
- **Async:** Yes

---

### `VARIABLE` `parentId`

- **Line:** 669

---

### `VARIABLE` `result`

- **Line:** 670

---

### `FUNCTION` `handleGetTranscriptForCall`

- **Line:** 699
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `call` | `Activity` | **Yes** | - | - |

---

### `VARIABLE` `authorName`

- **Line:** 701

---

### `VARIABLE` `result`

- **Line:** 704

---

### `VARIABLE` `updatedLead`

- **Line:** 712

---

### `FUNCTION` `ensureFranchiseeIdField`

- **Line:** 725
- **Async:** Yes

---

### `VARIABLE` `fId`

- **Line:** 727

---

### `VARIABLE` `directName`

- **Line:** 748

---

### `VARIABLE` `locId`

- **Line:** 749

---

### `VARIABLE` `data`

- **Line:** 760

---

### `FUNCTION` `fetchOperators`

- **Line:** 776
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 778

---

### `VARIABLE` `mapping`

- **Line:** 779
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `data`

- **Line:** 781

---

### `VARIABLE` `fullName`

- **Line:** 782

---

### `FUNCTION` `fetchFranchiseeData`

- **Line:** 797
- **Async:** Yes

---

### `VARIABLE` `effectiveFranchiseeId`

- **Line:** 798

---

### `VARIABLE` `franchiseeDoc`

- **Line:** 806
- **Signature:** `any`

---

### `VARIABLE` `fDoc`

- **Line:** 810

---

### `VARIABLE` `q1`

- **Line:** 815

---

### `VARIABLE` `qSnap1`

- **Line:** 816

---

### `VARIABLE` `q2`

- **Line:** 820

---

### `VARIABLE` `qSnap2`

- **Line:** 821

---

### `VARIABLE` `q`

- **Line:** 831

---

### `VARIABLE` `qSnap`

- **Line:** 832

---

### `VARIABLE` `isSameValue`

- **Line:** 843

---

### `VARIABLE` `isNumericFranchisee`

- **Line:** 844

---

### `VARIABLE` `isIdMatch`

- **Line:** 845

---

### `VARIABLE` `updatedFranchiseeId`

- **Line:** 849

---

### `FUNCTION` `handleViewOperators`

- **Line:** 885
- **Async:** Yes

---

### `VARIABLE` `fId`

- **Line:** 887

---

### `VARIABLE` `ops`

- **Line:** 891

---

### `FUNCTION` `handleAddAdditionalAddress`

- **Line:** 913

---

### `FUNCTION` `handleEditAdditionalAddress`

- **Line:** 918

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `addr` | `TaggedAddress` | **Yes** | - | - |

---

### `FUNCTION` `handleDeleteAdditionalAddress`

- **Line:** 923
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `addrId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updatedLead`

- **Line:** 931

---

### `FUNCTION` `handleAddressSaved`

- **Line:** 943
- **Async:** Yes

---

### `VARIABLE` `updatedLead`

- **Line:** 944

---

### `FUNCTION` `loadSiblings`

- **Line:** 957
- **Async:** Yes

---

### `VARIABLE` `siblings`

- **Line:** 960

---

### `VARIABLE` `children`

- **Line:** 963

---

### `FUNCTION` `checkDuplicates`

- **Line:** 982
- **Async:** Yes

---

### `VARIABLE` `matches`

- **Line:** 985
- **Signature:** `Lead[]`

---

### `VARIABLE` `companyMatches`

- **Line:** 986
- **Signature:** `any[]`

---

### `VARIABLE` `checkedIds`

- **Line:** 987

---

### `VARIABLE` `qExact`

- **Line:** 990

---

### `VARIABLE` `coreBrand`

- **Line:** 993

---

### `VARIABLE` `qPrefix`

- **Line:** 994

---

### `VARIABLE` `coreUpper`

- **Line:** 996

---

### `VARIABLE` `qCompanies`

- **Line:** 1006

---

### `VARIABLE` `extraLeadQueries`

- **Line:** 1009
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `extraDocs`

- **Line:** 1030

---

### `VARIABLE` `candidateDocs`

- **Line:** 1031

---

### `VARIABLE` `candidateData`

- **Line:** 1035

---

### `VARIABLE` `isDirectFieldMatch`

- **Line:** 1038

---

### `VARIABLE` `scoreRes`

- **Line:** 1045

---

### `VARIABLE` `candidateData`

- **Line:** 1054

---

### `VARIABLE` `scoreRes`

- **Line:** 1055

---

### `VARIABLE` `timer`

- **Line:** 1070

---

### `FUNCTION` `fetchFranchisees`

- **Line:** 1075
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 1077

---

### `VARIABLE` `franchiseesList`

- **Line:** 1078

---

### `VARIABLE` `filtered`

- **Line:** 1079

---

### `VARIABLE` `q`

- **Line:** 1091

---

### `VARIABLE` `unsubscribe`

- **Line:** 1092

---

### `VARIABLE` `appts`

- **Line:** 1093

---

### `VARIABLE` `parentCol`

- **Line:** 1102

---

### `VARIABLE` `q`

- **Line:** 1103

---

### `VARIABLE` `unsubscribe`

- **Line:** 1104

---

### `VARIABLE` `jobsList`

- **Line:** 1105

---

### `VARIABLE` `aTime`

- **Line:** 1107

---

### `VARIABLE` `bTime`

- **Line:** 1108

---

### `VARIABLE` `validJobsCount`

- **Line:** 1114

---

### `VARIABLE` `isTrialCancelled`

- **Line:** 1115

---

### `VARIABLE` `computedTrials`

- **Line:** 1116

---

### `VARIABLE` `computedJobCount`

- **Line:** 1117

---

### `FUNCTION` `handleRecredit`

- **Line:** 1138
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `jobId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 1141

---

### `VARIABLE` `hasAmpoService`

- **Line:** 1155

---

### `VARIABLE` `n`

- **Line:** 1156

---

### `FUNCTION` `fetchUsers`

- **Line:** 1165
- **Async:** Yes

---

### `VARIABLE` `usersRef`

- **Line:** 1168

---

### `VARIABLE` `amQ`

- **Line:** 1169

---

### `VARIABLE` `csQ`

- **Line:** 1170

---

### `FUNCTION` `processSnap`

- **Line:** 1174

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `snap` | `any` | **Yes** | - | - |
| `isAm` | `any` | No | `false` | - |

---

### `VARIABLE` `data`

- **Line:** 1175

---

### `VARIABLE` `name`

- **Line:** 1177

---

### `FUNCTION` `calculateEngagementScore`

- **Line:** 1192

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `currentLead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `score`

- **Line:** 1193

---

### `VARIABLE` `callsCount`

- **Line:** 1200

---

### `VARIABLE` `notesCount`

- **Line:** 1202

---

### `VARIABLE` `engagementScore`

- **Line:** 1206

---

### `FUNCTION` `handleGenerateNextBestAction`

- **Line:** 1208
- **Async:** Yes

---

### `VARIABLE` `result`

- **Line:** 1211

---

### `FUNCTION` `handleRekeyToNetSuite`

- **Line:** 1248
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 1253

---

### `VARIABLE` `targetUrl`

- **Line:** 1259

---

### `VARIABLE` `errorMsg`

- **Line:** 1262

---

### `VARIABLE` `msg`

- **Line:** 1273

---

### `FUNCTION` `handleStartEditNote`

- **Line:** 1295

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `note` | `Note` | **Yes** | - | - |

---

### `FUNCTION` `handleNoteUpdated`

- **Line:** 1300

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updatedNote` | `Note` | **Yes** | - | - |

---

### `VARIABLE` `autoVerifiedLeadRef`

- **Line:** 1317

---

### `VARIABLE` `unverifiedContacts`

- **Line:** 1323

---

### `VARIABLE` `emailList`

- **Line:** 1330

---

### `VARIABLE` `next`

- **Line:** 1333

---

### `VARIABLE` `updatedContacts`

- **Line:** 1348

---

### `VARIABLE` `norm`

- **Line:** 1350

---

### `VARIABLE` `match`

- **Line:** 1351

---

### `VARIABLE` `next`

- **Line:** 1371

---

### `FUNCTION` `handleCheckShipmateStatus`

- **Line:** 1380
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `Contact` | **Yes** | - | - |

---

### `VARIABLE` `parentType`

- **Line:** 1384

---

### `VARIABLE` `res`

- **Line:** 1385

---

### `VARIABLE` `data`

- **Line:** 1396

---

### `FUNCTION` `handleVerifySingleEmail`

- **Line:** 1446
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `Partial<Contact>` | **Yes** | - | - |

---

### `VARIABLE` `normEmail`

- **Line:** 1448

---

### `VARIABLE` `results`

- **Line:** 1452

---

### `VARIABLE` `res`

- **Line:** 1460

---

### `VARIABLE` `found`

- **Line:** 1462

---

### `VARIABLE` `updatedContacts`

- **Line:** 1463

---

### `FUNCTION` `handleVerifyAllLeadEmails`

- **Line:** 1508
- **Async:** Yes

---

### `VARIABLE` `validContacts`

- **Line:** 1509

---

### `VARIABLE` `emailList`

- **Line:** 1517

---

### `VARIABLE` `results`

- **Line:** 1518

---

### `VARIABLE` `updatedContacts`

- **Line:** 1525

---

### `VARIABLE` `norm`

- **Line:** 1527

---

### `VARIABLE` `match`

- **Line:** 1528

---

### `VARIABLE` `cachedCount`

- **Line:** 1542

---

### `VARIABLE` `liveCount`

- **Line:** 1543

---

### `VARIABLE` `oneYearAgo`

- **Line:** 1570

---

### `VARIABLE` `cutoffTime`

- **Line:** 1572

---

### `VARIABLE` `recent`

- **Line:** 1574
- **Signature:** `any[]`

---

### `VARIABLE` `older`

- **Line:** 1575
- **Signature:** `any[]`

---

### `VARIABLE` `invTime`

- **Line:** 1582

---

### `VARIABLE` `displayedInvoices`

- **Line:** 1593

---

### `VARIABLE` `monthlyInvoiceData`

- **Line:** 1595

---

### `VARIABLE` `map`

- **Line:** 1597
- **Signature:** `Record<string, {
      monthKey: string;
      monthLabel: string;
      totalValue: number;
      paidValue: number;
      unpaidValue: number;
      totalCount: number;
      paidCount: number;
      unpaidCount: number;
      timestamp: number;
    }>`

---

### `VARIABLE` `d`

- **Line:** 1611

---

### `VARIABLE` `monthKey`

- **Line:** 1614

---

### `VARIABLE` `monthLabel`

- **Line:** 1615

---

### `VARIABLE` `firstOfMonth`

- **Line:** 1616

---

### `VARIABLE` `val`

- **Line:** 1617

---

### `VARIABLE` `statusStr`

- **Line:** 1619

---

### `VARIABLE` `isPaid`

- **Line:** 1620

---

### `VARIABLE` `sorted`

- **Line:** 1647

---

### `VARIABLE` `totalInvoicedVal`

- **Line:** 1660

---

### `VARIABLE` `totalPaidVal`

- **Line:** 1661

---

### `VARIABLE` `totalUnpaidVal`

- **Line:** 1662

---

### `FUNCTION` `toggleExpandInvoice`

- **Line:** 1666

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `invoiceId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `next`

- **Line:** 1668

---

### `VARIABLE` `tabsListRef`

- **Line:** 1720

---

### `VARIABLE` `checkTabScroll`

- **Line:** 1724

---

### `VARIABLE` `container`

- **Line:** 1725

---

### `VARIABLE` `container`

- **Line:** 1733

---

### `VARIABLE` `activeEl`

- **Line:** 1736

---

### `VARIABLE` `timer`

- **Line:** 1742

---

### `FUNCTION` `handleScrollTabsLeft`

- **Line:** 1751

---

### `FUNCTION` `handleScrollTabsRight`

- **Line:** 1757

---

### `FUNCTION` `resolveAmEmail`

- **Line:** 1803
- **Async:** Yes

---

### `VARIABLE` `amAssigned`

- **Line:** 1804

---

### `VARIABLE` `usersRef`

- **Line:** 1812

---

### `VARIABLE` `matchedData`

- **Line:** 1813
- **Signature:** `any`

---

### `VARIABLE` `docRef`

- **Line:** 1816

---

### `VARIABLE` `docSnap`

- **Line:** 1817

---

### `VARIABLE` `qAll`

- **Line:** 1822

---

### `VARIABLE` `snapAll`

- **Line:** 1823

---

### `VARIABLE` `name`

- **Line:** 1824

---

### `VARIABLE` `found`

- **Line:** 1825

---

### `VARIABLE` `data`

- **Line:** 1826

---

### `VARIABLE` `fullName`

- **Line:** 1827

---

### `VARIABLE` `dispName`

- **Line:** 1828

---

### `VARIABLE` `emailName`

- **Line:** 1829

---

### `VARIABLE` `lists`

- **Line:** 1865

---

### `FUNCTION` `fetchTemplatesAndCampaigns`

- **Line:** 1878
- **Async:** Yes

---

### `FUNCTION` `fetchSurcharge`

- **Line:** 1895
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 1897

---

### `VARIABLE` `data`

- **Line:** 1898

---

### `FUNCTION` `fetchProducts`

- **Line:** 1908
- **Async:** Yes

---

### `VARIABLE` `q`

- **Line:** 1911

---

### `VARIABLE` `snapshot`

- **Line:** 1916

---

### `VARIABLE` `EXCLUDED_PRODUCTS`

- **Line:** 1917

---

### `VARIABLE` `fetchedProducts`

- **Line:** 1922

---

### `VARIABLE` `plans`

- **Line:** 1926

---

### `VARIABLE` `defaultPlanProds`

- **Line:** 1938

---

### `VARIABLE` `groupedTemplates`

- **Line:** 1950

---

### `VARIABLE` `groups`

- **Line:** 1951
- **Signature:** `{ campaignId: string; campaignName: string; templates: any[] }[]`

---

### `VARIABLE` `campName`

- **Line:** 1954

---

### `VARIABLE` `campTemplates`

- **Line:** 1959

---

### `VARIABLE` `linkedTemplateIds`

- **Line:** 1969

---

### `VARIABLE` `unlinkedTemplates`

- **Line:** 1973

---

### `FUNCTION` `handleSendSingleEmail`

- **Line:** 1987
- **Async:** Yes

---

### `VARIABLE` `finalSenderEmail`

- **Line:** 1993
- **Signature:** `string | undefined`

---

### `VARIABLE` `role`

- **Line:** 1995

---

### `VARIABLE` `isMatchedRole`

- **Line:** 1996

---

### `VARIABLE` `userEmail`

- **Line:** 2003

---

### `VARIABLE` `emailRegex`

- **Line:** 2021

---

### `VARIABLE` `response`

- **Line:** 2035

---

### `VARIABLE` `result`

- **Line:** 2054

---

### `FUNCTION` `handleForwardEmail`

- **Line:** 2096
- **Async:** Yes

---

### `VARIABLE` `response`

- **Line:** 2103

---

### `VARIABLE` `result`

- **Line:** 2113

---

### `FUNCTION` `handleEmailClick`

- **Line:** 2128

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleFranchiseeLookup`

- **Line:** 2150
- **Async:** Yes

---

### `VARIABLE` `isSigned`

- **Line:** 2152

---

### `VARIABLE` `snap`

- **Line:** 2168

---

### `VARIABLE` `franchisees`

- **Line:** 2169

---

### `VARIABLE` `matches`

- **Line:** 2170

---

### `VARIABLE` `leadCity`

- **Line:** 2172

---

### `VARIABLE` `leadState`

- **Line:** 2173

---

### `VARIABLE` `leadZip`

- **Line:** 2174

---

### `FUNCTION` `handleFranchiseeSelection`

- **Line:** 2192
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchisee` | `any` | **Yes** | - | - |

---

### `VARIABLE` `isSigned`

- **Line:** 2194

---

### `VARIABLE` `franchiseeId`

- **Line:** 2205

---

### `VARIABLE` `oldFranchisee`

- **Line:** 2206

---

### `VARIABLE` `newFranchisee`

- **Line:** 2207

---

### `VARIABLE` `router`

- **Line:** 2240

---

### `VARIABLE` `isActionable`

- **Line:** 2248

---

### `VARIABLE` `isUserRole`

- **Line:** 2249

---

### `VARIABLE` `refreshLead`

- **Line:** 2254

---

### `VARIABLE` `updatedLead`

- **Line:** 2258

---

### `VARIABLE` `am`

- **Line:** 2284

---

### `VARIABLE` `serviceTableHtml`

- **Line:** 2294

---

### `VARIABLE` `match`

- **Line:** 2309

---

### `VARIABLE` `displayName`

- **Line:** 2310

---

### `VARIABLE` `productTableHtml`

- **Line:** 2323

---

### `VARIABLE` `html`

- **Line:** 2328

---

### `VARIABLE` `sortedSelected`

- **Line:** 2341

---

### `FUNCTION` `parseWeight`

- **Line:** 2342

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `p` | `any` | **Yes** | - | - |

---

### `VARIABLE` `weightStr`

- **Line:** 2343

---

### `VARIABLE` `match`

- **Line:** 2344

---

### `VARIABLE` `basePrice`

- **Line:** 2351

---

### `VARIABLE` `surchargePerc`

- **Line:** 2352

---

### `VARIABLE` `surchargeAmt`

- **Line:** 2353

---

### `VARIABLE` `totalVal`

- **Line:** 2354

---

### `VARIABLE` `bulkEmailPreviewBody`

- **Line:** 2370

---

### `VARIABLE` `selectedTemplate`

- **Line:** 2372

---

### `VARIABLE` `rawBody`

- **Line:** 2373

---

### `VARIABLE` `parsedBody`

- **Line:** 2374

---

### `VARIABLE` `leadData`

- **Line:** 2376

---

### `VARIABLE` `primaryContact`

- **Line:** 2377

---

### `VARIABLE` `contactName`

- **Line:** 2378

---

### `VARIABLE` `contactFirstName`

- **Line:** 2379

---

### `VARIABLE` `localMilePlusAuthLink`

- **Line:** 2380

---

### `VARIABLE` `franName`

- **Line:** 2382

---

### `VARIABLE` `franContact`

- **Line:** 2383

---

### `VARIABLE` `franEmail`

- **Line:** 2384

---

### `VARIABLE` `franMobile`

- **Line:** 2385

---

### `VARIABLE` `rawStartDate`

- **Line:** 2387

---

### `VARIABLE` `formattedStartDate`

- **Line:** 2388

---

### `VARIABLE` `localMileLink`

- **Line:** 2389

---

### `VARIABLE` `localMileActivationLink`

- **Line:** 2390

---

### `VARIABLE` `localMileSecurityCode`

- **Line:** 2391

---

### `VARIABLE` `sofPublicLink`

- **Line:** 2392

---

### `VARIABLE` `amName`

- **Line:** 2393

---

### `VARIABLE` `pkgCode`

- **Line:** 2426

---

### `VARIABLE` `connoteNum`

- **Line:** 2427

---

### `VARIABLE` `selectedTemplate`

- **Line:** 2452

---

### `VARIABLE` `subject`

- **Line:** 2454

---

### `VARIABLE` `franName`

- **Line:** 2455

---

### `VARIABLE` `franContact`

- **Line:** 2456

---

### `VARIABLE` `franEmail`

- **Line:** 2457

---

### `VARIABLE` `franMobile`

- **Line:** 2458

---

### `VARIABLE` `primaryContact`

- **Line:** 2460

---

### `VARIABLE` `contactName`

- **Line:** 2461

---

### `VARIABLE` `contactFirstName`

- **Line:** 2462

---

### `FUNCTION` `handleAttachmentUpload`

- **Line:** 2486
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 2487

---

### `VARIABLE` `storageRef`

- **Line:** 2492

---

### `VARIABLE` `downloadURL`

- **Line:** 2494

---

### `FUNCTION` `removeAttachment`

- **Line:** 2506

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | - | - |

---

### `FUNCTION` `resetEmailDialog`

- **Line:** 2510

---

### `VARIABLE` `colName`

- **Line:** 2529

---

### `VARIABLE` `q`

- **Line:** 2530

---

### `VARIABLE` `unsubscribe`

- **Line:** 2531

---

### `VARIABLE` `jobsList`

- **Line:** 2532

---

### `VARIABLE` `aTime`

- **Line:** 2534

---

### `VARIABLE` `bTime`

- **Line:** 2535

---

### `VARIABLE` `filteredShipMateJobs`

- **Line:** 2547

---

### `VARIABLE` `matchesSearch`

- **Line:** 2549

---

### `VARIABLE` `matchesStatus`

- **Line:** 2553

---

### `FUNCTION` `fetchInvoices`

- **Line:** 2559
- **Async:** Yes

---

### `VARIABLE` `invoicesRef`

- **Line:** 2563

---

### `VARIABLE` `invoicesSnapshot`

- **Line:** 2564

---

### `VARIABLE` `invoicesData`

- **Line:** 2565

---

### `VARIABLE` `handleEndSession`

- **Line:** 2585

---

### `FUNCTION` `handleDeleteContact`

- **Line:** 2591
- **Async:** Yes

---

### `VARIABLE` `col`

- **Line:** 2595

---

### `VARIABLE` `handleNextLead`

- **Line:** 2617

---

### `VARIABLE` `currentIndex`

- **Line:** 2620

---

### `VARIABLE` `nextLeadId`

- **Line:** 2621
- **Signature:** `string | null`

---

### `VARIABLE` `remainingLeads`

- **Line:** 2628

---

### `VARIABLE` `visitNoteId`

- **Line:** 2646

---

### `VARIABLE` `noteRef`

- **Line:** 2649

---

### `FUNCTION` `fetchAusPostMapping`

- **Line:** 2667
- **Async:** Yes

---

### `VARIABLE` `leadCity`

- **Line:** 2670

---

### `VARIABLE` `leadState`

- **Line:** 2671

---

### `VARIABLE` `leadZip`

- **Line:** 2672

---

### `FUNCTION` `matchLpo`

- **Line:** 2674
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parent_lpo_id` | `string` | **Yes** | - | - |

---

### `VARIABLE` `companyData`

- **Line:** 2677

---

### `VARIABLE` `res`

- **Line:** 2685

---

### `VARIABLE` `data`

- **Line:** 2686

---

### `VARIABLE` `assignedFranchisee`

- **Line:** 2703

---

### `VARIABLE` `fDoc`

- **Line:** 2704

---

### `VARIABLE` `q`

- **Line:** 2708

---

### `VARIABLE` `qSnap`

- **Line:** 2709

---

### `VARIABLE` `d`

- **Line:** 2711

---

### `VARIABLE` `match`

- **Line:** 2719

---

### `VARIABLE` `firstMatch`

- **Line:** 2730

---

### `VARIABLE` `snap`

- **Line:** 2747

---

### `VARIABLE` `franchisees`

- **Line:** 2748

---

### `VARIABLE` `match`

- **Line:** 2752

---

### `FUNCTION` `fetchLinkedLpoLead`

- **Line:** 2780
- **Async:** Yes

---

### `VARIABLE` `directId`

- **Line:** 2783

---

### `VARIABLE` `docSnap`

- **Line:** 2785

---

### `VARIABLE` `q1`

- **Line:** 2797

---

### `VARIABLE` `snap1`

- **Line:** 2798

---

### `VARIABLE` `d`

- **Line:** 2800

---

### `VARIABLE` `q2`

- **Line:** 2810

---

### `VARIABLE` `snap2`

- **Line:** 2811

---

### `VARIABLE` `d`

- **Line:** 2813

---

### `VARIABLE` `q3`

- **Line:** 2823

---

### `VARIABLE` `snap3`

- **Line:** 2824

---

### `VARIABLE` `d`

- **Line:** 2826

---

### `VARIABLE` `q4`

- **Line:** 2837

---

### `VARIABLE` `snap4`

- **Line:** 2838

---

### `VARIABLE` `d`

- **Line:** 2840

---

### `VARIABLE` `isLpoParentLeadDoc`

- **Line:** 2861

---

### `FUNCTION` `checkLpoSuburbs`

- **Line:** 2874
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `franchiseeRefs`

- **Line:** 2877

---

### `VARIABLE` `parentLpoId`

- **Line:** 2878

---

### `VARIABLE` `extractedSuburbs`

- **Line:** 2879
- **Signature:** `any[]`

---

### `VARIABLE` `linkedFrans`

- **Line:** 2886

---

### `VARIABLE` `embedded`

- **Line:** 2896

---

### `VARIABLE` `linkedFranIds`

- **Line:** 2907

---

### `VARIABLE` `parentIdSet`

- **Line:** 2915

---

### `VARIABLE` `childQueries`

- **Line:** 2925
- **Signature:** `any[]`

---

### `VARIABLE` `childSnaps`

- **Line:** 2939

---

### `VARIABLE` `d`

- **Line:** 2943

---

### `VARIABLE` `embedded`

- **Line:** 2961

---

### `VARIABLE` `allFranchisees`

- **Line:** 2974

---

### `VARIABLE` `cleanRef`

- **Line:** 2978

---

### `VARIABLE` `fData`

- **Line:** 2981

---

### `VARIABLE` `suburbs`

- **Line:** 2993

---

### `FUNCTION` `handleProvisionLpoPlus`

- **Line:** 3014
- **Async:** Yes

---

### `VARIABLE` `primaryContact`

- **Line:** 3026

---

### `VARIABLE` `nameParts`

- **Line:** 3027

---

### `VARIABLE` `firstName`

- **Line:** 3028

---

### `VARIABLE` `lastName`

- **Line:** 3029

---

### `VARIABLE` `email`

- **Line:** 3030

---

### `VARIABLE` `phone`

- **Line:** 3031

---

### `VARIABLE` `res`

- **Line:** 3033

---

### `VARIABLE` `data`

- **Line:** 3059

---

### `VARIABLE` `targetCollection`

- **Line:** 3061

---

### `VARIABLE` `updatedFields`

- **Line:** 3062

---

### `VARIABLE` `docRef`

- **Line:** 3070

---

### `VARIABLE` `counterpartCollection`

- **Line:** 3074

---

### `VARIABLE` `counterpartRef`

- **Line:** 3075

---

### `VARIABLE` `counterpartSnap`

- **Line:** 3076

---

### `FUNCTION` `handleSyncLpoSuburbs`

- **Line:** 3117
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 3131

---

### `VARIABLE` `data`

- **Line:** 3140

---

### `VARIABLE` `targetCollection`

- **Line:** 3147

---

### `FUNCTION` `renderLpoCredentialsCard`

- **Line:** 3172

---

### `VARIABLE` `isLeadSignedUp`

- **Line:** 3173

---

### `VARIABLE` `isAccountActive`

- **Line:** 3177

---

### `FUNCTION` `handleResetLpoPlusPassword`

- **Line:** 3343
- **Async:** Yes

---

### `VARIABLE` `primaryContact`

- **Line:** 3347

---

### `VARIABLE` `email`

- **Line:** 3348

---

### `VARIABLE` `res`

- **Line:** 3359

---

### `VARIABLE` `data`

- **Line:** 3370

---

### `VARIABLE` `updatedFields`

- **Line:** 3372

---

### `FUNCTION` `handleCallLogged`

- **Line:** 3396
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newStatus` | `LeadStatus` | No | - | - |
| `outcome` | `string` | No | - | - |

---

### `FUNCTION` `handleAiProspect`

- **Line:** 3401
- **Async:** Yes

---

### `VARIABLE` `result`

- **Line:** 3405

---

### `FUNCTION` `handleGatherCompanyInsights`

- **Line:** 3425
- **Async:** Yes

---

### `VARIABLE` `response`

- **Line:** 3429

---

### `VARIABLE` `result`

- **Line:** 3433

---

### `VARIABLE` `newInsightData`

- **Line:** 3434

---

### `VARIABLE` `newInsightId`

- **Line:** 3447

---

### `VARIABLE` `newInsight`

- **Line:** 3448
- **Signature:** `CompanyInsight`

---

### `FUNCTION` `handleNoteLogged`

- **Line:** 3468

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newNote` | `Note` | **Yes** | - | - |

---

### `FUNCTION` `handleLeadUpdated`

- **Line:** 3473

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updatedLeadData` | `Partial<Lead>` | **Yes** | - | - |

---

### `FUNCTION` `handleSaveAbn`

- **Line:** 3483
- **Async:** Yes

---

### `VARIABLE` `cleanedAbn`

- **Line:** 3484

---

### `VARIABLE` `nsResult`

- **Line:** 3499

---

### `FUNCTION` `handleSaveWebsite`

- **Line:** 3536
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `urlOverride` | `string` | No | - | - |

---

### `VARIABLE` `rawVal`

- **Line:** 3537

---

### `VARIABLE` `formattedUrl`

- **Line:** 3542

---

### `VARIABLE` `leadRef`

- **Line:** 3551

---

### `VARIABLE` `companyRef`

- **Line:** 3552

---

### `FUNCTION` `handleBucketChange`

- **Line:** 3589
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newBucket` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isLost`

- **Line:** 3590

---

### `VARIABLE` `isAmOrSalesMgr`

- **Line:** 3591

---

### `VARIABLE` `isField`

- **Line:** 3615

---

### `VARIABLE` `oldBucket`

- **Line:** 3616

---

### `VARIABLE` `author`

- **Line:** 3617

---

### `VARIABLE` `isLpoBucket`

- **Line:** 3619

---

### `VARIABLE` `extraUpdates`

- **Line:** 3620
- **Signature:** `any`

---

### `VARIABLE` `updatedHistory`

- **Line:** 3634

---

### `FUNCTION` `handleAccountManagerChange`

- **Line:** 3665
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `amName` | `string` | **Yes** | - | - |
| `contactId` | `string` | No | - | - |

---

### `VARIABLE` `oldBucket`

- **Line:** 3667

---

### `VARIABLE` `author`

- **Line:** 3668

---

### `VARIABLE` `newBookingUrlId`

- **Line:** 3669

---

### `VARIABLE` `isAmUser`

- **Line:** 3670

---

### `VARIABLE` `targetBucket`

- **Line:** 3671

---

### `VARIABLE` `updates`

- **Line:** 3673
- **Signature:** `any`

---

### `VARIABLE` `updatedHistory`

- **Line:** 3692

---

### `FUNCTION` `handleCustomerSuccessChange`

- **Line:** 3728
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `csName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `oldBucket`

- **Line:** 3730

---

### `VARIABLE` `author`

- **Line:** 3731

---

### `VARIABLE` `updates`

- **Line:** 3733
- **Signature:** `any`

---

### `VARIABLE` `updatedHistory`

- **Line:** 3745

---

### `FUNCTION` `handleMyPostBusinessChange`

- **Line:** 3777
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updatedHasAccount`

- **Line:** 3779

---

### `VARIABLE` `currentParcelVol`

- **Line:** 3780

---

### `VARIABLE` `isLost`

- **Line:** 3781

---

### `VARIABLE` `isTrialingLocalMile`

- **Line:** 3782

---

### `VARIABLE` `updateData`

- **Line:** 3784
- **Signature:** `any`

---

### `VARIABLE` `shouldPushToLpo`

- **Line:** 3785

---

### `VARIABLE` `oldBucket`

- **Line:** 3797

---

### `VARIABLE` `author`

- **Line:** 3798

---

### `FUNCTION` `handleParcelVolumeChange`

- **Line:** 3824
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updatedParcelVol`

- **Line:** 3826

---

### `VARIABLE` `currentHasAccount`

- **Line:** 3827

---

### `VARIABLE` `isLost`

- **Line:** 3828

---

### `VARIABLE` `isTrialingLocalMile`

- **Line:** 3829

---

### `VARIABLE` `updateData`

- **Line:** 3831
- **Signature:** `any`

---

### `VARIABLE` `shouldPushToLpo`

- **Line:** 3832

---

### `VARIABLE` `oldBucket`

- **Line:** 3844

---

### `VARIABLE` `author`

- **Line:** 3845

---

### `VARIABLE` `COURIER_OPTIONS`

- **Line:** 3871
- **Signature:** `Option[]`

---

### `FUNCTION` `parseCarriers`

- **Line:** 3886
- **Returns:** `string[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `carrierData` | `string | string[]` | No | - | - |

---

### `FUNCTION` `handleCurrentCarrierChange`

- **Line:** 3892
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `selectedValues` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `finalValues`

- **Line:** 3893

---

### `VARIABLE` `prevValues`

- **Line:** 3894

---

### `VARIABLE` `value`

- **Line:** 3901

---

### `FUNCTION` `executeCall`

- **Line:** 3914

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetLeadId` | `string` | **Yes** | - | - |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleInitiateCall`

- **Line:** 3926

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetLeadId` | `string` | **Yes** | - | - |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `opener`

- **Line:** 3929

---

### `VARIABLE` `personalisation`

- **Line:** 3930

---

### `VARIABLE` `apRel`

- **Line:** 3931

---

### `VARIABLE` `hasInsights`

- **Line:** 3933

---

### `FUNCTION` `handleInitiateSms`

- **Line:** 3954

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |
| `recipientName` | `string` | No | `''` | - |

---

### `FUNCTION` `handleCopy`

- **Line:** 3964

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string | null | undefined` | **Yes** | - | - |
| `fieldName` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleBackToLeads`

- **Line:** 3970

---

### `VARIABLE` `params`

- **Line:** 3972

---

### `VARIABLE` `isFromAmPipeline`

- **Line:** 3973

---

### `VARIABLE` `targetUrl`

- **Line:** 3981

---

### `VARIABLE` `referrerUrl`

- **Line:** 3987

---

### `VARIABLE` `isReferrerLeadDetail`

- **Line:** 3988

---

### `FUNCTION` `handleLocalMileConfirm`

- **Line:** 3999
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `serviceType` | `string` | **Yes** | - | - |
| `rate` | `number` | **Yes** | - | - |
| `selectedContactsInfo` | `any[]` | No | `[]` | - |

---

### `VARIABLE` `contact`

- **Line:** 4001

---

### `VARIABLE` `result`

- **Line:** 4002

---

### `VARIABLE` `isOutbound`

- **Line:** 4023

---

### `VARIABLE` `nowIso`

- **Line:** 4024

---

### `VARIABLE` `nowIsoFallback`

- **Line:** 4069

---

### `FUNCTION` `handleResendLocalMileEmail`

- **Line:** 4082
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `any` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 4084

---

### `FUNCTION` `handleRecreateSecurityCode`

- **Line:** 4104
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `any` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 4106

---

### `FUNCTION` `handleShipMateConfirm`

- **Line:** 4130
- **Async:** Yes

---

### `VARIABLE` `result`

- **Line:** 4131

---

### `FUNCTION` `handleConfirmStopTrial`

- **Line:** 4153
- **Async:** Yes

---

### `VARIABLE` `isSigned`

- **Line:** 4157

---

### `VARIABLE` `newStatus`

- **Line:** 4158
- **Signature:** `LeadStatus`

---

### `VARIABLE` `author`

- **Line:** 4161

---

### `VARIABLE` `reasonText`

- **Line:** 4162

---

### `VARIABLE` `updateData`

- **Line:** 4164
- **Signature:** `Partial<Lead>`

---

### `VARIABLE` `activityNote`

- **Line:** 4182

---

### `FUNCTION` `handleDiscoverySave`

- **Line:** 4219
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `DiscoveryData` | **Yes** | - | - |

---

### `FUNCTION` `handleSetupMultiFranchisee`

- **Line:** 4230
- **Async:** Yes

---

### `VARIABLE` `isSigned`

- **Line:** 4232

---

### `VARIABLE` `updatedLead`

- **Line:** 4249

---

### `FUNCTION` `handleUpdateAppointment`

- **Line:** 4263
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `appt` | `any` | **Yes** | - | - |
| `updates` | `any` | **Yes** | - | - |

---

### `VARIABLE` `docRef`

- **Line:** 4265

---

### `VARIABLE` `newAppointments`

- **Line:** 4269

---

### `FUNCTION` `handleAddTask`

- **Line:** 4286
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `authorName`

- **Line:** 4290

---

### `VARIABLE` `h`

- **Line:** 4292

---

### `VARIABLE` `m`

- **Line:** 4293

---

### `VARIABLE` `finalDueDate`

- **Line:** 4294

---

### `VARIABLE` `dueDateIso`

- **Line:** 4295

---

### `VARIABLE` `duration`

- **Line:** 4296

---

### `VARIABLE` `newTask`

- **Line:** 4298

---

### `VARIABLE` `userEmail`

- **Line:** 4306

---

### `VARIABLE` `userId`

- **Line:** 4307

---

### `VARIABLE` `syncRes`

- **Line:** 4310

---

### `VARIABLE` `syncData`

- **Line:** 4324

---

### `FUNCTION` `handleToggleTask`

- **Line:** 4349
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `taskId` | `string` | **Yes** | - | - |
| `isCompleted` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `completedAtIso`

- **Line:** 4352

---

### `FUNCTION` `handleDeleteTask`

- **Line:** 4362
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `taskId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `targetTask`

- **Line:** 4364

---

### `VARIABLE` `userEmail`

- **Line:** 4368

---

### `VARIABLE` `userId`

- **Line:** 4369

---

### `FUNCTION` `handleTaskUpdatedInProfile`

- **Line:** 4393

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updatedTask` | `Task` | **Yes** | - | - |

---

### `FUNCTION` `formatDate`

- **Line:** 4400

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | No | - | - |

---

### `VARIABLE` `date`

- **Line:** 4402

---

### `FUNCTION` `DetailItem`

- **Line:** 4406

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ icon: Icon, label, value, copyable, isLink, linkUrl, isWebsite, callable, leadId, emailClickable, actionIcon: ActionIcon, onActionClick, isActionLoading, actionClassName }` | `any` | **Yes** | - | - |

---

### `VARIABLE` `norm`

- **Line:** 4433

---

### `VARIABLE` `matchingContact`

- **Line:** 4434

---

### `VARIABLE` `leadAddr`

- **Line:** 4500

---

### `VARIABLE` `contactLoc`

- **Line:** 4501

---

### `VARIABLE` `contactTime`

- **Line:** 4502

---

### `VARIABLE` `isAdmin`

- **Line:** 4515

---

### `VARIABLE` `isAdminUser`

- **Line:** 4516

---

### `VARIABLE` `isSalesManager`

- **Line:** 4517

---

### `VARIABLE` `isLeadGenAdmin`

- **Line:** 4518

---

### `VARIABLE` `isFieldSales`

- **Line:** 4519

---

### `VARIABLE` `isDialer`

- **Line:** 4520

---

### `VARIABLE` `isOperationsRole`

- **Line:** 4521

---

### `VARIABLE` `isMailPlusPtyLtd`

- **Line:** 4530

---

### `VARIABLE` `isLpoLeadProcess`

- **Line:** 4531

---

### `VARIABLE` `isLpoNetworkBucket`

- **Line:** 4539

---

### `VARIABLE` `showSchedule`

- **Line:** 4541

---

### `VARIABLE` `showProcessLead`

- **Line:** 4542

---

### `VARIABLE` `showCall`

- **Line:** 4543

---

### `VARIABLE` `showNote`

- **Line:** 4544

---

### `VARIABLE` `showCheckIn`

- **Line:** 4545

---

### `VARIABLE` `showSales`

- **Line:** 4546

---

### `FUNCTION` `refreshLeadData`

- **Line:** 4585
- **Async:** Yes

---

### `VARIABLE` `updatedLead`

- **Line:** 4587

---

### `VARIABLE` `updatedScfs`

- **Line:** 4594

---

### `FUNCTION` `requireLeadType`

- **Line:** 4601

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `action` | `() => void` | **Yes** | - | - |

---

### `FUNCTION` `handleSaveMissingLeadType`

- **Line:** 4611
- **Async:** Yes

---

### `FUNCTION` `checkPrimary`

- **Line:** 4630

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `action` | `() => void` | **Yes** | - | - |

---

### `FUNCTION` `handleCancelScf`

- **Line:** 4642
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `scfId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleAdminUploadScfPdf`

- **Line:** 4670
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `scfId` | `string` | **Yes** | - | - |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 4671

---

### `VARIABLE` `storageRef`

- **Line:** 4681

---

### `VARIABLE` `downloadURL`

- **Line:** 4683

---

### `VARIABLE` `uploaderName`

- **Line:** 4685

---

### `FUNCTION` `renderActionButtons`

- **Line:** 4715

---

### `VARIABLE` `isLeadWonOrSigned`

- **Line:** 4722

---

### `VARIABLE` `signupItem`

- **Line:** 4724

---

### `VARIABLE` `quoteItem`

- **Line:** 4734

---

### `VARIABLE` `syncCheck`

- **Line:** 4742

---

### `VARIABLE` `trialsExceeded`

- **Line:** 4762

---

### `VARIABLE` `freeTrialItem`

- **Line:** 4764

---

### `VARIABLE` `isTrialingLocalMile`

- **Line:** 4787

---

### `VARIABLE` `isTrialingShipMate`

- **Line:** 4788

---

### `VARIABLE` `stopLocalMileItem`

- **Line:** 4790

---

### `VARIABLE` `stopShipMateItem`

- **Line:** 4803

---

### `VARIABLE` `isQuoteAccepted`

- **Line:** 4816

---

### `VARIABLE` `isChildLpoLead`

- **Line:** 4818

---

### `VARIABLE` `salesItems`

- **Line:** 4820
- **Signature:** `React.ReactNode[]`

---

### `VARIABLE` `hasSalesItems`

- **Line:** 4830

---

### `VARIABLE` `canShowLpoPlus`

- **Line:** 4831

---

### `VARIABLE` `isNumericLeadId`

- **Line:** 4833

---

### `VARIABLE` `isLeadSyncedWithNetSuite`

- **Line:** 4834

---

### `VARIABLE` `canAccessNetSuiteSync`

- **Line:** 4835

---

### `VARIABLE` `showNetSuiteSyncBtn`

- **Line:** 4836

---

### `VARIABLE` `isAmOrSalesMgr`

- **Line:** 4843

---

### `VARIABLE` `isTrialingLocalMile`

- **Line:** 4844

---

### `VARIABLE` `isLost`

- **Line:** 4845

---

### `VARIABLE` `hasValidLpoAnswers`

- **Line:** 4846

---

### `VARIABLE` `isPushEligible`

- **Line:** 4847

---

### `VARIABLE` `callActivities`

- **Line:** 4957

---

### `VARIABLE` `callHistory`

- **Line:** 4959

---

### `VARIABLE` `calls`

- **Line:** 4960

---

### `VARIABLE` `sortedNotes`

- **Line:** 4964

---

### `VARIABLE` `sortedActivities`

- **Line:** 4968

---

### `VARIABLE` `sortedEmails`

- **Line:** 4972

---

### `VARIABLE` `resolvedCallAttempts`

- **Line:** 4976

---

### `VARIABLE` `uniqueCallIdsCount`

- **Line:** 4983

---

### `VARIABLE` `callIds`

- **Line:** 4984

---

### `VARIABLE` `fullAddressStr`

- **Line:** 4992

---

### `VARIABLE` `updatedLead`

- **Line:** 5042

---

### `VARIABLE` `current`

- **Line:** 5131

---

### `VARIABLE` `isAlphanumericId`

- **Line:** 5178

---

### `VARIABLE` `isSyncFailed`

- **Line:** 5179

---

### `VARIABLE` `isLpoNetwork`

- **Line:** 5180

---

### `VARIABLE` `showBanner`

- **Line:** 5181

---

### `VARIABLE` `b`

- **Line:** 5425

---

### `VARIABLE` `actualJobCount`

- **Line:** 5490

---

### `VARIABLE` `validJobsCount`

- **Line:** 5491

---

### `VARIABLE` `isTrialStoppedOrCancelled`

- **Line:** 5492

---

### `VARIABLE` `actualTrialsRemaining`

- **Line:** 5493

---

### `VARIABLE` `hasJobs`

- **Line:** 5494

---

### `VARIABLE` `regLink`

- **Line:** 5500

---

### `VARIABLE` `leadAddr`

- **Line:** 5605

---

### `VARIABLE` `targetLocation`

- **Line:** 5606

---

### `VARIABLE` `localTimeInfo`

- **Line:** 5607

---

### `VARIABLE` `diffHoursAbs`

- **Line:** 5608

---

### `VARIABLE` `diffText`

- **Line:** 5609

---

### `VARIABLE` `isChecked`

- **Line:** 5684

---

### `VARIABLE` `dateVal`

- **Line:** 5925

---

### `VARIABLE` `parsed`

- **Line:** 5926

---

### `VARIABLE` `addrStr`

- **Line:** 6341

---

### `VARIABLE` `lpoId`

- **Line:** 6494

---

### `VARIABLE` `lpoName`

- **Line:** 6495

---

### `VARIABLE` `lpoStatus`

- **Line:** 6496

---

### `VARIABLE` `isActioned`

- **Line:** 6691

---

### `VARIABLE` `isRecredited`

- **Line:** 6692

---

### `VARIABLE` `lodgementEvidence`

- **Line:** 6733

---

### `VARIABLE` `shipperEvidence`

- **Line:** 6734

---

### `VARIABLE` `shopifyDetected`

- **Line:** 6735

---

### `VARIABLE` `prospectSummary`

- **Line:** 6736

---

### `VARIABLE` `xeroDetected`

- **Line:** 6737

---

### `VARIABLE` `apRelationship`

- **Line:** 6738

---

### `VARIABLE` `suggestedProduct`

- **Line:** 6739

---

### `VARIABLE` `suggestedOpener`

- **Line:** 6740

---

### `VARIABLE` `suggestedPersonalisation`

- **Line:** 6741

---

### `VARIABLE` `hasEnrichment`

- **Line:** 6743

---

### `VARIABLE` `rawUrl`

- **Line:** 6980

---

### `VARIABLE` `fullUrl`

- **Line:** 6989

---

### `VARIABLE` `displayUrl`

- **Line:** 6990

---

### `VARIABLE` `parsed`

- **Line:** 6992

---

### `VARIABLE` `landingUrl`

- **Line:** 7029

---

### `VARIABLE` `channel`

- **Line:** 7030

---

### `VARIABLE` `utmCampaign`

- **Line:** 7031

---

### `VARIABLE` `utmSource`

- **Line:** 7032

---

### `VARIABLE` `utmMedium`

- **Line:** 7033

---

### `VARIABLE` `utmContent`

- **Line:** 7034

---

### `VARIABLE` `adClickId`

- **Line:** 7035

---

### `VARIABLE` `posthogReplayUrl`

- **Line:** 7036

---

### `VARIABLE` `posthogSessionId`

- **Line:** 7037

---

### `VARIABLE` `posthogDistinctId`

- **Line:** 7038

---

### `VARIABLE` `metrics`

- **Line:** 7040

---

### `VARIABLE` `hasValue`

- **Line:** 7079

---

### `VARIABLE` `hasPostal`

- **Line:** 7868

---

### `VARIABLE` `pubSofUrl`

- **Line:** 7877

---

### `VARIABLE` `pendingScf`

- **Line:** 8020

---

### `VARIABLE` `allAppointmentsMap`

- **Line:** 8092

---

### `VARIABLE` `allAppointments`

- **Line:** 8095

---

### `VARIABLE` `dateStr`

- **Line:** 8100

---

### `VARIABLE` `person`

- **Line:** 8101

---

### `VARIABLE` `notes`

- **Line:** 8125

---

### `VARIABLE` `notes`

- **Line:** 8129

---

### `VARIABLE` `notes`

- **Line:** 8133

---

### `VARIABLE` `url`

- **Line:** 8141

---

### `VARIABLE` `isOverdue`

- **Line:** 8194

---

### `VARIABLE` `recordingAssetUrl`

- **Line:** 8508

---

### `VARIABLE` `callTranscript`

- **Line:** 8552

---

### `VARIABLE` `isCall`

- **Line:** 8595

---

### `VARIABLE` `recordingAssetUrl`

- **Line:** 8596

---

### `VARIABLE` `data`

- **Line:** 8747

---

### `VARIABLE` `isExpanded`

- **Line:** 8860

---

### `VARIABLE` `itemsCount`

- **Line:** 8861

---

### `VARIABLE` `statusStr`

- **Line:** 8862

---

### `VARIABLE` `badgeClass`

- **Line:** 8864

---

### `VARIABLE` `lowerStatus`

- **Line:** 8865

---

### `VARIABLE` `statusLower`

- **Line:** 9124

---

### `VARIABLE` `statusBadgeStyle`

- **Line:** 9125

---

### `VARIABLE` `regLink`

- **Line:** 9307

---

### `VARIABLE` `updatedTranscripts`

- **Line:** 9782

---

### `VARIABLE` `jsonField`

- **Line:** 9884

---

### `VARIABLE` `list`

- **Line:** 9888

---

### `VARIABLE` `ops`

- **Line:** 9917

---

### `VARIABLE` `sec`

- **Line:** 9925

---

### `VARIABLE` `updatedContacts`

- **Line:** 9964

---

### `VARIABLE` `updatedContacts`

- **Line:** 9979

---

### `VARIABLE` `updatedContacts`

- **Line:** 10000

---

### `VARIABLE` `targetContact`

- **Line:** 10033

---

### `VARIABLE` `role`

- **Line:** 10090

---

### `VARIABLE` `isMatchedRole`

- **Line:** 10091

---

### `VARIABLE` `userEmail`

- **Line:** 10097

---

### `VARIABLE` `defaultEmail`

- **Line:** 10098

---

### `VARIABLE` `subjectInput`

- **Line:** 10215

---

### `VARIABLE` `start`

- **Line:** 10217

---

### `VARIABLE` `end`

- **Line:** 10218

---

### `VARIABLE` `text`

- **Line:** 10219

---

### `VARIABLE` `before`

- **Line:** 10220

---

### `VARIABLE` `after`

- **Line:** 10221

---

### `VARIABLE` `planProds`

- **Line:** 10251

---

### `VARIABLE` `filtered`

- **Line:** 10282

---

### `VARIABLE` `sorted`

- **Line:** 10283

---

### `FUNCTION` `parseWeight`

- **Line:** 10284

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `p` | `any` | **Yes** | - | - |

---

### `VARIABLE` `weightStr`

- **Line:** 10285

---

### `VARIABLE` `match`

- **Line:** 10286

---

### `VARIABLE` `isChecked`

- **Line:** 10292

---

### `VARIABLE` `basePrice`

- **Line:** 10293

---

### `VARIABLE` `surchargePerc`

- **Line:** 10294

---

### `VARIABLE` `surchargeAmt`

- **Line:** 10295

---

### `VARIABLE` `totalVal`

- **Line:** 10296

---

### `VARIABLE` `current`

- **Line:** 10373

---

### `VARIABLE` `current`

- **Line:** 10387

---

### `VARIABLE` `current`

- **Line:** 10401

---

### `VARIABLE` `current`

- **Line:** 10428

---

### `VARIABLE` `current`

- **Line:** 10442

---

### `VARIABLE` `current`

- **Line:** 10456

---

### `VARIABLE` `query`

- **Line:** 10607

---

### `VARIABLE` `query`

- **Line:** 10614

---

### `VARIABLE` `isSelected`

- **Line:** 10676

---

### `VARIABLE` `fId`

- **Line:** 10677

---

### `VARIABLE` `author`

- **Line:** 10735

---

### `VARIABLE` `cb`

- **Line:** 10739

---

### `FUNCTION` `MergeDuplicatesDialog`

- **Line:** 10863
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
    currentLead,
    duplicates,
    isOpen,
    onOpenChange,
    onMerged,
    onDismissed
}` | `{
    currentLead: Lead;
    duplicates: Lead[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onMerged: (targetLeadId: string) => void;
    onDismissed?: () => void;
}` | **Yes** | - | - |

---

### `FUNCTION` `handleSearchAddLead`

- **Line:** 10887
- **Async:** Yes

---

### `VARIABLE` `trimmed`

- **Line:** 10888

---

### `VARIABLE` `foundLead`

- **Line:** 10892

---

### `VARIABLE` `qPid`

- **Line:** 10894

---

### `VARIABLE` `snap`

- **Line:** 10895

---

### `VARIABLE` `qComp`

- **Line:** 10901

---

### `VARIABLE` `snap`

- **Line:** 10902

---

### `VARIABLE` `allCandidates`

- **Line:** 10932

---

### `VARIABLE` `combined`

- **Line:** 10933

---

### `VARIABLE` `uniqueMap`

- **Line:** 10934

---

### `VARIABLE` `nonMasterIds`

- **Line:** 10945

---

### `VARIABLE` `filteredPrev`

- **Line:** 10948

---

### `VARIABLE` `mergedSet`

- **Line:** 10949

---

### `VARIABLE` `selectedLead`

- **Line:** 10960

---

### `FUNCTION` `toggleCandidateForMerge`

- **Line:** 10962

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `candId` | `string` | **Yes** | - | - |
| `e` | `React.MouseEvent` | No | - | - |

---

### `FUNCTION` `handleSelectMaster`

- **Line:** 10970

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `masterId` | `string` | **Yes** | - | - |
| `e` | `React.MouseEvent` | No | - | - |

---

### `FUNCTION` `handleMerge`

- **Line:** 10975
- **Async:** Yes

---

### `VARIABLE` `validSourceIds`

- **Line:** 10978

---

### `FUNCTION` `handleDismiss`

- **Line:** 11010
- **Async:** Yes

---

### `VARIABLE` `selectedSourcesList`

- **Line:** 11027

---

### `VARIABLE` `excludedSourcesList`

- **Line:** 11031

---

### `VARIABLE` `isMaster`

- **Line:** 11081

---

### `VARIABLE` `isSourceSelected`

- **Line:** 11082

---

### `VARIABLE` `isCurrent`

- **Line:** 11083

---

### `VARIABLE` `addr`

- **Line:** 11084

---

