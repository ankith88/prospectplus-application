# Module: `src/components/account-manager/pipeline-dashboard.tsx`

- **Language:** TypeScript
- **Total Lines:** 2412
- **Direct Dependencies:** 28 modules imported

## Exported Symbols & API

### `FUNCTION` `parseApptDate`

- **Line:** 35
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `app` | `any` | **Yes** | - | - |

---

### `VARIABLE` `raw`

- **Line:** 36

---

### `VARIABLE` `parsed`

- **Line:** 42

---

### `FUNCTION` `parseTaskDate`

- **Line:** 49
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `task` | `any` | **Yes** | - | - |

---

### `VARIABLE` `raw`

- **Line:** 50

---

### `VARIABLE` `parsed`

- **Line:** 56

---

### `FUNCTION` `isFranchiseeGeneratedLead`

- **Line:** 63
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `getLeadDaysUntouched`

- **Line:** 76
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 78

---

### `VARIABLE` `dates`

- **Line:** 79
- **Signature:** `Date[]`

---

### `VARIABLE` `datesToCheck`

- **Line:** 81

---

### `VARIABLE` `parsed`

- **Line:** 92

---

### `VARIABLE` `latestTouch`

- **Line:** 99

---

### `VARIABLE` `diffHours`

- **Line:** 100

---

### `FUNCTION` `getPrimaryContact`

