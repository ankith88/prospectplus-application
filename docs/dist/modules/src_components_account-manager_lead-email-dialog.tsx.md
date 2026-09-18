# Module: `src/components/account-manager/lead-email-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 318
- **Direct Dependencies:** 18 modules imported

## Exported Symbols & API

### `INTERFACE` `LeadEmailDialogProps`

- **Line:** 29

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `lead` | `Lead | null` | No | - |
| `onEmailSent` | `(leadId: string, timestamp: string) => void` | Yes | - |

---

### `INTERFACE` `Template`

- **Line:** 36

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `subject` | `string` | No | - |
| `body` | `string` | No | - |

---

### `FUNCTION` `LeadEmailDialog`

- **Line:** 43
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onClose, lead, onEmailSent }` | `LeadEmailDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `fetchTemplates`

- **Line:** 54
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `snap`

- **Line:** 56

---

### `VARIABLE` `list`

- **Line:** 57

---

### `FUNCTION` `applyTemplate`

- **Line:** 71

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `templateId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `template`

- **Line:** 78

---

### `VARIABLE` `primaryContact`

- **Line:** 80

---

### `VARIABLE` `contactName`

- **Line:** 81

---

### `VARIABLE` `encryptedId`

- **Line:** 82

---

### `VARIABLE` `sofPublicLink`

- **Line:** 83

---

### `VARIABLE` `parsedSubject`

- **Line:** 85

---

### `VARIABLE` `parsedBody`

- **Line:** 97

---

### `FUNCTION` `insertPlaceholder`

- **Line:** 114

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ph` | `string` | **Yes** | - | - |

---

### `FUNCTION` `insertSubjectPlaceholder`

- **Line:** 118

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ph` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleSend`

- **Line:** 122
- **Async:** Yes

---

### `VARIABLE` `hasPrimary`

- **Line:** 125

---

### `VARIABLE` `primaryContact`

- **Line:** 131

---

### `VARIABLE` `toEmail`

- **Line:** 132

---

### `VARIABLE` `response`

- **Line:** 146

---

### `VARIABLE` `result`

- **Line:** 163

---

### `VARIABLE` `hasPrimary`

- **Line:** 179

---

### `VARIABLE` `primaryContact`

- **Line:** 180

---

### `VARIABLE` `toEmail`

- **Line:** 181

---

