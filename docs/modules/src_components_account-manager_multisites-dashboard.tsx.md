# Module: `src/components/account-manager/multisites-dashboard.tsx`

- **Language:** TypeScript
- **Total Lines:** 2025
- **Direct Dependencies:** 31 modules imported

## Exported Symbols & API

### `VARIABLE` `AUSTRALIAN_STATES`

- **Line:** 42

---

### `FUNCTION` `parseApptDate`

- **Line:** 44
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `app` | `any` | **Yes** | - | - |

---

### `VARIABLE` `raw`

- **Line:** 45

---

### `VARIABLE` `parsed`

- **Line:** 51

---

### `FUNCTION` `parseTaskDate`

- **Line:** 58
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `task` | `any` | **Yes** | - | - |

---

### `VARIABLE` `raw`

- **Line:** 59

---

### `VARIABLE` `parsed`

- **Line:** 65

---

### `FUNCTION` `MultiSitesDashboard`

- **Line:** 72
- **Returns:** `void`

---

### `VARIABLE` `isFranchisee`

- **Line:** 74

---

### `FUNCTION` `fetchHierarchy`

- **Line:** 134
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 136

---

### `FUNCTION` `toggleSelectChild`

- **Line:** 146

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentId` | `string` | **Yes** | - | - |
| `childId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `current`

- **Line:** 148

---

### `VARIABLE` `updated`

- **Line:** 149

---

### `FUNCTION` `toggleSelectAllChildren`

- **Line:** 156

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentId` | `string` | **Yes** | - | - |
| `allChildIds` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `current`

- **Line:** 158

---

### `VARIABLE` `isAllSelected`

- **Line:** 159

---

### `FUNCTION` `openBulkLostDialog`

- **Line:** 164

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parent` | `Lead | null` | **Yes** | - | - |
| `availableChildren` | `Lead[]` | **Yes** | - | - |
| `preselectedChildIds` | `string[]` | No | - | - |

---

### `VARIABLE` `childIdsToSelect`

- **Line:** 167

---

### `VARIABLE` `initialSet`

- **Line:** 171

---

### `FUNCTION` `handleExecuteBulkMarkAsLost`

- **Line:** 186
- **Async:** Yes

---

### `VARIABLE` `themeName`

- **Line:** 208

---

### `VARIABLE` `whyName`

- **Line:** 209

---

### `VARIABLE` `reasonName`

- **Line:** 210

---

### `VARIABLE` `themeObj`

- **Line:** 213

---

### `VARIABLE` `whyObj`

- **Line:** 216

---

### `VARIABLE` `reasonObj`

- **Line:** 219

---

### `VARIABLE` `staffName`

- **Line:** 227

---

### `VARIABLE` `targetIds`

- **Line:** 228

---

### `VARIABLE` `leadRef`

- **Line:** 231

---

### `VARIABLE` `compRef`

- **Line:** 232

---

### `VARIABLE` `isCompany`

- **Line:** 239

---

### `VARIABLE` `lostStatus`

- **Line:** 240

---

### `VARIABLE` `updateFields`

- **Line:** 242
- **Signature:** `any`

---

### `VARIABLE` `leadData`

- **Line:** 275

---

### `VARIABLE` `canSeeAll`

- **Line:** 309

---

### `FUNCTION` `loadAMs`

- **Line:** 323
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `usersRef`

- **Line:** 325

---

### `VARIABLE` `q`

- **Line:** 326

---

### `VARIABLE` `snap`

- **Line:** 327

---

### `VARIABLE` `ams`

- **Line:** 328

---

### `VARIABLE` `targetAm`

- **Line:** 331

---

### `VARIABLE` `resolvedName`

- **Line:** 333

---

### `VARIABLE` `targetDoc`

- **Line:** 336

---

### `VARIABLE` `data`

- **Line:** 338

---

### `VARIABLE` `resolvedName`

- **Line:** 339

---

### `FUNCTION` `fetchMultiSiteData`

- **Line:** 353
- **Async:** Yes

---

### `VARIABLE` `leadsRef`

- **Line:** 356

---

### `VARIABLE` `snap`