- **Line:** 104
- **Returns:** `Contact | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `FUNCTION` `getLeadContactName`

- **Line:** 111
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `primary`

- **Line:** 113

---

### `VARIABLE` `full`

- **Line:** 118

---

### `VARIABLE` `legacyName`

- **Line:** 121

---

### `VARIABLE` `inbound`

- **Line:** 131

---

### `FUNCTION` `PipelineDashboard`

- **Line:** 141
- **Returns:** `void`

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 143

---

### `VARIABLE` `isAdmin`

- **Line:** 184

---

### `VARIABLE` `isAm`

- **Line:** 185

---

### `FUNCTION` `getAmName`

- **Line:** 187

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `am` | `UserProfile` | **Yes** | - | - |

---

### `VARIABLE` `loggedInAmName`

- **Line:** 191

---

### `FUNCTION` `fetchAMs`

- **Line:** 202
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `usersRef`

- **Line:** 205

---

### `VARIABLE` `q`

- **Line:** 206

---

### `VARIABLE` `snap`

- **Line:** 207

---

### `VARIABLE` `ams`

- **Line:** 208

---

### `FUNCTION` `fetchPipeline`

- **Line:** 224
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `startTimePerf`

- **Line:** 227

---

### `VARIABLE` `leadsRef`

- **Line:** 229

---

### `VARIABLE` `q`

- **Line:** 230

---

### `VARIABLE` `snap`

- **Line:** 235

---

### `VARIABLE` `rawLeads`

- **Line:** 236

---

### `VARIABLE` `filteredLeads`

- **Line:** 239

---

### `VARIABLE` `leadIds`

- **Line:** 245

---

### `VARIABLE` `signedCompanyIds`

- **Line:** 246

---

### `VARIABLE` `chunks`

- **Line:** 249
- **Signature:** `string[][]`

---

### `VARIABLE` `companyQueries`

- **Line:** 254

---

### `VARIABLE` `companySnaps`

- **Line:** 258

---

### `VARIABLE` `filteredLeadsWithoutCompanies`

- **Line:** 266

---

### `VARIABLE` `appointmentsByLead`

- **Line:** 269
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `tasksByLead`

- **Line:** 270
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `thirtyDaysAgo`

- **Line:** 271

---

### `VARIABLE` `startISO`

- **Line:** 273

---

### `VARIABLE` `apptQuery`

- **Line:** 275

---

### `VARIABLE` `taskQuery`

- **Line:** 279

---

### `VARIABLE` `parentId`

- **Line:** 293

---

### `VARIABLE` `parentId`

- **Line:** 303

---

### `VARIABLE` `fetchedLeads`

- **Line:** 312

---

### `VARIABLE` `updatedLead`

- **Line:** 314

---

### `VARIABLE` `cSnap`

- **Line:** 319

---

### `VARIABLE` `appts`

- **Line:** 331

---

### `VARIABLE` `existingAppts`

- **Line:** 332

---

### `VARIABLE` `combinedAppts`

- **Line:** 333

---

### `VARIABLE` `tsks`

- **Line:** 340

---

### `VARIABLE` `existingTsks`

- **Line:** 341

---

### `VARIABLE` `combinedTsks`

- **Line:** 342

---

### `VARIABLE` `uniqueCampaigns`

- **Line:** 367

---

### `VARIABLE` `campaigns`

- **Line:** 368

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 382

---

### `VARIABLE` `franchisees`

- **Line:** 383

---

### `VARIABLE` `baseAmPipelineLeads`

- **Line:** 393

---

### `VARIABLE` `amNames`

- **Line:** 394

---

### `VARIABLE` `isWebsite`

- **Line:** 398

---

### `VARIABLE` `currentStatus`

- **Line:** 404

---

### `VARIABLE` `filteredLeads`

- **Line:** 423

---

### `VARIABLE` `hasMatchingAppt`

- **Line:** 429

---

### `VARIABLE` `status`

- **Line:** 430

---

### `VARIABLE` `hasMatchingApptDate`

- **Line:** 436

---

### `VARIABLE` `d`

- **Line:** 437

---

### `VARIABLE` `apptDate`

- **Line:** 440

---

### `VARIABLE` `fromDate`

- **Line:** 442

---

### `VARIABLE` `toDate`

- **Line:** 446

---

### `VARIABLE` `parsedDate`

- **Line:** 459

---

### `VARIABLE` `enteredDate`

- **Line:** 463

---

### `VARIABLE` `fromDate`

- **Line:** 465

---

### `VARIABLE` `toDate`

- **Line:** 469

---

### `VARIABLE` `leadVal`

- **Line:** 483

---

### `VARIABLE` `filterNum`

- **Line:** 486

---

### `VARIABLE` `leadNum`

- **Line:** 488

---

### `VARIABLE` `initialOrigin`

- **Line:** 510

---

### `VARIABLE` `originBreakdown`

- **Line:** 524

---

### `VARIABLE` `counts`

- **Line:** 525
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `origin`

- **Line:** 528

---

### `VARIABLE` `totalTransferredCount`

- **Line:** 535

---

### `VARIABLE` `amOriginBreakdown`

- **Line:** 539

---

### `VARIABLE` `result`

- **Line:** 540
- **Signature:** `Record<string, { total: number; origins: Record<string, number> }>`

---

### `VARIABLE` `amName`

- **Line:** 544

---

### `VARIABLE` `origin`

- **Line:** 549

---

### `FUNCTION` `getTransferredCount`

- **Line:** 555

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadList` | `Lead[]` | **Yes** | - | - |

---

### `VARIABLE` `pastPendingAppointmentsLeads`

- **Line:** 561

---

### `VARIABLE` `today`

- **Line:** 562

---

### `VARIABLE` `apptDate`

- **Line:** 565

---

### `VARIABLE` `apptStatus`

- **Line:** 567

---

### `VARIABLE` `todayAppointmentsLeads`

- **Line:** 573

---

### `VARIABLE` `today`

- **Line:** 574

---

### `VARIABLE` `apptDate`

- **Line:** 577

---

### `VARIABLE` `apptStatus`

- **Line:** 579

---

### `VARIABLE` `futureAppointmentsLeads`

- **Line:** 585

---

### `VARIABLE` `today`

- **Line:** 586

---

### `VARIABLE` `apptDate`

- **Line:** 589

---

### `VARIABLE` `apptStatus`

- **Line:** 591

---

### `VARIABLE` `noShowAppointmentsLeads`

- **Line:** 597

---

### `VARIABLE` `apptStatus`

- **Line:** 600

---

