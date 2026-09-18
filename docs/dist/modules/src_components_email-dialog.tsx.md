# Module: `src/components/email-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 220
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `INTERFACE` `EmailDialogProps`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `toEmail` | `string` | No | - |
| `recipientName` | `string` | Yes | - |
| `senderEmail` | `string` | Yes | - |
| `leadId` | `string` | Yes | - |

---

### `FUNCTION` `EmailDialog`

- **Line:** 33
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onClose, toEmail, recipientName, senderEmail, leadId }` | `EmailDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `handleFileUpload`

- **Line:** 43
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 44

---

### `VARIABLE` `storageRef`

- **Line:** 49

---

### `VARIABLE` `downloadURL`

- **Line:** 51

---

### `FUNCTION` `removeAttachment`

- **Line:** 63

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleSend`

- **Line:** 67
- **Async:** Yes

---

### `VARIABLE` `response`

- **Line:** 79

---

### `VARIABLE` `result`

- **Line:** 96

---

