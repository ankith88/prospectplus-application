# Module: `src/components/leads-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 3078
- **Direct Dependencies:** 52 modules imported

## Exported Symbols & API

### `TYPE` `LeadWithDetails`

- **Line:** 89
- **Signature:** `Lead & { notes?: Note[], activity?: Activity[] }`

---

### `TYPE` `SortableLeadKeys`

- **Line:** 90
- **Signature:** `'companyName' | 'status' | 'prospectPlusId' | 'customerStatus' | 'customerSource'`

---

### `FUNCTION` `getProspectPlusId`

- **Line:** 92
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Partial<Lead> & Record<string, any>` | **Yes** | - | - |

---

### `VARIABLE` `pid`

- **Line:** 93

---

### `VARIABLE` `entityId`

- **Line:** 97

---

### `VARIABLE` `internalId`

- **Line:** 101

---

### `FUNCTION` `hasLeadContact`

- **Line:** 108
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Partial<Lead> & Record<string, any>` | **Yes** | - | - |

---

### `VARIABLE` `hasName`

- **Line:** 112

---

### `VARIABLE` `hasEmail`

- **Line:** 113

---

### `VARIABLE` `hasPhone`

- **Line:** 114

---

### `TYPE` `ExpandedLeadDetails`

- **Line:** 118
- **Signature:** `{
    note: Note | null;
    activity: Activity | null;
    loading: boolean;
}`

---

### `FUNCTION` `MergeLeadsDialog`

- **Line:** 126
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ masterLead, similarLeads, isOpen, onOpenChange, onMerged }` | `{ masterLead: Lead | null, similarLeads: Lead[], isOpen: boolean, onOpenChange: (open: boolean) => void, onMerged: () => void }` | **Yes** | - | - |

---

### `VARIABLE` `filteredSimilarLeads`

- **Line:** 131

---

### `FUNCTION` `toggleLeadSelection`

- **Line:** 144

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `toggleSelectAll`

- **Line:** 150

---

### `FUNCTION` `handleMerge`

- **Line:** 158
- **Async:** Yes

---

### `VARIABLE` `evalRes`

- **Line:** 204

---

### `VARIABLE` `confidence`

- **Line:** 205

---

### `VARIABLE` `reasons`

- **Line:** 206

---

### `VARIABLE` `isChecked`

- **Line:** 207

---

### `INTERFACE` `AddToMarketingListDialogProps`

- **Line:** 286

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `onLeadsAdded` | `() => void` | No | - |
| `existingLists` | `string[]` | No | - |

---

### `FUNCTION` `CreatableListCombobox`

- **Line:** 294
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
    options,
    value,
    onChange,
    placeholder
}` | `{
    options: string[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}` | **Yes** | - | - |

---

### `VARIABLE` `exactMatch`

- **Line:** 308

---

### `FUNCTION` `AddToMarketingListDialog`

- **Line:** 388
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ leads, isOpen, onOpenChange, onLeadsAdded, existingLists }` | `AddToMarketingListDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `handleSave`

- **Line:** 395
- **Async:** Yes

---

### `VARIABLE` `author`

- **Line:** 406

---

### `VARIABLE` `isAccountManager`

- **Line:** 407

---

### `VARIABLE` `leadStatuses`

- **Line:** 467
- **Signature:** `LeadStatus[]`

---

### `INTERFACE` `LeadsClientPageProps`

- **Line:** 470

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | Yes | - |
| `initialBucket` | `string` | Yes | - |

---

### `FUNCTION` `LeadsClientPage`

