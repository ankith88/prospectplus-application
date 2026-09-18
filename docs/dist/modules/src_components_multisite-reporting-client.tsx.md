# Module: `src/components/multisite-reporting-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 2377
- **Direct Dependencies:** 22 modules imported

## Exported Symbols & API

### `VARIABLE` `AUSTRALIAN_STATES`

- **Line:** 31

---

### `INTERFACE` `AmSmCategoryBreakdown`

- **Line:** 33

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `callsCount` | `number` | No | - |
| `appointmentsCount` | `number` | No | - |
| `tasksCount` | `number` | No | - |
| `emailsCount` | `number` | No | - |
| `notesCount` | `number` | No | - |
| `totalActivityCount` | `number` | No | - |
| `lastActivityDate` | `string` | Yes | - |
| `lastActivityNotes` | `string` | Yes | - |
| `lastAuthor` | `string` | Yes | - |

---

### `INTERFACE` `MultiSiteHierarchyGroup`

- **Line:** 45

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `parent` | `Lead` | No | - |
| `children` | `Lead[]` | No | - |
| `totalBranches` | `number` | No | - |
| `outreachCount` | `number` | No | - |
| `respondedCount` | `number` | No | - |
| `quoteSentCount` | `number` | No | - |
| `activeCount` | `number` | No | - |
| `lastOutreachDate` | `string` | Yes | - |
| `overallStatus` | `LeadStatus` | No | - |
| `isSignedCustomer` | `boolean` | No | - |
| `signedAmActivityCount` | `number` | No | - |
| `signedAmCategoryBreakdown` | `AmSmCategoryBreakdown` | No | - |
| `signedAmLastActivityDate` | `string` | Yes | - |
| `signedAmLastActivityNotes` | `string` | Yes | - |
| `signedAmLastAuthor` | `string` | Yes | - |

---

### `VARIABLE` `AM_SM_ROLES`

- **Line:** 63

---

### `VARIABLE` `EXCLUDED_AM_SM_USERS`

- **Line:** 70

---

### `VARIABLE` `SYSTEM_NOTE_PATTERNS`

- **Line:** 77

---

### `FUNCTION` `isSystemAuditNote`

- **Line:** 103
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `noteText` | `string` | No | - | - |

---

### `VARIABLE` `lower`

- **Line:** 105

---

### `FUNCTION` `MultiSiteReportingClient`

- **Line:** 109
- **Returns:** `void`

---

### `VARIABLE` `hasAccess`

- **Line:** 145

---

### `FUNCTION` `helperGetStatus`

- **Line:** 152
- **Returns:** `LeadStatus`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `l`

- **Line:** 153

---

### `FUNCTION` `isSignedCustomerStatus`

- **Line:** 157
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `l`

- **Line:** 158

---

### `VARIABLE` `st`

- **Line:** 159

---

### `FUNCTION` `helperGetTaggedBy`

- **Line:** 169
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `l`

- **Line:** 170

---

### `FUNCTION` `helperGetAssignedAm`

- **Line:** 181
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `l`

- **Line:** 182

---

### `FUNCTION` `isAuthorAmOrSm`

- **Line:** 186
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `authorStr` | `string` | No | - | - |
| `leadAssignedAm` | `string` | No | - | - |

---

### `FUNCTION` `isExcluded`

- **Line:** 187

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `str` | `string` | No | - | - |

---

### `VARIABLE` `lower`

- **Line:** 189

---

### `VARIABLE` `lowerAuthor`

- **Line:** 194

---

### `VARIABLE` `lowerAm`

- **Line:** 225

---

### `FUNCTION` `toggleModalRowExpand`

