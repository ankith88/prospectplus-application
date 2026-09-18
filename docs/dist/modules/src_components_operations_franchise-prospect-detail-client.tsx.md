# Module: `src/components/operations/franchise-prospect-detail-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 4318
- **Direct Dependencies:** 20 modules imported

## Exported Symbols & API

### `FUNCTION` `getInitialFyColumns`

- **Line:** 56
- **Returns:** `KeyFactSheetHistoryColumn[]`

---

### `VARIABLE` `now`

- **Line:** 57

---

### `VARIABLE` `currentYear`

- **Line:** 58

---

### `VARIABLE` `currentMonth`

- **Line:** 59

---

### `VARIABLE` `lastCompletedFyYear`

- **Line:** 60

---

### `VARIABLE` `HISTORICAL_EVENT_ROWS`

- **Line:** 81

---

### `FUNCTION` `FranchiseProspectDetailClient`

- **Line:** 91
- **Returns:** `void`

---

### `VARIABLE` `params`

- **Line:** 92

---

### `VARIABLE` `router`

- **Line:** 93

---

### `VARIABLE` `prospectId`

- **Line:** 94

---

### `VARIABLE` `activeRole`

- **Line:** 99

---

### `VARIABLE` `isAllowed`

- **Line:** 100

---

### `FUNCTION` `handleUploadDeedFile`

- **Line:** 376
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 377

---

### `VARIABLE` `uploadedDocs`

- **Line:** 381
- **Signature:** `ProspectDocument[]`

---

### `VARIABLE` `file`

- **Line:** 383

---

### `VARIABLE` `storageRef`

- **Line:** 384

---

### `VARIABLE` `url`

- **Line:** 386

---

### `VARIABLE` `currentDocs`

- **Line:** 397

---

### `VARIABLE` `updatedDocs`

- **Line:** 398

---

### `VARIABLE` `refDoc`

- **Line:** 400

---

### `VARIABLE` `updatedDeed`

- **Line:** 401
- **Signature:** `ConfidentialityDeedData`

---

### `VARIABLE` `newNote`

- **Line:** 407

---

### `FUNCTION` `handleDeleteDeedDoc`

- **Line:** 431
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `docId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updatedDocs`

- **Line:** 434

---

### `VARIABLE` `refDoc`

- **Line:** 435

---

### `FUNCTION` `handleSaveDeedSchedule`

- **Line:** 446
- **Async:** Yes

---

### `VARIABLE` `refDoc`

- **Line:** 450

---

### `VARIABLE` `updatedDeed`

- **Line:** 451
- **Signature:** `ConfidentialityDeedData`

---

### `VARIABLE` `newNote`

- **Line:** 459

---

### `FUNCTION` `handleSaveEOIPrefill`

- **Line:** 482
- **Async:** Yes

---

### `VARIABLE` `refDoc`

- **Line:** 486

---

### `VARIABLE` `updatedEOI`

- **Line:** 487
- **Signature:** `EOIData`

---

### `VARIABLE` `newNote`

- **Line:** 497

---

### `FUNCTION` `handleUploadEOIFile`

- **Line:** 520
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 521

---

### `VARIABLE` `uploadedDocs`

- **Line:** 525
- **Signature:** `ProspectDocument[]`

---

### `VARIABLE` `file`

- **Line:** 527

---

### `VARIABLE` `storageRef`

- **Line:** 528

---

### `VARIABLE` `url`

- **Line:** 530

---

### `VARIABLE` `currentDocs`

- **Line:** 541

---

### `VARIABLE` `updatedDocs`

- **Line:** 542

---

### `VARIABLE` `refDoc`

- **Line:** 544

---

### `VARIABLE` `updatedEOI`

- **Line:** 545
- **Signature:** `EOIData`

---

### `VARIABLE` `newNote`

- **Line:** 551

---

### `FUNCTION` `handleDeleteEOIDoc`

- **Line:** 575
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `docId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updatedDocs`

- **Line:** 578

---

### `VARIABLE` `refDoc`

- **Line:** 579

---

### `FUNCTION` `handleUploadDepositReceipt`

- **Line:** 590
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 591

---

### `VARIABLE` `uploadedDocs`

- **Line:** 595
- **Signature:** `ProspectDocument[]`

---

### `VARIABLE` `file`

- **Line:** 597

---

### `VARIABLE` `storageRef`

- **Line:** 598

---

### `VARIABLE` `url`

