# Module: `src/app/api/contacts/route.ts`

- **Language:** TypeScript
- **Total Lines:** 270
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 5

---

### `VARIABLE` `API_KEY`

- **Line:** 6

---

### `FUNCTION` `unwrapValue`

- **Line:** 8
- **Returns:** `any`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 16
- **Signature:** `any`

---

### `FUNCTION` `resolveParentRef`

- **Line:** 27
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `db` | `any` | **Yes** | - | - |
| `parentId` | `string` | **Yes** | - | - |
| `parentType` | `string` | No | `'leads'` | - |

---

### `VARIABLE` `initialCollection`

- **Line:** 28

---

### `VARIABLE` `initialRef`

- **Line:** 29

---

### `VARIABLE` `initialSnap`

- **Line:** 30

---

### `VARIABLE` `altCollection`

- **Line:** 37

---

### `VARIABLE` `altRef`

- **Line:** 38

---

### `VARIABLE` `altSnap`

- **Line:** 39

---

### `VARIABLE` `leadNsSnap`

- **Line:** 45

---

### `VARIABLE` `docSnap`

- **Line:** 47

---

### `VARIABLE` `compNsSnap`

- **Line:** 52

---

### `VARIABLE` `docSnap`

- **Line:** 54

---

### `FUNCTION` `POST`

- **Line:** 61
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `apiKeyHeader`

- **Line:** 62

---

### `VARIABLE` `rawBody`

- **Line:** 69

---

### `VARIABLE` `body`

- **Line:** 72
- **Signature:** `any`

---

### `VARIABLE` `unwrapped`

- **Line:** 74

---

### `VARIABLE` `firstName`

- **Line:** 82

---

### `VARIABLE` `lastName`

- **Line:** 83

---

### `VARIABLE` `fullName`

- **Line:** 84

---

### `VARIABLE` `contactsRef`

- **Line:** 102

---

### `VARIABLE` `snap`

- **Line:** 103

---

### `VARIABLE` `batch`

- **Line:** 104

---

### `VARIABLE` `contactData`

- **Line:** 112

---

### `VARIABLE` `customContactId`

- **Line:** 128

---

### `VARIABLE` `newContactRef`

- **Line:** 129

---

### `VARIABLE` `currentCount`

- **Line:** 138

---

### `VARIABLE` `activityRef`

- **Line:** 145

---

### `FUNCTION` `PATCH`

- **Line:** 165
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `apiKeyHeader`

- **Line:** 166

---

### `VARIABLE` `rawBody`

- **Line:** 173

---

### `VARIABLE` `body`

- **Line:** 176
- **Signature:** `any`

---

### `VARIABLE` `unwrapped`

- **Line:** 178

---

### `VARIABLE` `contactId`

- **Line:** 188

---

### `VARIABLE` `contactRef`

- **Line:** 202

---

### `VARIABLE` `contactSnap`

- **Line:** 203

---

### `VARIABLE` `contactsRef`

- **Line:** 210

---

### `VARIABLE` `snap`

- **Line:** 211

---

### `VARIABLE` `batch`

- **Line:** 212

---

### `VARIABLE` `cleanedUpdates`

- **Line:** 222
- **Signature:** `any`

---

### `VARIABLE` `firstName`

- **Line:** 230

---

### `VARIABLE` `lastName`

- **Line:** 231

---

### `VARIABLE` `existingData`

- **Line:** 240

---

### `VARIABLE` `fName`

- **Line:** 241

---

### `VARIABLE` `lName`

- **Line:** 242

---

### `VARIABLE` `activityRef`

- **Line:** 250

---

