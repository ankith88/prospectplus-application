# Module: `src/components/discovery-questions-form.tsx`

- **Language:** TypeScript
- **Total Lines:** 268
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `VARIABLE` `discoverySignalGroups`

- **Line:** 30

---

### `VARIABLE` `lostPropertyOptions`

- **Line:** 70

---

### `VARIABLE` `FormSchema`

- **Line:** 77

---

### `INTERFACE` `DiscoveryQuestionsDialogProps`

- **Line:** 85

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `onSave` | `(data: DiscoveryData) => void` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(isOpen: boolean) => void` | No | - |

---

### `FUNCTION` `SignalButton`

- **Line:** 92

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ signal, field }` | `{ signal: any, field: any }` | **Yes** | - | - |

---

### `VARIABLE` `isSelected`

- **Line:** 93

---

### `VARIABLE` `newValue`

- **Line:** 101

---

### `FUNCTION` `DiscoveryQuestionsDialog`

- **Line:** 113
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, onSave, isOpen, onOpenChange }` | `DiscoveryQuestionsDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `form`

- **Line:** 115

---

### `VARIABLE` `watchedSignals`

- **Line:** 120

---

### `VARIABLE` `showDropOffHassle`

- **Line:** 121

---

### `VARIABLE` `isFieldSales`

- **Line:** 122

---

### `FUNCTION` `onSubmit`

- **Line:** 124
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `z.infer<typeof FormSchema>` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 125

---

