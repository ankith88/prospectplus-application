# Module: `src/app/api/contacts/[id]/route.ts`

- **Language:** TypeScript
- **Total Lines:** 165
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

### `FUNCTION` `PATCH`

- **Line:** 61
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `apiKeyHeader`

- **Line:** 65

---

### `VARIABLE` `resolvedParams`

- **Line:** 66

---

### `VARIABLE` `contactId`

- **Line:** 67

---

### `VARIABLE` `rawBody`

- **Line:** 74

---

### `VARIABLE` `body`

- **Line:** 77
- **Signature:** `any`

---

### `VARIABLE` `unwrapped`

- **Line:** 79

---

### `VARIABLE` `contactRef`

- **Line:** 98

---

### `VARIABLE` `contactSnap`

- **Line:** 99

---

### `VARIABLE` `contactsRef`

- **Line:** 106

---

### `VARIABLE` `snap`

- **Line:** 107

---

### `VARIABLE` `batch`

- **Line:** 108

---

### `VARIABLE` `cleanedUpdates`

- **Line:** 118
- **Signature:** `any`

---

### `VARIABLE` `firstName`

- **Line:** 125

---

### `VARIABLE` `lastName`

- **Line:** 126

---

### `VARIABLE` `existingData`

- **Line:** 135

---

### `VARIABLE` `fName`

- **Line:** 136

---

### `VARIABLE` `lName`

- **Line:** 137

---

### `VARIABLE` `activityRef`

- **Line:** 145

---

