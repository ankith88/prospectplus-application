# Module: `src/components/ui/custom-bulk-select-control.tsx`

- **Language:** TypeScript
- **Total Lines:** 317
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `CustomBulkSelectControlProps`

- **Line:** 13

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `allAvailableIds` | `string[]` | No | Ordered list of all lead IDs available in the current filtered/searched view |
| `selectedIds` | `string[]` | No | Currently selected lead IDs |
| `onSelect` | `(ids: string[]) => void` | No | Callback to set or update selected lead IDs |
| `onClear` | `() => void` | Yes | Callback to clear selection |
| `label` | `string` | Yes | Label for total count description (default: "Leads") |
| `compact` | `boolean` | Yes | Compact mode for tight table toolbars |
| `requireAdmin` | `boolean` | Yes | Restrict display to Admin / SuperAdmin users only (default: true) |
| `className` | `string` | Yes | - |

---

### `VARIABLE` `PRESETS`

- **Line:** 31

---

### `FUNCTION` `CustomBulkSelectControl`

- **Line:** 33
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  allAvailableIds = [],
  selectedIds = [],
  onSelect,
  onClear,
  label = 'Leads',
  compact = false,
  requireAdmin = true,
  className = '',
}` | `CustomBulkSelectControlProps` | **Yes** | - | - |

---

### `VARIABLE` `role`

- **Line:** 50

---

### `VARIABLE` `isAdminOrSuperAdmin`

- **Line:** 51

---

### `VARIABLE` `selectedCount`

- **Line:** 69

---

### `VARIABLE` `isPreselectedTarget`

- **Line:** 70

---

### `VARIABLE` `activePoolIds`

- **Line:** 71

---

### `VARIABLE` `totalAvailable`

- **Line:** 72

---

### `FUNCTION` `handleSelectCount`

- **Line:** 74

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `count` | `number` | **Yes** | - | - |
| `isRandom` | `any` | No | `false` | - |

---

### `VARIABLE` `targetCount`

- **Line:** 80

---

### `VARIABLE` `targetIds`

- **Line:** 81
- **Signature:** `string[]`

---

### `VARIABLE` `shuffled`

- **Line:** 85

---

### `VARIABLE` `finalIds`

- **Line:** 92
- **Signature:** `string[]`

---

### `FUNCTION` `handleSelectAll`

- **Line:** 109

---

### `FUNCTION` `handleCustomSubmit`

- **Line:** 113

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | No | - | - |
| `isRandom` | `any` | No | `false` | - |

---

### `VARIABLE` `parsed`

- **Line:** 115

---

### `FUNCTION` `handleClear`

- **Line:** 123

---

