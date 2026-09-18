# Module: `src/components/customer-success/pipeline-dashboard.tsx`

- **Language:** TypeScript
- **Total Lines:** 1891
- **Direct Dependencies:** 27 modules imported

## Exported Symbols & API

### `INTERFACE` `LeadOriginInfo`

- **Line:** 34

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | No | - |
| `type` | `'outbound' | 'inbound' | 'field_sales' | 'account_manager' | 'multisite' | 'franchisee' | 'marketing' | 'customer_success' | 'other'` | No | - |
| `badgeClass` | `string` | No | - |

---

### `FUNCTION` `getLeadOrigin`

- **Line:** 40
- **Returns:** `LeadOriginInfo`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `sortedHistory`

- **Line:** 47

---

### `VARIABLE` `dateA`

- **Line:** 48

---

### `VARIABLE` `dateB`

- **Line:** 49

---

### `VARIABLE` `oldB`

- **Line:** 54

---

### `VARIABLE` `custSourceLower`

- **Line:** 82

---

### `VARIABLE` `leadSourceLower`

- **Line:** 83

---

### `VARIABLE` `campaignLower`

- **Line:** 84

---

### `VARIABLE` `isInbound`

- **Line:** 87

---

### `VARIABLE` `isOutbound`

- **Line:** 94

---

### `VARIABLE` `isFranchisee`

- **Line:** 101

---

### `FUNCTION` `getLeadSystemEnteredDate`

- **Line:** 148
- **Returns:** `string | undefined`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `getLeadCsBucketDate`

- **Line:** 159
- **Returns:** `string | undefined`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `explicitDate`

- **Line:** 163

---

### `VARIABLE` `csHistoryEntries`

- **Line:** 172

---

### `VARIABLE` `sorted`

- **Line:** 176

---

### `VARIABLE` `dA`

- **Line:** 177

---

### `VARIABLE` `dB`

- **Line:** 178

---

### `FUNCTION` `getPrimaryContact`