- **Line:** 600

---

### `VARIABLE` `currentDocs`

- **Line:** 611

---

### `VARIABLE` `updatedDocs`

- **Line:** 612

---

### `VARIABLE` `payload`

- **Line:** 614

---

### `VARIABLE` `res`

- **Line:** 629

---

### `VARIABLE` `json`

- **Line:** 635

---

### `FUNCTION` `handleDeleteDepositDoc`

- **Line:** 649
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `docId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updatedDocs`

- **Line:** 652

---

### `VARIABLE` `refDoc`

- **Line:** 653

---

### `FUNCTION` `handleAddFyColumn`

- **Line:** 673

---

### `VARIABLE` `cols`

- **Line:** 674

---

### `VARIABLE` `newId`

- **Line:** 675

---

### `VARIABLE` `newCol`

- **Line:** 676
- **Signature:** `KeyFactSheetHistoryColumn`

---

### `FUNCTION` `handleRemoveFyColumn`

- **Line:** 684

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleUpdateFyColumnLabel`

- **Line:** 692

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `label` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleUpdateFyOccurrence`

- **Line:** 699

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `key` | `string` | **Yes** | - | - |
| `val` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleToggleTerritoryDetail`

- **Line:** 708

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `current`

- **Line:** 709

---

### `VARIABLE` `updated`

- **Line:** 710

---

### `FUNCTION` `handleToggleCompetitionType`

- **Line:** 716

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `current`

- **Line:** 717

---

### `VARIABLE` `updated`

- **Line:** 718

---

### `FUNCTION` `handleToggleRenewalOption`

- **Line:** 724

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `current`

- **Line:** 725

---

### `VARIABLE` `updated`

- **Line:** 726

---

### `FUNCTION` `loadSystemTerritories`

- **Line:** 733
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 735

---

### `VARIABLE` `list`

- **Line:** 736

---

### `FUNCTION` `handleOpenTerritoryModal`

- **Line:** 747

---

### `VARIABLE` `currentInterested`

- **Line:** 748

---

### `FUNCTION` `handleAddTerritory`

- **Line:** 760

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `tName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `clean`

- **Line:** 761

---

### `VARIABLE` `updated`

- **Line:** 763

---

### `FUNCTION` `handleRemoveTerritory`

- **Line:** 770

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `tName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 771

---

### `FUNCTION` `handleSaveTerritories`

- **Line:** 778
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `primary`

- **Line:** 782

---

### `VARIABLE` `ref`

- **Line:** 783

---

### `VARIABLE` `note`

- **Line:** 785

---

### `VARIABLE` `updatedNotes`

- **Line:** 793

---

### `FUNCTION` `checkAndAutoUpdateStatus`

- **Line:** 821
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prospectData` | `FranchiseProspect` | **Yes** | - | - |

---

### `VARIABLE` `deedDone`

- **Line:** 826

---

### `VARIABLE` `kfsDone`

- **Line:** 827

---

### `VARIABLE` `eoiDone`

- **Line:** 828

---

### `VARIABLE` `depositDone`

- **Line:** 829

---

### `VARIABLE` `nabConfirmed`

- **Line:** 830

---

### `VARIABLE` `rfdInstructed`

- **Line:** 831

---

### `VARIABLE` `discSigned`

- **Line:** 832

---

### `VARIABLE` `faExecuted`

- **Line:** 833

---

### `VARIABLE` `trainingScheduled`

- **Line:** 834

---

### `VARIABLE` `targetStatus`

- **Line:** 836
- **Signature:** `FranchiseProspect['status'] | null`

---

### `VARIABLE` `autoNoteReason`

- **Line:** 837

---

### `VARIABLE` `refDoc`

- **Line:** 870

---

### `VARIABLE` `autoNote`

- **Line:** 871

---

### `VARIABLE` `updatedNotes`

- **Line:** 878

---

### `FUNCTION` `fetchProspect`

- **Line:** 896
- **Async:** Yes

---

### `VARIABLE` `ref`

- **Line:** 900

---

### `VARIABLE` `snap`

- **Line:** 901

---

### `VARIABLE` `data`

- **Line:** 903

---

### `VARIABLE` `kfs`

- **Line:** 907
- **Signature:** `Partial<KeyFactSheetData>`

---

### `VARIABLE` `existingDeed`

- **Line:** 989
- **Signature:** `ConfidentialityDeedData`

---

### `VARIABLE` `todayFormatted`

