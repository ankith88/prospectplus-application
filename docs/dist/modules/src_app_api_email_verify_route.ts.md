# Module: `src/app/api/email/verify/route.ts`

- **Language:** TypeScript
- **Total Lines:** 351
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 7

---

### `VARIABLE` `db`

- **Line:** 9

---

### `FUNCTION` `verifyEmailFallback`

- **Line:** 11
- **Async:** Yes
- **Returns:** `Promise<EmailVerificationResult>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `normalizedEmail` | `string` | **Yes** | - | - |

---

### `VARIABLE` `dateStr`

- **Line:** 12

---

### `VARIABLE` `emailRegex`

- **Line:** 15

---

### `VARIABLE` `parts`

- **Line:** 27

---

### `VARIABLE` `disposableDomains`

- **Line:** 42

---

### `VARIABLE` `sentCheck`

- **Line:** 60

---

### `VARIABLE` `mxRecords`

- **Line:** 89

---

### `VARIABLE` `mxHosts`

- **Line:** 102

---

### `VARIABLE` `isGoogle`

- **Line:** 103

---

### `VARIABLE` `isMicrosoft`

- **Line:** 104

---

### `VARIABLE` `isYahoo`

- **Line:** 105

---

### `VARIABLE` `isIcloud`

- **Line:** 106

---

### `VARIABLE` `isMajorWebmail`

- **Line:** 107

---

### `VARIABLE` `isRoleEmail`

- **Line:** 109

---

### `VARIABLE` `score`

- **Line:** 111

---

### `VARIABLE` `status`

- **Line:** 112
- **Signature:** `EmailVerificationStatus`

---

### `VARIABLE` `reason`

- **Line:** 113

---

### `FUNCTION` `POST`

- **Line:** 160
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 162

---

### `VARIABLE` `targetEntityId`

- **Line:** 164

---

### `VARIABLE` `apiKey`

- **Line:** 173

---

### `VARIABLE` `results`

- **Line:** 174
- **Signature:** `EmailVerificationResult[]`

---

### `VARIABLE` `normalizedEmail`

- **Line:** 178

---

### `VARIABLE` `cachedDoc`

- **Line:** 195

---

### `VARIABLE` `cachedData`

- **Line:** 197

---

### `VARIABLE` `verificationResult`

- **Line:** 212
- **Signature:** `EmailVerificationResult | null`

---

### `VARIABLE` `hunterUrl`

- **Line:** 216

---

### `VARIABLE` `controller`

- **Line:** 217

---

### `VARIABLE` `timeout`

- **Line:** 218

---

### `VARIABLE` `response`

- **Line:** 220

---

### `VARIABLE` `resData`

- **Line:** 228

---

### `VARIABLE` `data`

- **Line:** 229

---

### `VARIABLE` `statusMap`

- **Line:** 231
- **Signature:** `Record<string, EmailVerificationStatus>`

---

### `VARIABLE` `hunterStatus`

- **Line:** 237

---

### `VARIABLE` `entityRef`

- **Line:** 281

---

### `VARIABLE` `entityDoc`

- **Line:** 282

---

### `VARIABLE` `collectionName`

- **Line:** 283

---

### `VARIABLE` `entityData`

- **Line:** 292

---

### `VARIABLE` `contacts`

- **Line:** 293

---

### `VARIABLE` `updated`

- **Line:** 295

---

### `VARIABLE` `updatedContacts`

- **Line:** 296

---

### `VARIABLE` `norm`

- **Line:** 298

---

### `VARIABLE` `match`

- **Line:** 299

---

### `VARIABLE` `contactSubRef`

- **Line:** 318

---

### `VARIABLE` `subDoc`

- **Line:** 319

---

### `VARIABLE` `subData`

- **Line:** 321

---

### `VARIABLE` `match`

- **Line:** 322

---

