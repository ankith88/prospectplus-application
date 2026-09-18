# Module: `src/app/admin/all-leads/master-all-leads-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1581
- **Direct Dependencies:** 23 modules imported

## Exported Symbols & API

### `VARIABLE` `BUCKET_LABELS`

- **Line:** 53
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `parseAnyDate`

- **Line:** 66
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `ms`

- **Line:** 72

---

### `VARIABLE` `d`

- **Line:** 73

---

### `VARIABLE` `d`

- **Line:** 79

---

### `VARIABLE` `d`

- **Line:** 86

---

### `VARIABLE` `d`

- **Line:** 90

---

### `VARIABLE` `trimmed`

- **Line:** 95

---

### `VARIABLE` `dmY`

- **Line:** 98

---

### `VARIABLE` `d`

- **Line:** 100

---

### `VARIABLE` `parsedIso`

- **Line:** 105

---

### `VARIABLE` `parsedStandard`

- **Line:** 110

---

### `FUNCTION` `safeFormatDate`

- **Line:** 117
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |
| `outputFormat` | `any` | No | `'dd/MM/yyyy'` | - |

---

### `VARIABLE` `d`

- **Line:** 118

---

### `FUNCTION` `getLeadFranchisee`

- **Line:** 127
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `FUNCTION` `isLeadActiveLpo`

- **Line:** 141
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |

---

### `FUNCTION` `MasterAllLeadsClient`

- **Line:** 155
- **Returns:** `void`

---

### `VARIABLE` `isFranchisee`

- **Line:** 157

---

### `VARIABLE` `router`

- **Line:** 159

---

### `VARIABLE` `isAllowed`

- **Line:** 161

---

### `VARIABLE` `role`

- **Line:** 162

---

### `FUNCTION` `handleBulkNetSuiteSync`

- **Line:** 185
- **Async:** Yes

---

### `VARIABLE` `successCount`

- **Line:** 188

---

### `VARIABLE` `res`

- **Line:** 191

---

### `FUNCTION` `fetchData`

- **Line:** 229
- **Async:** Yes

---

### `VARIABLE` `uniqueSources`

- **Line:** 255

---

### `VARIABLE` `set`

- **Line:** 256

---

### `VARIABLE` `uniqueStatuses`

- **Line:** 263

---

### `VARIABLE` `set`

- **Line:** 264

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 271

---

### `VARIABLE` `set`

- **Line:** 272

---

### `VARIABLE` `f`

- **Line:** 274

---

### `VARIABLE` `uniqueDialers`

- **Line:** 280

---

### `VARIABLE` `set`

- **Line:** 281

---

### `VARIABLE` `uniqueAccountManagers`

- **Line:** 288

---

### `VARIABLE` `set`

- **Line:** 289

---

### `VARIABLE` `filteredLeads`

- **Line:** 297

---

### `VARIABLE` `q`

- **Line:** 301

---

### `VARIABLE` `matchCompany`

- **Line:** 302

---

### `VARIABLE` `matchContact`

- **Line:** 303

---

### `VARIABLE` `matchId`

- **Line:** 304

---

### `VARIABLE` `b`

- **Line:** 315

---

### `VARIABLE` `leadFran`

- **Line:** 326

---

### `VARIABLE` `isAlphanumeric`

- **Line:** 368

---

### `VARIABLE` `isNumeric`

- **Line:** 373

---

### `VARIABLE` `leadCreatedStr`

- **Line:** 379

---

### `VARIABLE` `leadDate`

- **Line:** 380

---

### `VARIABLE` `fromDate`

- **Line:** 383

---

### `VARIABLE` `toDate`

- **Line:** 387

---

### `VARIABLE` `leadEnteredStr`

- **Line:** 397

---

### `VARIABLE` `leadDate`

- **Line:** 398

---

### `VARIABLE` `fromDate`

- **Line:** 401

---

### `VARIABLE` `toDate`

- **Line:** 405

---

### `VARIABLE` `totalPages`

- **Line:** 433

---

### `VARIABLE` `paginatedLeads`

- **Line:** 434

---

### `VARIABLE` `start`

- **Line:** 435

---

### `VARIABLE` `eligibleUsers`

- **Line:** 440

---

### `VARIABLE` `roles`

- **Line:** 444

---

### `FUNCTION` `handleSelectAllFiltered`

- **Line:** 466

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectRow`

- **Line:** 474

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleClearFilters`

- **Line:** 482

---

### `FUNCTION` `handleAssignLeads`

- **Line:** 499
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `isRandom` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `assignmentMap`

- **Line:** 512
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `leadCurrentBuckets`

- **Line:** 513
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `selectedLeadObjs`

- **Line:** 515

---

