# Module: `src/components/admin/bulk-bucket-updater.tsx`

- **Language:** TypeScript
- **Total Lines:** 898
- **Direct Dependencies:** 22 modules imported

## Exported Symbols & API

### `VARIABLE` `BUCKET_OPTIONS`

- **Line:** 41
- **Signature:** `{ value: string; label: string }[]`

---

### `INTERFACE` `StaffUser`

- **Line:** 54

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `role` | `string` | Yes | - |

---

### `FUNCTION` `allocateLeadsRandomlyAndEqually`

> Shuffles leadIds using Fisher-Yates algorithm and assigns them
in round-robin fashion across target assignees for equal, random distribution.

- **Line:** 64
- **Returns:** `Record<string, string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `assigneeNames` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `allocation`

- **Line:** 68
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `shuffledIds`

- **Line:** 79

---

### `VARIABLE` `j`

- **Line:** 81

---

### `FUNCTION` `BulkBucketUpdater`

- **Line:** 93
- **Returns:** `void`

---

### `VARIABLE` `debouncedSearchTerm`

- **Line:** 119

---

### `FUNCTION` `fetchLeadsAndUsers`

- **Line:** 122
- **Async:** Yes

---

### `VARIABLE` `users`

- **Line:** 132
- **Signature:** `StaffUser[]`

---

### `VARIABLE` `data`

- **Line:** 135

---

### `VARIABLE` `name`

- **Line:** 136

---

### `VARIABLE` `uniqueStatuses`

- **Line:** 171

---

### `VARIABLE` `statuses`

- **Line:** 172

---

### `VARIABLE` `list`

- **Line:** 173

---

### `VARIABLE` `uniqueBuckets`

- **Line:** 177

---

### `VARIABLE` `buckets`

- **Line:** 178

---

### `VARIABLE` `list`

- **Line:** 179

---

### `VARIABLE` `uniqueAMs`

- **Line:** 186

---

### `VARIABLE` `amSet`

- **Line:** 187

---

### `VARIABLE` `r`

- **Line:** 190

---

### `VARIABLE` `list`

- **Line:** 195

---

### `VARIABLE` `uniqueDialers`

- **Line:** 199

---

### `VARIABLE` `dialerSet`

- **Line:** 200

---

### `VARIABLE` `r`

- **Line:** 203

---

### `VARIABLE` `list`

- **Line:** 208

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 212

---

### `VARIABLE` `franchisees`

- **Line:** 213

---

### `VARIABLE` `list`

- **Line:** 214

---

### `VARIABLE` `targetAssigneeOptions`

- **Line:** 219

---

### `VARIABLE` `opts`

- **Line:** 221

---

### `VARIABLE` `opts`

- **Line:** 225

---

### `VARIABLE` `fieldSet`

- **Line:** 229

---

### `VARIABLE` `opts`

- **Line:** 232

---

### `VARIABLE` `csSet`

- **Line:** 236

---

### `VARIABLE` `opts`

- **Line:** 239

---

### `VARIABLE` `salesSet`

- **Line:** 243

---

### `VARIABLE` `opts`

- **Line:** 246

---

### `VARIABLE` `filteredItems`

- **Line:** 252

---

### `VARIABLE` `lowerSearch`

- **Line:** 256

---

### `VARIABLE` `matchesName`

- **Line:** 257

---

### `VARIABLE` `matchesId`

- **Line:** 258

---

### `VARIABLE` `matchesEntityId`

- **Line:** 259

---

### `VARIABLE` `matchesCustomerEntityId`

- **Line:** 260

---

### `VARIABLE` `matchesProspectPlusId`

- **Line:** 261

---

### `VARIABLE` `matchesNetsuiteId`

- **Line:** 262

---

### `VARIABLE` `matchesInternalId`

- **Line:** 263

---

### `VARIABLE` `statusVal`

- **Line:** 269

---

### `VARIABLE` `bucketVal`

- **Line:** 275

---

### `VARIABLE` `amVal`

- **Line:** 281

---

### `VARIABLE` `dialerVal`

- **Line:** 287

---

### `VARIABLE` `franchiseeVal`

- **Line:** 293

---

### `VARIABLE` `leadDate`

- **Line:** 299

---

### `VARIABLE` `start`

- **Line:** 302

---

### `VARIABLE` `end`

- **Line:** 303

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 312

---

### `VARIABLE` `effectivePageSize`

- **Line:** 325

---

### `VARIABLE` `totalPages`

- **Line:** 330

---

### `VARIABLE` `safeCurrentPage`

- **Line:** 331

---

### `VARIABLE` `startIndex`

- **Line:** 333

---

### `VARIABLE` `endIndex`

- **Line:** 334

---

### `VARIABLE` `displayedItems`

- **Line:** 336

---

### `VARIABLE` `displayedItemIds`

- **Line:** 340

---

### `VARIABLE` `filteredItemIds`

- **Line:** 341

---

### `VARIABLE` `isAllCurrentPageSelected`

- **Line:** 344

---

### `VARIABLE` `isSomeCurrentPageSelected`

- **Line:** 345

---

### `VARIABLE` `isAllMatchingSelected`

- **Line:** 346

---

### `FUNCTION` `handleSelectItem`

- **Line:** 348

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `itemId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleToggleSelectCurrentPage`

- **Line:** 354

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAllMatching`

- **Line:** 362

---

### `FUNCTION` `handleDeselectAll`

- **Line:** 366

---

### `FUNCTION` `handleJumpPage`

- **Line:** 370

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `pageNum`

- **Line:** 372

---

### `FUNCTION` `handleSingleBucketUpdate`

- **Line:** 386
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `newBucket` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleBulkBucketUpdate`

- **Line:** 407
- **Async:** Yes

---

### `VARIABLE` `CHUNK_SIZE`

- **Line:** 412

---

### `VARIABLE` `selectedSet`

- **Line:** 413

---

### `VARIABLE` `completedCount`

- **Line:** 414

---

### `VARIABLE` `allocationMap`

- **Line:** 417

---

### `VARIABLE` `assigneeField`

- **Line:** 418

---

### `VARIABLE` `chunk`

- **Line:** 422

---

### `VARIABLE` `assignedPerson`

- **Line:** 425

---

### `VARIABLE` `assignedPerson`

- **Line:** 446

---

### `VARIABLE` `updatedItem`

- **Line:** 447
- **Signature:** `Lead`

---

### `VARIABLE` `successDescription`

- **Line:** 459

---

### `FUNCTION` `clearAllFilters`

- **Line:** 487

---

### `VARIABLE` `isSelected`

- **Line:** 755

---