### `VARIABLE` `pastPendingTasksLeads`

- **Line:** 606

---

### `VARIABLE` `today`

- **Line:** 607

---

### `VARIABLE` `taskDate`

- **Line:** 611

---

### `VARIABLE` `todayTasksLeads`

- **Line:** 618

---

### `VARIABLE` `today`

- **Line:** 619

---

### `VARIABLE` `taskDate`

- **Line:** 623

---

### `VARIABLE` `futureTasksLeads`

- **Line:** 630

---

### `VARIABLE` `today`

- **Line:** 631

---

### `VARIABLE` `taskDate`

- **Line:** 635

---

### `VARIABLE` `completedTasksLeads`

- **Line:** 642

---

### `VARIABLE` `priorityLeads`

- **Line:** 648

---

### `VARIABLE` `today`

- **Line:** 649

---

### `VARIABLE` `currentStatus`

- **Line:** 651

---

### `VARIABLE` `isPriorityStatus`

- **Line:** 654

---

### `VARIABLE` `hasAppointmentToday`

- **Line:** 656

---

### `VARIABLE` `hasTaskToday`

- **Line:** 661

---

### `VARIABLE` `isLowOnLocalMileTrials`

- **Line:** 666

---

### `VARIABLE` `quotesOut`

- **Line:** 672

---

### `VARIABLE` `currentStatus`

- **Line:** 675

---

### `VARIABLE` `quotesAccepted`

- **Line:** 680

---

### `VARIABLE` `currentStatus`

- **Line:** 683

---

### `VARIABLE` `productPending`

- **Line:** 688

---

### `VARIABLE` `currentStatus`

- **Line:** 691

---

### `VARIABLE` `localMilePending`

- **Line:** 696

---

### `VARIABLE` `currentStatus`

- **Line:** 699

---

### `VARIABLE` `outOfTerritoryLeads`

- **Line:** 704

---

### `VARIABLE` `currentStatus`

- **Line:** 706

---

### `VARIABLE` `newLeads`

- **Line:** 711

---

### `VARIABLE` `currentStatus`

- **Line:** 713

---

### `VARIABLE` `futureFollowUpLeads`

- **Line:** 718

---

### `VARIABLE` `currentStatus`

- **Line:** 720

---

### `VARIABLE` `wipLeads`

- **Line:** 725

---

### `VARIABLE` `wipStatuses`

- **Line:** 726

---

### `VARIABLE` `currentStatus`

- **Line:** 729

---

### `VARIABLE` `staleLeads`

- **Line:** 734

---

### `FUNCTION` `handleCall`

- **Line:** 740
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `phone` | `string` | **Yes** | - | - |

---

### `VARIABLE` `nowStr`

- **Line:** 742

---

### `FUNCTION` `openLead`

- **Line:** 752

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleAmReassign`

- **Line:** 756
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `amName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `finalAmName`

- **Line:** 762

---

### `VARIABLE` `name`

- **Line:** 803

---

### `INTERFACE` `GroupedLeads`

- **Line:** 1457

---

### `VARIABLE` `STATUS_ORDER`

- **Line:** 1461
- **Signature:** `{ [status: string]: number }`

---

### `FUNCTION` `getStatusOrder`

- **Line:** 1478

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `FUNCTION` `LeadGrid`