- **Line:** 200
- **Returns:** `Contact | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `getLeadContactName`

- **Line:** 207
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `primary`

- **Line:** 209

---

### `VARIABLE` `full`

- **Line:** 214

---

### `VARIABLE` `legacyName`

- **Line:** 217

---

### `VARIABLE` `inbound`

- **Line:** 227

---

### `FUNCTION` `CustomerSuccessDashboard`

- **Line:** 237
- **Returns:** `void`

---

### `FUNCTION` `handleAssignCs`

- **Line:** 300
- **Async:** Yes

---

### `VARIABLE` `csValue`

- **Line:** 304

---

### `FUNCTION` `handleSaveCallOutcome`

- **Line:** 330
- **Async:** Yes

---

### `VARIABLE` `nowStr`

- **Line:** 341

---

### `VARIABLE` `newCallCount`

- **Line:** 342

---

### `VARIABLE` `match`

- **Line:** 346

---

### `VARIABLE` `mappingUpdate`

- **Line:** 347

---

### `FUNCTION` `handleSaveLost`

- **Line:** 388
- **Async:** Yes

---

### `VARIABLE` `nowStr`

- **Line:** 398

---

### `VARIABLE` `selectedThemeObj`

- **Line:** 400

---

### `VARIABLE` `selectedWhyObj`

- **Line:** 401

---

### `VARIABLE` `selectedReasonObj`

- **Line:** 402

---

### `VARIABLE` `isUserRole`

- **Line:** 437

---

### `VARIABLE` `phone`

- **Line:** 443

---

### `VARIABLE` `name`

- **Line:** 444

---

### `VARIABLE` `isAdmin`

- **Line:** 461

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 462

---

### `VARIABLE` `isCs`

- **Line:** 463

---

### `VARIABLE` `canAssignCs`

- **Line:** 464

---

### `FUNCTION` `getCsName`

- **Line:** 466

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `am` | `UserProfile` | **Yes** | - | - |

---

### `VARIABLE` `loggedInCsName`

- **Line:** 470

---

### `FUNCTION` `fetchHierarchy`

- **Line:** 474
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 476

---

### `FUNCTION` `fetchAMs`

- **Line:** 487
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `usersRef`

- **Line:** 490

---

### `VARIABLE` `q`

- **Line:** 491

---

### `VARIABLE` `snap`

- **Line:** 492

---

### `VARIABLE` `ams`

- **Line:** 493

---

### `FUNCTION` `fetchJourneys`

- **Line:** 504
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 506

---

### `FUNCTION` `fetchAllJourneyStates`

- **Line:** 518
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `statesMap`

- **Line:** 520
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `snap`

- **Line:** 521

---

### `VARIABLE` `parentId`

- **Line:** 523

---

### `FUNCTION` `fetchPipeline`

- **Line:** 551
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `leadsRef`

- **Line:** 554

---

### `VARIABLE` `q`

- **Line:** 555

---

### `VARIABLE` `snap`

- **Line:** 573

---

### `VARIABLE` `fetchedLeads`

- **Line:** 574

---

### `VARIABLE` `filteredLeads`

- **Line:** 577

---

### `VARIABLE` `leadsWithDetails`

- **Line:** 583

---

### `VARIABLE` `updated`

- **Line:** 585

---

### `VARIABLE` `cSnap`

- **Line:** 590

---

### `VARIABLE` `bhSnap`

- **Line:** 605

---

### `VARIABLE` `historyList`

- **Line:** 607

---

### `VARIABLE` `filteredLeads`

- **Line:** 632

---

### `VARIABLE` `amNames`

- **Line:** 633

---

### `VARIABLE` `statusClean`

- **Line:** 638

---

### `VARIABLE` `customerStatusClean`

- **Line:** 639

---

### `VARIABLE` `currentStatusClean`

- **Line:** 640

---

### `VARIABLE` `lostStatuses`

- **Line:** 642

---

### `VARIABLE` `signedStatuses`

- **Line:** 643

---

### `VARIABLE` `isLost`

- **Line:** 645

---

### `VARIABLE` `isSigned`

- **Line:** 649

---

### `VARIABLE` `currentStatus`

- **Line:** 655

---

### `VARIABLE` `qLower`

- **Line:** 672

---

### `VARIABLE` `companyMatch`

- **Line:** 673

---

### `VARIABLE` `idMatch`

- **Line:** 674

---

### `VARIABLE` `contactMatch`

- **Line:** 675

---

### `VARIABLE` `phoneMatch`

- **Line:** 676

---

### `VARIABLE` `emailMatch`

- **Line:** 677

---

### `VARIABLE` `origin`

- **Line:** 683

---

### `VARIABLE` `priorityLeads`

- **Line:** 695

---

### `VARIABLE` `today`

- **Line:** 696

---

### `VARIABLE` `currentStatus`

- **Line:** 698

---

### `VARIABLE` `isPriorityStatus`

- **Line:** 701

---

### `VARIABLE` `hasAppointmentToday`

- **Line:** 703

---

### `VARIABLE` `hasTaskToday`

- **Line:** 708

---

### `VARIABLE` `quotesOut`

- **Line:** 717

---

### `VARIABLE` `currentStatus`

- **Line:** 720

---

### `VARIABLE` `quotesAccepted`

- **Line:** 725

---

### `VARIABLE` `currentStatus`

- **Line:** 728

---

### `VARIABLE` `productPending`

- **Line:** 733

---

### `VARIABLE` `currentStatus`

- **Line:** 736

---

### `VARIABLE` `localMilePending`

- **Line:** 741

---

### `VARIABLE` `currentStatus`

- **Line:** 744

---

### `VARIABLE` `wipLeads`

- **Line:** 749

---

### `VARIABLE` `wipStatuses`

- **Line:** 750

---

### `VARIABLE` `currentStatus`

- **Line:** 753

---

### `FUNCTION` `handleCall`

- **Line:** 758
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `phone` | `string` | **Yes** | - | - |

---

### `FUNCTION` `openLead`

- **Line:** 767

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `name`

- **Line:** 799

---

### `VARIABLE` `name`

- **Line:** 1238

---

### `VARIABLE` `STATUS_MAP`

- **Line:** 1263
- **Signature:** `Record<string, string>`

---

### `INTERFACE` `GroupedLeads`

- **Line:** 1289

---

### `VARIABLE` `STATUS_ORDER`

- **Line:** 1293
- **Signature:** `{ [status: string]: number }`

---

### `FUNCTION` `getStatusOrder`

- **Line:** 1309

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `FUNCTION` `LeadGrid`

- **Line:** 1313
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ 
    leads, 
    viewMode, 
    sortBy, 
    onCall, 
    onClick, 
    onEmail, 
    onNotes,
    journeys = [],
    journeyStates = {},
    onMarkCalled,
    onMarkLost,
    canAssignCs,
    onAssign
}` | `{ 
    leads: Lead[], 
    viewMode: 'board' | 'accordion' | 'grid' | 'table', 
    sortBy: 'franchisee' | 'companyName' | 'dateLeadEntered' | 'dateCsEntered', 
    onCall: (id: string, phone: string) => void, 
    onClick: (id: string) => void, 
    onEmail: (lead: Lead) => void, 
    onNotes: (lead: Lead) => void,
    journeys?: any[],
    journeyStates?: Record<string, any[]>,
    onMarkCalled: (lead: Lead) => void,
    onMarkLost: (lead: Lead) => void,
    canAssignCs?: boolean,
    onAssign?: (lead: Lead) => void
}` | **Yes** | - | - |