- **Line:** 990

---

### `VARIABLE` `existingEOI`

- **Line:** 1009
- **Signature:** `Partial<EOIData>`

---

### `VARIABLE` `recipientEmail`

- **Line:** 1123

---

### `VARIABLE` `territory`

- **Line:** 1124

---

### `VARIABLE` `deedDone`

- **Line:** 1152

---

### `VARIABLE` `kfsDone`

- **Line:** 1153

---

### `VARIABLE` `eoiDone`

- **Line:** 1154

---

### `VARIABLE` `depositDone`

- **Line:** 1155

---

### `FUNCTION` `loadAllFranchiseesAndPresales`

- **Line:** 1187
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `currentProspectTerritory` | `string` | No | - | - |
| `existingLinkedId` | `string` | No | - | - |
| `prospectDataObj` | `any` | No | - | - |

---

### `VARIABLE` `combinedOptions`

- **Line:** 1194
- **Signature:** `any[]`

---

### `VARIABLE` `res`

- **Line:** 1198

---

### `VARIABLE` `json`

- **Line:** 1199

---

### `VARIABLE` `pd`

- **Line:** 1203

---

### `VARIABLE` `md`

- **Line:** 1204

---

### `VARIABLE` `tName`

- **Line:** 1205

---

### `VARIABLE` `snap`

- **Line:** 1235

---

### `VARIABLE` `fData`

- **Line:** 1237

---

### `VARIABLE` `fId`

- **Line:** 1238

---

### `VARIABLE` `fName`

- **Line:** 1239

---

### `VARIABLE` `targetMatch`

- **Line:** 1273

---

### `VARIABLE` `cleanTerritory`

- **Line:** 1276

---

### `VARIABLE` `prospectRef`

- **Line:** 1291

---

### `FUNCTION` `autoApplyIMDataFromFranchisee`

- **Line:** 1319

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `any` | **Yes** | - | - |

---

### `VARIABLE` `serviceRev`

- **Line:** 1320

---

### `VARIABLE` `askingPrice`

- **Line:** 1321

---

### `VARIABLE` `productRev`

- **Line:** 1325

---

### `VARIABLE` `totalDailyRunTimeHours`

- **Line:** 1326

---

### `VARIABLE` `morningShiftHours`

- **Line:** 1327

---

### `VARIABLE` `afternoonShiftHours`

- **Line:** 1328

---

### `VARIABLE` `franchiseTermYears`

- **Line:** 1329

---

### `FUNCTION` `handleConfirmLinkFranchisee`

- **Line:** 1350
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `match`

- **Line:** 1354

---

### `VARIABLE` `prospectRef`

- **Line:** 1357

---

### `FUNCTION` `handleSyncFromPresale`

- **Line:** 1393

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetId` | `string` | No | - | - |

---

### `VARIABLE` `idToUse`

- **Line:** 1394

---

### `VARIABLE` `match`

- **Line:** 1399

---

### `FUNCTION` `handleUploadTerritoryMap`

- **Line:** 1415
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `file` | `File` | **Yes** | - | - |

---

### `VARIABLE` `fileExt`

- **Line:** 1419

---

### `VARIABLE` `storageRef`

- **Line:** 1420

---

### `VARIABLE` `downloadUrl`

- **Line:** 1422

---

### `VARIABLE` `prospectRef`

- **Line:** 1426

---

### `VARIABLE` `updatedKfs`

- **Line:** 1427

---

### `VARIABLE` `linkedId`

- **Line:** 1435

---

### `VARIABLE` `presaleRef`

- **Line:** 1438

---

### `VARIABLE` `presaleSnap`

- **Line:** 1439

---

### `VARIABLE` `pData`

- **Line:** 1441

---

### `VARIABLE` `updatedPresaleDetails`

- **Line:** 1442

---

### `VARIABLE` `franRef`

- **Line:** 1449

---

### `VARIABLE` `franSnap`

- **Line:** 1450

---

### `VARIABLE` `deedDone`

- **Line:** 1503

---

### `VARIABLE` `kfsDone`

- **Line:** 1504

---

### `VARIABLE` `eoiDone`

- **Line:** 1505

---

### `VARIABLE` `depositDone`

- **Line:** 1506

---

### `VARIABLE` `nabDone`

- **Line:** 1507

---

### `VARIABLE` `rfdDone`

- **Line:** 1508

---

### `VARIABLE` `discDone`

- **Line:** 1509

---

### `VARIABLE` `faDone`

- **Line:** 1510

---

### `VARIABLE` `trainingDone`

- **Line:** 1511

---

### `VARIABLE` `completedCount`

- **Line:** 1513

---

### `VARIABLE` `isPrerequisitesComplete`

- **Line:** 1514

---

### `FUNCTION` `getCurrentStageName`

- **Line:** 1517

---

### `VARIABLE` `origin`

- **Line:** 1533

---

### `VARIABLE` `kfsToken`

- **Line:** 1534

---

### `VARIABLE` `deedToken`

- **Line:** 1535

---

### `VARIABLE` `eoiToken`

- **Line:** 1536

---

### `VARIABLE` `rfdToken`

- **Line:** 1537

---

### `VARIABLE` `discToken`

- **Line:** 1538

---

### `VARIABLE` `faToken`

- **Line:** 1539

---

### `VARIABLE` `kfsPublicUrl`

- **Line:** 1541

---

### `VARIABLE` `deedPublicUrl`

- **Line:** 1542

---

### `VARIABLE` `eoiPublicUrl`

- **Line:** 1543

---

### `VARIABLE` `rfdPublicUrl`

- **Line:** 1544

---

### `VARIABLE` `discPublicUrl`

- **Line:** 1545

---

### `VARIABLE` `faPublicUrl`

- **Line:** 1546

---

### `FUNCTION` `handleCopyLink`

- **Line:** 1549

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | - | - |
| `label` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleConfirmNAB`

