# Module: `functions/src/services/emailDispatcher.ts`

- **Language:** TypeScript
- **Total Lines:** 201
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `EmailDispatchOptions`

- **Line:** 5

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `to` | `string` | No | - |
| `subject` | `string` | No | - |
| `html` | `string` | No | - |
| `customFrom` | `string` | Yes | - |
| `cc` | `string` | Yes | - |
| `bcc` | `string` | Yes | - |
| `leadId` | `string` | Yes | - |
| `prospectPlusId` | `string` | Yes | - |

---

### `FUNCTION` `extractCleanEmail`

- **Line:** 16
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `toField` | `string` | **Yes** | - | - |

---

### `VARIABLE` `match`

- **Line:** 17

---

### `FUNCTION` `isInternalRecipient`

- **Line:** 24
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `toField` | `string` | **Yes** | - | - |

---

### `VARIABLE` `parts`

- **Line:** 26

---

### `VARIABLE` `match`

- **Line:** 28

---

### `VARIABLE` `email`

- **Line:** 29

---

### `FUNCTION` `sendAutomatedEmail`

- **Line:** 37
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; simulated: boolean; error?: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ to, subject, html, customFrom, cc, bcc, leadId, prospectPlusId }` | `EmailDispatchOptions` | **Yes** | - | - |

---

### `VARIABLE` `db`

- **Line:** 39

---

### `VARIABLE` `configSnap`

- **Line:** 40

---

### `VARIABLE` `config`

- **Line:** 46

---

### `VARIABLE` `finalSender`

- **Line:** 54

---

### `VARIABLE` `finalProspectPlusId`

- **Line:** 57

---

### `VARIABLE` `leadSnap`

- **Line:** 61

---

### `VARIABLE` `cleanEmail`

- **Line:** 66

---

### `VARIABLE` `contactsSnap`

- **Line:** 68

---

### `VARIABLE` `leadRef`

- **Line:** 70

---

### `VARIABLE` `leadSnap`

- **Line:** 72

---

### `VARIABLE` `updatedHtml`

- **Line:** 85

---

### `VARIABLE` `idBadge`

- **Line:** 87

---

### `VARIABLE` `bodyCloseIndex`

- **Line:** 88

---

### `VARIABLE` `transporter`

- **Line:** 103

---

### `VARIABLE` `tokenUrl`

- **Line:** 135

---

### `VARIABLE` `tokenBody`

- **Line:** 136

---

### `VARIABLE` `tokenRes`

- **Line:** 143

---

### `VARIABLE` `errText`

- **Line:** 150

---

### `VARIABLE` `tokenData`

- **Line:** 154

---

### `VARIABLE` `accessToken`

- **Line:** 155

---

### `VARIABLE` `sendMailUrl`

- **Line:** 157

---

### `VARIABLE` `mailPayload`

- **Line:** 158
- **Signature:** `any`

---

### `VARIABLE` `graphRes`

- **Line:** 177

---

### `VARIABLE` `errText`

- **Line:** 187

---

