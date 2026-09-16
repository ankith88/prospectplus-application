# Module: `src/components/schedule-appointment-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 310
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `INTERFACE` `ScheduleAppointmentDialogProps`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `lead` | `Lead` | No | - |
| `accountManagers` | `string[]` | Yes | - |
| `onAssignAccountManager` | `(amName: string, contactId: string) => Promise<string | null>` | Yes | - |
| `onAppointmentScheduled` | `() => void` | Yes | - |
| `onCreateContact` | `() => void` | Yes | - |
| `onContactAdded` | `(contact: Contact) => void` | Yes | - |

---

### `FUNCTION` `ScheduleAppointmentDialog`

- **Line:** 35
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onOpenChange,
  lead,
  accountManagers,
  onAssignAccountManager,
  onAppointmentScheduled,
  onCreateContact,
  onContactAdded
}` | `ScheduleAppointmentDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `amList`

- **Line:** 54

---

### `FUNCTION` `handleCreateContact`

- **Line:** 64

---

### `FUNCTION` `handleInlineContactAdded`

- **Line:** 71

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `newContact` | `Contact` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 73

---

### `FUNCTION` `handleAmSelection`

- **Line:** 85
- **Async:** Yes

---

### `VARIABLE` `urlId`

- **Line:** 90
- **Signature:** `string | null`

---

### `VARIABLE` `newBookingUrlId`

- **Line:** 93

---

### `VARIABLE` `updates`

- **Line:** 99
- **Signature:** `any`

---

### `VARIABLE` `updates`

- **Line:** 111
- **Signature:** `any`

---

### `FUNCTION` `handleCopyLink`

- **Line:** 134

---

### `FUNCTION` `handleOpenChange`

- **Line:** 142

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `open` | `boolean` | **Yes** | - | - |

---