- **Line:** 1482
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
    onAmReassign,
    accountManagers,
    canReassign,
    canUnassign,
    appointmentColumnHeader,
    taskColumnHeader,
    isPastSection = false,
    isNoShowSection = false,
    isPastTaskSection = false,
    isTodayTaskSection = false,
    isFutureTaskSection = false,
    isCompletedTaskSection = false,
    isStaleSection = false,
    emptyMessage = "No leads in this bucket.",
    statusFilter
}` | `{ 
    leads: Lead[], 
    viewMode: 'table' | 'accordion' | 'grid' | 'queue', 
    sortBy: 'franchisee' | 'companyName' | 'dateLeadEntered' | 'weeklyParcels', 
    onCall: (id: string, phone: string) => void, 
    onClick: (id: string) => void, 
    onEmail: (lead: Lead) => void, 
    onNotes: (lead: Lead) => void,
    onAmReassign?: (leadId: string, amName: string) => void,
    accountManagers?: UserProfile[],
    canReassign?: boolean,
    canUnassign?: boolean,
    appointmentColumnHeader?: string,
    taskColumnHeader?: string,
    isPastSection?: boolean,
    isNoShowSection?: boolean,
    isPastTaskSection?: boolean,
    isTodayTaskSection?: boolean,
    isFutureTaskSection?: boolean,
    isCompletedTaskSection?: boolean,
    isStaleSection?: boolean,
    emptyMessage?: string,
    statusFilter?: string
}` | **Yes** | - | - |

---

### `VARIABLE` `sortedLeads`

- **Line:** 1534

---

### `VARIABLE` `valA`

- **Line:** 1537

---

### `VARIABLE` `valB`

- **Line:** 1538

---

### `VARIABLE` `cmp`

- **Line:** 1542

---

### `VARIABLE` `dateA`

- **Line:** 1547

---

### `VARIABLE` `dateB`

- **Line:** 1548

---

### `VARIABLE` `valA`

- **Line:** 1551

---

### `VARIABLE` `valB`

- **Line:** 1552

---

### `VARIABLE` `groupedLeads`

- **Line:** 1560

---

### `VARIABLE` `groups`

- **Line:** 1562
- **Signature:** `GroupedLeads`

---

### `VARIABLE` `status`

- **Line:** 1564

---

### `VARIABLE` `sortedStatuses`

- **Line:** 1574

---

### `VARIABLE` `isTaskMode`

- **Line:** 1614

---

### `VARIABLE` `primaryContact`

- **Line:** 1635

---

### `VARIABLE` `contactName`

- **Line:** 1636

---

### `VARIABLE` `phoneNumbers`

- **Line:** 1639
- **Signature:** `{ label: string; phone: string }[]`

---

### `VARIABLE` `uniquePhones`

- **Line:** 1650

---

### `VARIABLE` `email`

- **Line:** 1652

---

### `VARIABLE` `now`

- **Line:** 1654

---

### `VARIABLE` `allAppointmentsMap`

- **Line:** 1656

---

### `VARIABLE` `allAppointments`

- **Line:** 1658

---

### `VARIABLE` `upcomingAppointment`

- **Line:** 1660
- **Signature:** `any`

---

### `VARIABLE` `dA`

- **Line:** 1665

---

### `VARIABLE` `dB`

- **Line:** 1666

---

### `VARIABLE` `parsed`

- **Line:** 1672

---

### `VARIABLE` `status`

- **Line:** 1673

---

### `VARIABLE` `dA`

- **Line:** 1677

---

### `VARIABLE` `dB`

- **Line:** 1678

---

### `VARIABLE` `parsed`

- **Line:** 1684

---

### `VARIABLE` `status`

- **Line:** 1685

---

### `VARIABLE` `dA`

- **Line:** 1689

---

### `VARIABLE` `dB`

- **Line:** 1690

---

### `VARIABLE` `allTasksMap`

- **Line:** 1699

---

### `VARIABLE` `allTasks`

- **Line:** 1701

---

### `VARIABLE` `relevantTask`

- **Line:** 1703
- **Signature:** `any`

---

### `VARIABLE` `parsed`

- **Line:** 1708

---

### `VARIABLE` `parsed`

- **Line:** 1716

---

### `VARIABLE` `parsed`

- **Line:** 1723

---

### `VARIABLE` `currentStatus`

- **Line:** 1735

---

### `VARIABLE` `rowBgClass`

- **Line:** 1736

---

### `VARIABLE` `dateVal`

- **Line:** 1747

---

### `VARIABLE` `parsed`

- **Line:** 1748

---

### `VARIABLE` `isTransferred`

- **Line:** 1778

---

### `VARIABLE` `origin`

- **Line:** 1779

---

### `VARIABLE` `currentBucketName`

- **Line:** 1780

---

### `VARIABLE` `daysUntouched`

- **Line:** 1812

---

### `VARIABLE` `name`

- **Line:** 1842

---

### `VARIABLE` `parsed`

- **Line:** 1927

---

### `VARIABLE` `parsed`

- **Line:** 1941

---

### `FUNCTION` `LeadCard`

- **Line:** 2031
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ 
    lead, 
    onCall, 
    onClick, 
    onEmail, 
    onNotes, 
    onAmReassign, 
    accountManagers = [], 
    canReassign = false, 
    canUnassign = false, 
    isPastSection = false, 
    isNoShowSection = false,
    isPastTaskSection = false,
    isTodayTaskSection = false,
    isFutureTaskSection = false,
    isCompletedTaskSection = false,
    isStaleSection = false
}` | `{ 
    lead: Lead, 
    onCall: (id: string, phone: string) => void, 
    onClick: () => void, 
    onEmail: () => void, 
    onNotes: () => void, 
    onAmReassign?: (leadId: string, amName: string) => void, 
    accountManagers?: UserProfile[], 
    canReassign?: boolean, 
    canUnassign?: boolean, 
    isPastSection?: boolean, 
    isNoShowSection?: boolean,
    isPastTaskSection?: boolean,
    isTodayTaskSection?: boolean,
    isFutureTaskSection?: boolean,
    isCompletedTaskSection?: boolean,
    isStaleSection?: boolean
}` | **Yes** | - | - |