- **Line:** 475
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ 
  title = "Outbound Leads", 
  initialBucket = "outbound" 
}` | `LeadsClientPageProps` | **Yes** | - | - |

---

### `VARIABLE` `router`

- **Line:** 479

---

### `VARIABLE` `searchParams`

- **Line:** 480

---

### `VARIABLE` `isFranchisee`

- **Line:** 484

---

### `VARIABLE` `activeUserRoleUserNames`

- **Line:** 489

---

### `VARIABLE` `set`

- **Line:** 490

---

### `VARIABLE` `role`

- **Line:** 494

---

### `VARIABLE` `assignedRoles`

- **Line:** 495

---

### `VARIABLE` `isUserRole`

- **Line:** 496

---

### `VARIABLE` `fullName`

- **Line:** 499

---

### `VARIABLE` `reassignUserList`

- **Line:** 507

---

### `VARIABLE` `role`

- **Line:** 511

---

### `VARIABLE` `assignedRoles`

- **Line:** 512

---

### `VARIABLE` `getCallCount`

- **Line:** 560

---

### `VARIABLE` `callActs`

- **Line:** 562

---

### `FUNCTION` `resolveAmDetails`

- **Line:** 572
- **Async:** Yes

---

### `VARIABLE` `firstLeadId`

- **Line:** 573

---

### `VARIABLE` `lead`

- **Line:** 579

---

### `VARIABLE` `amAssigned`

- **Line:** 580

---

### `VARIABLE` `usersRef`

- **Line:** 587

---

### `VARIABLE` `matchedData`

- **Line:** 588
- **Signature:** `any`

---

### `VARIABLE` `docRef`

- **Line:** 591

---

### `VARIABLE` `docSnap`

- **Line:** 592

---

### `VARIABLE` `qDisplayName`

- **Line:** 597

---

### `VARIABLE` `snapDisplayName`

- **Line:** 598

---

### `VARIABLE` `qAll`

- **Line:** 603

---

### `VARIABLE` `snapAll`

- **Line:** 604

---

### `VARIABLE` `name`

- **Line:** 605

---

### `VARIABLE` `found`

- **Line:** 606

---

### `VARIABLE` `data`

- **Line:** 607

---

### `VARIABLE` `fullName`

- **Line:** 608

---

### `VARIABLE` `dispName`

- **Line:** 609

---

### `VARIABLE` `emailName`

- **Line:** 610

---

### `FUNCTION` `handleVerifyBulkRecipients`

- **Line:** 636
- **Async:** Yes

---

### `VARIABLE` `targetEmails`

- **Line:** 637
- **Signature:** `string[]`

---

### `VARIABLE` `lead`

- **Line:** 639

---

### `VARIABLE` `email`

- **Line:** 641

---

### `VARIABLE` `results`

- **Line:** 655

---

### `VARIABLE` `resultMap`

- **Line:** 656
- **Signature:** `Record<string, EmailVerificationResult>`

---

### `VARIABLE` `cachedCount`

- **Line:** 662

---

### `VARIABLE` `apiCount`

- **Line:** 663

---

### `VARIABLE` `bulkEmailPreviewBody`

- **Line:** 675

---

### `VARIABLE` `selectedTemplate`

- **Line:** 677

---

### `VARIABLE` `rawBody`

- **Line:** 678

---

### `VARIABLE` `lead`

- **Line:** 679

---

### `VARIABLE` `parsedBody`

- **Line:** 680

---

### `VARIABLE` `leadData`

- **Line:** 682

---

### `VARIABLE` `primaryContact`

- **Line:** 683

---

### `VARIABLE` `contactName`

- **Line:** 684

---

### `VARIABLE` `contactFirstName`

- **Line:** 685

---

### `VARIABLE` `localMilePlusAuthLink`

- **Line:** 686

---

### `VARIABLE` `localMileLink`

- **Line:** 688

---

### `VARIABLE` `localMileActivationLink`

- **Line:** 689

---

### `VARIABLE` `localMileSecurityCode`

- **Line:** 690

---

### `VARIABLE` `sofPublicLink`

- **Line:** 691

---

### `VARIABLE` `amName`

- **Line:** 692

---

### `VARIABLE` `LEADS_PER_PAGE`

- **Line:** 724

---

### `VARIABLE` `unsubscribe`

- **Line:** 747
- **Signature:** `(() => void) | undefined`

---

### `VARIABLE` `hasMeasuredTime`

- **Line:** 753

---

### `VARIABLE` `timerLabel`

- **Line:** 754

---

### `VARIABLE` `startTimePerf`

- **Line:** 756

---

### `VARIABLE` `isDialerOnly`

- **Line:** 758

---

### `VARIABLE` `dialerName`

- **Line:** 759

---

### `FUNCTION` `fetchTemplatesAndCampaigns`

- **Line:** 788
- **Async:** Yes

---

### `VARIABLE` `groupedTemplates`

- **Line:** 803

---

### `VARIABLE` `groups`

- **Line:** 804
- **Signature:** `{ campaignId: string; campaignName: string; templates: any[] }[]`

---

### `VARIABLE` `campName`

- **Line:** 807

---

### `VARIABLE` `campTemplates`

- **Line:** 812

---

### `VARIABLE` `linkedTemplateIds`

- **Line:** 822

---

### `VARIABLE` `unlinkedTemplates`

- **Line:** 826

---

### `FUNCTION` `handleSendBulkEmail`

- **Line:** 838
- **Async:** Yes

---

### `VARIABLE` `finalSenderEmail`

- **Line:** 848
- **Signature:** `string | undefined`

---

### `VARIABLE` `emailRegex`

- **Line:** 865

---

### `VARIABLE` `response`

- **Line:** 879

---

### `VARIABLE` `result`

- **Line:** 889

---

### `FUNCTION` `fetchData`

- **Line:** 919
- **Async:** Yes

---

### `VARIABLE` `fetchedUsers`

- **Line:** 921

---

### `VARIABLE` `dialers`

- **Line:** 922

---

### `VARIABLE` `roles`

- **Line:** 924

---

### `VARIABLE` `isDialer`

- **Line:** 925

---

### `VARIABLE` `isAM`

- **Line:** 926

---

### `FUNCTION` `handleRefresh`

- **Line:** 937

---

### `FUNCTION` `requestSort`

- **Line:** 942

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableLeadKeys` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 943
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 950

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableLeadKeys` | **Yes** | - | - |

---

### `FUNCTION` `handleFilterChange`

- **Line:** 958

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `string | string[] | DateRange | undefined` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 963

---

### `VARIABLE` `filteredLeads`

- **Line:** 981

---

### `VARIABLE` `leads`

- **Line:** 982

---

### `VARIABLE` `isAccountManager`

- **Line:** 983

---

### `VARIABLE` `loggedInAmName`

- **Line:** 984

---

### `VARIABLE` `assignedRep`

- **Line:** 990

---

### `VARIABLE` `companyNameMatch`

- **Line:** 996

---

### `VARIABLE` `prospectPlusIdMatch`

- **Line:** 997

---

### `VARIABLE` `statusMatch`

- **Line:** 998

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 999

---

### `VARIABLE` `suburbMatch`

- **Line:** 1000

---

### `VARIABLE` `isArchived`

- **Line:** 1001

---

### `VARIABLE` `bucketMatch`

- **Line:** 1005

---

### `VARIABLE` `isFieldSalesLead`

- **Line:** 1012

---

### `VARIABLE` `campaignMatch`

- **Line:** 1014

---

### `VARIABLE` `leadCampaign`

- **Line:** 1016

---

### `VARIABLE` `filterCampaign`

- **Line:** 1017

---

### `VARIABLE` `parsedDate`

- **Line:** 1025

---

### `VARIABLE` `dateLeadEnteredMatch`

- **Line:** 1026

---

### `VARIABLE` `parsedDialerDate`

- **Line:** 1027

---

### `VARIABLE` `dateDialerAssignedMatch`

- **Line:** 1028

---

### `VARIABLE` `sourceMatch`

- **Line:** 1029

---

### `VARIABLE` `entityIdMatch`

- **Line:** 1030

---

### `VARIABLE` `customerStatusMatch`

- **Line:** 1031

---

### `VARIABLE` `aValue`

- **Line:** 1038
- **Signature:** `any`

---

### `VARIABLE` `bValue`

- **Line:** 1039
- **Signature:** `any`

---

### `VARIABLE` `myLeads`

- **Line:** 1062

---

### `VARIABLE` `isInbound`

- **Line:** 1064

---

### `VARIABLE` `assignedToMe`

- **Line:** 1066

---

### `VARIABLE` `groupedMyLeads`

- **Line:** 1075

---

### `VARIABLE` `status`

- **Line:** 1077

---

### `VARIABLE` `groupedAssignedLeads`

- **Line:** 1086

---

### `VARIABLE` `isInbound`

- **Line:** 1087

---

### `VARIABLE` `assignedLeads`

- **Line:** 1088

---

### `VARIABLE` `assignee`

- **Line:** 1093

---

### `VARIABLE` `status`

- **Line:** 1094

---

### `VARIABLE` `unassignedLeads`

- **Line:** 1109

---

### `VARIABLE` `isInbound`

- **Line:** 1110

---

### `VARIABLE` `groupedUnassignedLeads`

- **Line:** 1116

---

### `VARIABLE` `status`

- **Line:** 1118

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 1127

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 1131

---

### `FUNCTION` `getContactFirstAndLastName`

- **Line:** 1138

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `Partial<Contact>` | No | - | - |

---

### `VARIABLE` `lastName`

- **Line:** 1141

---

### `VARIABLE` `parts`

- **Line:** 1145

---

### `VARIABLE` `firstName`

- **Line:** 1146

---

### `VARIABLE` `lastName`

- **Line:** 1147

---

### `FUNCTION` `generateLeadsRows`

- **Line:** 1153

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | **Yes** | - | - |

---

### `VARIABLE` `rows`

- **Line:** 1154
- **Signature:** `string[][]`

---

### `VARIABLE` `contacts`

- **Line:** 1156

---

### `VARIABLE` `c1`

- **Line:** 1157

---

### `VARIABLE` `c2`

- **Line:** 1158

---

### `VARIABLE` `c3`

- **Line:** 1159

---

### `VARIABLE` `addrs`

- **Line:** 1161

---

### `VARIABLE` `a2`

- **Line:** 1162

---

### `VARIABLE` `a3`

- **Line:** 1163

---

### `VARIABLE` `row`

- **Line:** 1165

---

### `FUNCTION` `downloadCsv`

- **Line:** 1243

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `headers` | `string[]` | **Yes** | - | - |
| `rows` | `string[][]` | **Yes** | - | - |
| `filename` | `string` | **Yes** | - | - |

---

### `VARIABLE` `csvContent`

- **Line:** 1244

---

### `VARIABLE` `blob`

- **Line:** 1245

---

### `VARIABLE` `link`

- **Line:** 1246

---

### `VARIABLE` `url`

- **Line:** 1247

---

### `VARIABLE` `leadExportHeaders`

- **Line:** 1256

---

### `FUNCTION` `handleExportAll`

- **Line:** 1268
- **Async:** Yes

---

### `VARIABLE` `allLeadsData`

- **Line:** 1271

---

### `VARIABLE` `rows`

- **Line:** 1276

---

### `FUNCTION` `handleExportSelected`

- **Line:** 1287
- **Async:** Yes

---

### `VARIABLE` `selectedLeadsData`

- **Line:** 1292

---

### `VARIABLE` `rows`

- **Line:** 1297

---

### `FUNCTION` `handleExportMyLeads`

- **Line:** 1308
- **Async:** Yes

---

### `VARIABLE` `leadIds`

- **Line:** 1311

---

### `VARIABLE` `fullLeadsData`

- **Line:** 1312

---

### `VARIABLE` `rows`

- **Line:** 1317

---

### `FUNCTION` `handleExportAllAssigned`

- **Line:** 1328
- **Async:** Yes

---

### `VARIABLE` `assignedLeads`

- **Line:** 1329

---

### `VARIABLE` `leadIds`

- **Line:** 1334

---

### `VARIABLE` `fullLeadsData`

- **Line:** 1335

---

### `VARIABLE` `rows`

- **Line:** 1340

---

### `FUNCTION` `handleStartDialing`

- **Line:** 1351
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leads` | `LeadWithDetails[]` | **Yes** | - | - |
| `startingFromLeadId` | `string` | No | - | - |

