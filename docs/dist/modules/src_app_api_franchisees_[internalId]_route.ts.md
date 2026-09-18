# Module: `src/app/api/franchisees/[internalId]/route.ts`

- **Language:** TypeScript
- **Total Lines:** 142
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `FUNCTION` `PATCH`

- **Line:** 7
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ internalId: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `internalId`

- **Line:** 8

---

### `VARIABLE` `resolvedParams`

- **Line:** 10

---

### `VARIABLE` `apiKey`

- **Line:** 12

---

### `VARIABLE` `validApiKey`

- **Line:** 13

---

### `VARIABLE` `body`

- **Line:** 24

---

### `VARIABLE` `parsedData`

- **Line:** 27

---

### `VARIABLE` `db`

- **Line:** 29

---

### `VARIABLE` `docRef`

- **Line:** 30

---

### `VARIABLE` `existingDoc`

- **Line:** 31

---

### `VARIABLE` `existingData`

- **Line:** 37

---

### `VARIABLE` `franchiseeName`

- **Line:** 38

---

### `VARIABLE` `updatedLinkedUserIds`

- **Line:** 41
- **Signature:** `string[] | undefined`

---

### `VARIABLE` `newLinkedUids`

- **Line:** 43

---

### `VARIABLE` `existingLinked`

- **Line:** 48
- **Signature:** `string[]`

---

### `VARIABLE` `updatePayload`

- **Line:** 53

---

### `VARIABLE` `existingFees`

- **Line:** 59

---

### `VARIABLE` `updatedFees`

- **Line:** 60

---

### `FUNCTION` `DELETE`

- **Line:** 107
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ internalId: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `internalId`

- **Line:** 108

---

### `VARIABLE` `resolvedParams`

- **Line:** 110

---

### `VARIABLE` `apiKey`

- **Line:** 112

---

### `VARIABLE` `validApiKey`

- **Line:** 113

---

### `VARIABLE` `db`

- **Line:** 124

---

### `VARIABLE` `docRef`

- **Line:** 125

---

