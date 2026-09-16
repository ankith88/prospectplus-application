# Module: `src/app/transcripts/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 468
- **Direct Dependencies:** 26 modules imported

## Exported Symbols & API

### `FUNCTION` `TranscriptsPage`

- **Line:** 50
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 64

---

### `VARIABLE` `isSuperAdminUid`

- **Line:** 69

---

### `VARIABLE` `hasAccess`

- **Line:** 70

---

### `FUNCTION` `fetchTranscripts`

- **Line:** 72
- **Async:** Yes

---

### `VARIABLE` `fetchedTranscripts`

- **Line:** 76

---

### `FUNCTION` `fetchLeads`

- **Line:** 86
- **Async:** Yes

---

### `VARIABLE` `leads`

- **Line:** 88

---

### `FUNCTION` `handleFilterChange`

- **Line:** 112

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof filters` | **Yes** | - | - |
| `value` | `string | DateRange | undefined` | **Yes** | - | - |

---

### `FUNCTION` `clearFilters`

- **Line:** 116

---

### `FUNCTION` `getLeadByPhoneNumber`

- **Line:** 120

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `phoneNumber` | `string` | **Yes** | - | - |

---

### `VARIABLE` `filteredTranscripts`

- **Line:** 125

---

### `VARIABLE` `isAm`

- **Line:** 126

---

### `VARIABLE` `lead`

- **Line:** 129

---

### `VARIABLE` `isAuthor`

- **Line:** 132

---

### `VARIABLE` `isAmLead`

- **Line:** 133

---

### `VARIABLE` `phoneMatch`

- **Line:** 137

---

### `VARIABLE` `callIdMatch`

- **Line:** 138

---

### `VARIABLE` `transcriptDate`

- **Line:** 139

---

### `VARIABLE` `dateMatch`

- **Line:** 140

---

### `VARIABLE` `leadNameMatch`

- **Line:** 141

---

### `FUNCTION` `handleSyncTranscripts`

- **Line:** 147
- **Async:** Yes

---

### `VARIABLE` `result`

- **Line:** 154

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 174

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 178

---

### `FUNCTION` `formatTranscriptContent`

- **Line:** 185
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `content` | `string` | **Yes** | - | - |

---

### `VARIABLE` `utterances`

- **Line:** 187

---

### `FUNCTION` `handleExport`

- **Line:** 197

---

### `VARIABLE` `headers`

- **Line:** 198

---

### `VARIABLE` `rows`

- **Line:** 199

---

### `VARIABLE` `lead`

- **Line:** 200

---

### `VARIABLE` `csvContent`

- **Line:** 212

---

### `VARIABLE` `blob`

- **Line:** 213

---

### `VARIABLE` `link`

- **Line:** 214

---

### `VARIABLE` `url`

- **Line:** 215

---

### `VARIABLE` `hasActiveFilters`

- **Line:** 239

---

### `VARIABLE` `lead`

- **Line:** 370

---

### `VARIABLE` `updatedTranscripts`

- **Line:** 456

---