---

### `VARIABLE` `sortedLeadIds`

- **Line:** 1356

---

### `VARIABLE` `startIndex`

- **Line:** 1359

---

### `VARIABLE` `currentUrl`

- **Line:** 1368

---

### `FUNCTION` `handleEndSession`

- **Line:** 1374
- **Async:** Yes

---

### `FUNCTION` `handleBulkUnassign`

- **Line:** 1379
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `idsToUnassign` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `isInbound`

- **Line:** 1386

---

### `VARIABLE` `updateData`

- **Line:** 1387

---

### `VARIABLE` `updatedLeads`

- **Line:** 1390

---

### `FUNCTION` `handleBulkAssign`

- **Line:** 1402
- **Async:** Yes

---

### `VARIABLE` `isInbound`

- **Line:** 1405

---

### `VARIABLE` `updateData`

- **Line:** 1406

---

### `VARIABLE` `updatedLeads`

- **Line:** 1409

---

### `FUNCTION` `handleBulkReassign`

- **Line:** 1421
- **Async:** Yes

---

### `VARIABLE` `targetIdsToReassign`

- **Line:** 1423

---

### `VARIABLE` `totalPreselected`

- **Line:** 1425

---

### `VARIABLE` `parsedCount`

- **Line:** 1426

---

### `VARIABLE` `effectiveCount`

