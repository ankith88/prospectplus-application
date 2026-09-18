# Module: `src/components/archived-leads-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1346
- **Direct Dependencies:** 30 modules imported

## Exported Symbols & API

### `TYPE` `LeadWithDetails`

- **Line:** 59
- **Signature:** `Lead & { notes?: Note[], activity?: Activity[] }`

---

### `TYPE` `SortableLeadKeys`

- **Line:** 61
- **Signature:** `'companyName' | 'status' | 'bucket' | 'franchisee' | 'dialerAssigned' | 'lastActivityDate'`

---

### `VARIABLE` `BUCKET_TABS`

- **Line:** 63

---

### `FUNCTION` `getAssignedRepForLead`

- **Line:** 74

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `LeadWithDetails` | **Yes** | - | - |

---

### `VARIABLE` `b`

- **Line:** 75

---

### `FUNCTION` `getBucketBadge`

- **Line:** 87

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `LeadWithDetails` | **Yes** | - | - |

---

### `VARIABLE` `b`

- **Line:** 88

---

### `FUNCTION` `isOrWasOutboundLead`

- **Line:** 109

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `LeadWithDetails` | **Yes** | - | - |

---

### `VARIABLE` `currentBucket`

- **Line:** 110

---

### `VARIABLE` `wasOutboundInHistory`

- **Line:** 114

---

### `VARIABLE` `oldB`

- **Line:** 115

---

### `VARIABLE` `newB`

- **Line:** 116

---

### `VARIABLE` `prevB`

- **Line:** 122

---

### `TYPE` `ExpandedLeadDetails`

- **Line:** 128
- **Signature:** `{
    note: Note | null;
    activity: Activity | null;
    loading: boolean;
}`

---

### `VARIABLE` `LEADS_PER_PAGE`

- **Line:** 134

---

### `VARIABLE` `archivedStatuses`

- **Line:** 135
- **Signature:** `LeadStatus[]`

---

### `FUNCTION` `getDefaultFilters`

- **Line:** 137

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `role` | `string` | No | - | - |

---

### `VARIABLE` `isOutboundOrUser`

- **Line:** 138

---

### `FUNCTION` `ArchivedLeadsClientPage`

- **Line:** 157
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 164

---

### `VARIABLE` `isFranchisee`

- **Line:** 166

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 181
- **Signature:** `Option[]`

---

### `VARIABLE` `franchisees`

- **Line:** 183

---

### `VARIABLE` `activeUserRoleUserNames`

- **Line:** 187

---

### `VARIABLE` `set`

- **Line:** 188

---

### `VARIABLE` `role`

- **Line:** 192

---

### `VARIABLE` `assignedRoles`

- **Line:** 193

---

### `VARIABLE` `isUserRole`

- **Line:** 194

---

### `VARIABLE` `fullName`

- **Line:** 197

---

### `VARIABLE` `dialerOptions`

- **Line:** 205
- **Signature:** `Option[]`

---

### `VARIABLE` `usersToDisplay`

- **Line:** 206

---

### `VARIABLE` `role`

- **Line:** 210

---

### `VARIABLE` `assignedRoles`

- **Line:** 211

---

### `VARIABLE` `uniqueNames`

- **Line:** 215

---

### `VARIABLE` `dialers`

- **Line:** 216

---

### `VARIABLE` `statusOptions`

- **Line:** 223
- **Signature:** `Option[]`

---

### `VARIABLE` `uniqueCampaigns`

- **Line:** 227
- **Signature:** `Option[]`

---

### `VARIABLE` `campaigns`

- **Line:** 228

---

### `VARIABLE` `campaign`

- **Line:** 229

---

### `VARIABLE` `statusReasonOptions`

- **Line:** 239
- **Signature:** `Option[]`

---

### `VARIABLE` `reasons`

- **Line:** 241

---

### `VARIABLE` `amOptions`

- **Line:** 245
- **Signature:** `Option[]`

---

### `VARIABLE` `ams`

- **Line:** 247

---

### `FUNCTION` `fetchData`

- **Line:** 271
- **Async:** Yes

---

### `VARIABLE` `dialers`

- **Line:** 279

---

### `FUNCTION` `handleRefresh`

- **Line:** 291

---

### `FUNCTION` `handleFilterChange`

- **Line:** 297

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `string | string[] | DateRange | undefined` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 302

---

### `VARIABLE` `baseFilteredLeads`

- **Line:** 307

---

### `VARIABLE` `leads`

- **Line:** 308

---

### `VARIABLE` `loggedInAmName`

- **Line:** 315

---

### `VARIABLE` `assignedRep`

- **Line:** 322

---

### `VARIABLE` `loggedInUserName`

- **Line:** 326

---

### `VARIABLE` `companyNameMatch`

- **Line:** 339

---

### `VARIABLE` `statusMatch`

- **Line:** 340

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 341

---

### `VARIABLE` `statusReasonMatch`

- **Line:** 342

---

### `VARIABLE` `dialerMatch`

- **Line:** 344

---

### `VARIABLE` `amMatch`

- **Line:** 353

---

### `VARIABLE` `amVal`

- **Line:** 355

---

### `VARIABLE` `apptAmMatch`

- **Line:** 356

---

### `VARIABLE` `fieldSourcedMatch`

- **Line:** 360

---

### `VARIABLE` `isField`

- **Line:** 362

---

### `VARIABLE` `targetActivityDateFilter`

- **Line:** 370

---

### `VARIABLE` `dateMatch`

- **Line:** 371