---

### `VARIABLE` `primaryContact`

- **Line:** 2066

---

### `VARIABLE` `contactName`

- **Line:** 2067

---

### `VARIABLE` `phoneNumbers`

- **Line:** 2070
- **Signature:** `{ label: string; phone: string }[]`

---

### `VARIABLE` `uniquePhones`

- **Line:** 2081

---

### `VARIABLE` `email`

- **Line:** 2083

---

### `VARIABLE` `currentStatus`

- **Line:** 2084

---

### `VARIABLE` `fullAddress`

- **Line:** 2085

---

### `VARIABLE` `now`

- **Line:** 2087

---

### `VARIABLE` `allAppointmentsMap`

- **Line:** 2090

---

### `VARIABLE` `allAppointments`

- **Line:** 2092

---

### `VARIABLE` `upcomingAppointment`

- **Line:** 2094
- **Signature:** `any`

---

### `VARIABLE` `dA`

- **Line:** 2099

---

### `VARIABLE` `dB`

- **Line:** 2100

---

### `VARIABLE` `parsed`

- **Line:** 2106

---

### `VARIABLE` `status`

- **Line:** 2107

---

### `VARIABLE` `dA`

- **Line:** 2111

---

### `VARIABLE` `dB`

- **Line:** 2112

---

### `VARIABLE` `parsed`

- **Line:** 2118

---

### `VARIABLE` `status`

- **Line:** 2119

---

### `VARIABLE` `dA`

- **Line:** 2123

---

### `VARIABLE` `dB`

- **Line:** 2124

---

### `VARIABLE` `isTaskMode`

- **Line:** 2133

---

### `VARIABLE` `allTasksMap`

- **Line:** 2134

---

### `VARIABLE` `allTasks`

- **Line:** 2136

---

### `VARIABLE` `relevantTask`

- **Line:** 2138
- **Signature:** `any`

---

### `VARIABLE` `parsed`

- **Line:** 2143

---

### `VARIABLE` `parsed`

- **Line:** 2151

---

### `VARIABLE` `parsed`

- **Line:** 2158

---

### `VARIABLE` `daysUntouched`

- **Line:** 2212

---

### `VARIABLE` `name`

- **Line:** 2335

---

### `VARIABLE` `parsed`

- **Line:** 2355

---

### `VARIABLE` `parsed`

- **Line:** 2372

---

### `VARIABLE` `parsed`

- **Line:** 2395

---