- **Line:** 357

---

### `VARIABLE` `allLeads`

- **Line:** 358

---

### `VARIABLE` `compRef`

- **Line:** 361

---

### `VARIABLE` `compSnap`

- **Line:** 362

---

### `VARIABLE` `allCompanies`

- **Line:** 363

---

### `VARIABLE` `leadIdSet`

- **Line:** 366

---

### `VARIABLE` `mergedLeads`

- **Line:** 367

---

### `VARIABLE` `explicitMultisiteIds`

- **Line:** 375

---

### `VARIABLE` `fetchedAppts`

- **Line:** 393
- **Signature:** `any[]`

---

### `VARIABLE` `apptQuery`

- **Line:** 395

---

### `VARIABLE` `apptSnap`

- **Line:** 396

---

### `VARIABLE` `apptsByLead`

- **Line:** 404
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `multisiteLeads`

- **Line:** 413

---

### `VARIABLE` `appts`

- **Line:** 416

---

### `VARIABLE` `existingAppts`

- **Line:** 417

---

### `VARIABLE` `combinedAppts`

- **Line:** 418

---

### `VARIABLE` `frDocs`

- **Line:** 431

---

### `VARIABLE` `frNames`

- **Line:** 432

---

### `VARIABLE` `fName`

- **Line:** 434

---

### `VARIABLE` `initialOpen`

- **Line:** 443
- **Signature:** `Record<string, boolean>`

---

### `FUNCTION` `formatFullAddress`

- **Line:** 467

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `l` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `addr`

- **Line:** 468

---

### `VARIABLE` `address1`

- **Line:** 469

---

### `VARIABLE` `street`

- **Line:** 470

---

### `VARIABLE` `city`

- **Line:** 471

---

### `VARIABLE` `state`

- **Line:** 472

---

### `VARIABLE` `zip`

- **Line:** 473

---

### `VARIABLE` `parts`

- **Line:** 475

---

### `VARIABLE` `filteredLeads`

- **Line:** 480

---

### `VARIABLE` `targetAmLeadIds`

- **Line:** 481
- **Signature:** `Set<string> | null`

---

### `VARIABLE` `targetParentIds`

- **Line:** 482
- **Signature:** `Set<string> | null`

---

### `VARIABLE` `targetAmObj`

- **Line:** 488

---

### `VARIABLE` `targetUid`

- **Line:** 489

---

### `VARIABLE` `targetName`

- **Line:** 490

---

### `VARIABLE` `amAssigned`

- **Line:** 493

---

### `VARIABLE` `amUid`

- **Line:** 494

---

### `VARIABLE` `salesRep`

- **Line:** 495

---

### `VARIABLE` `isTargetAm`

- **Line:** 497

---

### `VARIABLE` `isDirectMatch`

- **Line:** 523

---

### `VARIABLE` `isParentOfMatch`

- **Line:** 524

---

### `VARIABLE` `isChildOfMatch`

- **Line:** 525

---

### `VARIABLE` `currentStatus`

- **Line:** 538

---

### `VARIABLE` `leadFranchisee`

- **Line:** 551

---

### `VARIABLE` `leadState`

- **Line:** 557

---

### `VARIABLE` `q`

- **Line:** 563

---

### `VARIABLE` `name`

- **Line:** 564

---

### `VARIABLE` `id`

- **Line:** 565

---

### `VARIABLE` `ppId`

- **Line:** 566

---

### `VARIABLE` `parentId`

- **Line:** 567

---

### `VARIABLE` `fullAddr`

- **Line:** 568

---

### `VARIABLE` `am`

- **Line:** 569

---

### `VARIABLE` `franchisee`

- **Line:** 570

---

### `VARIABLE` `matches`

- **Line:** 572

---

### `VARIABLE` `pipelineLeads`

- **Line:** 582

---

### `VARIABLE` `st`

- **Line:** 584

---

### `VARIABLE` `priorityQueueLeads`

- **Line:** 590

---

### `VARIABLE` `st`

- **Line:** 592

---

### `VARIABLE` `pastPendingAppointmentsLeads`