- **Line:** 1427

---

### `VARIABLE` `isInbound`

- **Line:** 1440

---

### `VARIABLE` `assignedLeadsMap`

- **Line:** 1443

---

### `VARIABLE` `userToAssign`

- **Line:** 1445

---

### `VARIABLE` `updatedLeads`

- **Line:** 1449

---

### `VARIABLE` `assignee`

- **Line:** 1451

---

### `FUNCTION` `handleSelectLead`

- **Line:** 1477

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `checked` | `boolean | 'indeterminate'` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAllInGroup`

- **Line:** 1485

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadsInGroup` | `LeadWithDetails[]` | **Yes** | - | - |

---

### `VARIABLE` `leadIdsInGroup`

- **Line:** 1486

---

### `VARIABLE` `isChecked`

- **Line:** 1487

---

### `VARIABLE` `newSelectedLeads`

- **Line:** 1489

---

### `FUNCTION` `handleUnassign`

- **Line:** 1498
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isInbound`

- **Line:** 1504

---

### `VARIABLE` `updatedLeads`

- **Line:** 1506

---

### `FUNCTION` `handleAssign`

- **Line:** 1520
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isInbound`

- **Line:** 1523

---

### `VARIABLE` `updatedLeads`

- **Line:** 1525

---

### `FUNCTION` `executeCall`

