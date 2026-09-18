# Module: `src/components/marketing/import-leads-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 2661
- **Direct Dependencies:** 25 modules imported

## Exported Symbols & API

### `VARIABLE` `standardFields`

- **Line:** 32

---

### `FUNCTION` `ImportLeadsClient`

- **Line:** 95
- **Returns:** `void`

---

### `FUNCTION` `executeNetSuiteSync`

- **Line:** 172
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetId` | `string` | No | - | - |

---

### `VARIABLE` `idsToSync`

- **Line:** 173

---

### `VARIABLE` `syncedCount`

- **Line:** 179

---

### `VARIABLE` `updatedLogs`

- **Line:** 180

---

### `VARIABLE` `leadId`

- **Line:** 183

---

### `VARIABLE` `res`

- **Line:** 185

---

### `VARIABLE` `logIndex`

- **Line:** 188

---

### `VARIABLE` `logIndex`

- **Line:** 198

---

### `VARIABLE` `interval`

- **Line:** 223
- **Signature:** `any`

---

### `VARIABLE` `requiredFields`

- **Line:** 234

---

### `VARIABLE` `missingRequiredMappings`

- **Line:** 240

---

### `VARIABLE` `allRequiredMapped`

- **Line:** 243

---

### `FUNCTION` `loadData`

- **Line:** 247
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `journeysSnap`

- **Line:** 255

---

### `VARIABLE` `journeysData`

- **Line:** 256

---

### `VARIABLE` `leadsSnap`

- **Line:** 263

---

### `VARIABLE` `lists`

- **Line:** 264

---

### `VARIABLE` `ml`

- **Line:** 266

---

### `VARIABLE` `compMap`

- **Line:** 279

---

### `VARIABLE` `parentAccMap`

- **Line:** 280

---

### `VARIABLE` `pAccounts`

- **Line:** 281
- **Signature:** `Array<{ id: string; companyName: string; prospectPlusId?: string; abn?: string; type: 'company' | 'lead' }>`

---

### `FUNCTION` `registerParentItem`

- **Line:** 283

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `{ id: string; companyName: string; prospectPlusId?: string; abn?: string }` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `FUNCTION` `addKey`

- **Line:** 284

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `k` | `string | number | null` | No | - | - |

---

### `VARIABLE` `str`

- **Line:** 286

---

### `VARIABLE` `numPart`

- **Line:** 289

---

### `VARIABLE` `normName`

- **Line:** 305

---

### `VARIABLE` `data`

- **Line:** 312

---

### `VARIABLE` `name`

- **Line:** 313

---

### `VARIABLE` `ppId`

- **Line:** 314

---

### `VARIABLE` `abn`

- **Line:** 315

---

### `VARIABLE` `normName`

- **Line:** 316

---

### `VARIABLE` `item`

- **Line:** 318

---

### `VARIABLE` `data`

- **Line:** 328

---

### `VARIABLE` `name`

- **Line:** 330

---

### `VARIABLE` `ppId`

- **Line:** 331

---

### `VARIABLE` `abn`

- **Line:** 332

---

### `VARIABLE` `item`

- **Line:** 334

---

### `VARIABLE` `activeDialers`

- **Line:** 362

---

### `VARIABLE` `activeFieldReps`

- **Line:** 367

---

### `VARIABLE` `activeAMs`

- **Line:** 372

---

### `VARIABLE` `activeCS`

- **Line:** 377

---

### `FUNCTION` `handleDownloadSample`

- **Line:** 383

---

### `VARIABLE` `headers`

- **Line:** 384

---

### `VARIABLE` `sampleRow`

- **Line:** 385

---

### `VARIABLE` `csvContent`

- **Line:** 437

---

### `VARIABLE` `blob`

- **Line:** 438

---

### `VARIABLE` `url`

- **Line:** 439

---

### `VARIABLE` `link`

- **Line:** 440

---

### `FUNCTION` `handleCsvUpload`

- **Line:** 450

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 451

---

### `VARIABLE` `headers`

- **Line:** 464

---

### `VARIABLE` `mappings`

- **Line:** 469
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `normalizedHeader`

- **Line:** 471

---

### `VARIABLE` `match`

- **Line:** 472

---

### `VARIABLE` `fieldLabelNorm`

- **Line:** 473

---

### `VARIABLE` `fieldKeyNorm`

- **Line:** 474

---

### `FUNCTION` `resolveLeadFranchisee`

- **Line:** 536

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `city` | `string` | **Yes** | - | - |
| `state` | `string` | **Yes** | - | - |
| `zip` | `string` | **Yes** | - | - |

---

### `VARIABLE` `cleanCity`

- **Line:** 537

---

### `VARIABLE` `cleanState`

- **Line:** 538

---

### `VARIABLE` `cleanZip`

- **Line:** 539

---

### `VARIABLE` `mailPlusObj`

- **Line:** 541

---

### `VARIABLE` `matches`

- **Line:** 544
- **Signature:** `Franchisee[]`

---

### `VARIABLE` `match`

- **Line:** 546

---

### `FUNCTION` `findMatchingLead`

- **Line:** 566
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `row` | `any` | **Yes** | - | - |
| `getVal` | `(key: string) => string` | **Yes** | - | - |
| `compName` | `string` | **Yes** | - | - |
| `activeMatchKey` | `string` | **Yes** | - | - |

---

### `VARIABLE` `rawIdVal`

- **Line:** 572

---

### `VARIABLE` `abnVal`

- **Line:** 573

---

### `VARIABLE` `idSnap`

- **Line:** 579

---

### `VARIABLE` `numVal`

- **Line:** 582

---

### `VARIABLE` `qStr`

- **Line:** 583

---

### `VARIABLE` `sStr`

- **Line:** 584

---

### `VARIABLE` `qNum`

- **Line:** 588

---

### `VARIABLE` `sNum`

- **Line:** 589

---

### `VARIABLE` `qPp`

- **Line:** 600

---

### `VARIABLE` `sPp`

- **Line:** 601

---

### `VARIABLE` `numVal`

- **Line:** 611

---

### `VARIABLE` `qEntStr`

- **Line:** 612

---

### `VARIABLE` `sEntStr`

- **Line:** 613

---

### `VARIABLE` `qEntNum`

- **Line:** 616

---

### `VARIABLE` `sEntNum`

- **Line:** 617

---

### `VARIABLE` `qAbn`

- **Line:** 628

---

### `VARIABLE` `sAbn`

- **Line:** 629

---

### `VARIABLE` `qComp`

- **Line:** 639

---

### `VARIABLE` `sComp`

- **Line:** 640

---

### `VARIABLE` `idSnap`

- **Line:** 649

---

### `VARIABLE` `numVal`

- **Line:** 652

---

### `VARIABLE` `queries`

- **Line:** 653

---

### `VARIABLE` `querySnaps`

- **Line:** 663

---

### `VARIABLE` `coreBrand`

- **Line:** 672

---

### `VARIABLE` `norm`

- **Line:** 674

---

### `VARIABLE` `words`

- **Line:** 675

---

### `VARIABLE` `qExact`

- **Line:** 679

---

### `VARIABLE` `qPrefix`

- **Line:** 680

---

### `VARIABLE` `coreUpper`

- **Line:** 682

---

### `VARIABLE` `incomingLead`

- **Line:** 696

---

### `VARIABLE` `bestMatch`

- **Line:** 710
- **Signature:** `{ id: string; confidence: 'High' | 'Medium' | 'Low' | 'None'; reasons: string[] } | null`

---

### `VARIABLE` `topScore`

- **Line:** 711

---

### `VARIABLE` `checkedIds`

- **Line:** 712

---

### `VARIABLE` `docs`

- **Line:** 714

---

### `VARIABLE` `candidateLead`

- **Line:** 718

---

### `VARIABLE` `res`

- **Line:** 719

---

### `FUNCTION` `resolveParentAccountByAnyId`

- **Line:** 734
- **Async:** Yes
- **Returns:** `Promise<{ id: string; companyName: string; prospectPlusId?: string; source: 'row' | 'global' | 'auto' } | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rawPpId` | `string` | No | - | - |
| `rawAbn` | `string` | No | - | - |
| `rawName` | `string` | No | - | - |

---

### `VARIABLE` `cleanPpId`

- **Line:** 739

---

### `VARIABLE` `cleanAbnVal`

- **Line:** 740

---

### `VARIABLE` `cleanNameNorm`

- **Line:** 741

---

### `VARIABLE` `k`

- **Line:** 745

---

### `VARIABLE` `found`

- **Line:** 747

---

### `VARIABLE` `numPart`

- **Line:** 750

---

### `VARIABLE` `found`

- **Line:** 752

---

### `VARIABLE` `found`

- **Line:** 757

---

### `VARIABLE` `found`

- **Line:** 761

---

### `VARIABLE` `searchTerms`

- **Line:** 767
- **Signature:** `(string | number)[]`

---

### `VARIABLE` `numPart`

- **Line:** 768

---

### `VARIABLE` `collections`

- **Line:** 772

---

### `VARIABLE` `fields`

- **Line:** 773

---

### `VARIABLE` `docSnap`

- **Line:** 778

---

### `VARIABLE` `dData`

- **Line:** 780

---

### `VARIABLE` `item`

- **Line:** 781

---

### `VARIABLE` `qSnap`

- **Line:** 797

---

### `VARIABLE` `docItem`

- **Line:** 799

---

### `VARIABLE` `dData`

- **Line:** 800

---

### `VARIABLE` `item`

- **Line:** 801

---

### `VARIABLE` `qSnap`

- **Line:** 818

---

### `VARIABLE` `docItem`

- **Line:** 820

---

### `VARIABLE` `dData`

- **Line:** 821

---

### `VARIABLE` `item`

- **Line:** 822

---

### `VARIABLE` `found`

- **Line:** 836

---

### `FUNCTION` `runValidationAndDuplicates`

- **Line:** 846
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `overrideMatchKey` | `string` | No | - | - |

---

### `VARIABLE` `activeMatchKey`

- **Line:** 847

---

### `VARIABLE` `errors`

- **Line:** 851
- **Signature:** `Record<number, string[]>`

---

### `VARIABLE` `duplicates`

- **Line:** 852
- **Signature:** `Record<number, { id: string; confidence: 'High' | 'Medium' | 'Low' | 'None'; reasons: string[] } | null>`

---

### `VARIABLE` `compMatches`

- **Line:** 853
- **Signature:** `Record<number, { id: string; name: string } | null>`

---

### `VARIABLE` `pMatches`

- **Line:** 854
- **Signature:** `Record<number, { id: string; companyName: string; prospectPlusId?: string; source: 'row' | 'global' | 'auto' } | null>`

---

### `VARIABLE` `previewData`

- **Line:** 855
- **Signature:** `any[]`

---

### `VARIABLE` `limitRows`

- **Line:** 858

---

### `VARIABLE` `row`

- **Line:** 861

---

### `VARIABLE` `rowErrors`

- **Line:** 862
- **Signature:** `string[]`

---

### `FUNCTION` `getVal`

- **Line:** 864

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `string` | **Yes** | - | - |

---

### `VARIABLE` `colHeader`

- **Line:** 865

---

### `VARIABLE` `companyName`

- **Line:** 870

---

### `VARIABLE` `email`

- **Line:** 871

---

### `VARIABLE` `phone`

- **Line:** 872

---

### `VARIABLE` `abnVal`

- **Line:** 873

---

### `VARIABLE` `normName`

- **Line:** 874

---

### `VARIABLE` `isFieldRequired`

- **Line:** 877

---

### `VARIABLE` `header`

- **Line:** 881

---

### `VARIABLE` `val`

- **Line:** 882

---

### `VARIABLE` `c1First`

- **Line:** 915

---

### `VARIABLE` `c1Last`

- **Line:** 916

---

### `VARIABLE` `c1Name`

- **Line:** 917

---

### `VARIABLE` `c2First`

- **Line:** 918

---

### `VARIABLE` `c2Last`

- **Line:** 919

---

### `VARIABLE` `c2Name`

- **Line:** 920

---

### `VARIABLE` `c3First`

- **Line:** 921

---

### `VARIABLE` `c3Last`

- **Line:** 922

---

### `VARIABLE` `c3Name`

- **Line:** 923

---

### `VARIABLE` `contactCount`

- **Line:** 925

---

### `VARIABLE` `remainingRows`

- **Line:** 943

---

### `VARIABLE` `validationChunkSize`

- **Line:** 944

---

### `VARIABLE` `chunk`

- **Line:** 946

---

### `VARIABLE` `actualIdx`

- **Line:** 948

---

### `FUNCTION` `getVal`

- **Line:** 949

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `string` | **Yes** | - | - |

---

### `VARIABLE` `colHeader`

- **Line:** 950

---

### `VARIABLE` `compName`

- **Line:** 954

---

### `VARIABLE` `abnVal`

- **Line:** 955

---

### `VARIABLE` `normName`

- **Line:** 956

---

### `FUNCTION` `executeImport`

- **Line:** 986
- **Async:** Yes

---

### `VARIABLE` `successCount`

- **Line:** 993

---

### `VARIABLE` `updatedCount`

- **Line:** 994

---

### `VARIABLE` `skippedCount`

- **Line:** 995

---

### `VARIABLE` `failedCount`

- **Line:** 996

---

### `VARIABLE` `newCreatedLeadIds`

- **Line:** 997
- **Signature:** `string[]`

---

### `VARIABLE` `importLogs`

- **Line:** 999
- **Signature:** `Array<{
      rowNum: number;
      companyName: string;
      internalId?: string;
      status: 'Created' | 'Updated' | 'Skipped' | 'Failed';
      details: string;
    }>`

---

### `VARIABLE` `total`

- **Line:** 1007

---

### `VARIABLE` `authorName`

- **Line:** 1008

---

### `VARIABLE` `nowStr`

- **Line:** 1009

---

### `VARIABLE` `chunkSize`

- **Line:** 1012

---

### `VARIABLE` `chunk`

- **Line:** 1015

---

### `VARIABLE` `batch`

- **Line:** 1016

---

### `VARIABLE` `rowIdx`

- **Line:** 1019

---

### `VARIABLE` `row`

- **Line:** 1020

---

### `FUNCTION` `getVal`

- **Line:** 1023

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `fieldKey` | `string` | **Yes** | - | - |

---

### `VARIABLE` `header`

- **Line:** 1024

---

### `VARIABLE` `companyName`

- **Line:** 1028

---

### `VARIABLE` `isDuplicateMatch`

- **Line:** 1031

---

### `VARIABLE` `isExistingCustomerMatch`

- **Line:** 1035

---

### `VARIABLE` `isUpdatingExistingLead`

- **Line:** 1062

---

### `VARIABLE` `hasMissingRequired`

- **Line:** 1064

---

### `VARIABLE` `isFieldRequired`

- **Line:** 1066

---

### `VARIABLE` `val`

- **Line:** 1071

---

### `VARIABLE` `streetVal`

- **Line:** 1092

---

### `VARIABLE` `cityVal`

- **Line:** 1093

---

### `VARIABLE` `stateVal`

- **Line:** 1094

---

### `VARIABLE` `zipVal`

- **Line:** 1095

---

### `VARIABLE` `hasAddressInput`

- **Line:** 1096

---

### `VARIABLE` `address`

- **Line:** 1098

---

### `VARIABLE` `assignedFranchisee`

- **Line:** 1113

---

### `VARIABLE` `assignedFranchiseeId`

- **Line:** 1114

---

### `VARIABLE` `resolved`

- **Line:** 1116

---

### `VARIABLE` `fObj`

- **Line:** 1120

---

### `VARIABLE` `postalStreet`

- **Line:** 1126

---

### `VARIABLE` `postalCity`

- **Line:** 1127

---

### `VARIABLE` `postalState`

- **Line:** 1128

---

### `VARIABLE` `postalZip`

- **Line:** 1129

---

### `VARIABLE` `postalAddress`

- **Line:** 1130

---

### `VARIABLE` `additionalAddresses`

- **Line:** 1139
- **Signature:** `TaggedAddress[]`

---

### `VARIABLE` `a2Tag`

- **Line:** 1140

---

### `VARIABLE` `a2Street`

- **Line:** 1141

---

### `VARIABLE` `a2City`

- **Line:** 1142

---

### `VARIABLE` `a2State`

- **Line:** 1143

---

### `VARIABLE` `a2Zip`

- **Line:** 1144

---

### `VARIABLE` `a3Tag`

- **Line:** 1156

---

### `VARIABLE` `a3Street`

- **Line:** 1157

---

### `VARIABLE` `a3City`

- **Line:** 1158

---

### `VARIABLE` `a3State`

- **Line:** 1159

---

### `VARIABLE` `a3Zip`

- **Line:** 1160

---

### `VARIABLE` `leadData`

- **Line:** 1173
- **Signature:** `any`

---

### `VARIABLE` `effectiveParent`

- **Line:** 1229
- **Signature:** `{ id: string; companyName: string; prospectPlusId?: string } | null`

---

### `VARIABLE` `effectiveCampaign`

- **Line:** 1243

---

### `VARIABLE` `isMultisite`

- **Line:** 1244

---

### `FUNCTION` `resolveEffectiveSalesRep`

- **Line:** 1246

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `selected` | `string` | **Yes** | - | - |
| `idx` | `number` | **Yes** | - | - |

---

### `VARIABLE` `foundAm`

- **Line:** 1257

---

### `VARIABLE` `targetAmName`

- **Line:** 1258

---

### `VARIABLE` `effRep`

- **Line:** 1276

---

### `VARIABLE` `effRep`

- **Line:** 1284

---

### `VARIABLE` `effRep`

- **Line:** 1291

---

### `VARIABLE` `leadRef`

- **Line:** 1324

---

### `VARIABLE` `contactsToCreate`

- **Line:** 1329

---

### `VARIABLE` `addedContactsCount`

- **Line:** 1360

---

### `VARIABLE` `cFirst`

- **Line:** 1362

---

### `VARIABLE` `cLast`

- **Line:** 1363

---

### `VARIABLE` `cEmail`

- **Line:** 1364

---

### `VARIABLE` `cPhone`

- **Line:** 1365

---

### `VARIABLE` `cTitle`

- **Line:** 1366

---

### `VARIABLE` `contactRef`

- **Line:** 1370

---

### `VARIABLE` `contactData`

- **Line:** 1371
- **Signature:** `Contact`

---

### `VARIABLE` `activityRef`

- **Line:** 1393

---

### `VARIABLE` `historyRef`

- **Line:** 1410

---

### `VARIABLE` `stateRef`

- **Line:** 1421

---

### `VARIABLE` `currentProcessed`

- **Line:** 1469

---

### `VARIABLE` `progressVal`

- **Line:** 1471

---

### `VARIABLE` `duplicateCount`

- **Line:** 1493

---

### `VARIABLE` `matchRatePercentage`

- **Line:** 1497

---

### `VARIABLE` `rate`

- **Line:** 1499

---

### `VARIABLE` `customerMatchCount`

- **Line:** 1502

---

### `VARIABLE` `mappedHeader`

- **Line:** 1993

---

### `VARIABLE` `isFieldRequired`

- **Line:** 1994

---

### `VARIABLE` `newMappings`

- **Line:** 2008

---

### `VARIABLE` `colHeader`

- **Line:** 2115

---

### `VARIABLE` `fallback`

- **Line:** 2117

---

### `VARIABLE` `colHeader`

- **Line:** 2121

---

### `VARIABLE` `fallback`

- **Line:** 2123

---

### `VARIABLE` `colHeader`

- **Line:** 2127

---

### `VARIABLE` `fallback`

- **Line:** 2129

---

### `VARIABLE` `colHeader`

- **Line:** 2133

---

### `VARIABLE` `fallback`

- **Line:** 2135

---

### `VARIABLE` `colHeader`

- **Line:** 2139

---

### `VARIABLE` `fallback`

- **Line:** 2141

---

### `VARIABLE` `keyVal`

- **Line:** 2162

---

### `VARIABLE` `rowErrors`

- **Line:** 2214

---

### `VARIABLE` `existingId`

- **Line:** 2215

---

### `VARIABLE` `customerMatch`

- **Line:** 2216

---

### `VARIABLE` `isDup`

- **Line:** 2217

---

### `VARIABLE` `isCust`

- **Line:** 2218

---

### `VARIABLE` `m`

- **Line:** 2362

---

### `VARIABLE` `s`

- **Line:** 2363

---

### `VARIABLE` `rPerSec`

- **Line:** 2375

---

### `VARIABLE` `remRows`

- **Line:** 2376

---

### `VARIABLE` `remSecs`

- **Line:** 2378

---

### `VARIABLE` `m`

- **Line:** 2379

---

### `VARIABLE` `s`

- **Line:** 2380

---

### `VARIABLE` `isAlphanumeric`

- **Line:** 2578

---