- **Line:** 238

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getLeadAmActivitiesList`

- **Line:** 242

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `lAny`

- **Line:** 243

---

### `VARIABLE` `assignedAm`

- **Line:** 244

---

### `VARIABLE` `list`

- **Line:** 245
- **Signature:** `{ id: string; type: string; category: string; author: string; date: string; text: string }[]`

---

### `VARIABLE` `activities`

- **Line:** 248
- **Signature:** `Activity[]`

---

### `VARIABLE` `actType`

- **Line:** 251

---

### `VARIABLE` `notesLower`

- **Line:** 252

---

### `VARIABLE` `cat`

- **Line:** 253

---

### `VARIABLE` `appointments`

- **Line:** 270
- **Signature:** `any[]`

---

### `VARIABLE` `appAuthor`

- **Line:** 272

---

### `VARIABLE` `appText`

- **Line:** 273

---

### `VARIABLE` `tasks`

- **Line:** 287
- **Signature:** `any[]`

---

### `VARIABLE` `taskAuthor`

- **Line:** 289

---

### `VARIABLE` `taskText`

- **Line:** 290

---

### `VARIABLE` `subNotes`

- **Line:** 304
- **Signature:** `any[]`

---

### `VARIABLE` `noteAuthor`

- **Line:** 306

---

### `VARIABLE` `noteText`

- **Line:** 307

---

### `VARIABLE` `noteAuthor`

- **Line:** 323

---

### `VARIABLE` `noteText`

- **Line:** 324

---

### `VARIABLE` `noteDate`

- **Line:** 325

---

### `FUNCTION` `getLeadAmSmCategorizedStats`

- **Line:** 343
- **Returns:** `AmSmCategoryBreakdown`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `lAny`

- **Line:** 344

---

### `VARIABLE` `assignedAm`

- **Line:** 345

---

### `VARIABLE` `callsCount`

- **Line:** 347

---

### `VARIABLE` `appointmentsCount`

- **Line:** 348

---

### `VARIABLE` `tasksCount`

- **Line:** 349

---

### `VARIABLE` `emailsCount`

- **Line:** 350

---

### `VARIABLE` `notesCount`

- **Line:** 351

---

### `VARIABLE` `lastDate`

- **Line:** 353
- **Signature:** `string | undefined`

---

### `VARIABLE` `lastNotes`

- **Line:** 354
- **Signature:** `string | undefined`

---

### `VARIABLE` `lastAuthor`

- **Line:** 355
- **Signature:** `string | undefined`

---

### `FUNCTION` `updateLastActivity`

- **Line:** 357

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `string` | No | - | - |
| `notes` | `string` | No | - | - |
| `author` | `string` | No | - | - |

---

### `VARIABLE` `activities`

- **Line:** 366
- **Signature:** `Activity[]`

---

### `VARIABLE` `actType`

- **Line:** 369

---

### `VARIABLE` `notesLower`

- **Line:** 370

---

### `VARIABLE` `appointments`

- **Line:** 386
- **Signature:** `any[]`

---

### `VARIABLE` `appAuthor`

- **Line:** 388

---

### `VARIABLE` `appText`

- **Line:** 389

---

### `VARIABLE` `appDate`

- **Line:** 392

---

### `VARIABLE` `appNote`

- **Line:** 393

---

### `VARIABLE` `tasks`

- **Line:** 399
- **Signature:** `any[]`

---

### `VARIABLE` `taskAuthor`

- **Line:** 401

---

### `VARIABLE` `taskText`

- **Line:** 402

---

### `VARIABLE` `taskDate`

- **Line:** 405

---

### `VARIABLE` `taskNote`

- **Line:** 406

---

### `VARIABLE` `subNotes`

- **Line:** 412
- **Signature:** `any[]`

---

### `VARIABLE` `noteAuthor`

- **Line:** 414

---

### `VARIABLE` `noteText`

- **Line:** 415

---

### `VARIABLE` `noteAuthor`

- **Line:** 431

---

### `VARIABLE` `noteText`

- **Line:** 432

---

### `VARIABLE` `noteDate`

- **Line:** 433

---

### `VARIABLE` `totalActivityCount`

- **Line:** 442

---

### `FUNCTION` `openDrillDownModal`

- **Line:** 457

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | - | - |
| `description` | `string` | **Yes** | - | - |
| `leads` | `Lead[]` | **Yes** | - | - |

---

### `FUNCTION` `fetchData`

- **Line:** 467
- **Async:** Yes

---

### `VARIABLE` `startTime`

- **Line:** 469

---

### `VARIABLE` `allUsers`

- **Line:** 474

---

### `VARIABLE` `amSmSet`

- **Line:** 475

---

### `VARIABLE` `role`

- **Line:** 478

---

### `VARIABLE` `assigned`

- **Line:** 479

---

### `VARIABLE` `fullName`

- **Line:** 480

---

### `VARIABLE` `displayName`

- **Line:** 481

---

### `VARIABLE` `email`

- **Line:** 482

---

### `VARIABLE` `isExcluded`

- **Line:** 484

---

### `VARIABLE` `isAmOrSm`

- **Line:** 489

---

### `VARIABLE` `leadsRef`

- **Line:** 501

---

### `VARIABLE` `companiesRef`

- **Line:** 502

---

### `VARIABLE` `leadsQuery`

- **Line:** 504

---

### `VARIABLE` `companiesQuery`

- **Line:** 505

---

### `VARIABLE` `leadMap`

- **Line:** 512

---

### `VARIABLE` `campaignQuery`

- **Line:** 525

---

### `VARIABLE` `campaignSnap`

- **Line:** 526

---

### `VARIABLE` `data`

- **Line:** 529

---

### `VARIABLE` `missingParentIds`

- **Line:** 537

---

### `VARIABLE` `parentDocs`

- **Line:** 544

---

### `VARIABLE` `pLeadSnap`

- **Line:** 547

---

### `VARIABLE` `pCompSnap`

- **Line:** 549

---

### `VARIABLE` `allLeadsArr`

- **Line:** 566

---

### `VARIABLE` `cAny`

- **Line:** 570

---

### `VARIABLE` `rawActivities`

- **Line:** 585

---

### `VARIABLE` `allMultisiteLeads`

- **Line:** 618

---

### `VARIABLE` `endTime`

- **Line:** 629

---

### `VARIABLE` `duration`

- **Line:** 630

---

### `VARIABLE` `uniqueAccountManagers`

- **Line:** 642

---

### `VARIABLE` `amSet`

- **Line:** 643

---

### `VARIABLE` `am`

- **Line:** 645

---

### `VARIABLE` `filteredLeads`

- **Line:** 654

---

### `VARIABLE` `leadAny`

- **Line:** 656

---

### `VARIABLE` `rawDate`

- **Line:** 660

---

### `VARIABLE` `leadDate`

- **Line:** 661

---

### `VARIABLE` `now`

- **Line:** 663

---

### `VARIABLE` `startOfYear`

- **Line:** 667

---

### `VARIABLE` `leadState`

- **Line:** 675

---

### `VARIABLE` `am`

- **Line:** 681

---

### `VARIABLE` `st`

- **Line:** 687

---

### `VARIABLE` `isSigned`

- **Line:** 688

---

### `VARIABLE` `q`

- **Line:** 698

---

### `VARIABLE` `comp`

- **Line:** 699

---

### `VARIABLE` `city`

- **Line:** 700

---

### `VARIABLE` `abn`

- **Line:** 701

---

### `VARIABLE` `ppId`

- **Line:** 702

---

### `VARIABLE` `taggedBy`

- **Line:** 703

---

### `VARIABLE` `filteredModalLeads`

- **Line:** 714

---

### `VARIABLE` `q`

- **Line:** 716

---

### `VARIABLE` `leadAny`

- **Line:** 718

---

### `VARIABLE` `comp`

- **Line:** 719

---

### `VARIABLE` `city`

- **Line:** 720

---

### `VARIABLE` `abn`

- **Line:** 721

---

### `VARIABLE` `ppId`

- **Line:** 722

---

### `VARIABLE` `am`

- **Line:** 723

---

### `VARIABLE` `hierarchyGroups`

- **Line:** 729

---

### `VARIABLE` `parentMap`

- **Line:** 730

---

### `VARIABLE` `standaloneChildren`

- **Line:** 731
- **Signature:** `Lead[]`

---

### `VARIABLE` `lAny`

- **Line:** 734

---

### `VARIABLE` `isParent`

- **Line:** 735

---

### `VARIABLE` `parentId`

- **Line:** 744

---

### `VARIABLE` `dummyParent`

- **Line:** 747
- **Signature:** `any`

---

### `VARIABLE` `groups`

- **Line:** 765
- **Signature:** `MultiSiteHierarchyGroup[]`

---

### `VARIABLE` `outreachCount`

- **Line:** 766

---

### `VARIABLE` `respondedCount`

- **Line:** 767

---

### `VARIABLE` `quoteSentCount`

- **Line:** 768

---

### `VARIABLE` `activeCount`

- **Line:** 769

---

### `VARIABLE` `lastDate`

- **Line:** 770
- **Signature:** `string | undefined`

---

### `VARIABLE` `parentIsSigned`

- **Line:** 772

---

### `VARIABLE` `parentAmStats`

- **Line:** 773

---

### `VARIABLE` `groupSignedChildCount`

- **Line:** 775

---

### `VARIABLE` `groupCalls`

- **Line:** 776

---

### `VARIABLE` `groupAppts`

- **Line:** 777

---

### `VARIABLE` `groupTasks`

- **Line:** 778

---

### `VARIABLE` `groupEmails`

- **Line:** 779

---

### `VARIABLE` `groupNotes`

- **Line:** 780

---

### `VARIABLE` `latestSignedActivityDate`

- **Line:** 782
- **Signature:** `string | undefined`

---

### `VARIABLE` `latestSignedActivityNotes`

- **Line:** 783
- **Signature:** `string | undefined`

---

### `VARIABLE` `latestSignedAuthor`

- **Line:** 784
- **Signature:** `string | undefined`

---

### `VARIABLE` `cAny`

- **Line:** 787

---

### `VARIABLE` `statusStr`

- **Line:** 788

---

### `VARIABLE` `statusLower`

- **Line:** 789

---

### `VARIABLE` `childIsSigned`

- **Line:** 790

---

### `VARIABLE` `childStats`

- **Line:** 794

---

### `VARIABLE` `childDate`

- **Line:** 821

---

### `VARIABLE` `parentAny`

- **Line:** 827

---

### `VARIABLE` `pStatus`

- **Line:** 828

---

### `VARIABLE` `isSignedCustomer`

- **Line:** 829

---

### `VARIABLE` `groupTotalActivity`

- **Line:** 830

---

### `VARIABLE` `metrics`

- **Line:** 865

---

### `VARIABLE` `totalParents`

- **Line:** 866

---

### `VARIABLE` `totalChildBranches`

- **Line:** 867

---

### `VARIABLE` `activeSignedBranches`

- **Line:** 868

---

### `VARIABLE` `totalOutreach`

- **Line:** 869

---

### `VARIABLE` `totalResponded`

- **Line:** 870

---

### `VARIABLE` `totalQuoteSent`

- **Line:** 871

---

### `VARIABLE` `totalSignedAccounts`

- **Line:** 873

---

### `VARIABLE` `signedAccountsWithAmActivity`

- **Line:** 874

---

### `VARIABLE` `totalSignedCalls`

- **Line:** 876

---

### `VARIABLE` `totalSignedAppointments`

- **Line:** 877

---

### `VARIABLE` `totalSignedTasks`

- **Line:** 878

---

### `VARIABLE` `totalSignedEmails`

- **Line:** 879

---

### `VARIABLE` `totalSignedNotes`

- **Line:** 880

---

### `VARIABLE` `pStats`

- **Line:** 887

---

### `VARIABLE` `st`

- **Line:** 899

---

### `VARIABLE` `cStats`

- **Line:** 909

---

### `VARIABLE` `responseRate`

- **Line:** 925

---

### `VARIABLE` `conversionRate`

- **Line:** 929

---

### `VARIABLE` `signedAmTouchpointRate`

- **Line:** 933

---

### `VARIABLE` `totalSignedAmActivities`

- **Line:** 937

---

### `VARIABLE` `amSignedPerformance`

- **Line:** 961

---

### `VARIABLE` `map`

- **Line:** 962

---

### `VARIABLE` `amName`

- **Line:** 977

---

### `VARIABLE` `stats`

- **Line:** 991

---

### `VARIABLE` `data`

- **Line:** 992

---

### `VARIABLE` `recentSignedAmActivities`

- **Line:** 1014

---

### `VARIABLE` `list`

- **Line:** 1015
- **Signature:** `{ leadId: string; companyName: string; amName: string; category: string; type: string; date: string; notes: string }[]`

---

### `VARIABLE` `lAny`

- **Line:** 1019

---

### `VARIABLE` `amName`

- **Line:** 1020

---

### `VARIABLE` `activities`

- **Line:** 1023
- **Signature:** `Activity[]`

---

### `VARIABLE` `actType`

- **Line:** 1026

---

### `VARIABLE` `notesLower`

- **Line:** 1027

---

### `VARIABLE` `cat`

- **Line:** 1028

---

### `VARIABLE` `appointments`

- **Line:** 1046
- **Signature:** `any[]`

---

### `VARIABLE` `appText`

- **Line:** 1048

---

### `VARIABLE` `tasks`

- **Line:** 1063
- **Signature:** `any[]`

---

### `VARIABLE` `taskText`

- **Line:** 1065

---

### `FUNCTION` `toggleParentExpand`

- **Line:** 1084

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleExportCSV`