- **Line:** 1542

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleInitiateCall`

- **Line:** 1557

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `targetLead`

- **Line:** 1559

---

### `VARIABLE` `opener`

- **Line:** 1561

---

### `VARIABLE` `personalisation`

- **Line:** 1562

---

### `VARIABLE` `apRel`

- **Line:** 1563

---

### `VARIABLE` `hasInsights`

- **Line:** 1565

---

### `FUNCTION` `handleReassignUserSelect`

- **Line:** 1586

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |
| `userId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handlePageChange`

- **Line:** 1592

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `groupKey` | `string` | **Yes** | - | - |
| `newPage` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleMyLeadsPageChange`

- **Line:** 1596

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |
| `newPage` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleJumpToPage`

- **Line:** 1600

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent<HTMLFormElement>` | **Yes** | - | - |
| `groupKey` | `string` | **Yes** | - | - |
| `totalPages` | `number` | **Yes** | - | - |
| `setPageFn` | `(key: string, page: number) => void` | **Yes** | - | - |

---

### `VARIABLE` `formData`

- **Line:** 1602

---

### `VARIABLE` `page`

- **Line:** 1603

---

### `FUNCTION` `toggleLeadDetails`

- **Line:** 1609
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `newState`

- **Line:** 1612

---

### `FUNCTION` `confirmDelete`

