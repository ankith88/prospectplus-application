# Module: `src/components/check-ins-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 415
- **Direct Dependencies:** 22 modules imported

## Exported Symbols & API

### `TYPE` `SortableKeys`

- **Line:** 27
- **Signature:** `'dateLeadEntered' | 'leadId' | 'entityId' | 'companyName' | 'status' | 'franchisee' | 'dialerAssigned' | 'outcome' | 'address'`

---

### `TYPE` `LeadWithVisitNote`

- **Line:** 28
- **Signature:** `Lead & { visitNote?: VisitNote }`

---

### `FUNCTION` `CheckinsClientPage`

- **Line:** 30
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 35

---

### `VARIABLE` `searchParams`

- **Line:** 36

---

### `VARIABLE` `isFranchisee`

- **Line:** 38

---

### `VARIABLE` `userParam`

- **Line:** 52

---

### `VARIABLE` `franchiseeParam`

- **Line:** 53

---

### `VARIABLE` `dateFrom`

- **Line:** 54

---

### `VARIABLE` `dateTo`

- **Line:** 55

---

### `VARIABLE` `statusParam`

- **Line:** 56

---

### `VARIABLE` `newFilters`

- **Line:** 58

---

### `FUNCTION` `fetchData`

- **Line:** 79
- **Async:** Yes

---

### `VARIABLE` `allItems`

- **Line:** 88

---

### `FUNCTION` `handleFilterChange`

- **Line:** 104

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 108

---

### `VARIABLE` `leadsWithVisitNotes`

- **Line:** 117

---

### `VARIABLE` `visitNotesMap`

- **Line:** 118

---

### `VARIABLE` `filteredLeads`

- **Line:** 128

---

### `VARIABLE` `leads`

- **Line:** 129

---

### `VARIABLE` `fromDate`

- **Line:** 146

---

### `VARIABLE` `toDate`

- **Line:** 147

---

### `VARIABLE` `noteDate`

- **Line:** 150

---

### `VARIABLE` `sortedLeads`

- **Line:** 159

---

### `VARIABLE` `sortableItems`

- **Line:** 160
- **Signature:** `LeadWithVisitNote[]`

---

### `VARIABLE` `aValue`

- **Line:** 163
- **Signature:** `any`

---

### `VARIABLE` `bValue`

- **Line:** 164
- **Signature:** `any`

---

### `FUNCTION` `requestSort`

- **Line:** 208

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableKeys` | **Yes** | - | - |

---

### `VARIABLE` `direction`

- **Line:** 209
- **Signature:** `'ascending' | 'descending'`

---

### `FUNCTION` `getSortIndicator`

- **Line:** 216

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `SortableKeys` | **Yes** | - | - |

---

### `VARIABLE` `userOptions`

- **Line:** 223
- **Signature:** `Option[]`

---

### `VARIABLE` `users`

- **Line:** 224

---

### `VARIABLE` `franchiseeOptions`

- **Line:** 228
- **Signature:** `Option[]`

---

### `VARIABLE` `franchisees`

- **Line:** 229

---

### `VARIABLE` `statusOptions`

- **Line:** 233
- **Signature:** `Option[]`

---

### `VARIABLE` `statuses`

- **Line:** 234

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 238

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 240

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 244

---

### `FUNCTION` `handleExport`

- **Line:** 251

---

### `VARIABLE` `headers`

- **Line:** 257

---

### `VARIABLE` `rows`

- **Line:** 258

---

### `VARIABLE` `csvContent`

- **Line:** 270

---

### `VARIABLE` `blob`

- **Line:** 271

---

### `VARIABLE` `link`

- **Line:** 272

---

### `VARIABLE` `url`

- **Line:** 273

---

### `VARIABLE` `visitDate`

- **Line:** 378

---

