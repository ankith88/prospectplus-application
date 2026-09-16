# Module: `src/components/edit-task-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 234
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `INTERFACE` `EditTaskDialogProps`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `task` | `(Task & { leadId?: string; leadName?: string }) | null` | No | - |
| `open` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `onTaskUpdated` | `(updatedTask: Task) => void` | Yes | - |

---

### `FUNCTION` `EditTaskDialog`

- **Line:** 31
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  task,
  open,
  onOpenChange,
  onTaskUpdated,
}` | `EditTaskDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `initialDate`

- **Line:** 49

---

### `VARIABLE` `hours`

- **Line:** 52

---

### `VARIABLE` `minutes`

- **Line:** 53

---

### `FUNCTION` `handleSubmit`

- **Line:** 60
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `h`

- **Line:** 67

---

### `VARIABLE` `m`

- **Line:** 68

---

### `VARIABLE` `finalDueDate`

- **Line:** 70

---

### `VARIABLE` `dueDateIso`

- **Line:** 71

---

### `VARIABLE` `duration`

- **Line:** 72

---

### `VARIABLE` `updates`

- **Line:** 74
- **Signature:** `Partial<Task>`

---

### `VARIABLE` `targetLeadId`

- **Line:** 81

---

### `VARIABLE` `userEmail`

- **Line:** 87

---

### `VARIABLE` `userId`

- **Line:** 88

---

### `VARIABLE` `outlookEventId`

- **Line:** 90

---

### `VARIABLE` `syncRes`

- **Line:** 94

---

### `VARIABLE` `syncData`

- **Line:** 109

---

### `VARIABLE` `updatedTask`

- **Line:** 122
- **Signature:** `Task`

---

