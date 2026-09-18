# Module: `src/app/api/companies/[id]/lost/route.ts`

- **Language:** TypeScript
- **Total Lines:** 178
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 6

---

### `VARIABLE` `API_KEY`

- **Line:** 7

---

### `FUNCTION` `PATCH`

- **Line:** 9
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `apiKeyHeader`

- **Line:** 13

---

### `VARIABLE` `resolvedParams`

- **Line:** 14

---

### `VARIABLE` `companyId`

- **Line:** 15

---

### `VARIABLE` `body`

- **Line:** 22

---

### `VARIABLE` `cancelledOn`

- **Line:** 40

---

### `VARIABLE` `cancelledBy`

- **Line:** 41

---

### `VARIABLE` `companyRef`

- **Line:** 44

---

### `VARIABLE` `leadRef`

- **Line:** 45

---

### `VARIABLE` `primarySnap`

- **Line:** 56

---

### `VARIABLE` `currentData`

- **Line:** 57

---

### `VARIABLE` `companyName`

- **Line:** 58

---

### `VARIABLE` `updateData`

- **Line:** 61
- **Signature:** `any`

---

### `VARIABLE` `cancellationsRef`

- **Line:** 100

---

### `FUNCTION` `POST`

- **Line:** 172
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

