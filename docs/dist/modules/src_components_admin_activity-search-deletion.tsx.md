# Module: `src/components/admin/activity-search-deletion.tsx`

- **Language:** TypeScript
- **Total Lines:** 220
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `TYPE` `ActivityWithLeadId`

- **Line:** 27
- **Signature:** `Activity & { leadId: string }`

---

### `FUNCTION` `ActivitySearchDeletion`

- **Line:** 29
- **Returns:** `void`

---

### `VARIABLE` `debouncedSearchTerm`

- **Line:** 39

---

### `FUNCTION` `handleSearch`

- **Line:** 42
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `map`

- **Line:** 57
- **Signature:** `Record<string, Lead>`

---

### `VARIABLE` `filtered`

- **Line:** 62

---

### `FUNCTION` `handleSelect`

- **Line:** 73

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `activityId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAll`

- **Line:** 79

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleDelete`

- **Line:** 83
- **Async:** Yes

---

### `VARIABLE` `activitiesByLead`

- **Line:** 87

---

### `VARIABLE` `isAllSelected`

- **Line:** 114

---

### `VARIABLE` `parentLead`

- **Line:** 166

---

### `VARIABLE` `netSuiteId`

- **Line:** 167

---

### `VARIABLE` `prospectPlusId`

- **Line:** 168

---

