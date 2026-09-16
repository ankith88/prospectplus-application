# Module: `src/components/sms-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 116
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `SmsDialogProps`

- **Line:** 21

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `phoneNumber` | `string` | No | - |
| `recipientName` | `string` | Yes | - |
| `lead` | `any` | Yes | - |
| `leadId` | `string` | Yes | - |

---

### `FUNCTION` `SmsDialog`

- **Line:** 30
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onClose, phoneNumber, recipientName, lead, leadId }` | `SmsDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `isUserRole`

- **Line:** 36

---

### `FUNCTION` `handleSend`

- **Line:** 38
- **Async:** Yes

---

### `VARIABLE` `activeLead`

- **Line:** 51

---

### `VARIABLE` `finalMessage`

- **Line:** 52

---

### `VARIABLE` `result`

- **Line:** 64

---

