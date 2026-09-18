# Module: `src/services/firebase.ts`

- **Language:** TypeScript
- **Total Lines:** 4518
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `FUNCTION` `sanitizeData`

> Sanitizes data retrieved from Firestore to ensure it can be passed from 
Server Components/Actions to Client Components. Converts Timestamps and Dates to ISO strings.

- **Line:** 24
- **Returns:** `any`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 29

---

### `VARIABLE` `sanitized`

- **Line:** 45
- **Signature:** `any`

---

### `FUNCTION` `prepareForFirestore`

> Removes undefined values from an object recursively to prevent Firestore errors.

- **Line:** 58
- **Returns:** `any`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `obj` | `any` | **Yes** | - | - |

---

### `VARIABLE` `cleaned`

- **Line:** 66
- **Signature:** `any`

---

### `VARIABLE` `cleanedValue`

- **Line:** 69

---

### `FUNCTION` `generateProspectPlusIdClient`

- **Line:** 78
- **Async:** Yes
- **Returns:** `Promise<string>`

---

### `VARIABLE` `unique`

- **Line:** 79

---

### `VARIABLE` `candidate`

- **Line:** 80

---

### `VARIABLE` `attempts`

- **Line:** 81

---

### `VARIABLE` `qLeads`

- **Line:** 85

---

### `VARIABLE` `snapLeads`

- **Line:** 86

---

### `VARIABLE` `qCompanies`

- **Line:** 89

---

### `VARIABLE` `snapCompanies`

- **Line:** 90

---

### `FUNCTION` `getLeadOrCompanyCollection`

- **Line:** 99
- **Async:** Yes
- **Returns:** `Promise<'companies' | 'leads'>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `leadObject` | `any` | No | - | - |

---

### `VARIABLE` `compSnap`

- **Line:** 107

---

### `FUNCTION` `logActivity`

- **Line:** 115
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `activity` | `Partial<Omit<Activity, 'id' | 'date'>> & { date?: string }` | **Yes** | - | - |
| `collectionName` | `'leads' | 'companies' | 'lpo_leads' | string` | No | - | - |

---

### `VARIABLE` `colName`

- **Line:** 121

---

### `VARIABLE` `activityRef`

- **Line:** 122

---

### `VARIABLE` `auth`

- **Line:** 124

---

### `VARIABLE` `currentUser`

- **Line:** 125

---

### `VARIABLE` `author`

- **Line:** 126

---

### `VARIABLE` `email`

- **Line:** 127

---

### `VARIABLE` `activityDate`

- **Line:** 128

---

### `VARIABLE` `activityLog`

- **Line:** 130
- **Signature:** `Partial<Activity>`

---

### `VARIABLE` `docRef`

- **Line:** 138

---

### `VARIABLE` `updatePayload`

- **Line:** 142
- **Signature:** `Record<string, any>`

---

### `FUNCTION` `findActivityByCallId`

- **Line:** 161
- **Async:** Yes
- **Returns:** `Promise<{ id: string; data: Activity } | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `callId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `activityRef`

- **Line:** 163

---

### `VARIABLE` `q`

- **Line:** 164

---

### `VARIABLE` `querySnapshot`

- **Line:** 165

---

### `VARIABLE` `doc`

- **Line:** 171

---

### `FUNCTION` `updateActivity`

- **Line:** 183
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `activityId` | `string` | **Yes** | - | - |
| `activityUpdate` | `Partial<Activity>` | **Yes** | - | - |

---

### `VARIABLE` `activityDocRef`

- **Line:** 185

---

### `FUNCTION` `safeGetStatus`

- **Line:** 193
- **Returns:** `LeadStatus`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `any` | **Yes** | - | - |

---

### `VARIABLE` `validStatuses`

- **Line:** 194
- **Signature:** `LeadStatus[]`

---

### `VARIABLE` `trimmedStatus`

- **Line:** 196

---

### `VARIABLE` `cleanStatus`

- **Line:** 198

---

### `VARIABLE` `found`

- **Line:** 200

---

### `FUNCTION` `getUserAircallId`

- **Line:** 206
- **Async:** Yes
- **Returns:** `Promise<string | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `displayName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `users`

- **Line:** 208

---

### `VARIABLE` `user`

- **Line:** 209

---

### `FUNCTION` `getUserPhoneNumber`

- **Line:** 217
- **Async:** Yes
- **Returns:** `Promise<string | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `displayName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `users`

- **Line:** 219

---

### `VARIABLE` `user`

- **Line:** 220

---

### `FUNCTION` `getLeadFromFirebase`

- **Line:** 228
- **Async:** Yes
- **Returns:** `Promise<Lead | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `includeSubCollections` | `any` | No | `true` | - |

---

### `VARIABLE` `leadRef`

- **Line:** 231

---

### `VARIABLE` `docSnapshot`

- **Line:** 232

---

### `VARIABLE` `data`

- **Line:** 236

---

### `VARIABLE` `companyName`

- **Line:** 237

---

### `VARIABLE` `address`

- **Line:** 239
- **Signature:** `Address | undefined`

---

### `VARIABLE` `transformedLead`

- **Line:** 253
- **Signature:** `Lead`

---

### `VARIABLE` `finalContacts`

- **Line:** 378

---

### `VARIABLE` `legacyName`

- **Line:** 391

---

### `VARIABLE` `legacyEmail`

- **Line:** 392

---

### `VARIABLE` `legacyPhone`

- **Line:** 393

---

### `FUNCTION` `getCompanyFromFirebase`

- **Line:** 429
- **Async:** Yes
- **Returns:** `Promise<Lead | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyId` | `string` | **Yes** | - | - |
| `includeSubCollections` | `any` | No | `true` | - |

---

### `VARIABLE` `companyRef`

- **Line:** 432

---

### `VARIABLE` `docSnapshot`

- **Line:** 433

---

### `VARIABLE` `data`

- **Line:** 437

---

### `VARIABLE` `companyName`

- **Line:** 438

---

### `VARIABLE` `address`

- **Line:** 440
- **Signature:** `Address | undefined`

---

### `VARIABLE` `transformedCompany`

- **Line:** 454
- **Signature:** `Lead`

---

### `VARIABLE` `finalCompanyContacts`

- **Line:** 579

---

### `VARIABLE` `legacyName`

- **Line:** 581

---

### `VARIABLE` `legacyEmail`

- **Line:** 582

---

### `VARIABLE` `legacyPhone`

- **Line:** 583

---

### `FUNCTION` `getLeadsFromFirebase`

- **Line:** 617
- **Async:** Yes
- **Returns:** `Promise<Lead[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `options` | `{ leadId?: string, leadIds?: string[], summary?: boolean, dialerAssigned?: string, franchisee?: string, includeDuplicates?: boolean }` | No | - | - |

---

### `VARIABLE` `lead`

- **Line:** 621

---

### `VARIABLE` `leads`

- **Line:** 626

---

### `VARIABLE` `leadsQuery`

- **Line:** 631

---

### `VARIABLE` `snapshot`

- **Line:** 635

---

### `VARIABLE` `leads`

- **Line:** 636

---

### `VARIABLE` `data`

- **Line:** 639

---

### `VARIABLE` `address`

- **Line:** 640
- **Signature:** `Address | undefined`

---

### `VARIABLE` `BATCH_SIZE`

- **Line:** 758

---

### `VARIABLE` `leadsWithContacts`

- **Line:** 759
- **Signature:** `Lead[]`

---

### `VARIABLE` `batch`

- **Line:** 761

---

### `VARIABLE` `batchResults`

- **Line:** 762

---

### `VARIABLE` `contacts`

- **Line:** 765

---

### `FUNCTION` `subscribeLeadsFromFirebase`

- **Line:** 785
- **Returns:** `() => void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `callback` | `(leads: Lead[]) => void` | **Yes** | - | - |
| `options` | `{ dialerAssigned?: string, franchisee?: string, bucket?: string }` | No | - | - |

---

### `VARIABLE` `leadsQuery`

- **Line:** 791

---

### `VARIABLE` `leads`

- **Line:** 797

---

### `VARIABLE` `data`

- **Line:** 800

---

### `VARIABLE` `address`

- **Line:** 801
- **Signature:** `Address | undefined`

---

### `FUNCTION` `getCompaniesFromFirebase`

