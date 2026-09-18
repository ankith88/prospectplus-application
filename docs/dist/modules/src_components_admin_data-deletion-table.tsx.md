# Module: `src/components/admin/data-deletion-table.tsx`

- **Language:** TypeScript
- **Total Lines:** 541
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `INTERFACE` `DataDeletionTableProps`

- **Line:** 37

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `collectionName` | `'leads' | 'companies'` | No | - |

---

### `VARIABLE` `leadStatuses`

- **Line:** 41
- **Signature:** `LeadStatus[]`

---

### `FUNCTION` `DataDeletionTable`

- **Line:** 43
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ collectionName }` | `DataDeletionTableProps` | **Yes** | - | - |

---

### `VARIABLE` `debouncedSearchTerm`

- **Line:** 62

---

### `VARIABLE` `debouncedCampaignFilter`

- **Line:** 63

---

### `FUNCTION` `fetchData`

- **Line:** 68
- **Async:** Yes

---

### `VARIABLE` `data`

- **Line:** 71

---

### `VARIABLE` `uniqueSources`

- **Line:** 91

---

### `VARIABLE` `sources`

- **Line:** 93

---

### `VARIABLE` `list`

- **Line:** 94

---

### `VARIABLE` `uniqueBuckets`

- **Line:** 98

---

### `VARIABLE` `buckets`

- **Line:** 100

---

### `VARIABLE` `list`

- **Line:** 101

---

### `VARIABLE` `filteredItems`

- **Line:** 110

---

### `VARIABLE` `lowercasedSearchTerm`

- **Line:** 112

---

### `VARIABLE` `lowercasedCampaignFilter`

- **Line:** 113

---

### `VARIABLE` `companyName`

- **Line:** 115

---

### `VARIABLE` `nameMatch`

- **Line:** 116

---

### `VARIABLE` `campaignMatch`

- **Line:** 131

---

### `VARIABLE` `campaign`

- **Line:** 133

---

### `VARIABLE` `statusMatch`

- **Line:** 141

---

### `VARIABLE` `bucketMatch`

- **Line:** 143

---

### `VARIABLE` `sourceMatch`

- **Line:** 147

---

### `VARIABLE` `effectivePageSize`

- **Line:** 156

---

### `VARIABLE` `totalPages`

- **Line:** 161

---

### `VARIABLE` `safeCurrentPage`

- **Line:** 162

---

### `VARIABLE` `startIndex`

- **Line:** 164

---

### `VARIABLE` `endIndex`

- **Line:** 165

---

### `VARIABLE` `displayedItems`

- **Line:** 167

---

### `VARIABLE` `displayedItemIds`

- **Line:** 171

---

### `VARIABLE` `filteredItemIds`

- **Line:** 172

---

### `VARIABLE` `isAllCurrentPageSelected`

- **Line:** 174

---

### `VARIABLE` `isSomeCurrentPageSelected`

- **Line:** 175

---

### `VARIABLE` `isAllMatchingSelected`

- **Line:** 176

---

### `FUNCTION` `handleSelectItem`

- **Line:** 178

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `itemId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleToggleSelectCurrentPage`

- **Line:** 184

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAllMatching`

- **Line:** 192

---

### `FUNCTION` `handleDeselectAll`

- **Line:** 196

---

### `FUNCTION` `handleJumpPage`

- **Line:** 200

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `pageNum`

- **Line:** 202

---

### `FUNCTION` `handleDelete`

- **Line:** 215
- **Async:** Yes

---

### `VARIABLE` `deleteFunction`

- **Line:** 219

---

### `VARIABLE` `leadStatusOptions`

- **Line:** 233
- **Signature:** `Option[]`

---

### `VARIABLE` `isSelected`

- **Line:** 381

---

### `VARIABLE` `netSuiteId`

- **Line:** 382

---

### `VARIABLE` `prospectPlusId`

- **Line:** 383

---

