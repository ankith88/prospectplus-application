# Module: `src/app/admin/mailbox/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 952
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `INTERFACE` `EmailLog`

- **Line:** 50

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `timestamp` | `string` | No | - |
| `senderEmail` | `string` | No | - |
| `recipientEmail` | `string` | Yes | - |
| `subject` | `string` | No | - |
| `body` | `string` | Yes | - |
| `intent` | `string` | Yes | - |
| `reasoning` | `string` | Yes | - |
| `suggestedStatus` | `string` | Yes | - |
| `leadId` | `string` | Yes | - |
| `status` | `string` | No | - |
| `error` | `string` | Yes | - |
| `reason` | `string` | Yes | - |
| `companyName` | `string` | Yes | - |
| `leadName` | `string` | Yes | - |

---

### `FUNCTION` `MailboxPage`

- **Line:** 68
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 71

---

### `VARIABLE` `allowedMailboxRoles`

- **Line:** 74

---

### `VARIABLE` `hasAccess`

- **Line:** 84

---

### `FUNCTION` `fetchLogs`

- **Line:** 119
- **Async:** Yes

---

### `VARIABLE` `q`

- **Line:** 122

---

### `VARIABLE` `snap`

- **Line:** 126

---

### `VARIABLE` `items`

- **Line:** 127
- **Signature:** `EmailLog[]`

---

### `VARIABLE` `leadCache`

- **Line:** 128
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `data`

- **Line:** 131

---

### `VARIABLE` `senderEmail`

- **Line:** 132

---

### `VARIABLE` `recipientEmail`

- **Line:** 133

---

### `VARIABLE` `userEmail`

- **Line:** 136

---

### `VARIABLE` `parentRef`

- **Line:** 146

---

### `VARIABLE` `companyName`

- **Line:** 147

---

### `VARIABLE` `leadName`

- **Line:** 148

---

### `VARIABLE` `leadId`

- **Line:** 151

---

### `VARIABLE` `leadSnap`

- **Line:** 153

---

### `VARIABLE` `timestamp`

- **Line:** 167

---

### `VARIABLE` `body`

- **Line:** 168

---

### `VARIABLE` `list`

- **Line:** 211

---

### `VARIABLE` `selected`

- **Line:** 222

---

### `FUNCTION` `handleGenerateDraft`

- **Line:** 229
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 233

---

### `VARIABLE` `data`

- **Line:** 238

---

### `FUNCTION` `handleCopyDraft`

- **Line:** 264

---

### `VARIABLE` `fullText`

- **Line:** 265

---

### `FUNCTION` `handleFileUpload`

- **Line:** 274
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 275

---

### `VARIABLE` `storageRef`

- **Line:** 280

---

### `VARIABLE` `downloadURL`

- **Line:** 282

---

### `FUNCTION` `removeAttachment`

- **Line:** 294

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleSendEmail`

- **Line:** 297
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 310

---

### `VARIABLE` `data`

- **Line:** 326

---

### `FUNCTION` `handleOpenReply`

- **Line:** 357

---

### `VARIABLE` `dateStr`

- **Line:** 361

---

### `VARIABLE` `cleanBody`

- **Line:** 362

---

### `VARIABLE` `filteredLogs`

- **Line:** 386

---

### `VARIABLE` `matchesSearch`

- **Line:** 387

---

### `VARIABLE` `logIntent`

- **Line:** 393

---

### `FUNCTION` `getIntentBadgeStyles`

- **Line:** 402

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `intent` | `string | undefined` | **Yes** | - | - |

---

### `FUNCTION` `isSentEmail`

- **Line:** 410

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `log` | `EmailLog` | **Yes** | - | - |

---

### `VARIABLE` `isSent`

- **Line:** 500

---

