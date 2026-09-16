# Module: `src/app/api/integrations/microsoft/webhook/route.ts`

- **Language:** TypeScript
- **Total Lines:** 378
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 6

---

### `FUNCTION` `GET`

- **Line:** 8
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `validationToken`

- **Line:** 9

---

### `FUNCTION` `POST`

- **Line:** 19
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 20

---

### `VARIABLE` `senderEmail`

- **Line:** 21

---

### `VARIABLE` `subject`

- **Line:** 22

---

### `VARIABLE` `emailBody`

- **Line:** 23

---

### `VARIABLE` `recipientEmail`

- **Line:** 24

---

### `VARIABLE` `validationToken`

- **Line:** 27

---

### `VARIABLE` `payload`

- **Line:** 35

---

### `VARIABLE` `result`

- **Line:** 44

---

### `VARIABLE` `logs`

- **Line:** 57

---

### `VARIABLE` `configSnap`

- **Line:** 60

---

### `VARIABLE` `activeConfig`

- **Line:** 61

---

### `VARIABLE` `accessToken`

- **Line:** 63

---

### `VARIABLE` `tokenUrl`

- **Line:** 68

---

### `VARIABLE` `tokenBody`

- **Line:** 69

---

### `VARIABLE` `tokenRes`

- **Line:** 76

---

### `VARIABLE` `tokenData`

- **Line:** 83

---

### `VARIABLE` `errText`

- **Line:** 86

---

### `VARIABLE` `messageUrl`

- **Line:** 99

---

### `VARIABLE` `messageRes`

- **Line:** 100

---

### `VARIABLE` `message`

- **Line:** 108

---

### `VARIABLE` `messageId`

- **Line:** 112

---

### `VARIABLE` `result`

- **Line:** 116

---

### `VARIABLE` `errText`

- **Line:** 126

---

### `INTERFACE` `ProcessEmailParams`

- **Line:** 177

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `senderEmail` | `string` | No | - |
| `recipientEmail` | `string` | No | - |
| `subject` | `string` | No | - |
| `body` | `string` | No | - |
| `messageId` | `string` | No | - |

---

### `FUNCTION` `processEmail`

- **Line:** 185
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ senderEmail, recipientEmail, subject, body, messageId }` | `ProcessEmailParams` | **Yes** | - | - |

---

### `VARIABLE` `now`

- **Line:** 186

---

### `VARIABLE` `searchEmail`

- **Line:** 187

---

### `VARIABLE` `contactsQuery`

- **Line:** 190

---

### `VARIABLE` `contactsSnap`

- **Line:** 191

---

### `VARIABLE` `contactDoc`

- **Line:** 206

---

### `VARIABLE` `contactData`

- **Line:** 207

---

### `VARIABLE` `leadRef`

- **Line:** 209

---

### `VARIABLE` `leadSnap`

- **Line:** 214

---

### `VARIABLE` `leadData`

- **Line:** 218

---

### `VARIABLE` `leadId`

- **Line:** 219

---

### `VARIABLE` `leadEmailRef`

- **Line:** 222

---

### `VARIABLE` `addedDocRef`

- **Line:** 223

---

### `VARIABLE` `companyDocRef`

- **Line:** 234

---

### `VARIABLE` `companyEmailRef`

- **Line:** 236

---

### `VARIABLE` `parentDocRef`

- **Line:** 248

---

### `VARIABLE` `parentEmailRef`

- **Line:** 250

---

### `VARIABLE` `classification`

- **Line:** 263

---

### `VARIABLE` `childContactsSnap`

- **Line:** 307

---

