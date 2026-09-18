# Module: `src/components/admin/granular-deletion.tsx`

- **Language:** TypeScript
- **Total Lines:** 277
- **Direct Dependencies:** 15 modules imported

## Exported Symbols & API

### `TYPE` `SubcollectionType`

- **Line:** 30
- **Signature:** `'contacts' | 'notes' | 'activity' | 'appointments'`

---

### `TYPE` `ItemToDelete`

- **Line:** 31
- **Signature:** `{
    leadId: string;
    subcollection: SubcollectionType;
    itemIds: string[];
    itemDescription: string;
}`

---

### `FUNCTION` `GranularDeletion`

- **Line:** 38
- **Returns:** `void`

---

### `FUNCTION` `handleSearch`

- **Line:** 53
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `cleanId`

- **Line:** 55

---

### `VARIABLE` `fetchedLead`

- **Line:** 61

---

### `VARIABLE` `leadQueries`

- **Line:** 68

---

### `VARIABLE` `snap`

- **Line:** 79

---

### `VARIABLE` `matchedDocId`

- **Line:** 81

---

### `FUNCTION` `handleItemSelection`

- **Line:** 100

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `subcollection` | `SubcollectionType` | **Yes** | - | - |
| `itemId` | `string` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleSelectAll`

- **Line:** 109

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `subcollection` | `SubcollectionType` | **Yes** | - | - |
| `items` | `any[]` | **Yes** | - | - |
| `checked` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `itemIds`

- **Line:** 110

---

### `FUNCTION` `handleDelete`

- **Line:** 117
- **Async:** Yes

---

### `VARIABLE` `updatedSubcollection`

- **Line:** 125

---

### `FUNCTION` `confirmDelete`

- **Line:** 139

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `subcollection` | `SubcollectionType` | **Yes** | - | - |

---

### `VARIABLE` `idsToDelete`

- **Line:** 140

---

### `INTERFACE` `SubcollectionTabContentProps`

- **Line:** 213

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `subcollection` | `SubcollectionType` | No | - |
| `columns` | `string[]` | No | - |
| `selectedItems` | `string[]` | No | - |
| `onSelect` | `(subcollection: SubcollectionType, itemId: string, checked: boolean) => void` | No | - |
| `onSelectAll` | `(subcollection: SubcollectionType, items: any[], checked: boolean) => void` | No | - |
| `onConfirmDelete` | `(subcollection: SubcollectionType) => void` | No | - |

---

### `FUNCTION` `SubcollectionTabContent`

- **Line:** 223
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, subcollection, columns, selectedItems, onSelect, onSelectAll, onConfirmDelete }` | `SubcollectionTabContentProps` | **Yes** | - | - |

---

### `VARIABLE` `items`

- **Line:** 224

---

### `VARIABLE` `allSelected`

- **Line:** 225

---