- **Line:** 598

---

### `VARIABLE` `today`

- **Line:** 599

---

### `VARIABLE` `apptDate`

- **Line:** 602

---

### `VARIABLE` `apptStatus`

- **Line:** 604

---

### `VARIABLE` `todayAppointmentsLeads`

- **Line:** 610

---

### `VARIABLE` `today`

- **Line:** 611

---

### `VARIABLE` `apptDate`

- **Line:** 614

---

### `VARIABLE` `apptStatus`

- **Line:** 616

---

### `VARIABLE` `futureAppointmentsLeads`

- **Line:** 622

---

### `VARIABLE` `today`

- **Line:** 623

---

### `VARIABLE` `apptDate`

- **Line:** 626

---

### `VARIABLE` `apptStatus`

- **Line:** 628

---

### `VARIABLE` `noShowAppointmentsLeads`

- **Line:** 634

---

### `VARIABLE` `apptStatus`

- **Line:** 637

---

### `VARIABLE` `pastPendingTasksLeads`

- **Line:** 644

---

### `VARIABLE` `today`

- **Line:** 645

---

### `VARIABLE` `taskDate`

- **Line:** 649

---

### `VARIABLE` `todayTasksLeads`

- **Line:** 656

---

### `VARIABLE` `today`

- **Line:** 657

---

### `VARIABLE` `taskDate`

- **Line:** 661

---

### `VARIABLE` `futureTasksLeads`

- **Line:** 668

---

### `VARIABLE` `today`

- **Line:** 669

---

### `VARIABLE` `taskDate`

- **Line:** 673

---

### `VARIABLE` `completedTasksLeads`

- **Line:** 680

---

### `VARIABLE` `totalAppointmentsCount`

- **Line:** 687

---

### `VARIABLE` `totalTasksCount`

- **Line:** 688

---

### `VARIABLE` `stageCounts`

- **Line:** 691

---

### `VARIABLE` `counts`

- **Line:** 692

---

### `VARIABLE` `st`

- **Line:** 705

---

### `VARIABLE` `activeStageLeads`

- **Line:** 719

---

### `VARIABLE` `metrics`

- **Line:** 732

---

### `VARIABLE` `totalMultiSites`

- **Line:** 733

---

### `VARIABLE` `parentAccountIds`

- **Line:** 736

---

### `VARIABLE` `totalParents`

- **Line:** 744

---

### `VARIABLE` `totalChildren`

- **Line:** 746

---

### `VARIABLE` `assignedToTargetAm`

- **Line:** 747

---

### `VARIABLE` `activePipelines`

- **Line:** 753

---

### `FUNCTION` `toggleParentOpen`

- **Line:** 758

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleCompleteTask`

- **Line:** 762
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |
| `taskId` | `string` | **Yes** | - | - |
| `taskTitle` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleExecutePromoteParent`

- **Line:** 786
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 798

---

### `FUNCTION` `renderHierarchyGroups`

- **Line:** 827

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetLeads` | `Lead[]` | **Yes** | - | - |
| `mode` | `'leads' | 'appointments' | 'tasks'` | No | `'leads'` | - |

---

### `VARIABLE` `parentMap`

- **Line:** 829

---

### `VARIABLE` `orphanChildren`

- **Line:** 836
- **Signature:** `Lead[]`

---

### `VARIABLE` `fullParent`

- **Line:** 843

---

### `VARIABLE` `groups`

- **Line:** 856

---

### `VARIABLE` `parentId`

- **Line:** 871

---

### `VARIABLE` `isOpen`

- **Line:** 872

---

### `VARIABLE` `isChecked`

- **Line:** 1020

---

### `VARIABLE` `childAppts`

- **Line:** 1151

---

### `VARIABLE` `childTasks`

- **Line:** 1264

---

### `VARIABLE` `isChecked`

- **Line:** 1795

---

### `VARIABLE` `allIds`

- **Line:** 1854

---

### `VARIABLE` `next`

- **Line:** 1880

---

### `VARIABLE` `isChecked`

- **Line:** 1904

---

### `VARIABLE` `next`

- **Line:** 1911

---