- **Line:** 1554
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `action` | `'confirm' | 'reject'` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 1557

---

### `VARIABLE` `json`

- **Line:** 1566

---

### `FUNCTION` `handleBackdateDisclosure`

- **Line:** 1575
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `backdateIso` | `string` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 1578

---

### `VARIABLE` `json`

- **Line:** 1587

---

### `FUNCTION` `handleToggleFundingType`

- **Line:** 1596
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `isNabRequired` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `refDoc`

- **Line:** 1600

---

### `VARIABLE` `updatedNabFunding`

- **Line:** 1601
- **Signature:** `NABFundingDetails`

---

### `VARIABLE` `updatedEOI`

- **Line:** 1608
- **Signature:** `EOIData`

---

### `VARIABLE` `noteText`

- **Line:** 1613

---

### `VARIABLE` `newNote`

- **Line:** 1617

---

### `FUNCTION` `handleSaveFactSheet`

- **Line:** 1644
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `payload`

- **Line:** 1648

---

### `VARIABLE` `res`

- **Line:** 1655

---

### `VARIABLE` `json`

- **Line:** 1661

---

### `FUNCTION` `handleSendStepEmail`

- **Line:** 1673
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `stepType` | `'fact_sheet' | 'confidentiality_deed' | 'eoi'` | **Yes** | - | - |

---

### `VARIABLE` `emailForm`

- **Line:** 1674

---

### `VARIABLE` `hasMap`

- **Line:** 1679

---

### `VARIABLE` `res`

- **Line:** 1694

---

### `VARIABLE` `json`

- **Line:** 1708

---

### `FUNCTION` `handleSaveDeposit`

- **Line:** 1730
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `payload`

- **Line:** 1734

---

### `VARIABLE` `res`

- **Line:** 1747

---

### `VARIABLE` `json`

- **Line:** 1753

---

### `FUNCTION` `handleUpdateStatus`

- **Line:** 1765
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newStatus` | `FranchiseProspect['status']` | **Yes** | - | - |

---

### `VARIABLE` `ref`

- **Line:** 1768

---

### `FUNCTION` `handleAddNote`

- **Line:** 1779
- **Async:** Yes

---

### `VARIABLE` `newNote`

- **Line:** 1783

---

### `VARIABLE` `updatedNotes`

- **Line:** 1790

---

### `VARIABLE` `ref`

- **Line:** 1791

---

### `FUNCTION` `handleStartConvert`

- **Line:** 1804

---

### `VARIABLE` `eoi`

- **Line:** 1805
- **Signature:** `any`

---

### `FUNCTION` `getStatusBadge`

- **Line:** 1819

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `FranchiseProspect['status']` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 2427

---

### `VARIABLE` `file`

- **Line:** 2470

---

### `VARIABLE` `isPrimary`

- **Line:** 4005

---

### `VARIABLE` `isPrimary`

- **Line:** 4159

---