---

### `VARIABLE` `sortedLeads`

- **Line:** 1347

---

### `VARIABLE` `valA`

- **Line:** 1350

---

### `VARIABLE` `valB`

- **Line:** 1351

---

### `VARIABLE` `cmp`

- **Line:** 1355

---

### `VARIABLE` `dateA`

- **Line:** 1360

---

### `VARIABLE` `dateB`

- **Line:** 1361

---

### `VARIABLE` `dateA`

- **Line:** 1364

---

### `VARIABLE` `dateB`

- **Line:** 1365

---

### `VARIABLE` `groupedLeads`

- **Line:** 1373

---

### `VARIABLE` `groups`

- **Line:** 1375
- **Signature:** `GroupedLeads`

---

### `VARIABLE` `status`

- **Line:** 1377

---

### `VARIABLE` `sortedStatuses`

- **Line:** 1387

---

### `VARIABLE` `primaryContact`

- **Line:** 1414

---

### `VARIABLE` `contactName`

- **Line:** 1415

---

### `VARIABLE` `phone`

- **Line:** 1416

---

### `VARIABLE` `email`

- **Line:** 1417

---

### `VARIABLE` `address`

- **Line:** 1418

---

### `VARIABLE` `activeJStates`

- **Line:** 1427

---

### `VARIABLE` `activeJourneyStages`

- **Line:** 1428

---

### `VARIABLE` `jDef`

- **Line:** 1431

---

### `VARIABLE` `jName`

- **Line:** 1432

---

### `VARIABLE` `currentNode`

- **Line:** 1434

---

### `VARIABLE` `nodeName`

- **Line:** 1435

---

### `VARIABLE` `lastActionHistory`

- **Line:** 1442

---

### `VARIABLE` `lastSent`

- **Line:** 1443

---

### `VARIABLE` `actionNode`

- **Line:** 1445

---

### `VARIABLE` `actionType`

- **Line:** 1446

---

### `VARIABLE` `actionLabel`

- **Line:** 1447

---

### `VARIABLE` `isCalled`

- **Line:** 1458

---

### `VARIABLE` `origin`

- **Line:** 1459

---

### `VARIABLE` `systemDateVal`

- **Line:** 1461

---

### `VARIABLE` `csDateVal`

- **Line:** 1462

---

### `VARIABLE` `systemDateStr`

- **Line:** 1463

---

### `VARIABLE` `csDateStr`

- **Line:** 1464

---

### `VARIABLE` `currentStatus`

- **Line:** 1466

---

### `VARIABLE` `rowBgClass`

- **Line:** 1467

---

### `FUNCTION` `LeadCard`

- **Line:** 1696
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, onCall, onClick, onEmail, onNotes, journeys = [], journeyStates = {} }` | `{ lead: Lead, onCall: (id: string, phone: string) => void, onClick: () => void, onEmail: () => void, onNotes: () => void, journeys?: any[], journeyStates?: Record<string, any[]> }` | **Yes** | - | - |

---

### `VARIABLE` `primaryContact`

- **Line:** 1697

---

### `VARIABLE` `contactName`

- **Line:** 1698

---

### `VARIABLE` `origin`

- **Line:** 1699

---

### `VARIABLE` `systemDateVal`

- **Line:** 1701

---

### `VARIABLE` `csDateVal`

- **Line:** 1702

---

### `VARIABLE` `systemDateStr`

- **Line:** 1703

---

### `VARIABLE` `csDateStr`

- **Line:** 1704

---

### `VARIABLE` `phoneNumbers`

- **Line:** 1707
- **Signature:** `{ label: string; phone: string }[]`

---

### `VARIABLE` `uniquePhones`

- **Line:** 1718

---

### `VARIABLE` `email`

- **Line:** 1720

---

### `VARIABLE` `currentStatus`

- **Line:** 1721

---

### `VARIABLE` `fullAddress`

- **Line:** 1722

---

### `VARIABLE` `activeJStates`

- **Line:** 1731

---

### `VARIABLE` `activeJourneyStages`

- **Line:** 1732

---

### `VARIABLE` `jDef`

- **Line:** 1735

---

### `VARIABLE` `jName`

- **Line:** 1736

---

### `VARIABLE` `currentNode`

- **Line:** 1738

---

### `VARIABLE` `nodeName`

- **Line:** 1739

---

