# Module: `src/components/field-sales/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 1171
- **Direct Dependencies:** 30 modules imported

## Exported Symbols & API

### `TYPE` `LeadWithDetails`

- **Line:** 71
- **Signature:** `Lead & { notes?: Note[], activity?: Activity[] }`

---

### `TYPE` `RouteWithUser`

- **Line:** 72
- **Signature:** `SavedRoute & { userName: string; userId: string }`

---

### `VARIABLE` `leadStatuses`

- **Line:** 73
- **Signature:** `LeadStatus[]`

---

### `INTERFACE` `MoveLeadDialogProps`

- **Line:** 75

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(isOpen: boolean) => void` | No | - |
| `onLeadsMoved` | `() => void` | No | - |
| `targetBucket` | `'field' | 'outbound'` | No | - |

---

### `FUNCTION` `MoveLeadDialog`

- **Line:** 84
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ leads, isOpen, onOpenChange, onLeadsMoved, targetBucket }` | `MoveLeadDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `fetchUsers`

- **Line:** 92
- **Async:** Yes

---

### `VARIABLE` `allUsers`

- **Line:** 96

---

### `VARIABLE` `filteredUsers`

- **Line:** 97

---

### `FUNCTION` `handleMoveLeads`

- **Line:** 112
- **Async:** Yes

---

### `FUNCTION` `FieldSalesPage`

- **Line:** 176
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 206

---

### `VARIABLE` `isFranchisee`

- **Line:** 208

---

### `VARIABLE` `hasAccess`

- **Line:** 211

---

### `VARIABLE` `fetchData`

- **Line:** 213

---

### `VARIABLE` `fieldSalesLeads`

- **Line:** 224

---

### `FUNCTION` `handleFilterChange`

- **Line:** 246

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `string | string[] | DateRange | undefined` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 250

---

### `VARIABLE` `weeklyStats`

- **Line:** 260

---

### `VARIABLE` `weekStart`

- **Line:** 263

---

### `VARIABLE` `activitiesThisWeek`

- **Line:** 264

---

### `VARIABLE` `checkInActivities`

- **Line:** 266

---

### `VARIABLE` `totalCheckIns`

- **Line:** 267

---

### `VARIABLE` `leadsThisWeek`

- **Line:** 269

---

### `VARIABLE` `signedUpLeads`

- **Line:** 273

---

### `VARIABLE` `trialingLeads`

- **Line:** 274

---

### `VARIABLE` `totalSignups`

- **Line:** 276

---

### `VARIABLE` `totalTrials`

- **Line:** 277

---

### `VARIABLE` `conversionRate`

- **Line:** 279

---

### `FUNCTION` `StatCard`

- **Line:** 289

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ title, value, icon: Icon }` | `{ title: string; value: string | number; icon: React.ElementType }` | **Yes** | - | - |

---

### `VARIABLE` `filteredMyLeads`

- **Line:** 301

---

### `VARIABLE` `leads`

- **Line:** 304

---

### `VARIABLE` `companyNameMatch`

- **Line:** 305

---

### `VARIABLE` `statusMatch`

- **Line:** 306

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 307

---

### `VARIABLE` `parsedDate`

- **Line:** 308

---

### `VARIABLE` `dateLeadEnteredMatch`

- **Line:** 309

---

### `VARIABLE` `sourceMatch`

- **Line:** 310

---

### `VARIABLE` `groupedMyLeads`

- **Line:** 326

---

### `VARIABLE` `status`

- **Line:** 328

---

### `VARIABLE` `groupedAllAssignedLeads`

- **Line:** 337

---

### `VARIABLE` `relevantLeads`

- **Line:** 340

---

### `VARIABLE` `companyNameMatch`

- **Line:** 341

---

### `VARIABLE` `statusMatch`

- **Line:** 342

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 343

---

### `VARIABLE` `parsedDate`

- **Line:** 344

---

### `VARIABLE` `dateLeadEnteredMatch`

- **Line:** 345

---

### `VARIABLE` `sourceMatch`

- **Line:** 346

---

### `VARIABLE` `dialer`

- **Line:** 352

---

### `VARIABLE` `status`

- **Line:** 356

---

### `VARIABLE` `scheduledRevisits`

- **Line:** 365

---

### `VARIABLE` `revisits`

- **Line:** 366

---

### `VARIABLE` `userRevisits`

