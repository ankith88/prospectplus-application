# Module: `src/components/admin/bulk-account-manager-updater.tsx`

- **Language:** TypeScript
- **Total Lines:** 866
- **Direct Dependencies:** 23 modules imported

## Exported Symbols & API

### `INTERFACE` `StaffUser`

- **Line:** 44

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `role` | `string` | Yes | - |

---

### `VARIABLE` `BUCKET_OPTIONS`

- **Line:** 50
- **Signature:** `Option[]`

---

### `FUNCTION` `allocateLeadsRandomlyAndEqually`

> Shuffles leadIds using Fisher-Yates algorithm and assigns them
in round-robin fashion across target assignees for equal, random distribution.

- **Line:** 67
- **Returns:** `Record<string, string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIds` | `string[]` | **Yes** | - | - |
| `assigneeNames` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `allocation`

- **Line:** 71
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `shuffledIds`

- **Line:** 82

---

### `VARIABLE` `j`

- **Line:** 84

---

### `FUNCTION` `BulkAccountManagerUpdater`

- **Line:** 96
- **Returns:** `void`

---

### `VARIABLE` `debouncedSearchTerm`

- **Line:** 121

---

### `FUNCTION` `fetchLeadsAndUsers`

- **Line:** 124
- **Async:** Yes

---

### `VARIABLE` `users`

- **Line:** 134
- **Signature:** `StaffUser[]`

---

### `VARIABLE` `data`

- **Line:** 137

---

### `VARIABLE` `name`

- **Line:** 138

---

### `VARIABLE` `uniqueBuckets`

- **Line:** 168

---

### `VARIABLE` `buckets`

- **Line:** 169

---

### `VARIABLE` `list`

- **Line:** 170

---

### `VARIABLE` `uniqueDialers`

- **Line:** 177

---

### `VARIABLE` `dialerSet`

- **Line:** 178

---

### `VARIABLE` `list`

- **Line:** 180

---

### `VARIABLE` `uniqueStatuses`

- **Line:** 184

---

### `VARIABLE` `statusSet`

- **Line:** 185

---

### `VARIABLE` `list`

- **Line:** 187

---

### `VARIABLE` `uniqueAMs`

- **Line:** 191

---

### `VARIABLE` `amSet`

- **Line:** 192

---

### `VARIABLE` `r`

- **Line:** 195

---

### `VARIABLE` `list`

- **Line:** 200

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 204

---

### `VARIABLE` `franSet`

- **Line:** 205

---

### `VARIABLE` `list`

- **Line:** 207

---

### `VARIABLE` `targetAMOptions`

- **Line:** 211

---

### `VARIABLE` `optionsMap`

- **Line:** 212

---

### `VARIABLE` `filteredItems`

- **Line:** 230

---

### `VARIABLE` `lowerSearch`

- **Line:** 234

---

### `VARIABLE` `matchesName`

- **Line:** 235

---

### `VARIABLE` `matchesId`

- **Line:** 236

---

### `VARIABLE` `matchesEntityId`

- **Line:** 237

---

### `VARIABLE` `matchesCustomerEntityId`

- **Line:** 238

---

### `VARIABLE` `matchesProspectPlusId`

- **Line:** 239

---

### `VARIABLE` `matchesNetsuiteId`

- **Line:** 240

---

### `VARIABLE` `matchesInternalId`

- **Line:** 241

---

### `VARIABLE` `bucketVal`

- **Line:** 247

---

### `VARIABLE` `dialerVal`

- **Line:** 253

---

### `VARIABLE` `statusVal`

- **Line:** 259

---

### `VARIABLE` `amVal`

- **Line:** 265

---

### `VARIABLE` `franchiseeVal`

- **Line:** 271

---

### `VARIABLE` `leadDate`

- **Line:** 278

---

### `VARIABLE` `fromDate`

- **Line:** 281

---

### `VARIABLE` `toDate`

- **Line:** 282

---

### `VARIABLE` `allFilteredIds`

- **Line:** 291

---

### `VARIABLE` `totalPages`

- **Line:** 294

---

### `VARIABLE` `paginatedItems`

- **Line:** 295

---

### `VARIABLE` `start`

- **Line:** 297

---

### `FUNCTION` `handleSelectAllOnPage`

- **Line:** 302

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `pageIds`

- **Line:** 304

---

### `VARIABLE` `pageIds`

- **Line:** 307

---

### `VARIABLE` `isAllPageSelected`

- **Line:** 312

---

### `FUNCTION` `handleSingleReassign`

- **Line:** 315
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `newAM` | `string` | **Yes** | - | - |

---

### `FUNCTION` `executeBulkReassign`

- **Line:** 333
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadIdsToUpdate` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `allocation`

- **Line:** 344

---

### `VARIABLE` `successCount`

- **Line:** 349

---

### `VARIABLE` `failCount`

- **Line:** 350

---

### `VARIABLE` `chunkSize`

- **Line:** 351

---

### `VARIABLE` `chunk`

- **Line:** 354

---

### `VARIABLE` `am`

- **Line:** 357

---

### `VARIABLE` `allocationPreview`

- **Line:** 392

---

### `VARIABLE` `allocation`

- **Line:** 394

---

### `VARIABLE` `counts`

- **Line:** 395
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 404

---

### `FUNCTION` `clearFilters`

- **Line:** 414

---

### `VARIABLE` `isSelected`

- **Line:** 697

---

### `VARIABLE` `pageNum`

- **Line:** 848

---