- **Line:** 1643

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ids` | `string[]` | **Yes** | - | - |

---

### `FUNCTION` `handleDelete`

- **Line:** 1649
- **Async:** Yes

---

### `FUNCTION` `openMoveLeadsDialog`

- **Line:** 1667

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetBucket` | `'field' | 'outbound'` | **Yes** | - | - |

---

### `VARIABLE` `leads`

- **Line:** 1672

---

### `FUNCTION` `openMoveToNurtureDialog`

- **Line:** 1677

---

### `VARIABLE` `leads`

- **Line:** 1682

---

### `FUNCTION` `openMarketingListDialog`

- **Line:** 1687

---

### `FUNCTION` `openAllocateBucketDialog`

- **Line:** 1695

---

### `VARIABLE` `leads`

- **Line:** 1700

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 1705

---

### `VARIABLE` `leadStatusOptions`

- **Line:** 1707
- **Signature:** `Option[]`

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 1709
- **Signature:** `Option[]`

---

### `VARIABLE` `franchisees`

- **Line:** 1710

---

### `VARIABLE` `uniqueSources`

- **Line:** 1714
- **Signature:** `Option[]`

---

### `VARIABLE` `sources`

- **Line:** 1715

---

### `VARIABLE` `uniqueCampaigns`

- **Line:** 1719
- **Signature:** `Option[]`

---

### `VARIABLE` `campaigns`

- **Line:** 1720

---

### `VARIABLE` `campaign`

- **Line:** 1721

---

### `VARIABLE` `uniqueMarketingLists`

- **Line:** 1731
- **Signature:** `string[]`

---

### `VARIABLE` `lists`

- **Line:** 1732

---

### `VARIABLE` `uniqueCustomerStatuses`

- **Line:** 1739
- **Signature:** `Option[]`

---

### `VARIABLE` `statuses`

- **Line:** 1740

---

### `VARIABLE` `dialerOptions`

- **Line:** 1744
- **Signature:** `Option[]`

---

### `VARIABLE` `uniqueNames`

- **Line:** 1745

---

### `VARIABLE` `isAdminView`

- **Line:** 1749

---

### `VARIABLE` `email`

- **Line:** 1927

---

### `VARIABLE` `vResult`

- **Line:** 1928

---

### `VARIABLE` `sortedLeads`

- **Line:** 2212

---

### `VARIABLE` `currentPage`

- **Line:** 2213

---

### `VARIABLE` `totalPages`

- **Line:** 2214

---

### `VARIABLE` `paginatedLeads`

- **Line:** 2215

---

### `VARIABLE` `isAllInGroupSelected`

- **Line:** 2216

---

### `VARIABLE` `matches`

- **Line:** 2306

---

### `VARIABLE` `sortedLeads`

- **Line:** 2518

---

### `VARIABLE` `groupKey`

- **Line:** 2519

---

### `VARIABLE` `currentPage`

- **Line:** 2520

---

### `VARIABLE` `totalPages`

- **Line:** 2521

---

### `VARIABLE` `paginatedLeads`

- **Line:** 2522

---

### `VARIABLE` `areAllInGroupSelected`

- **Line:** 2523

---

### `VARIABLE` `sortedLeads`

- **Line:** 2765

---

### `VARIABLE` `groupKey`

- **Line:** 2766

---

### `VARIABLE` `currentPage`

- **Line:** 2767

---

### `VARIABLE` `totalPages`

- **Line:** 2768

---

### `VARIABLE` `paginatedLeads`

- **Line:** 2769

---

### `VARIABLE` `isAllInGroupSelected`

- **Line:** 2770

---