- **Line:** 1088

---

### `VARIABLE` `csvRows`

- **Line:** 1090

---

### `VARIABLE` `parentName`

- **Line:** 1118

---

### `VARIABLE` `parentId`

- **Line:** 1119

---

### `VARIABLE` `pStatus`

- **Line:** 1120

---

### `VARIABLE` `pAny`

- **Line:** 1121

---

### `VARIABLE` `isSigned`

- **Line:** 1122

---

### `VARIABLE` `pCat`

- **Line:** 1123

---

### `VARIABLE` `lastAmDate`

- **Line:** 1124

---

### `VARIABLE` `cAny`

- **Line:** 1153

---

### `VARIABLE` `cStatus`

- **Line:** 1154

---

### `VARIABLE` `childIsSigned`

- **Line:** 1155

---

### `VARIABLE` `cCat`

- **Line:** 1156

---

### `VARIABLE` `csvString`

- **Line:** 1185

---

### `VARIABLE` `blob`

- **Line:** 1186

---

### `VARIABLE` `url`

- **Line:** 1187

---

### `VARIABLE` `link`

- **Line:** 1188

---

### `FUNCTION` `handleExportModalCSV`

- **Line:** 1202

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | - | - |
| `modalLeads` | `Lead[]` | **Yes** | - | - |