- **Line:** 910
- **Async:** Yes
- **Returns:** `Promise<Lead[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `options` | `{ franchisee?: string, skipCoordinateCheck?: boolean }` | No | - | - |

---

### `VARIABLE` `companiesQuery`

- **Line:** 913

---

### `VARIABLE` `snapshot`

- **Line:** 915

---

### `VARIABLE` `data`

- **Line:** 918

---

### `VARIABLE` `lat`

- **Line:** 919

---

### `VARIABLE` `lng`

- **Line:** 920

---

### `VARIABLE` `address`

- **Line:** 924
- **Signature:** `Address | undefined`

---

### `FUNCTION` `getArchivedLeads`

- **Line:** 1014
- **Async:** Yes
- **Returns:** `Promise<Lead[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchisee` | `string` | No | - | - |

---

### `VARIABLE` `archivedStatusesForQuery`

- **Line:** 1016
- **Signature:** `(LeadStatus | 'Signed')[]`

---

### `VARIABLE` `q`

- **Line:** 1018

---

### `VARIABLE` `snapshot`

- **Line:** 1021

---

### `VARIABLE` `leads`

- **Line:** 1022
- **Signature:** `Lead[]`

---

### `VARIABLE` `data`

- **Line:** 1023

---

### `VARIABLE` `dateA`

- **Line:** 1078

---

### `VARIABLE` `dateB`

- **Line:** 1079

---

### `FUNCTION` `getAllLeadsForReport`

- **Line:** 1088
- **Async:** Yes
- **Returns:** `Promise<Lead[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchisee` | `string` | No | - | - |

---

### `VARIABLE` `leadsQuery`

- **Line:** 1090

---

### `VARIABLE` `snapshot`

- **Line:** 1092

---

### `VARIABLE` `data`

- **Line:** 1094

---

### `FUNCTION` `getSubCollection`

- **Line:** 1155
- **Async:** Yes
- **Returns:** `Promise<T[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentCollection` | `string` | **Yes** | - | - |
| `docId` | `string` | **Yes** | - | - |
| `subCollectionName` | `string` | **Yes** | - | - |
| `orderByField` | `string | FieldPath` | **Yes** | - | - |
| `orderDirection` | `'asc' | 'desc'` | No | `'desc'` | - |

---

### `VARIABLE` `ref`

- **Line:** 1163

---

### `VARIABLE` `snapshot`

- **Line:** 1164

---

### `VARIABLE` `items`

- **Line:** 1165

---

### `VARIABLE` `data`

- **Line:** 1166

---

### `VARIABLE` `field`

- **Line:** 1174

---

### `VARIABLE` `valA`

- **Line:** 1176

---

### `VARIABLE` `valB`

- **Line:** 1177

---

### `FUNCTION` `getAllCallActivities`

- **Line:** 1192
- **Async:** Yes
- **Returns:** `Promise<any[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `startDate` | `string` | No | - | - |
| `endDate` | `string` | No | - | - |

---

### `VARIABLE` `q`

- **Line:** 1194

---

### `VARIABLE` `activitySnapshot`

- **Line:** 1208

---

### `VARIABLE` `fallbackQuery`

- **Line:** 1214

---

### `VARIABLE` `fallbackSnap`

- **Line:** 1215

---

### `VARIABLE` `filteredDocs`

- **Line:** 1216

---

### `VARIABLE` `data`

- **Line:** 1217

---

### `VARIABLE` `callActivityDocs`

- **Line:** 1225

---

### `VARIABLE` `leadIds`

- **Line:** 1228

---

### `VARIABLE` `leadsData`

- **Line:** 1229
- **Signature:** `Record<string, Lead>`

---

### `VARIABLE` `chunk`

- **Line:** 1233

---

### `VARIABLE` `leadsQuery`

- **Line:** 1234

---

### `VARIABLE` `leadsSnapshot`

- **Line:** 1235

---

### `VARIABLE` `missingIds`

- **Line:** 1242

---

### `VARIABLE` `chunk`

- **Line:** 1245

---

### `VARIABLE` `companiesQuery`

- **Line:** 1246

---

### `VARIABLE` `companiesSnapshot`

- **Line:** 1247

---

### `VARIABLE` `bucketHistories`

- **Line:** 1255
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `leadActivities`

- **Line:** 1256
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `historySnap`

- **Line:** 1263

---

### `VARIABLE` `historySnap`

- **Line:** 1271

---

### `VARIABLE` `activitySnap`

- **Line:** 1284

---

### `VARIABLE` `activitySnap`

- **Line:** 1292

---

### `VARIABLE` `rawCalls`

- **Line:** 1304

---

### `VARIABLE` `activityData`

- **Line:** 1305

---

### `VARIABLE` `leadId`

- **Line:** 1306

---

### `VARIABLE` `history`

- **Line:** 1309

---

### `VARIABLE` `transitions`

- **Line:** 1310

---

### `VARIABLE` `nextTransition`

- **Line:** 1314

---

### `VARIABLE` `activities`

- **Line:** 1317

---

### `VARIABLE` `statusChanges`

- **Line:** 1318

---

### `VARIABLE` `match`

- **Line:** 1321

---

### `VARIABLE` `timeline`

- **Line:** 1327
- **Signature:** `{ status: LeadStatus; date: Date }[]`

---

### `VARIABLE` `enteredDate`

- **Line:** 1328

---

### `VARIABLE` `currentStatus`

- **Line:** 1336

---

### `VARIABLE` `statusAtCall`

- **Line:** 1341
- **Signature:** `LeadStatus`

---

### `VARIABLE` `callTime`

- **Line:** 1342

---

### `VARIABLE` `nextStatus`

- **Line:** 1351
- **Signature:** `LeadStatus | undefined`

---

### `VARIABLE` `sortedHistory`

- **Line:** 1361

---

### `VARIABLE` `bucketAtCall`

- **Line:** 1362

---

### `VARIABLE` `pastTransitions`

- **Line:** 1363

---

### `VARIABLE` `finalCalls`

- **Line:** 1392
- **Signature:** `any[]`

---

### `VARIABLE` `callsByLead`

- **Line:** 1393
- **Signature:** `Record<string, any[]>`

---

### `VARIABLE` `outcomes`

- **Line:** 1400

---

### `VARIABLE` `attempts`

- **Line:** 1401

---

### `VARIABLE` `attemptTime`

- **Line:** 1404

---

### `VARIABLE` `matched`

- **Line:** 1405

---

### `FUNCTION` `getAllActivities`

- **Line:** 1417
- **Async:** Yes
- **Returns:** `Promise<Array<Activity & { leadId: string }>>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checkInOnly` | `any` | No | `false` | - |

---

### `VARIABLE` `activitiesSnapshot`

- **Line:** 1419

---

### `VARIABLE` `allActivities`

- **Line:** 1420

---

### `VARIABLE` `activityData`

- **Line:** 1421

---

### `FUNCTION` `getUserActivitiesForPeriod`

- **Line:** 1431
- **Async:** Yes
- **Returns:** `Promise<Activity[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `displayName` | `string` | **Yes** | - | - |
| `startDate` | `string` | **Yes** | - | - |

---

### `VARIABLE` `q`

- **Line:** 1433

---

### `VARIABLE` `snapshot`

- **Line:** 1434

---

### `FUNCTION` `getAllTranscripts`

- **Line:** 1443
- **Async:** Yes
- **Returns:** `Promise<Transcript[]>`

---

### `VARIABLE` `snapshot`

- **Line:** 1445

---

### `FUNCTION` `getAllAppointments`

- **Line:** 1453
- **Async:** Yes
- **Returns:** `Promise<Array<Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus; discoveryData?: DiscoveryData }>>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `startDate` | `string` | No | - | - |
| `endDate` | `string` | No | - | - |

---

### `VARIABLE` `apptQuery`

- **Line:** 1455

---

### `VARIABLE` `appointmentsSnapshot`

- **Line:** 1456

---

### `VARIABLE` `filteredDocs`

- **Line:** 1457

---

### `VARIABLE` `start`

- **Line:** 1460

---

### `VARIABLE` `end`

- **Line:** 1461

---

### `VARIABLE` `data`

- **Line:** 1463

---

### `VARIABLE` `dateStr`

- **Line:** 1464

---

### `VARIABLE` `time`

- **Line:** 1466

---

### `VARIABLE` `leadIds`

- **Line:** 1472

---

### `VARIABLE` `leadsData`

- **Line:** 1475
- **Signature:** `Record<string, Lead>`

---

### `VARIABLE` `leadsChunks`

- **Line:** 1476
- **Signature:** `string[][]`

---

### `VARIABLE` `leadsSnapshots`

- **Line:** 1480

---

### `VARIABLE` `missingIds`

- **Line:** 1487

---

### `VARIABLE` `compChunks`

- **Line:** 1489
- **Signature:** `string[][]`

---

### `VARIABLE` `compSnapshots`

- **Line:** 1493

---

### `VARIABLE` `data`

- **Line:** 1502

---

### `VARIABLE` `leadId`

- **Line:** 1503

---

### `VARIABLE` `lead`

- **Line:** 1504

---

### `FUNCTION` `addContactToLead`

- **Line:** 1523
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `contact` | `Omit<Contact, 'id'>` | **Yes** | - | - |
| `collectionName` | `'leads' | 'companies'` | No | `'leads'` | - |

---

### `VARIABLE` `contactsRef`

- **Line:** 1526

---

### `VARIABLE` `q`

- **Line:** 1527

---

### `VARIABLE` `snap`

- **Line:** 1528

---

### `VARIABLE` `batch`

- **Line:** 1529

---

### `VARIABLE` `contactsRef`

- **Line:** 1536

---

### `VARIABLE` `docRef`

- **Line:** 1537

---

### `VARIABLE` `parentRef`

- **Line:** 1540

---

### `VARIABLE` `parentDoc`

- **Line:** 1541

---

### `FUNCTION` `updateLeadSalesRep`

- **Line:** 1551
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `salesRep` | `string | null` | **Yes** | - | - |
| `calendlyLink` | `string | null` | **Yes** | - | - |

---

### `FUNCTION` `updateLeadDialerRep`

- **Line:** 1560
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `dialerRep` | `string | null` | **Yes** | - | - |
| `isInbound` | `boolean` | No | `false` | - |

---

### `VARIABLE` `updateField`

- **Line:** 1562

---

### `VARIABLE` `now`

- **Line:** 1563

---

### `VARIABLE` `updateData`

- **Line:** 1564
- **Signature:** `any`

---

### `FUNCTION` `updateLeadAccountManager`

- **Line:** 1575
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `accountManager` | `string | null` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 1577

---

### `VARIABLE` `leadRef`

- **Line:** 1578

---

### `VARIABLE` `updateData`

- **Line:** 1579
- **Signature:** `any`

---

### `FUNCTION` `updateLeadAvatar`

- **Line:** 1596
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `avatarUrl` | `string` | **Yes** | - | - |

---

### `FUNCTION` `updateLeadStatus`

- **Line:** 1605
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `status` | `LeadStatus` | **Yes** | - | - |
| `reason` | `string` | No | - | - |
| `options` | `{ source?: string; isDataManagement?: boolean }` | No | - | - |

---

### `VARIABLE` `updates`

- **Line:** 1612
- **Signature:** `any`

---

### `VARIABLE` `now`

- **Line:** 1613

---

### `VARIABLE` `colName`

- **Line:** 1614

---

### `VARIABLE` `leadRef`

- **Line:** 1615

---

### `VARIABLE` `leadSnap`

- **Line:** 1616

---

### `VARIABLE` `altRef`

- **Line:** 1618

---

### `VARIABLE` `altSnap`

- **Line:** 1619

---

### `VARIABLE` `leadData`

- **Line:** 1622

---

### `VARIABLE` `currentBucket`

- **Line:** 1623

---

### `VARIABLE` `isLpoLeadProcess`

- **Line:** 1642

---

### `VARIABLE` `isChildLeadOrCompany`

- **Line:** 1652

---

### `VARIABLE` `isLostStatus`

- **Line:** 1656

---

### `VARIABLE` `syncPayload`

- **Line:** 1663
- **Signature:** `any`

---

### `VARIABLE` `parentIdToSync`

- **Line:** 1674

---

### `VARIABLE` `qFindParent`

- **Line:** 1677

---

### `VARIABLE` `pSnap`

- **Line:** 1678

---

### `VARIABLE` `qChild`

- **Line:** 1687

---

### `VARIABLE` `childSnap`

- **Line:** 1688

---

### `VARIABLE` `lpoStatusToSet`

- **Line:** 1702
- **Signature:** `string | null`

---

### `VARIABLE` `statusStr`

- **Line:** 1703

---

### `VARIABLE` `targetParentId`

- **Line:** 1715

---

### `VARIABLE` `qLpo1`

- **Line:** 1716

---

### `VARIABLE` `qLpo2`

- **Line:** 1717

---

### `VARIABLE` `qLpo3`

- **Line:** 1718

---

### `VARIABLE` `lpoDocsMap`

- **Line:** 1726

---

### `VARIABLE` `isDataMgmt`

- **Line:** 1740

---

### `VARIABLE` `logNotes`

- **Line:** 1741

---

### `FUNCTION` `updateLeadSingleBucket`

- **Line:** 1771
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `newBucket` | `string` | **Yes** | - | - |
| `reason` | `string` | No | - | - |
| `options` | `{ 
        source?: string; 
        isDataManagement?: boolean; 
        author?: string;
        assignee?: string;
        assigneeField?: 'dialerAssigned' | 'accountManagerAssigned' | 'fieldRepAssigned' | 'salesRepAssigned' | 'customerSuccessAssigned';
        extraUpdates?: Record<string, any>;
    }` | No | - | - |

---

### `VARIABLE` `colName`

- **Line:** 1785

---

### `VARIABLE` `leadRef`

- **Line:** 1786

---

### `VARIABLE` `leadSnap`

- **Line:** 1787

---

### `VARIABLE` `altRef`

- **Line:** 1789

---

### `VARIABLE` `altSnap`

- **Line:** 1790

---

### `VARIABLE` `leadData`

- **Line:** 1793

---

### `VARIABLE` `oldBucket`

- **Line:** 1794

---

### `VARIABLE` `updates`

- **Line:** 1796
- **Signature:** `any`

---

### `VARIABLE` `historyRef`

- **Line:** 1817

---

### `VARIABLE` `isDataMgmt`

- **Line:** 1826

---

### `VARIABLE` `logNotes`

- **Line:** 1827

---

### `FUNCTION` `updateLeadAiScore`

- **Line:** 1843
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `score` | `number` | **Yes** | - | - |
| `reason` | `string` | **Yes** | - | - |

---

### `FUNCTION` `updateLeadNextBestAction`

- **Line:** 1851
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `action` | `string` | **Yes** | - | - |

---

### `FUNCTION` `updateLeadFieldSales`

- **Line:** 1859
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `isFieldSales` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `leadRef`

- **Line:** 1861

---

### `VARIABLE` `leadSnap`

- **Line:** 1862

---

### `VARIABLE` `oldBucket`

- **Line:** 1863

---

### `VARIABLE` `newBucket`

- **Line:** 1864

---

### `FUNCTION` `logCallActivity`

- **Line:** 1881
- **Async:** Yes
- **Returns:** `Promise<LeadStatus | undefined>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `callData` | `{ outcome: string; notes: string; author: string; salesRecordInternalId?: string; userRole?: string; }` | **Yes** | - | - |

---

### `VARIABLE` `notesToLog`

- **Line:** 1886

---

### `VARIABLE` `leadRef`

- **Line:** 1888

---

### `VARIABLE` `leadSnap`

- **Line:** 1889

---

### `VARIABLE` `leadData`

- **Line:** 1890

---

### `VARIABLE` `currentStatus`

- **Line:** 1891

---

### `VARIABLE` `callerRole`

- **Line:** 1893

---

### `VARIABLE` `dialerRoles`

- **Line:** 1894

---

### `VARIABLE` `isDialer`

- **Line:** 1895

---

### `VARIABLE` `isLocalMileOpp`

- **Line:** 1897

---

### `VARIABLE` `normalizedCurrentStatus`

- **Line:** 1899

---

### `VARIABLE` `protectedStatuses`

- **Line:** 1900

---

### `VARIABLE` `isCurrentStatusProtected`

- **Line:** 1901

---

### `VARIABLE` `isLostStatus`

- **Line:** 1903

---

### `VARIABLE` `noteRef`

- **Line:** 1909

---

### `VARIABLE` `noteSnap`

- **Line:** 1910

---

### `VARIABLE` `noteData`

- **Line:** 1911

---

### `VARIABLE` `userRef`

- **Line:** 1914

---

### `VARIABLE` `userSnap`

- **Line:** 1915

---

### `VARIABLE` `capturer`

- **Line:** 1916

---

### `VARIABLE` `updateData`

- **Line:** 1918
- **Signature:** `any`

---

### `VARIABLE` `assignMsg`

- **Line:** 1926

---

### `VARIABLE` `noteRef`

- **Line:** 1951

---

### `VARIABLE` `noteSnap`

- **Line:** 1952

---

### `VARIABLE` `noteData`

- **Line:** 1953

---

### `VARIABLE` `userRef`

- **Line:** 1956

---

### `VARIABLE` `userSnap`

- **Line:** 1957

---

### `VARIABLE` `capturer`

- **Line:** 1958

---

### `VARIABLE` `shouldUpdateStatus`

- **Line:** 1986

---

### `VARIABLE` `currentBucket`

- **Line:** 1991

---

### `VARIABLE` `nowIso`

- **Line:** 1993

---

### `VARIABLE` `bucketHistoryEntry`

- **Line:** 1994

---

### `FUNCTION` `logCsCallActivity`

- **Line:** 2025
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `callData` | `{ outcome: string; notes: string; author: string; salesRecordInternalId?: string; }` | **Yes** | - | - |
| `collectionName` | `'leads' | 'companies'` | No | `'leads'` | - |

---

### `VARIABLE` `nowStr`

- **Line:** 2030

---

### `VARIABLE` `leadRef`

- **Line:** 2031

---

### `VARIABLE` `csCallEntry`

- **Line:** 2033

---

### `VARIABLE` `notesToLog`

- **Line:** 2042

---

### `VARIABLE` `csCallsRef`

- **Line:** 2044

---

### `FUNCTION` `logNoteActivity`

- **Line:** 2061
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `noteData` | `{ content: string; author: string, date: string }` | **Yes** | - | - |
| `collectionName` | `'leads' | 'companies' | string` | No | - | - |

---

### `VARIABLE` `colName`

- **Line:** 2062

---

### `VARIABLE` `leadRef`

- **Line:** 2070

---

### `VARIABLE` `leadSnap`

- **Line:** 2071

---

### `VARIABLE` `lData`

- **Line:** 2073

---

### `VARIABLE` `targetParentId`

- **Line:** 2074

---

### `VARIABLE` `lpoId`

- **Line:** 2075

---

### `VARIABLE` `lpoIdsToUpdate`

- **Line:** 2077

---

### `VARIABLE` `q1`

- **Line:** 2081

---

### `VARIABLE` `s1`

- **Line:** 2082

---

### `VARIABLE` `q2`

- **Line:** 2085

---

### `VARIABLE` `s2`

- **Line:** 2086

---

### `VARIABLE` `q3`

- **Line:** 2090

---

### `VARIABLE` `s3`

- **Line:** 2091

---

### `FUNCTION` `updateNoteActivity`

- **Line:** 2108
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `noteId` | `string` | **Yes** | - | - |
| `content` | `string` | **Yes** | - | - |
| `collectionName` | `'leads' | 'companies' | string` | No | - | - |

---

### `VARIABLE` `colName`

- **Line:** 2109

---

### `VARIABLE` `noteRef`

- **Line:** 2113

---

### `FUNCTION` `logTranscriptActivity`

- **Line:** 2119
- **Async:** Yes
- **Returns:** `Promise<Transcript>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `transcriptData` | `{ content: string; author?: string, callId: string, phoneNumber?: string }` | **Yes** | - | - |

---

### `VARIABLE` `ref`

- **Line:** 2120

---

### `VARIABLE` `existing`

- **Line:** 2121

---

### `VARIABLE` `newTranscript`

- **Line:** 2124

---

### `VARIABLE` `docRef`

- **Line:** 2125

---

### `FUNCTION` `updateContactInLead`

- **Line:** 2130
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `contactId` | `string` | **Yes** | - | - |
| `contactData` | `Partial<Omit<Contact, 'id'>>` | **Yes** | - | - |
| `collectionName` | `'leads' | 'companies'` | No | `'leads'` | - |

---

### `VARIABLE` `contactsRef`

- **Line:** 2132

---

### `VARIABLE` `q`

- **Line:** 2133

---

### `VARIABLE` `snap`

- **Line:** 2134

---

### `VARIABLE` `batch`

- **Line:** 2135

---

### `FUNCTION` `deleteContactFromLead`

- **Line:** 2147
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `contactId` | `string` | **Yes** | - | - |
| `contactName` | `string` | **Yes** | - | - |
| `collectionName` | `'leads' | 'companies'` | No | `'leads'` | - |

---

### `VARIABLE` `parentRef`

- **Line:** 2150

---

### `VARIABLE` `snap`

- **Line:** 2151

---

### `FUNCTION` `updateLeadDetails`

- **Line:** 2155
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `oldLead` | `Lead | MapLead` | **Yes** | - | - |
| `newLeadData` | `Partial<Lead>` | **Yes** | - | - |

---

### `VARIABLE` `col`

- **Line:** 2156

---

### `VARIABLE` `dataToSave`

- **Line:** 2157

---

### `VARIABLE` `statusVal`

- **Line:** 2158

---

### `VARIABLE` `now`

- **Line:** 2159

---

### `VARIABLE` `currentBucket`

- **Line:** 2160

---

### `VARIABLE` `fieldDiffs`

- **Line:** 2185
- **Signature:** `string[]`

---

### `VARIABLE` `fieldsToTrack`

- **Line:** 2186
- **Signature:** `Array<{ key: keyof Lead; label: string }>`

---

### `VARIABLE` `valNew`

- **Line:** 2201

---

### `VARIABLE` `valOld`

- **Line:** 2202

---

### `VARIABLE` `activityNote`

- **Line:** 2208

---

### `FUNCTION` `updateTranscriptAnalysis`

- **Line:** 2216
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `transcriptId` | `string` | **Yes** | - | - |
| `analysis` | `TranscriptAnalysis` | **Yes** | - | - |

---

### `FUNCTION` `findLeadByPhoneNumber`

- **Line:** 2220
- **Async:** Yes
- **Returns:** `Promise<{ id: string } | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `variations`

- **Line:** 2221

---

### `VARIABLE` `snap`

- **Line:** 2223

---

### `FUNCTION` `getAllUserTasks`

- **Line:** 2229
- **Async:** Yes
- **Returns:** `Promise<Array<Task & { leadId: string; leadName: string }>>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `displayName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `q`

- **Line:** 2230

---

### `VARIABLE` `snap`

- **Line:** 2231

---

### `FUNCTION` `addTaskToLead`

- **Line:** 2235
- **Async:** Yes
- **Returns:** `Promise<Task>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `taskData` | `{ title: string; dueDate: string; author: string; durationMinutes?: number; outlookEventId?: string }` | **Yes** | - | - |

---

### `VARIABLE` `leadSnap`

- **Line:** 2236

---

### `VARIABLE` `newTask`

- **Line:** 2237

---

### `VARIABLE` `docRef`

- **Line:** 2238

---

### `FUNCTION` `updateTaskInLead`

- **Line:** 2242
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `taskId` | `string` | **Yes** | - | - |
| `updates` | `Partial<Task>` | **Yes** | - | - |

---

### `FUNCTION` `updateTaskCompletion`

- **Line:** 2246
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `taskId` | `string` | **Yes** | - | - |
| `isCompleted` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `deleteTaskFromLead`

- **Line:** 2250
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `taskId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `isLostLeadStatus`

- **Line:** 2254
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string | null` | No | - | - |

---

### `VARIABLE` `s`

- **Line:** 2256

---

### `FUNCTION` `getPendingItemsForLead`

- **Line:** 2267
- **Async:** Yes
- **Returns:** `Promise<{
    pendingAppointments: Appointment[];
    pendingTasks: Task[];
}>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `leadInState` | `Partial<Lead>` | No | - | - |

---

### `VARIABLE` `appts`

- **Line:** 2271
- **Signature:** `Appointment[]`

---

### `VARIABLE` `tasks`

- **Line:** 2272
- **Signature:** `Task[]`

---

### `VARIABLE` `pendingAppointments`

- **Line:** 2286

---

### `VARIABLE` `s`

- **Line:** 2287

---

### `VARIABLE` `pendingTasks`

- **Line:** 2291

---

### `FUNCTION` `resolvePendingItemsForLead`

- **Line:** 2296
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `appointmentResolutions` | `Array<{ id: string; status: AppointmentStatus; notes?: string }>` | **Yes** | - | - |
| `taskResolutions` | `Array<{ id: string; action: 'complete' | 'cancel' | 'keep' }>` | **Yes** | - | - |
| `author` | `string` | No | `'System'` | - |

---

### `VARIABLE` `leadRef`

- **Line:** 2302

---

### `VARIABLE` `leadSnap`

- **Line:** 2303

---

### `VARIABLE` `leadData`

- **Line:** 2304

---

### `VARIABLE` `existingAppts`

- **Line:** 2305
- **Signature:** `Appointment[]`

---

### `VARIABLE` `apptRef`

- **Line:** 2309

---

### `VARIABLE` `updates`

- **Line:** 2310
- **Signature:** `any`

---

### `FUNCTION` `updateLeadDiscoveryData`

- **Line:** 2352
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `data` | `DiscoveryData` | **Yes** | - | - |

---

### `FUNCTION` `updateLeadCheckinQuestions`

- **Line:** 2356
- **Async:** Yes
- **Returns:** `Promise<any>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `questions` | `CheckinQuestion[]` | **Yes** | - | - |

---

### `FUNCTION` `addScorecard`

- **Line:** 2361
- **Async:** Yes
- **Returns:** `Promise<any>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `docRef`

- **Line:** 2362

---

### `VARIABLE` `snap`

- **Line:** 2363

---

### `FUNCTION` `updateScorecardAnalysis`

- **Line:** 2367
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `scorecardId` | `string` | **Yes** | - | - |
| `analysis` | `any` | **Yes** | - | - |

---

### `FUNCTION` `getAllUsers`

- **Line:** 2371
- **Async:** Yes
- **Returns:** `Promise<UserProfile[]>`

---

### `VARIABLE` `snap`

- **Line:** 2372

---

### `FUNCTION` `updateUser`

- **Line:** 2376
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |
| `data` | `Partial<UserProfile>` | **Yes** | - | - |

---

### `FUNCTION` `deleteUserCompletely`

- **Line:** 2380
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |
| `requestorUid` | `string` | **Yes** | - | - |

---

### `VARIABLE` `response`

- **Line:** 2381

---

### `VARIABLE` `data`

- **Line:** 2389

---

### `FUNCTION` `unlinkUserFromFranchiseeCompletely`

- **Line:** 2395
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |
| `franchiseeId` | `string` | No | - | - |
| `requestorUid` | `string` | No | - | - |

---

### `VARIABLE` `response`

- **Line:** 2396

---

### `VARIABLE` `data`

- **Line:** 2404

---

### `FUNCTION` `addAdditionalAddress`

- **Line:** 2412
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `address` | `Omit<TaggedAddress, 'id'>` | **Yes** | - | - |
| `isCompany` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 2413

---

### `VARIABLE` `ref`

- **Line:** 2414

---

### `VARIABLE` `docRef`

- **Line:** 2415

---

### `FUNCTION` `updateAdditionalAddress`

- **Line:** 2422
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `addressId` | `string` | **Yes** | - | - |
| `address` | `Partial<TaggedAddress>` | **Yes** | - | - |
| `isCompany` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 2423

---

### `VARIABLE` `ref`

- **Line:** 2424

---

### `FUNCTION` `deleteAdditionalAddress`

- **Line:** 2428
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `addressId` | `string` | **Yes** | - | - |
| `isCompany` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 2429

---

### `VARIABLE` `ref`

- **Line:** 2430

---

### `FUNCTION` `createNotification`

- **Line:** 2435
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userId` | `string` | **Yes** | - | - |
| `notification` | `{ title: string, message: string, type: string, [key: string]: any }` | **Yes** | - | - |

---

### `VARIABLE` `ref`

- **Line:** 2436

---

### `FUNCTION` `markNotificationAsRead`

- **Line:** 2444
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userId` | `string` | **Yes** | - | - |
| `notificationId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `markAllNotificationsAsRead`

- **Line:** 2448
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `q`

- **Line:** 2449

---

### `VARIABLE` `snap`

- **Line:** 2450

---

### `VARIABLE` `batch`

- **Line:** 2451

---

### `FUNCTION` `bulkUpdateLeadDialerRep`

- **Line:** 2456
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `newDialerReps` | `(string | null)[]` | **Yes** | - | - |
| `isInbound` | `boolean` | No | `false` | - |

---

### `VARIABLE` `batch`

- **Line:** 2457

---

### `VARIABLE` `updateField`

- **Line:** 2458

---

### `VARIABLE` `now`

- **Line:** 2459

---

### `VARIABLE` `rep`

- **Line:** 2461

---

### `VARIABLE` `updateData`

- **Line:** 2462
- **Signature:** `any`

---

### `FUNCTION` `addLeadsToMarketingList`

- **Line:** 2471
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `listName` | `string` | **Yes** | - | - |
| `author` | `string` | **Yes** | - | - |
| `noteText` | `string` | **Yes** | - | - |
| `keepBucket` | `boolean` | No | `false` | - |

---

### `VARIABLE` `batch`

- **Line:** 2472

---

### `VARIABLE` `oldBuckets`

- **Line:** 2473
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `snap`

- **Line:** 2476

---

### `VARIABLE` `data`

- **Line:** 2478

---

### `VARIABLE` `leadRef`

- **Line:** 2487

---

### `VARIABLE` `noteRef`

- **Line:** 2501

---

### `VARIABLE` `activityRef`

- **Line:** 2510

---

### `FUNCTION` `removeLeadsFromMarketingList`

- **Line:** 2521
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `listName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 2522

---

### `FUNCTION` `renameMarketingList`

- **Line:** 2529
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `oldName` | `string` | **Yes** | - | - |
| `newName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `q`

- **Line:** 2530

---

### `VARIABLE` `snapshot`

- **Line:** 2531

---

### `VARIABLE` `batch`

- **Line:** 2535

---

### `VARIABLE` `data`

- **Line:** 2537

---

### `VARIABLE` `lists`

- **Line:** 2538
- **Signature:** `string[]`

---

### `FUNCTION` `bulkUpdateFieldSales`

- **Line:** 2546
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updates` | `{id: string, type: 'leads' | 'companies', data?: any}[]` | **Yes** | - | - |
| `fieldSales` | `boolean` | No | - | - |

---

### `VARIABLE` `batch`

- **Line:** 2547

---

### `VARIABLE` `updateData`

- **Line:** 2549

---

### `FUNCTION` `addCallReview`

- **Line:** 2555
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `activityId` | `string` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `FUNCTION` `getLastNote`

- **Line:** 2559
- **Async:** Yes
- **Returns:** `Promise<Note | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snap`

- **Line:** 2561

---

### `VARIABLE` `notes`

- **Line:** 2563

---

### `VARIABLE` `dateA`

- **Line:** 2565

---

### `VARIABLE` `dateB`

- **Line:** 2566

---

### `FUNCTION` `getLastActivity`

- **Line:** 2576
- **Async:** Yes
- **Returns:** `Promise<Activity | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snap`

- **Line:** 2578

---

### `VARIABLE` `activities`

- **Line:** 2580

---

### `VARIABLE` `dateA`

- **Line:** 2582

---

### `VARIABLE` `dateB`

- **Line:** 2583

---

### `FUNCTION` `createNewLead`

- **Line:** 2593
- **Async:** Yes
- **Returns:** `Promise<any>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 2594

---

### `FUNCTION` `prospectWebsiteTool`

- **Line:** 2604
- **Async:** Yes
- **Returns:** `Promise<any>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `{ leadId: string; websiteUrl: string }` | **Yes** | - | - |

---

### `FUNCTION` `checkForDuplicateLead`

- **Line:** 2608
- **Async:** Yes
- **Returns:** `Promise<string | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | - | - |
| `web` | `string` | No | - | - |
| `email` | `string` | No | - | - |
| `addr` | `Address` | No | - | - |

---

### `VARIABLE` `snap`

- **Line:** 2609

---

### `FUNCTION` `findExistingCompanyOrLead`

- **Line:** 2613
- **Async:** Yes
- **Returns:** `Promise<{ id: string; type: 'Lead' | 'Signed Customer'; companyName: string } | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | - | - |
| `website` | `string` | No | - | - |
| `phone` | `string` | No | - | - |

---

### `VARIABLE` `normalizedName`

- **Line:** 2614

---

### `VARIABLE` `collections`

- **Line:** 2618

---

### `VARIABLE` `qName`

- **Line:** 2624

---

### `VARIABLE` `snapName`

- **Line:** 2630

---

### `VARIABLE` `cleanWebsite`

- **Line:** 2641

---

### `VARIABLE` `qWeb`

- **Line:** 2643

---

### `VARIABLE` `snapWeb`

- **Line:** 2649

---

### `VARIABLE` `cleanPhone`

- **Line:** 2662

---

### `VARIABLE` `qPhone`

- **Line:** 2664

---

### `VARIABLE` `snapPhone`

- **Line:** 2670

---

### `FUNCTION` `deleteLead`

- **Line:** 2688
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ids` | `string | string[]` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 2689

---

### `VARIABLE` `list`

- **Line:** 2690

---

### `FUNCTION` `deleteCompany`

- **Line:** 2695
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ids` | `string | string[]` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 2696

---

### `VARIABLE` `list`

- **Line:** 2697

---

### `FUNCTION` `bulkDeleteSubCollectionItems`

- **Line:** 2702
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `sub` | `string` | **Yes** | - | - |
| `ids` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 2703

---

### `FUNCTION` `saveUserRoute`

- **Line:** 2708
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `docRef`

- **Line:** 2709

---

### `FUNCTION` `getUserRoutes`

- **Line:** 2713
- **Async:** Yes
- **Returns:** `Promise<SavedRoute[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snap`

- **Line:** 2714

---

### `FUNCTION` `getAllUserRoutes`

- **Line:** 2718
- **Async:** Yes
- **Returns:** `Promise<any[]>`

---

### `VARIABLE` `snap`

- **Line:** 2719

---

### `FUNCTION` `deleteUserRoute`

- **Line:** 2723
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |
| `rid` | `string` | **Yes** | - | - |

---

### `FUNCTION` `moveUserRoute`

- **Line:** 2727
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `src` | `string` | **Yes** | - | - |
| `target` | `string` | **Yes** | - | - |
| `rid` | `string` | **Yes** | - | - |

---

### `VARIABLE` `docSnap`

- **Line:** 2728

---

### `VARIABLE` `batch`

- **Line:** 2729

---

### `FUNCTION` `updateLeadServices`

- **Line:** 2735
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `s` | `ServiceSelection[]` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 2736

---

### `VARIABLE` `leadRef`

- **Line:** 2737

---

### `FUNCTION` `updateLeadCommReg`

- **Line:** 2741
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `commRegId` | `string` | **Yes** | - | - |
| `dynamicScfUrl` | `string` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 2742

---

### `VARIABLE` `leadRef`

- **Line:** 2743

---

### `FUNCTION` `updateUserRoute`

- **Line:** 2751
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |
| `rid` | `string` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `FUNCTION` `bulkMoveLeadsToNurtureCampaign`

- **Line:** 2755
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `journeyId` | `string` | **Yes** | - | - |
| `author` | `string` | **Yes** | - | - |
| `noteText` | `string` | **Yes** | - | - |
| `keepBucket` | `boolean` | No | `false` | - |

---

### `VARIABLE` `journeyRef`

- **Line:** 2762

---

### `VARIABLE` `journeySnap`

- **Line:** 2763

---

### `VARIABLE` `journey`

- **Line:** 2767

---

### `VARIABLE` `journeyName`

- **Line:** 2768

---

### `VARIABLE` `startNode`

- **Line:** 2769

---

### `VARIABLE` `firstEdge`

- **Line:** 2770

---

### `VARIABLE` `initialNodeId`

- **Line:** 2771

---

### `VARIABLE` `nowStr`

- **Line:** 2772

---

### `VARIABLE` `batch`

- **Line:** 2774

---

### `VARIABLE` `oldBuckets`

- **Line:** 2775
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `snap`

- **Line:** 2778

---

### `VARIABLE` `data`

- **Line:** 2780

---

### `VARIABLE` `leadRef`

- **Line:** 2789

---

### `VARIABLE` `stateRef`

- **Line:** 2804

---

### `VARIABLE` `noteRef`

- **Line:** 2823

---

### `VARIABLE` `activityRef`

- **Line:** 2831

---

### `FUNCTION` `logBucketChange`

- **Line:** 2845
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `oldBucket` | `string` | **Yes** | - | - |
| `newBucket` | `string` | **Yes** | - | - |
| `author` | `string` | **Yes** | - | - |

---

### `VARIABLE` `effectiveOldBucket`

- **Line:** 2847

---

### `VARIABLE` `leadRef`

- **Line:** 2850

---

### `VARIABLE` `leadSnap`

- **Line:** 2851

---

### `VARIABLE` `data`

- **Line:** 2853

---

### `VARIABLE` `src`

- **Line:** 2854

---

### `VARIABLE` `historyRef`

- **Line:** 2863

---

### `FUNCTION` `addBucketChangeToBatch`

- **Line:** 2875
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `batch` | `any` | **Yes** | - | - |
| `leadId` | `string` | **Yes** | - | - |
| `oldBucket` | `string` | **Yes** | - | - |
| `newBucket` | `string` | **Yes** | - | - |
| `author` | `string` | **Yes** | - | - |

---

### `VARIABLE` `historyRef`

- **Line:** 2876

---

### `FUNCTION` `bulkMoveLeadsToBucket`

- **Line:** 2885
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 2886

---

### `VARIABLE` `newBucket`

- **Line:** 2887

---

### `VARIABLE` `oldBuckets`

- **Line:** 2888
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `snap`

- **Line:** 2891

---

### `VARIABLE` `dataSnap`

- **Line:** 2893

---

### `VARIABLE` `updatePayload`

- **Line:** 2902
- **Signature:** `any`

---

### `FUNCTION` `bulkAssignUnassignedLeads`

- **Line:** 2920
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `newBucket` | `string` | **Yes** | - | - |
| `assignmentMap` | `Record<string, string>` | **Yes** | - | - |
| `author` | `string` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 2921

---

### `VARIABLE` `updateData`

- **Line:** 2923
- **Signature:** `any`

---

### `FUNCTION` `bulkReassignLeads`

- **Line:** 2936
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `newBucket` | `string` | **Yes** | - | - |
| `assignmentMap` | `Record<string, string>` | **Yes** | - | - |
| `author` | `string` | **Yes** | - | - |
| `leadCurrentBuckets` | `Record<string, string>` | No | - | - |

---

### `VARIABLE` `chunkSize`

- **Line:** 2943

---

### `VARIABLE` `chunk`

- **Line:** 2945

---

### `VARIABLE` `batch`

- **Line:** 2946

---

### `VARIABLE` `updateData`

- **Line:** 2949
- **Signature:** `any`

---

### `VARIABLE` `oldBucket`

- **Line:** 2957

---

### `FUNCTION` `markLeadsAsExported`

- **Line:** 2964
- **Async:** Yes
- **Returns:** `Promise<{ batchId: string; leadCount: number }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `exportedToCompany` | `string` | **Yes** | - | - |
| `authorName` | `string` | **Yes** | - | - |
| `authorUid` | `string` | **Yes** | - | - |
| `notes` | `string` | No | - | - |

---

### `VARIABLE` `exportedAt`

- **Line:** 2971

---

### `VARIABLE` `batchId`

- **Line:** 2972

---

### `VARIABLE` `chunkSize`

- **Line:** 2974

---

### `VARIABLE` `chunk`

- **Line:** 2976

---

### `VARIABLE` `batch`

- **Line:** 2977

---

### `VARIABLE` `leadRef`

- **Line:** 2980

---

### `VARIABLE` `entry`

- **Line:** 2981

---

### `FUNCTION` `deleteLeadsByCampaign`

- **Line:** 3009
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `c` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snap`

- **Line:** 3010

---

### `VARIABLE` `batch`

- **Line:** 3011

---

### `FUNCTION` `updateContactSendEmail`

- **Line:** 3016
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `cid` | `string` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 3017

---

### `VARIABLE` `contactRef`

- **Line:** 3018

---

### `VARIABLE` `snap`

- **Line:** 3019

---

### `VARIABLE` `altCol`

- **Line:** 3023

---

### `VARIABLE` `altRef`

- **Line:** 3024

---

### `FUNCTION` `addVisitNote`

- **Line:** 3031
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `note` | `any` | **Yes** | - | - |

---

### `VARIABLE` `docRef`

- **Line:** 3032

---

### `FUNCTION` `getVisitNotes`

- **Line:** 3040
- **Async:** Yes
- **Returns:** `Promise<VisitNote[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | No | - | - |

---

### `VARIABLE` `q`

- **Line:** 3041
- **Signature:** `Query`

---

### `VARIABLE` `snap`

- **Line:** 3043

---

### `FUNCTION` `updateVisitNote`

- **Line:** 3047
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `FUNCTION` `deleteVisitNote`

- **Line:** 3051
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `logUpsell`

- **Line:** 3055
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `docRef`

- **Line:** 3056

---

### `FUNCTION` `getUpsells`

- **Line:** 3060
- **Async:** Yes
- **Returns:** `Promise<Upsell[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | No | - | - |

---

### `VARIABLE` `q`

- **Line:** 3061
- **Signature:** `Query`

---

### `VARIABLE` `snap`

- **Line:** 3063

---

### `FUNCTION` `logDailyArea`

- **Line:** 3067
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `docRef`

- **Line:** 3068

---

### `FUNCTION` `getDailyAreaLogs`

- **Line:** 3072
- **Async:** Yes
- **Returns:** `Promise<DailyDeployment[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `string` | No | - | - |

---

### `VARIABLE` `q`

- **Line:** 3074

---

### `VARIABLE` `snap`

- **Line:** 3076

---

### `VARIABLE` `logs`

- **Line:** 3077

---

### `FUNCTION` `deleteDailyAreaLog`

- **Line:** 3088
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getTodayDeploymentForUser`

- **Line:** 3092
- **Async:** Yes
- **Returns:** `Promise<DailyDeployment | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | - | - |

---

### `VARIABLE` `today`

- **Line:** 3093

---

### `VARIABLE` `snap`

- **Line:** 3094

---

### `FUNCTION` `saveFieldSalesSchedule`

- **Line:** 3098
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `FUNCTION` `deleteFieldSalesSchedule`

- **Line:** 3102
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getFieldSalesSchedules`

- **Line:** 3106
- **Async:** Yes
- **Returns:** `Promise<FieldSalesSchedule[]>`

---

### `VARIABLE` `snap`

- **Line:** 3107

---

### `FUNCTION` `getLeadContacts`

- **Line:** 3111
- **Async:** Yes
- **Returns:** `Promise<Contact[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getLeadActivity`

- **Line:** 3115
- **Async:** Yes
- **Returns:** `Promise<Activity[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getLeadNotes`

- **Line:** 3119
- **Async:** Yes
- **Returns:** `Promise<Note[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getAllNotes`

- **Line:** 3123
- **Async:** Yes
- **Returns:** `Promise<Note[]>`

---

### `VARIABLE` `snapshot`

- **Line:** 3124

---

### `FUNCTION` `getLeadTranscripts`

- **Line:** 3128
- **Async:** Yes
- **Returns:** `Promise<Transcript[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getLeadTasks`

- **Line:** 3132
- **Async:** Yes
- **Returns:** `Promise<Task[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `mergeLeads`

- **Line:** 3136
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `masterLeadId` | `string` | **Yes** | - | - |
| `duplicateLeadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `mergeMultipleLeads`

- **Line:** 3140
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetLeadId` | `string` | **Yes** | - | - |
| `sourceLeadIds` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 3141

---

### `VARIABLE` `totalContactsCount`

- **Line:** 3142

---

### `VARIABLE` `validSourceLeadIds`

- **Line:** 3143

---

### `VARIABLE` `sourceRef`

- **Line:** 3148

---

### `VARIABLE` `sourceSnap`

- **Line:** 3149

---

### `VARIABLE` `mergeLog`

- **Line:** 3253

---

### `FUNCTION` `getAllTasks`

- **Line:** 3263
- **Async:** Yes
- **Returns:** `Promise<Task[]>`

---

### `VARIABLE` `snapshot`

- **Line:** 3264

---

### `FUNCTION` `getAllFranchisees`

- **Line:** 3268
- **Async:** Yes
- **Returns:** `Promise<import('@/lib/types').Franchisee[]>`

---

### `VARIABLE` `snapshot`

- **Line:** 3270

---

### `VARIABLE` `list`

- **Line:** 3271

---

### `VARIABLE` `data`

- **Line:** 3272

---

### `FUNCTION` `getOperatorsForFranchisee`

- **Line:** 3286
- **Async:** Yes
- **Returns:** `Promise<import('@/lib/types').Operator[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchiseeId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `qMain`

- **Line:** 3288

---

### `VARIABLE` `qLinked`

- **Line:** 3289

---

### `VARIABLE` `operatorsMap`

- **Line:** 3293

---

### `FUNCTION` `getFranchiseeByName`

- **Line:** 3310
- **Async:** Yes
- **Returns:** `Promise<import('@/lib/types').Franchisee | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | - | - |

---

### `VARIABLE` `q`

- **Line:** 3313

---

### `VARIABLE` `snapshot`

- **Line:** 3314

---

### `VARIABLE` `doc`

- **Line:** 3317

---

### `FUNCTION` `findFranchiseeForAddress`

- **Line:** 3328
- **Async:** Yes
- **Returns:** `Promise<{ name: string; internalId: string; isMultiple?: boolean }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `city` | `string` | **Yes** | - | - |
| `state` | `string` | **Yes** | - | - |
| `zip` | `string` | **Yes** | - | - |

---

### `VARIABLE` `snap`

- **Line:** 3330

---

### `VARIABLE` `franchisees`

- **Line:** 3331

---

### `VARIABLE` `leadCity`

- **Line:** 3332

---

### `VARIABLE` `leadState`

- **Line:** 3333

---

### `VARIABLE` `leadZip`

- **Line:** 3334

---

### `VARIABLE` `matches`

- **Line:** 3338

---

### `FUNCTION` `checkTerritory`

- **Line:** 3339

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `tList` | `any[]` | **Yes** | - | - |

---

### `VARIABLE` `subStr`

- **Line:** 3342

---

### `VARIABLE` `subMatch`

- **Line:** 3343

---

### `VARIABLE` `stateMatch`

- **Line:** 3348

---

### `VARIABLE` `zipMatch`

- **Line:** 3349

---

### `VARIABLE` `inTerritory`

- **Line:** 3361

---

### `VARIABLE` `inAusPost`

- **Line:** 3362

---

### `VARIABLE` `matchedFranchisee`

- **Line:** 3367

---

### `VARIABLE` `franchiseeName`

- **Line:** 3368

---

### `VARIABLE` `franchiseeId`

- **Line:** 3369

---

### `FUNCTION` `createChildSiteLead`

- **Line:** 3384
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentLeadId` | `string` | **Yes** | - | - |
| `companyName` | `string` | **Yes** | - | - |
| `siteAddress` | `Address` | **Yes** | - | - |
| `localManager` | `Contact` | **Yes** | - | - |
| `copiedContacts` | `Contact[]` | **Yes** | - | - |
| `notes` | `string` | No | - | - |
| `authorName` | `string` | No | - | - |
| `companyEmail` | `string` | No | - | - |
| `companyPhone` | `string` | No | - | - |
| `customFranchisee` | `{ name: string; internalId: string }` | No | - | - |

---

### `VARIABLE` `franchiseeInfo`

- **Line:** 3397

---

### `VARIABLE` `franchiseeName`

- **Line:** 3400

---

### `VARIABLE` `franchiseeInternalId`

- **Line:** 3401

---

### `VARIABLE` `parentLeadData`

- **Line:** 3404
- **Signature:** `any`

---

### `VARIABLE` `parentDoc`

- **Line:** 3406

---

### `VARIABLE` `targetAmName`

- **Line:** 3415

---

### `VARIABLE` `amSnap`

- **Line:** 3417

---

### `VARIABLE` `amData`

- **Line:** 3419

---

### `VARIABLE` `resolvedCustomerPhone`

- **Line:** 3426

---

### `VARIABLE` `resolvedCustomerEmail`

- **Line:** 3427

---

### `VARIABLE` `netSuitePayload`

- **Line:** 3430

---

### `VARIABLE` `nsResult`

- **Line:** 3457

---

### `VARIABLE` `newLeadId`

- **Line:** 3463

---

### `VARIABLE` `childLeadPayload`

- **Line:** 3466
- **Signature:** `any`

---

### `VARIABLE` `activityRef`

- **Line:** 3493

---

### `FUNCTION` `createScfRecord`

- **Line:** 3517
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 3518

---

### `VARIABLE` `now`

- **Line:** 3519

---

### `VARIABLE` `docRef`

- **Line:** 3520

---

### `FUNCTION` `isScfSignedOrAccepted`

- **Line:** 3530
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `scfData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `status`

- **Line:** 3532

---

### `FUNCTION` `getScfRecord`

- **Line:** 3536
- **Async:** Yes
- **Returns:** `Promise<any>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `scfId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 3537

---

### `VARIABLE` `docSnap`

- **Line:** 3538

---

### `VARIABLE` `altCol`

- **Line:** 3540

---

### `VARIABLE` `altSnap`

- **Line:** 3541

---

### `FUNCTION` `getScfRecords`

- **Line:** 3546
- **Async:** Yes
- **Returns:** `Promise<any[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 3547

---

### `VARIABLE` `snap`

- **Line:** 3548

---

### `VARIABLE` `records`

- **Line:** 3549

---

### `VARIABLE` `altCol`

- **Line:** 3551

---

### `VARIABLE` `altSnap`

- **Line:** 3552

---

### `FUNCTION` `updateScfStatus`

- **Line:** 3558
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `scfId` | `string` | **Yes** | - | - |
| `status` | `'Pending' | 'Accepted' | 'Cancelled'` | **Yes** | - | - |

---

### `VARIABLE` `existing`

- **Line:** 3559

---

### `VARIABLE` `colName`

- **Line:** 3563

---

### `VARIABLE` `docRef`

- **Line:** 3564

---

### `VARIABLE` `docSnap`

- **Line:** 3565

---

### `VARIABLE` `targetRef`

- **Line:** 3566

---

### `FUNCTION` `updateScfRecord`

- **Line:** 3573
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `scfId` | `string` | **Yes** | - | - |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `existing`

- **Line:** 3574

---

### `VARIABLE` `colName`

- **Line:** 3578

---

### `VARIABLE` `docRef`

- **Line:** 3579

---

### `VARIABLE` `docSnap`

- **Line:** 3580

---

### `VARIABLE` `targetRef`

- **Line:** 3581

---

### `FUNCTION` `updateScfPdfUrl`

- **Line:** 3588
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `scfId` | `string` | **Yes** | - | - |
| `pdfUrl` | `string` | **Yes** | - | - |
| `pdfName` | `string` | No | - | - |
| `uploadedBy` | `string` | No | - | - |

---

### `VARIABLE` `now`

- **Line:** 3589

---

### `VARIABLE` `colName`

- **Line:** 3590

---

### `VARIABLE` `docRef`

- **Line:** 3591

---

### `VARIABLE` `docSnap`

- **Line:** 3592

---

### `VARIABLE` `targetRef`

- **Line:** 3593

---

### `FUNCTION` `createMultiFranchiseeChildLead`

- **Line:** 3603
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentLeadId` | `string` | **Yes** | - | - |
| `franchiseeName` | `string` | **Yes** | - | - |
| `franchiseeId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `parentLeadData`

- **Line:** 3605
- **Signature:** `any`

---

### `VARIABLE` `parentDoc`

- **Line:** 3606

---

### `VARIABLE` `parentContacts`

- **Line:** 3614

---

### `VARIABLE` `primaryContact`

- **Line:** 3615

---

### `VARIABLE` `childCompanyName`

- **Line:** 3617

---

### `VARIABLE` `netSuitePayload`

- **Line:** 3620

---

### `VARIABLE` `nsResult`

- **Line:** 3641

---

### `VARIABLE` `newLeadId`

- **Line:** 3646

---

### `VARIABLE` `childLeadData`

- **Line:** 3649

---

### `VARIABLE` `contactsSubRef`

- **Line:** 3671

---

### `VARIABLE` `activityRef`

- **Line:** 3683

---

### `FUNCTION` `setupMultiFranchiseeArchitecture`

- **Line:** 3694
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `selectedFranchisees` | `{ name: string; id: string }[]` | **Yes** | - | - |

---

### `VARIABLE` `parentLeadRef`

- **Line:** 3695

---

### `VARIABLE` `nsResult`

- **Line:** 3706

---

### `VARIABLE` `activityRef`

- **Line:** 3716

---

### `FUNCTION` `getSiblingLeads`

- **Line:** 3730
- **Async:** Yes
- **Returns:** `Promise<Lead[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentLeadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `qLeads`

- **Line:** 3731

---

### `VARIABLE` `qCompanies`

- **Line:** 3732

---

### `VARIABLE` `leads`

- **Line:** 3735

---

### `VARIABLE` `companies`

- **Line:** 3736

---

### `VARIABLE` `data`

- **Line:** 3737

---

### `VARIABLE` `address`

- **Line:** 3738

---

### `FUNCTION` `duplicateLeadToCompanies`

- **Line:** 3768
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `leadRef`

- **Line:** 3770

---

### `VARIABLE` `leadSnap`

- **Line:** 3771

---

### `VARIABLE` `leadData`

- **Line:** 3777

---

### `VARIABLE` `companyRef`

- **Line:** 3780

---

### `VARIABLE` `subcollections`

- **Line:** 3784

---

### `VARIABLE` `sourceColRef`

- **Line:** 3804

---

### `VARIABLE` `sourceSnap`

- **Line:** 3805

---

### `VARIABLE` `destColRef`

- **Line:** 3808

---

### `VARIABLE` `batch`

- **Line:** 3809

---

### `VARIABLE` `destDocRef`

- **Line:** 3811

---

### `FUNCTION` `bulkUpdateDialerAssignmentDate`

- **Line:** 3824
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `newDate` | `string` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 3825

---

### `FUNCTION` `getLastInvoiceForCompany`

- **Line:** 3832
- **Async:** Yes
- **Returns:** `Promise<Invoice | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `invoicesRef`

- **Line:** 3835

---

### `VARIABLE` `q`

- **Line:** 3836

---

### `VARIABLE` `snap`

- **Line:** 3837

---

### `VARIABLE` `docSnap`

- **Line:** 3839

---

### `VARIABLE` `data`

- **Line:** 3840

---

### `FUNCTION` `getLastInvoicesForCompanies`

- **Line:** 3860
- **Async:** Yes
- **Returns:** `Promise<Record<string, Invoice | null>>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyIds` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `results`

- **Line:** 3862
- **Signature:** `Record<string, Invoice | null>`

---

### `VARIABLE` `BATCH_SIZE`

- **Line:** 3863

---

### `VARIABLE` `batch`

- **Line:** 3865

---

### `VARIABLE` `batchResults`

- **Line:** 3866

---

### `VARIABLE` `inv`

- **Line:** 3868

---

### `FUNCTION` `getServices`

- **Line:** 4018
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `q`

- **Line:** 4019

---

### `VARIABLE` `snapshot`

- **Line:** 4020

---

### `FUNCTION` `addCompanyInsight`

- **Line:** 4027
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `insight` | `Omit<CompanyInsight, 'id'>` | **Yes** | - | - |

---

### `VARIABLE` `insightsRef`

- **Line:** 4029

---

### `VARIABLE` `docRef`

- **Line:** 4030

---

### `FUNCTION` `getCompanyInsights`

- **Line:** 4041
- **Async:** Yes
- **Returns:** `Promise<CompanyInsight[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `dismissDuplicateWarning`

- **Line:** 4050
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 4052

---

### `VARIABLE` `leadRef`

- **Line:** 4055

---

### `VARIABLE` `leadSnap`

- **Line:** 4056

---

### `VARIABLE` `activityRef`

- **Line:** 4063

---

### `VARIABLE` `companyRef`

- **Line:** 4073

---

### `VARIABLE` `companySnap`

- **Line:** 4074

---

### `VARIABLE` `activityRef`

- **Line:** 4081

---

### `FUNCTION` `updateFranchiseeCampaigns`

- **Line:** 4104
- **Async:** Yes
- **Returns:** `Promise<void>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchiseeId` | `string` | **Yes** | - | - |
| `campaignPriorities` | `{ campaign: string; priority: 'High' | 'Medium' | 'Low' }[]` | **Yes** | - | - |

---

### `VARIABLE` `docRef`

- **Line:** 4106

---

### `FUNCTION` `ensureLeadFranchiseeId`

- **Line:** 4117
- **Async:** Yes
- **Returns:** `Promise<string | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `franchiseeName` | `string` | No | - | - |

---

### `VARIABLE` `leadRef`

- **Line:** 4120

---

### `VARIABLE` `leadSnap`

- **Line:** 4121

---

### `VARIABLE` `data`

- **Line:** 4130

---

### `VARIABLE` `nameToLookup`

- **Line:** 4135

---

### `VARIABLE` `franchisee`

- **Line:** 4137

---

### `FUNCTION` `checkLpoHierarchyNetSuiteSync`

> Checks whether all leads in an LPO Lead Hierarchy (parent and child leads) are synced with NetSuite.

- **Line:** 4153
- **Async:** Yes
- **Returns:** `Promise<{
    isAllSynced: boolean;
    unsyncedCount: number;
    unsyncedNames: string[];
}>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `leadRef`

- **Line:** 4159

---

### `VARIABLE` `leadSnap`

- **Line:** 4160

---

### `VARIABLE` `leadData`

- **Line:** 4165

---

### `VARIABLE` `parentId`

- **Line:** 4166

---

### `VARIABLE` `allLeads`

- **Line:** 4168
- **Signature:** `{ id: string; name: string; isSynced: boolean }[]`

---

### `VARIABLE` `pRef`

- **Line:** 4171

---

### `VARIABLE` `pSnap`

- **Line:** 4172

---

### `VARIABLE` `pData`

- **Line:** 4174

---

### `VARIABLE` `isSynced`

- **Line:** 4175

---

### `VARIABLE` `qChild`

- **Line:** 4180

---

### `VARIABLE` `childSnap`

- **Line:** 4181

---

### `VARIABLE` `cData`

- **Line:** 4183

---

### `VARIABLE` `isSynced`

- **Line:** 4184

---

### `VARIABLE` `cSnap`

- **Line:** 4194

---

### `VARIABLE` `cData`

- **Line:** 4196

---

### `VARIABLE` `isSynced`

- **Line:** 4197

---

### `VARIABLE` `unsynced`

- **Line:** 4205

---

### `FUNCTION` `syncLpoHierarchyWithNetSuite`

> Synchronizes the parent lead and all child leads in an LPO Lead hierarchy to NetSuite.

- **Line:** 4220
- **Async:** Yes
- **Returns:** `Promise<{
    success: boolean;
    count: number;
    newParentDocId?: string;
    message: string;
}>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentLeadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `parentRef`

- **Line:** 4227

---

### `VARIABLE` `parentSnap`

- **Line:** 4228

---

### `VARIABLE` `parentData`

- **Line:** 4233

---

### `VARIABLE` `targetParentId`

- **Line:** 4234

---

### `VARIABLE` `oldChildIds`

- **Line:** 4236
- **Signature:** `string[]`

---

### `VARIABLE` `qChild`

- **Line:** 4237

---

### `VARIABLE` `childSnap`

- **Line:** 4238

---

### `VARIABLE` `newParentId`

- **Line:** 4254

---

### `VARIABLE` `isParentAlreadyNumeric`

- **Line:** 4255

---

### `VARIABLE` `parentRekeyRes`

- **Line:** 4258

---

### `VARIABLE` `newChildIds`

- **Line:** 4270
- **Signature:** `string[]`

---

### `VARIABLE` `isChildAlreadyNumeric`

- **Line:** 4273

---

### `VARIABLE` `newChildId`

- **Line:** 4274

---

### `VARIABLE` `childRekeyRes`

- **Line:** 4284

---

### `VARIABLE` `lpoIdsToUpdate`

- **Line:** 4318

---

### `VARIABLE` `qLpo1`

- **Line:** 4320

---

### `VARIABLE` `lpoSnap1`

- **Line:** 4321

---

### `VARIABLE` `qLpo2`

- **Line:** 4325

---

### `VARIABLE` `lpoSnap2`

- **Line:** 4326

---

### `VARIABLE` `qLpo3`

- **Line:** 4330

---

### `VARIABLE` `lpoSnap3`

- **Line:** 4331

---

### `VARIABLE` `lpoRef`

- **Line:** 4339

---

### `FUNCTION` `getLpoParentsForFranchisee`

> Fetches all LPO Parent leads linked to a given franchisee.
Finds leads in the 'lpo_network' bucket where the linked franchisee matches the selected franchisee,
and extracts the Parent LPO Lead from those child LPO leads (or direct parent LPO leads).

- **Line:** 4375
- **Async:** Yes
- **Returns:** `Promise<{ id: string; companyName: string }[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchisee` | `{ internalId: string; name?: string; code?: string }` | **Yes** | - | - |

---

### `VARIABLE` `fId`

- **Line:** 4380

---

### `VARIABLE` `fName`

- **Line:** 4381

---

### `VARIABLE` `fCode`

- **Line:** 4382

---

### `VARIABLE` `parentMap`

- **Line:** 4384

---

### `FUNCTION` `addParent`

- **Line:** 4386

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `name` | `string` | No | - | - |

---

### `VARIABLE` `cleanId`

- **Line:** 4388

---

### `VARIABLE` `existingName`

- **Line:** 4390

---

### `VARIABLE` `qLpoNet1`

- **Line:** 4398

---

### `VARIABLE` `qLpoNet2`

- **Line:** 4399

---

### `VARIABLE` `uniqueLeadDocsMap`

- **Line:** 4406

---

### `VARIABLE` `qFranLeads`

- **Line:** 4410

---

### `VARIABLE` `snapFran`

- **Line:** 4411

---

### `VARIABLE` `data`

- **Line:** 4413

---

### `VARIABLE` `b`

- **Line:** 4414

---

### `VARIABLE` `missingParentIds`

- **Line:** 4420

---

### `VARIABLE` `isLinkedToFranchisee`

- **Line:** 4425

---

### `VARIABLE` `parentLeadId`

- **Line:** 4437

---

### `VARIABLE` `pIdStr`

- **Line:** 4440

---

### `VARIABLE` `parentData`

- **Line:** 4442

---

### `VARIABLE` `pName`

- **Line:** 4443

---

### `VARIABLE` `fallbackName`

- **Line:** 4446

---

### `VARIABLE` `pName`

- **Line:** 4451

---

### `VARIABLE` `snapLpoLeads`

- **Line:** 4457

---

### `VARIABLE` `data`

- **Line:** 4459

---

### `VARIABLE` `lpoFranList`

- **Line:** 4460

---

### `VARIABLE` `matchesFran`

- **Line:** 4461

---

### `VARIABLE` `parentId`

- **Line:** 4463

---

### `VARIABLE` `pName`

- **Line:** 4464

---

### `VARIABLE` `qComp`

- **Line:** 4473

---

### `VARIABLE` `snapComp`

- **Line:** 4474

---

### `VARIABLE` `data`

- **Line:** 4476

---

### `VARIABLE` `pName`

- **Line:** 4477

---

### `VARIABLE` `pDoc`

- **Line:** 4486

---

### `VARIABLE` `pData`

- **Line:** 4488

---

### `VARIABLE` `pName`

- **Line:** 4489

---

### `VARIABLE` `cDoc`

- **Line:** 4492

---

### `VARIABLE` `cData`

- **Line:** 4494

---

### `VARIABLE` `cName`

- **Line:** 4495

---

### `VARIABLE` `result`

- **Line:** 4509

---

