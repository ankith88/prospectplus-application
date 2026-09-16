# Module: `src/app/api/scf/send-quote/route.ts`

- **Language:** TypeScript
- **Total Lines:** 374
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 6

---

### `FUNCTION` `logEmailToLead`

- **Line:** 8
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `recipient` | `string` | **Yes** | - | - |
| `subject` | `string` | **Yes** | - | - |
| `html` | `string` | **Yes** | - | - |
| `sender` | `string` | **Yes** | - | - |
| `isSimulated` | `boolean` | **Yes** | - | - |
| `collectionName` | `'leads' | 'companies'` | No | `'leads'` | - |

---

### `VARIABLE` `leadRef`

- **Line:** 10

---

### `FUNCTION` `POST`

- **Line:** 24
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 26

---

### `VARIABLE` `colName`

- **Line:** 34
- **Signature:** `'companies' | 'leads'`

---

### `VARIABLE` `leadSnap`

- **Line:** 35

---

### `VARIABLE` `contactIds`

- **Line:** 42

---

### `VARIABLE` `contactsData`

- **Line:** 43

---

### `VARIABLE` `trimmedId`

- **Line:** 45

---

### `VARIABLE` `contactSnap`

- **Line:** 47

---

### `VARIABLE` `altCol`

- **Line:** 49

---

### `VARIABLE` `contactEmails`

- **Line:** 61

---

### `VARIABLE` `contactName`

- **Line:** 62

---

### `VARIABLE` `contactFirstName`

- **Line:** 63

---

### `VARIABLE` `contactEmail`

- **Line:** 68

---

### `VARIABLE` `brandSnap`

- **Line:** 71

---

### `VARIABLE` `brandData`

- **Line:** 72

---

### `VARIABLE` `primaryColor`

- **Line:** 73

---

### `VARIABLE` `fontFamily`

- **Line:** 74

---

### `VARIABLE` `logoUrl`

- **Line:** 75

---

### `FUNCTION` `wrapEmailHtml`

- **Line:** 77

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `htmlContent` | `string` | **Yes** | - | - |

---

### `FUNCTION` `wrapEmailHtmlTemplate`

- **Line:** 156

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `htmlContent` | `string` | **Yes** | - | - |

---

### `VARIABLE` `isAlreadyWrapped`

- **Line:** 221

---

### `VARIABLE` `formattedHtml`

- **Line:** 222

---

### `VARIABLE` `dispatchResult`

- **Line:** 224

---

### `VARIABLE` `templatesSnap`

- **Line:** 248

---

### `VARIABLE` `templateHtml`

- **Line:** 249

---

### `VARIABLE` `templateSubject`

- **Line:** 250

---

### `VARIABLE` `templateData`

- **Line:** 253

---

### `VARIABLE` `leadData`

- **Line:** 276

---

### `VARIABLE` `companyName`

- **Line:** 277

---

### `VARIABLE` `salesRepName`

- **Line:** 278

---

### `VARIABLE` `franchiseeName`

- **Line:** 279

---

### `VARIABLE` `serviceDetailsHtml`

- **Line:** 282

---

### `VARIABLE` `freqStr`

- **Line:** 295

---

### `VARIABLE` `serviceNames`

- **Line:** 325

---

### `VARIABLE` `serviceFrequencies`

- **Line:** 326

---

### `VARIABLE` `serviceRates`

- **Line:** 327

---

### `VARIABLE` `plainList`

- **Line:** 340

---

### `VARIABLE` `formattedFallbackHtml`

- **Line:** 343

---

### `VARIABLE` `dispatchResult`

- **Line:** 346

---

