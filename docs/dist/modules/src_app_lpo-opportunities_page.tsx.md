# Module: `src/app/lpo-opportunities/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 489
- **Direct Dependencies:** 18 modules imported

## Exported Symbols & API

### `FUNCTION` `isLeadLinkedToLpo`

- **Line:** 22
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `op` | `any` | **Yes** | - | - |

---

### `FUNCTION` `LpoOpportunitiesPage`

- **Line:** 38
- **Returns:** `void`

---

### `FUNCTION` `handleCopyLink`

- **Line:** 53

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `token`

- **Line:** 54

---

### `VARIABLE` `origin`

- **Line:** 55

---

### `VARIABLE` `publicUrl`

- **Line:** 56

---

### `FUNCTION` `handleOpenShareModal`

- **Line:** 67

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `qLeads`

- **Line:** 76

---

### `VARIABLE` `qCompanies`

- **Line:** 77

---

### `VARIABLE` `qLeadsBucket`

- **Line:** 78

---

### `VARIABLE` `qCompBucket`

- **Line:** 79

---

### `VARIABLE` `leadsData`

- **Line:** 81
- **Signature:** `Lead[]`

---

### `VARIABLE` `companiesData`

- **Line:** 82
- **Signature:** `Lead[]`

---

### `VARIABLE` `leadsBucketData`

- **Line:** 83
- **Signature:** `Lead[]`

---

### `VARIABLE` `compBucketData`

- **Line:** 84
- **Signature:** `Lead[]`

---

### `VARIABLE` `unsubLeads`

- **Line:** 86

---

### `VARIABLE` `unsubCompanies`

- **Line:** 94

---

### `VARIABLE` `unsubLeadsBucket`

- **Line:** 102

---

### `VARIABLE` `unsubCompBucket`

- **Line:** 109

---

### `FUNCTION` `combineAndSet`

- **Line:** 116
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `combined`

- **Line:** 118

---

### `VARIABLE` `unique`

- **Line:** 119

---

### `VARIABLE` `enriched`

- **Line:** 122

---

### `VARIABLE` `parentColl`

- **Line:** 125

---

### `VARIABLE` `subRef`

- **Line:** 126

---

### `VARIABLE` `subSnap`

- **Line:** 127

---

### `VARIABLE` `historyList`

- **Line:** 129
- **Signature:** `any[]`

---

### `VARIABLE` `linked`

- **Line:** 136

---

### `VARIABLE` `lpoSnap`

- **Line:** 139

---

### `VARIABLE` `lpoSnap2`

- **Line:** 143

---

### `VARIABLE` `linkedOpps`

- **Line:** 188

---

### `VARIABLE` `unlinkedOpps`

- **Line:** 189

---

### `FUNCTION` `filterByQuery`

- **Line:** 191

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `list` | `Lead[]` | **Yes** | - | - |

---

### `VARIABLE` `q`

- **Line:** 192

---

### `VARIABLE` `l`

- **Line:** 195

---

### `FUNCTION` `renderTable`

- **Line:** 216

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `oppList` | `Lead[]` | **Yes** | - | - |
| `isLinkedTab` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `filtered`

- **Line:** 217

---

### `VARIABLE` `l`

- **Line:** 250

---

### `VARIABLE` `rawAdd1`

- **Line:** 253

---

### `VARIABLE` `address1Val`

- **Line:** 254

---

### `VARIABLE` `streetVal`

- **Line:** 258

---

### `VARIABLE` `cityVal`

- **Line:** 259

---

### `VARIABLE` `stateVal`

- **Line:** 260

---

### `VARIABLE` `zipVal`

- **Line:** 261

---

### `VARIABLE` `locationParts`

- **Line:** 263

---

### `VARIABLE` `locationStr`

- **Line:** 264

---

### `VARIABLE` `movedBy`

- **Line:** 267

---

### `VARIABLE` `lpoHistory`

- **Line:** 269

---

### `VARIABLE` `lpoNameStr`

- **Line:** 285

---

