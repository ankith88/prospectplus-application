# Module: `src/lib/verify-email-client.ts`

- **Language:** TypeScript
- **Total Lines:** 51
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `VerifyEmailsParams`

- **Line:** 3

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `emails` | `string[]` | No | - |
| `leadId` | `string` | Yes | - |
| `companyId` | `string` | Yes | - |
| `contactId` | `string` | Yes | - |
| `forceRefresh` | `boolean` | Yes | - |

---

### `FUNCTION` `verifyEmailsClient`

- **Line:** 11
- **Async:** Yes
- **Returns:** `Promise<EmailVerificationResult[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  emails,
  leadId,
  companyId,
  contactId,
  forceRefresh = false,
}` | `VerifyEmailsParams` | **Yes** | - | - |

---

### `VARIABLE` `cleanEmails`

- **Line:** 18

---

### `VARIABLE` `response`

- **Line:** 27

---

### `VARIABLE` `errData`

- **Line:** 40

---

### `VARIABLE` `data`

- **Line:** 44

---