---

### `VARIABLE` `dateStr`

- **Line:** 373

---

### `VARIABLE` `lastActivityDate`

- **Line:** 374

---

### `VARIABLE` `fromDate`

- **Line:** 376

---

### `VARIABLE` `toDate`

- **Line:** 377

---

### `VARIABLE` `appointmentDateMatch`

- **Line:** 384

---

### `VARIABLE` `fromDate`

- **Line:** 389

---

### `VARIABLE` `toDate`

- **Line:** 390

---

### `VARIABLE` `d`

- **Line:** 392

---

### `VARIABLE` `assignmentDateMatch`

- **Line:** 398

---

### `VARIABLE` `dateStr`

- **Line:** 400

---

### `VARIABLE` `assignDate`

- **Line:** 401

---

### `VARIABLE` `fromDate`

- **Line:** 405

---

### `VARIABLE` `toDate`

- **Line:** 406

---

### `VARIABLE` `leadCreatedDateMatch`

- **Line:** 411

---

### `VARIABLE` `createdDate`

- **Line:** 413

---

### `VARIABLE` `fromDate`

- **Line:** 417

---

### `VARIABLE` `toDate`

- **Line:** 418

---

### `VARIABLE` `checkInDateMatch`

- **Line:** 423

---

### `VARIABLE` `fromDate`

- **Line:** 425

---

### `VARIABLE` `toDate`

- **Line:** 426

---

### `VARIABLE` `checkInActivity`

- **Line:** 427

---

### `VARIABLE` `checkInDate`

- **Line:** 429

---

### `VARIABLE` `campaignMatch`

- **Line:** 436

---

### `VARIABLE` `leadCampaign`

- **Line:** 438

---

### `VARIABLE` `filterCampaign`

- **Line:** 439

---

### `FUNCTION` `isLostStatus`

- **Line:** 453

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `bucketCounts`

- **Line:** 455

---

### `VARIABLE` `counts`

- **Line:** 456
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `b`

- **Line:** 459

---

### `VARIABLE` `currentBucketLeads`

- **Line:** 467

---

### `VARIABLE` `b`

- **Line:** 470

---

### `VARIABLE` `positiveLeadsCount`

- **Line:** 475

---

### `VARIABLE` `lostLeadsCount`

- **Line:** 479

---

### `VARIABLE` `archivedLeads`

- **Line:** 483

---

### `VARIABLE` `sortedLeads`

- **Line:** 493

---

### `VARIABLE` `sortableItems`

- **Line:** 494

---

### `VARIABLE` `aValue`

- **Line:** 497
- **Signature:** `string | number | undefined`

---

### `VARIABLE` `bValue`

- **Line:** 498
- **Signature:** `string | number | undefined`

---

### `VARIABLE` `dateAStr`

- **Line:** 507

---

### `VARIABLE` `dateBStr`

- **Line:** 508

---

### `VARIABLE` `paginatedLeads`

- **Line:** 528

---

### `VARIABLE` `startIndex`

- **Line:** 529

---

### `VARIABLE` `totalPages`

- **Line:** 533

---

### `FUNCTION` `requestSort`

- **Line:** 535

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableLeadKeys` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 536
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 543

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableLeadKeys` | **Yes** | - | - |

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 550

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 554

---

### `FUNCTION` `getContactFirstAndLastName`

- **Line:** 561

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `Partial<Contact>` | No | - | - |

---

### `VARIABLE` `lastName`

- **Line:** 564

---

### `VARIABLE` `parts`

- **Line:** 568

---

### `VARIABLE` `firstName`

- **Line:** 569

---

### `VARIABLE` `lastName`

- **Line:** 570

---

### `FUNCTION` `handleExport`

- **Line:** 576

---

### `VARIABLE` `headers`

- **Line:** 577

---

### `VARIABLE` `rows`

- **Line:** 589
- **Signature:** `string[][]`

---

### `VARIABLE` `contacts`

- **Line:** 592

---

### `VARIABLE` `c1`

- **Line:** 593

---

### `VARIABLE` `c2`

- **Line:** 594

---

### `VARIABLE` `c3`

- **Line:** 595

---

### `VARIABLE` `addrs`

- **Line:** 597

---

### `VARIABLE` `a2`

- **Line:** 598

---

### `VARIABLE` `a3`

- **Line:** 599

---

### `VARIABLE` `row`

- **Line:** 601

---

### `VARIABLE` `csvContent`

- **Line:** 675

---

### `VARIABLE` `blob`

- **Line:** 676

---

### `VARIABLE` `link`

- **Line:** 677

---

### `VARIABLE` `url`

- **Line:** 681

---

### `FUNCTION` `toggleLeadDetails`

- **Line:** 689
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `lastActivity` | `Activity | null` | **Yes** | - | - |

---

### `VARIABLE` `newState`

- **Line:** 692

---

### `FUNCTION` `handleDeleteLeads`

- **Line:** 723
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectLead`

- **Line:** 736

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAllOnPage`

- **Line:** 742

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `isChecked` | `boolean | 'indeterminate'` | **Yes** | - | - |

---

### `VARIABLE` `paginatedIds`

- **Line:** 746

---

### `VARIABLE` `isAllOnPageSelected`

- **Line:** 751

---

### `VARIABLE` `defaultAssignmentFrom`

- **Line:** 753

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 754

---

### `VARIABLE` `isOutboundOrUser`

- **Line:** 755

---

### `VARIABLE` `isCustomAssignmentDate`

- **Line:** 756

---

