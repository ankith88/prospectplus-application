# Module: `src/components/visit-notes-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 824
- **Direct Dependencies:** 29 modules imported

## Exported Symbols & API

### `TYPE` `SortableKeys`

- **Line:** 35
- **Signature:** `'capturedBy' | 'createdAt' | 'companyName' | 'address' | 'outcome' | 'status'`

---

### `FUNCTION` `VisitNotesClient`

- **Line:** 37
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 53

---

### `VARIABLE` `fetchData`

- **Line:** 67

---

### `VARIABLE` `canSeeAll`

- **Line:** 77

---

### `VARIABLE` `taggedCompanies`

- **Line:** 83

---

### `VARIABLE` `taggedLeads`

- **Line:** 84

---

### `VARIABLE` `recordsMap`

- **Line:** 103

---

### `VARIABLE` `visibleNotes`

- **Line:** 105

---

### `VARIABLE` `isCapturedByMe`

- **Line:** 110

---

### `VARIABLE` `isLinkedToMyFranchise`

- **Line:** 112

---

### `VARIABLE` `linkedRecord`

- **Line:** 114

---

### `FUNCTION` `handleProcessNote`

- **Line:** 124

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `note` | `VisitNote` | **Yes** | - | - |

---

### `FUNCTION` `handleNoteProcessed`

- **Line:** 129

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `noteId` | `string` | **Yes** | - | - |
| `status` | `'Converted' | 'Rejected'` | **Yes** | - | - |
| `leadId` | `string` | No | - | - |

---

### `FUNCTION` `handleExecuteDelete`

- **Line:** 133
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `noteId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `toggleExpand`

- **Line:** 147

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `VARIABLE` `next`

- **Line:** 149

---

### `FUNCTION` `handleSelectNote`

- **Line:** 156

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `isConverted` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `next`

- **Line:** 159

---

### `FUNCTION` `handleSelectAll`

- **Line:** 166

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `selectableNotes`

- **Line:** 168

---

### `FUNCTION` `handleBulkFieldSalesUpdate`

- **Line:** 175
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `selectedNotes`

- **Line:** 180

---

### `VARIABLE` `updates`

- **Line:** 181

---

### `VARIABLE` `record`

- **Line:** 184

---

### `VARIABLE` `updateData`

- **Line:** 185
- **Signature:** `any`

---

### `FUNCTION` `handleFilterChange`

- **Line:** 223

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 227

---

### `FUNCTION` `requestSort`

- **Line:** 239

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableKeys` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 240
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 247

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableKeys` | **Yes** | - | - |

---

### `FUNCTION` `formatAddressString`

- **Line:** 254

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address` | No | - | - |

---

### `VARIABLE` `parts`

- **Line:** 256
- **Signature:** `string[]`

---

### `VARIABLE` `filteredNotes`

- **Line:** 266

---

### `VARIABLE` `result`

- **Line:** 267

---

### `VARIABLE` `companyNameMatch`

- **Line:** 268

---

### `VARIABLE` `capturedByMatch`

- **Line:** 272

---

### `VARIABLE` `outcomeMatch`

- **Line:** 276

---

### `VARIABLE` `statusMatch`

- **Line:** 280

---

### `VARIABLE` `dateMatch`

- **Line:** 284

---

### `VARIABLE` `noteDate`

- **Line:** 286

---

### `VARIABLE` `fromDate`

- **Line:** 287

---

### `VARIABLE` `toDate`

- **Line:** 288

---

### `VARIABLE` `fieldSalesMatch`

- **Line:** 292

---

### `VARIABLE` `linkedRecord`

- **Line:** 294

---

### `VARIABLE` `isFieldSales`

- **Line:** 295

---

### `VARIABLE` `isDashback`

- **Line:** 299

---

### `VARIABLE` `dashbackMatch`

- **Line:** 300

---

### `VARIABLE` `aValue`

- **Line:** 307
- **Signature:** `any`

---

### `VARIABLE` `bValue`

- **Line:** 308
- **Signature:** `any`

---

### `VARIABLE` `capturedByOptions`

- **Line:** 341
- **Signature:** `Option[]`

---

### `VARIABLE` `users`

- **Line:** 342

---

### `VARIABLE` `outcomeOptions`

- **Line:** 346
- **Signature:** `Option[]`

---

### `VARIABLE` `outcomes`

- **Line:** 347

---

### `VARIABLE` `statusOptions`

- **Line:** 351
- **Signature:** `Option[]`

---

### `VARIABLE` `statuses`

- **Line:** 352

---

### `VARIABLE` `statusColorMap`

- **Line:** 356
- **Signature:** `Record<VisitNote['status'], string>`

---

### `VARIABLE` `canProcess`

- **Line:** 363

---

### `VARIABLE` `isAdmin`

- **Line:** 364

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 365

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 367

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 371

---

### `FUNCTION` `handleExport`

- **Line:** 378

---

### `VARIABLE` `headers`

- **Line:** 384

---

### `VARIABLE` `rows`

- **Line:** 385

---

### `VARIABLE` `record`

- **Line:** 386

---

### `VARIABLE` `noteDate`

- **Line:** 387

---

### `VARIABLE` `csvContent`

- **Line:** 405

---

### `VARIABLE` `blob`

- **Line:** 406

---

### `VARIABLE` `link`

- **Line:** 407

---

### `VARIABLE` `url`

- **Line:** 408

---

### `VARIABLE` `canManage`

- **Line:** 583

---

### `VARIABLE` `isFieldSales`

- **Line:** 584

---

### `VARIABLE` `isConverted`

- **Line:** 585

---

### `VARIABLE` `canEdit`

- **Line:** 586

---

### `VARIABLE` `canDelete`

- **Line:** 587

---

### `VARIABLE` `isExpanded`

- **Line:** 588

---

### `VARIABLE` `isAwaitingDelete`

- **Line:** 589

---

### `VARIABLE` `linkedRecord`

- **Line:** 591

---

### `VARIABLE` `isCompanyTarget`

- **Line:** 592

---

