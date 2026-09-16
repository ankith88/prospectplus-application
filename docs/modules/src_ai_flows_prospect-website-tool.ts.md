# Module: `src/ai/flows/prospect-website-tool.ts`

- **Language:** TypeScript
- **Total Lines:** 289
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `VARIABLE` `SocialLinksSchema`

- **Line:** 15

---

### `VARIABLE` `ContactSchema`

- **Line:** 22

---

### `VARIABLE` `ProspectWebsiteOutputSchema`

- **Line:** 30

---

### `VARIABLE` `ProspectWebsiteInputSchema`

- **Line:** 39

---

### `FUNCTION` `extractDomain`

- **Line:** 44
- **Returns:** `string | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | - | - |

---

### `VARIABLE` `hostname`

- **Line:** 46

---

### `FUNCTION` `extractNameFromEmail`

> Extracts a name from an email address.
e.g., 'john.doe@example.com' -> 'John Doe'

- **Line:** 59
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | - | - |

---

### `VARIABLE` `namePart`

- **Line:** 62

---

### `VARIABLE` `names`

- **Line:** 63

---

### `VARIABLE` `capitalizedNames`

- **Line:** 64

---

### `VARIABLE` `summarizeWebsitePrompt`

- **Line:** 71

---

### `VARIABLE` `prospectWebsiteTool`

- **Line:** 90

---

### `VARIABLE` `companyDescription`

- **Line:** 98

---

### `VARIABLE` `searchKeywords`

- **Line:** 99
- **Signature:** `string[]`

---

### `VARIABLE` `hunterData`

- **Line:** 100
- **Signature:** `any`

---

### `VARIABLE` `apiKey`

- **Line:** 104

---

### `VARIABLE` `domain`

- **Line:** 109

---

### `VARIABLE` `hunterUrl`

- **Line:** 115

---

### `VARIABLE` `controller`

- **Line:** 117

---

### `VARIABLE` `timeout`

- **Line:** 118

---

### `VARIABLE` `response`

- **Line:** 122

---

### `VARIABLE` `errorBody`

- **Line:** 130

---

### `VARIABLE` `controller`

- **Line:** 151

---

### `VARIABLE` `timeout`

- **Line:** 152

---

### `VARIABLE` `websiteResponse`

- **Line:** 156

---

### `VARIABLE` `html`

- **Line:** 161

---

### `VARIABLE` `textContent`

- **Line:** 162

---

### `VARIABLE` `foundContacts`

- **Line:** 188

---

### `VARIABLE` `fullName`

- **Line:** 189

---

### `VARIABLE` `leadDocRef`

- **Line:** 212

---

### `VARIABLE` `leadDoc`

- **Line:** 213

---

### `VARIABLE` `lead`

- **Line:** 225

---

### `VARIABLE` `updateData`

- **Line:** 227
- **Signature:** `Partial<Lead>`

---

### `FUNCTION` `getContactKey`

- **Line:** 237

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `{email?: string | null, phone?: string | null}` | **Yes** | - | - |

---

### `VARIABLE` `leadWithContacts`

- **Line:** 240

---

### `VARIABLE` `existingLeadData`

- **Line:** 241

---

### `VARIABLE` `existingContactsList`

- **Line:** 242

---

### `VARIABLE` `existingContacts`

- **Line:** 244

---

### `VARIABLE` `uniqueNewContacts`

- **Line:** 246

---

### `VARIABLE` `contactKey`

- **Line:** 248

---

### `VARIABLE` `savedContacts`

- **Line:** 254
- **Signature:** `Contact[]`

---

### `VARIABLE` `contactData`

- **Line:** 257

---

### `VARIABLE` `contactId`

- **Line:** 263

---

### `VARIABLE` `newContactWithId`

- **Line:** 264
- **Signature:** `Contact`

---