---

### `VARIABLE` `csvRows`

- **Line:** 1204

---

### `VARIABLE` `lAny`

- **Line:** 1225

---

### `VARIABLE` `isParent`

- **Line:** 1226

---

### `VARIABLE` `cat`

- **Line:** 1227

---

### `VARIABLE` `csvString`

- **Line:** 1248

---

### `VARIABLE` `blob`

- **Line:** 1249

---

### `VARIABLE` `url`

- **Line:** 1250

---

### `VARIABLE` `link`

- **Line:** 1251

---

### `VARIABLE` `isExpanded`

- **Line:** 1571

---

### `VARIABLE` `parentName`

- **Line:** 1572

---

### `VARIABLE` `pAny`

- **Line:** 1573

---

### `VARIABLE` `parentState`

- **Line:** 1574

---

### `VARIABLE` `parentStatus`

- **Line:** 1575

---

### `VARIABLE` `parentCat`

- **Line:** 1576

---

### `VARIABLE` `cAny`

- **Line:** 1670

---

### `VARIABLE` `childStatus`

- **Line:** 1671

---

### `VARIABLE` `taggedBy`

- **Line:** 1672

---

### `VARIABLE` `assignedAm`

- **Line:** 1673

---

### `VARIABLE` `childIsSigned`

- **Line:** 1674

---

### `VARIABLE` `childCat`

- **Line:** 1675

---

### `VARIABLE` `userStatsMap`

- **Line:** 2112

---

### `VARIABLE` `lAny`

- **Line:** 2115

---

### `VARIABLE` `isChild`

- **Line:** 2116

---

### `VARIABLE` `taggedBy`

- **Line:** 2118

---

### `VARIABLE` `pId`

- **Line:** 2119

---

### `VARIABLE` `st`

- **Line:** 2120

---

### `VARIABLE` `uData`

- **Line:** 2125

---

### `VARIABLE` `userStats`

- **Line:** 2132

---

### `VARIABLE` `lAny`

- **Line:** 2234

---

### `VARIABLE` `isParent`

- **Line:** 2235

---

### `VARIABLE` `statusStr`

- **Line:** 2236

---

### `VARIABLE` `assignedAm`

- **Line:** 2237

---

### `VARIABLE` `catStats`

- **Line:** 2238

---

### `VARIABLE` `amActivitiesList`

- **Line:** 2239

---

### `VARIABLE` `isRowExpanded`

- **Line:** 2240

---

