# Module: `src/lib/email-dispatcher.ts`

- **Language:** TypeScript
- **Total Lines:** 471
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 5

---

### `INTERFACE` `EmailAttachment`

- **Line:** 7

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | - |
| `url` | `string` | No | - |

---

### `INTERFACE` `EmailDispatchOptions`

- **Line:** 12

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
| `attachments` | `EmailAttachment[]` | Yes | - |
| `ticketId` | `string` | Yes | - |
| `notifyOnOpen` | `boolean` | Yes | - |
| `notifyUserId` | `string` | Yes | - |
| `notifyUserEmail` | `string` | Yes | - |
| `trackingCategory` | `'quote' | 'signup' | 'nurture' | 'custom' | 'system' | string` | Yes | - |
| `skipTracking` | `boolean` | Yes | - |

---

### `FUNCTION` `extractCleanEmail`

- **Line:** 30
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `toField` | `string` | **Yes** | - | - |

---

### `VARIABLE` `match`

- **Line:** 31

---

### `FUNCTION` `isInternalRecipient`

- **Line:** 38
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `toField` | `string` | **Yes** | - | - |

---

### `VARIABLE` `parts`

- **Line:** 40

---

### `VARIABLE` `match`

- **Line:** 42

---

### `VARIABLE` `email`

- **Line:** 43

---

### `FUNCTION` `sendPhysicalEmail`

- **Line:** 51
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; simulated: boolean; error?: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ to, subject, html, customFrom, cc, bcc, leadId, prospectPlusId, attachments, ticketId, notifyOnOpen, notifyUserId, notifyUserEmail, trackingCategory, skipTracking }` | `EmailDispatchOptions` | **Yes** | - | - |

---

### `VARIABLE` `configSnap`

- **Line:** 53

---

### `VARIABLE` `config`

- **Line:** 59

---

### `VARIABLE` `cleanCustomFrom`

- **Line:** 67

---

### `VARIABLE` `lowerSubject`

- **Line:** 68

---

### `VARIABLE` `isWelcomeOrResetEmail`

- **Line:** 69

---

### `VARIABLE` `cleanSender`

- **Line:** 71

---

### `VARIABLE` `effectiveCustomFrom`

- **Line:** 72

---

### `VARIABLE` `finalSender`

- **Line:** 80

---

### `VARIABLE` `finalCc`

- **Line:** 85

---

### `VARIABLE` `ccList`

- **Line:** 87

---

### `VARIABLE` `finalProspectPlusId`

- **Line:** 95

---

### `VARIABLE` `leadSnap`

- **Line:** 99

---

### `VARIABLE` `cleanEmail`

- **Line:** 104

---

### `VARIABLE` `contactsSnap`

- **Line:** 106

---

### `VARIABLE` `leadRef`

- **Line:** 108

---

### `VARIABLE` `leadSnap`

- **Line:** 110

---

### `VARIABLE` `updatedHtml`

- **Line:** 123

---

### `VARIABLE` `deliveryId`

- **Line:** 124
- **Signature:** `string | null`

---

### `VARIABLE` `deliveryRef`

- **Line:** 128

---

### `VARIABLE` `resolvedCompanyName`

- **Line:** 131
- **Signature:** `string | null`

---

### `VARIABLE` `resolvedLeadName`

- **Line:** 132
- **Signature:** `string | null`

---

### `VARIABLE` `leadSnap`

- **Line:** 136

---

### `VARIABLE` `leadData`

- **Line:** 138

---

### `VARIABLE` `compSnap`

- **Line:** 142

---

### `VARIABLE` `compData`

- **Line:** 144

---

### `VARIABLE` `baseUrl`

- **Line:** 153

---

### `VARIABLE` `trackingPixel`

- **Line:** 154

---

### `VARIABLE` `bodyCloseIndex`

- **Line:** 157

---

### `VARIABLE` `tdCloseIndex`

- **Line:** 160

---

### `VARIABLE` `idBadge`

- **Line:** 189

---

### `VARIABLE` `bodyCloseIndex`

- **Line:** 190

---

### `VARIABLE` `transporter`

- **Line:** 207

---

### `VARIABLE` `smtpAttachments`

- **Line:** 220

---

### `VARIABLE` `activeCustomFrom`

- **Line:** 227

---

### `VARIABLE` `fromHeader`

- **Line:** 228

---

### `VARIABLE` `tokenUrl`

- **Line:** 251

---

### `VARIABLE` `tokenBody`

- **Line:** 252

---

### `VARIABLE` `tokenRes`

- **Line:** 259

---

### `VARIABLE` `errText`

- **Line:** 266

---

### `VARIABLE` `tokenData`

- **Line:** 270

---

### `VARIABLE` `accessToken`

- **Line:** 271

---

### `VARIABLE` `graphAttachments`

- **Line:** 273

---

### `VARIABLE` `base64Content`

- **Line:** 277

---

### `VARIABLE` `parts`

- **Line:** 279

---

### `VARIABLE` `filePath`

- **Line:** 282

---

### `VARIABLE` `fs`

- **Line:** 283

---

### `VARIABLE` `buffer`

- **Line:** 284

---

### `VARIABLE` `fetchRes`

- **Line:** 287

---

### `VARIABLE` `buffer`

- **Line:** 289

---

### `VARIABLE` `sendMailUrl`

- **Line:** 307

---

### `VARIABLE` `mailPayload`

- **Line:** 308
- **Signature:** `any`

---

### `VARIABLE` `graphRes`

- **Line:** 328

---

### `VARIABLE` `errText`

- **Line:** 338

---

### `VARIABLE` `fallbackMailUrl`

- **Line:** 343

---

### `VARIABLE` `fallbackRes`

- **Line:** 344

---

### `VARIABLE` `fallbackErr`

- **Line:** 357

---

### `FUNCTION` `verifyPhysicalConnection`

- **Line:** 376
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `config` | `any` | **Yes** | - | - |

---

### `VARIABLE` `transporter`

- **Line:** 401

---

### `VARIABLE` `tokenUrl`

- **Line:** 434

---

### `VARIABLE` `tokenBody`

- **Line:** 435

---

### `VARIABLE` `tokenRes`

- **Line:** 442

---

### `VARIABLE` `errText`

- **Line:** 449

---