- **Line:** 368

---

### `VARIABLE` `lead`

- **Line:** 371

---

### `VARIABLE` `filteredRevisits`

- **Line:** 376

---

### `VARIABLE` `revisitTime`

- **Line:** 377

---

### `VARIABLE` `hasSubsequentCheckIn`

- **Line:** 378

---

### `VARIABLE` `lead`

- **Line:** 388

---

### `FUNCTION` `handleLoadRoute`

- **Line:** 395

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `route` | `SavedRoute` | **Yes** | - | - |

---

### `FUNCTION` `handleStartRoute`

- **Line:** 402

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `route` | `SavedRoute` | **Yes** | - | - |

---

### `VARIABLE` `directionsData`

- **Line:** 407

---

### `VARIABLE` `origin`

- **Line:** 408

---

### `VARIABLE` `destination`

- **Line:** 409

---

### `VARIABLE` `waypoints`

- **Line:** 410

---

### `VARIABLE` `mapsUrl`

- **Line:** 415

---

### `FUNCTION` `handleDeleteRoute`

- **Line:** 419
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `route` | `RouteWithUser` | **Yes** | - | - |

---

### `VARIABLE` `routeOwner`

- **Line:** 420

---

### `FUNCTION` `handleMoveRoute`

- **Line:** 431
- **Async:** Yes

---

### `FUNCTION` `handleSelectLead`

- **Line:** 448

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `openMoveLeadsDialog`

- **Line:** 454

---

### `VARIABLE` `leads`

- **Line:** 455

---

### `FUNCTION` `handleBulkReassign`

- **Line:** 460
- **Async:** Yes

---

### `FUNCTION` `handleReassignUserSelect`

- **Line:** 477

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |
| `userId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `confirmDelete`

- **Line:** 483

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ids` | `string[]` | **Yes** | - | - |

---

### `FUNCTION` `handleDelete`

- **Line:** 489
- **Async:** Yes

---

### `FUNCTION` `handleAddLeadToRoute`

- **Line:** 506
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadToAdd` | `Lead` | **Yes** | - | - |
| `route` | `SavedRoute` | **Yes** | - | - |

---

### `VARIABLE` `updatedLeads`

- **Line:** 510

---

### `VARIABLE` `directionsService`

- **Line:** 520

---

### `VARIABLE` `waypoints`

- **Line:** 521

---

### `VARIABLE` `origin`

- **Line:** 522

---

### `VARIABLE` `destination`

- **Line:** 523

---

### `VARIABLE` `geocodeAddress`

- **Line:** 548

---

### `VARIABLE` `geocoder`

- **Line:** 549

---

### `VARIABLE` `routesToShow`

- **Line:** 562

---

### `VARIABLE` `usersMap`

- **Line:** 564

---

### `VARIABLE` `allSystemRoutes`

- **Line:** 565

---

### `VARIABLE` `userName`

- **Line:** 568

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 586

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 590

---

### `FUNCTION` `handleExportRoutes`

- **Line:** 597

---

### `VARIABLE` `headers`

- **Line:** 603

---

### `VARIABLE` `rows`

- **Line:** 604
- **Signature:** `string[][]`

---

### `VARIABLE` `address`

- **Line:** 616

---

### `VARIABLE` `csvContent`

- **Line:** 629

---

### `VARIABLE` `blob`

- **Line:** 630

---

### `VARIABLE` `link`

- **Line:** 631

---

### `VARIABLE` `url`

- **Line:** 632

---

### `VARIABLE` `leadStatusOptions`

- **Line:** 641
- **Signature:** `Option[]`

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 642
- **Signature:** `Option[]`

---

### `VARIABLE` `franchisees`

- **Line:** 643

---

### `VARIABLE` `uniqueSources`

- **Line:** 646
- **Signature:** `Option[]`

---

### `VARIABLE` `sources`

- **Line:** 647

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 650

---

### `VARIABLE` `revisitDate`

- **Line:** 841

---

### `VARIABLE` `isRevisitToday`

- **Line:** 842

---

### `VARIABLE` `isRevisitThisWeek`

- **Line:** 843

---

### `VARIABLE` `isRevisitOverdue`

- **Line:** 844

---

### `VARIABLE` `leadIds`

- **Line:** 987

---

### `VARIABLE` `leadIds`

- **Line:** 1095

---