### `VARIABLE` `userIndex`

- **Line:** 525

---

### `VARIABLE` `updated`

- **Line:** 552
- **Signature:** `Lead`

---

### `VARIABLE` `selectedLeadObjects`

- **Line:** 578

---

### `VARIABLE` `exportedSelectedCount`

- **Line:** 582

---

### `VARIABLE` `finalExportCount`

- **Line:** 586

---

### `VARIABLE` `targetName`

- **Line:** 591

---

### `VARIABLE` `matchCurrent`

- **Line:** 595

---

### `VARIABLE` `matchHistory`

- **Line:** 596

---

### `FUNCTION` `handleOpenExportModal`

- **Line:** 604

---

### `FUNCTION` `handleExecuteExport`

- **Line:** 616
- **Async:** Yes

---

### `VARIABLE` `targetName`

- **Line:** 622

---

### `VARIABLE` `leadsToExport`

- **Line:** 624

---

### `VARIABLE` `matchCurrent`

- **Line:** 630

---

### `VARIABLE` `matchHistory`

- **Line:** 631

---

### `VARIABLE` `contactsByLeadId`

- **Line:** 644
- **Signature:** `Record<string, Contact[]>`

---

### `VARIABLE` `BATCH_SIZE`

- **Line:** 645

---

### `VARIABLE` `batch`

- **Line:** 647

---

### `VARIABLE` `contactsList`

- **Line:** 649
- **Signature:** `Contact[]`

---

### `VARIABLE` `subContacts`

- **Line:** 652

---

### `VARIABLE` `compContacts`

- **Line:** 656

---

### `VARIABLE` `headers`

- **Line:** 668

---

### `FUNCTION` `escapeCsv`

- **Line:** 716

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `str`

- **Line:** 718

---

### `FUNCTION` `getContactNameParts`

- **Line:** 722

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `c` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parts`

- **Line:** 728

---

### `VARIABLE` `rows`

- **Line:** 737

---

### `VARIABLE` `historyCompanies`

- **Line:** 738

---

### `VARIABLE` `exportCount`

- **Line:** 739

---

### `VARIABLE` `leadInternalId`

- **Line:** 741

---

### `VARIABLE` `leadAddress1`

- **Line:** 742

---

### `VARIABLE` `leadStreet`

- **Line:** 743

---

### `VARIABLE` `leadCity`

- **Line:** 744

---

### `VARIABLE` `leadState`

- **Line:** 745

---

### `VARIABLE` `leadZip`

- **Line:** 746

---

### `VARIABLE` `leadCountry`

- **Line:** 747

---

### `VARIABLE` `leadFranchisee`

- **Line:** 748

---

### `VARIABLE` `isActiveLpo`

- **Line:** 749

---

### `VARIABLE` `leadEmail`

- **Line:** 750

---

### `VARIABLE` `leadPhone`

- **Line:** 751

---

### `VARIABLE` `leadWebsite`

- **Line:** 752

---

### `VARIABLE` `leadAbn`

- **Line:** 753

---

### `VARIABLE` `contacts`

- **Line:** 755

---

### `VARIABLE` `c1`

- **Line:** 756

---

### `VARIABLE` `c2`

- **Line:** 757

---

### `VARIABLE` `c3`

- **Line:** 758

---

### `VARIABLE` `c1Parts`

- **Line:** 760

---

### `VARIABLE` `c2Parts`

- **Line:** 761

---

### `VARIABLE` `c3Parts`

- **Line:** 762

---

### `VARIABLE` `contactsDetails`

- **Line:** 764

---

### `VARIABLE` `parts`

- **Line:** 765

---

### `VARIABLE` `csvContent`

- **Line:** 818

---

### `VARIABLE` `blob`

- **Line:** 819

---

### `VARIABLE` `url`

- **Line:** 820

---

### `VARIABLE` `link`

- **Line:** 821

---

### `VARIABLE` `cleanCompName`

- **Line:** 822

---

### `VARIABLE` `leadIdsToMark`

- **Line:** 830

---

### `VARIABLE` `authorName`

- **Line:** 831

---

### `VARIABLE` `authorUid`

- **Line:** 832

---

### `VARIABLE` `res`

- **Line:** 834

---

### `VARIABLE` `exportedAtNow`

- **Line:** 842

---

### `VARIABLE` `newHistoryItem`

- **Line:** 843

---

### `VARIABLE` `existingHistory`

- **Line:** 852

---

### `VARIABLE` `isSelected`

- **Line:** 1306

---

### `VARIABLE` `dateCreatedStr`

- **Line:** 1307

---

### `VARIABLE` `dateEnteredStr`

- **Line:** 1308

---

### `VARIABLE` `leadUrl`

- **Line:** 1309

---

