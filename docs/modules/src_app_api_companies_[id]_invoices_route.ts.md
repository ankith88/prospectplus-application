# Module: `src/app/api/companies/[id]/invoices/route.ts`

- **Language:** TypeScript
- **Total Lines:** 131
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 5

---

### `VARIABLE` `db`

- **Line:** 7

---

### `FUNCTION` `POST`

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

### `VARIABLE` `apiKeyQuery`

- **Line:** 15

---

### `VARIABLE` `providedKey`

- **Line:** 16

---

### `VARIABLE` `API_KEY`

- **Line:** 18

---

### `VARIABLE` `resolvedParams`

- **Line:** 28

---

### `VARIABLE` `rawCompanyId`

- **Line:** 29

---

### `VARIABLE` `body`

- **Line:** 38

---

### `VARIABLE` `companyDocId`

- **Line:** 48

---

### `VARIABLE` `companyDoc`

- **Line:** 49

---

### `VARIABLE` `querySnap`

- **Line:** 52

---

### `VARIABLE` `invoicesRef`

- **Line:** 70

---

### `VARIABLE` `docId`

- **Line:** 73

---

### `VARIABLE` `items`

- **Line:** 78
- **Signature:** `any[]`

---

### `VARIABLE` `invoicePayload`

- **Line:** 88

---

### `FUNCTION` `PUT`

- **Line:** 123
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `ctx` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

### `FUNCTION` `PATCH`

- **Line:** 127
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `ctx` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

