# Module: `src/components/ask/quick-task-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 158
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `QuickTaskDialogProps`

- **Line:** 13

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `defaultTitle` | `string` | Yes | - |
| `leadId` | `string` | Yes | - |
| `companyName` | `string` | Yes | - |
| `onTaskCreated` | `(task: any) => void` | Yes | - |

---

### `FUNCTION` `QuickTaskDialog`

- **Line:** 22
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onClose,
  defaultTitle = "",
  leadId,
  companyName,
  onTaskCreated,
}` | `QuickTaskDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `tomorrow`

- **Line:** 33

---

### `FUNCTION` `handleCreate`

- **Line:** 40
- **Async:** Yes

---

### `VARIABLE` `idToken`

- **Line:** 52

---

### `VARIABLE` `res`

- **Line:** 53

---

### `VARIABLE` `data`

- **Line:** 68

---

