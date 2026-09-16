# Module: `src/components/admin/lpo-lead-deletion.tsx`

- **Language:** TypeScript
- **Total Lines:** 262
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `INTERFACE` `LpoLead`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `customerEntityId` | `string` | Yes | - |
| `entityId` | `string` | Yes | - |
| `netsuiteId` | `string` | Yes | - |
| `prospectPlusId` | `string` | Yes | - |
| `lpoName` | `string` | Yes | - |
| `lpoOwnerName` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `status` | `string` | Yes | - |
| `createdAt` | `any` | Yes | - |

---

### `FUNCTION` `LpoLeadDeletion`

- **Line:** 37
- **Returns:** `void`

---

### `FUNCTION` `handleSearch`

- **Line:** 49
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `nameTerm`

- **Line:** 51

---

### `VARIABLE` `idTerm`

- **Line:** 52

---

### `VARIABLE` `q`

- **Line:** 61

---

### `VARIABLE` `snap`

- **Line:** 62

---

### `VARIABLE` `allLeads`

- **Line:** 64
- **Signature:** `LpoLead[]`

---

### `VARIABLE` `filtered`

- **Line:** 72

---

### `VARIABLE` `matchesName`

- **Line:** 73

---

### `VARIABLE` `matchesId`

- **Line:** 74

---

### `FUNCTION` `handleSelectLead`

- **Line:** 95

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAll`

- **Line:** 101

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleDelete`

- **Line:** 105
- **Async:** Yes

---

### `VARIABLE` `batch`

- **Line:** 111

---

### `VARIABLE` `activitySnap`

- **Line:** 117

---

### `VARIABLE` `isAllSelected`

- **Line:** 137

---

### `VARIABLE` `netSuiteId`

- **Line:** 206

---

