# Module: `src/components/revisit-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 160
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `VARIABLE` `formSchema`

- **Line:** 35

---

### `TYPE` `FormValues`

- **Line:** 40
- **Signature:** `z.infer<typeof formSchema>`

---

### `INTERFACE` `RevisitDialogProps`

- **Line:** 42

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `lead` | `Lead` | No | - |
| `onRevisitScheduled` | `() => void` | No | - |

---

### `FUNCTION` `RevisitDialog`

- **Line:** 49
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange, lead, onRevisitScheduled }` | `RevisitDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `form`

- **Line:** 54

---

### `FUNCTION` `handleSubmit`

- **Line:** 61
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `FormValues` | **Yes** | - | - |

---

### `VARIABLE` `combinedDateTime`

- **Line:** 71

---

### `VARIABLE` `appointmentData`

- **Line:** 74

---

