# Module: `src/components/admin/cancellation-reasons-manager.tsx`

- **Language:** TypeScript
- **Total Lines:** 364
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `FUNCTION` `CancellationReasonsManager`

- **Line:** 16
- **Returns:** `void`

---

### `FUNCTION` `fetchHierarchy`

- **Line:** 39
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 42

---

### `VARIABLE` `list`

- **Line:** 43

---

### `FUNCTION` `toggleTheme`

- **Line:** 53

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `toggleWhy`

- **Line:** 57

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `saveHierarchy`

- **Line:** 61
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updatedThemes` | `any[]` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 62

---

### `VARIABLE` `collectionRef`

- **Line:** 63

---

### `VARIABLE` `docRef`

- **Line:** 65

---

### `FUNCTION` `handleOpenTheme`

- **Line:** 74

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | `'add' | 'edit'` | **Yes** | - | - |
| `theme` | `any` | No | - | - |

---

### `FUNCTION` `handleSaveTheme`

- **Line:** 86
- **Async:** Yes

---

### `VARIABLE` `updated`

- **Line:** 88

---

### `FUNCTION` `handleDeleteTheme`

- **Line:** 98
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `themeId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `batch`

- **Line:** 100

---

### `VARIABLE` `docRef`

- **Line:** 102

---

### `FUNCTION` `handleOpenWhy`

- **Line:** 110

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | `'add' | 'edit'` | **Yes** | - | - |
| `themeId` | `string` | **Yes** | - | - |
| `why` | `any` | No | - | - |

---

### `FUNCTION` `handleSaveWhy`

- **Line:** 123
- **Async:** Yes

---

### `VARIABLE` `updated`

- **Line:** 125

---

### `VARIABLE` `newWhys`

- **Line:** 127

---

### `FUNCTION` `handleDeleteWhy`

- **Line:** 139
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `themeId` | `string` | **Yes** | - | - |
| `whyId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 141

---

### `FUNCTION` `handleOpenReason`

- **Line:** 149

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | `'add' | 'edit'` | **Yes** | - | - |
| `themeId` | `string` | **Yes** | - | - |
| `whyId` | `string` | **Yes** | - | - |
| `reason` | `any` | No | - | - |

---

### `FUNCTION` `handleSaveReason`

- **Line:** 163
- **Async:** Yes

---

### `VARIABLE` `updated`

- **Line:** 165

---

### `VARIABLE` `newWhys`

- **Line:** 167

---

### `VARIABLE` `newReasons`

- **Line:** 169

---

### `FUNCTION` `handleDeleteReason`

- **Line:** 183
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `themeId` | `string` | **Yes** | - | - |
| `whyId` | `string` | **Yes** | - | - |
| `reasonId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 185

---

### `VARIABLE` `newWhys`

- **Line:** 187

---

### `VARIABLE` `isThemeExpanded`

- **Line:** 220

---

### `VARIABLE` `isWhyExpanded`

- **Line:** 247

---

