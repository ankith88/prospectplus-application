# Module: `src/components/admin/lead-status-updater.tsx`

- **Language:** TypeScript
- **Total Lines:** 862
- **Direct Dependencies:** 20 modules imported

## Exported Symbols & API

### `VARIABLE` `LEAD_STATUSES`

- **Line:** 38
- **Signature:** `LeadStatus[]`

---

### `FUNCTION` `LeadStatusUpdater`

- **Line:** 48
- **Returns:** `void`

---

### `VARIABLE` `debouncedSearchTerm`

- **Line:** 72

---

### `FUNCTION` `fetchLeads`

- **Line:** 75
- **Async:** Yes

---

### `VARIABLE` `data`

- **Line:** 78

---

### `VARIABLE` `uniqueSources`

- **Line:** 99

---

### `VARIABLE` `sources`

- **Line:** 100

---

### `VARIABLE` `list`

- **Line:** 101

---

### `VARIABLE` `uniqueBuckets`

- **Line:** 105

---

### `VARIABLE` `buckets`

- **Line:** 106

---

### `VARIABLE` `list`

- **Line:** 107

---

### `VARIABLE` `uniqueAMs`

- **Line:** 114

---

### `VARIABLE` `ams`

- **Line:** 115

---

### `VARIABLE` `list`

- **Line:** 116

---

### `VARIABLE` `uniqueDialers`

- **Line:** 120

---

### `VARIABLE` `dialers`

- **Line:** 121

---

### `VARIABLE` `list`

- **Line:** 122

---

### `VARIABLE` `filteredItems`

- **Line:** 126

---

### `VARIABLE` `lowerSearch`

- **Line:** 130

---

### `VARIABLE` `matchesName`

- **Line:** 131

---

### `VARIABLE` `matchesId`

- **Line:** 132

---

### `VARIABLE` `matchesEntityId`

- **Line:** 133

---

### `VARIABLE` `matchesCustomerEntityId`

- **Line:** 134

---

### `VARIABLE` `matchesProspectPlusId`

- **Line:** 135

---

### `VARIABLE` `matchesNetsuiteId`

- **Line:** 136

---

### `VARIABLE` `matchesInternalId`

- **Line:** 137

---

### `VARIABLE` `sourceVal`

- **Line:** 143

---

### `VARIABLE` `bucketVal`

- **Line:** 149

---

### `VARIABLE` `amVal`

- **Line:** 160

---

### `VARIABLE` `dialerVal`

- **Line:** 166

---

### `VARIABLE` `leadDate`

- **Line:** 172

---

### `VARIABLE` `start`

- **Line:** 175

---

### `VARIABLE` `end`

- **Line:** 176

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 185

---

### `VARIABLE` `effectivePageSize`

- **Line:** 198

---

### `VARIABLE` `totalPages`

- **Line:** 203

---

### `VARIABLE` `safeCurrentPage`

- **Line:** 204

---

### `VARIABLE` `startIndex`

- **Line:** 206

---

### `VARIABLE` `endIndex`

- **Line:** 207

---

### `VARIABLE` `displayedItems`

- **Line:** 209

---

### `VARIABLE` `displayedItemIds`

- **Line:** 213

---

### `VARIABLE` `filteredItemIds`

- **Line:** 214

---

### `VARIABLE` `isAllCurrentPageSelected`

- **Line:** 217

---

### `VARIABLE` `isSomeCurrentPageSelected`

- **Line:** 218

---

### `VARIABLE` `isAllMatchingSelected`

- **Line:** 219

---

### `FUNCTION` `handleSelectItem`

- **Line:** 221

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `itemId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleToggleSelectCurrentPage`

- **Line:** 227

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAllMatching`

- **Line:** 235

---

### `FUNCTION` `handleSelectCurrentPageOnly`

- **Line:** 239

---

### `FUNCTION` `handleDeselectAll`

- **Line:** 243

---

### `FUNCTION` `handleJumpPage`

- **Line:** 247

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `pageNum`

- **Line:** 249

---

### `FUNCTION` `handleSingleStatusUpdate`

- **Line:** 263
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `newStatus` | `LeadStatus` | **Yes** | - | - |

---

### `FUNCTION` `handleBulkStatusUpdate`

- **Line:** 284
- **Async:** Yes

---

### `VARIABLE` `CHUNK_SIZE`

- **Line:** 289

---

### `VARIABLE` `targetStatus`

- **Line:** 290

---

### `VARIABLE` `selectedSet`

- **Line:** 291

---

### `VARIABLE` `completedCount`

- **Line:** 292

---

### `VARIABLE` `chunk`

- **Line:** 296

---

### `FUNCTION` `clearFilters`

- **Line:** 331

---

### `VARIABLE` `leadStatusOptions`

- **Line:** 341
- **Signature:** `Option[]`

---

### `VARIABLE` `isSelected`

- **Line:** 699

---

### `VARIABLE` `netSuiteId`

- **Line:** 700

---

### `VARIABLE` `prospectPlusId`

- **Line:** 701

---

