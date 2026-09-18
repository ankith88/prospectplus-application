# Module: `src/app/api/companies/[id]/invoices/[invoiceId]/route.ts`

- **Language:** TypeScript
- **Total Lines:** 161
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 5

---

### `VARIABLE` `db`

- **Line:** 7

---

### `FUNCTION` `handleUpdate`

- **Line:** 9
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ id: string; invoiceId: string }> }` | **Yes** | - | - |

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

### `VARIABLE` `rawInvoiceId`

- **Line:** 30

---

### `VARIABLE` `body`

- **Line:** 39

---

### `VARIABLE` `companyDocId`

- **Line:** 49

---

### `VARIABLE` `companyDoc`

- **Line:** 50

---

### `VARIABLE` `querySnap`

- **Line:** 53

---

### `VARIABLE` `invoicesRef`

- **Line:** 71

---

### `VARIABLE` `targetInvoiceDocId`

- **Line:** 74

---

### `VARIABLE` `invoiceDoc`

- **Line:** 75

---

### `VARIABLE` `qSnap`

- **Line:** 78

---

### `VARIABLE` `updatePayload`

- **Line:** 95
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `finalDocSnap`

- **Line:** 131

---

### `FUNCTION` `POST`

- **Line:** 149
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `ctx` | `{ params: Promise<{ id: string; invoiceId: string }> }` | **Yes** | - | - |

---

### `FUNCTION` `PATCH`

- **Line:** 153
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `ctx` | `{ params: Promise<{ id: string; invoiceId: string }> }` | **Yes** | - | - |

---

### `FUNCTION` `PUT`

- **Line:** 157
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `ctx` | `{ params: Promise<{ id: string; invoiceId: string }> }` | **Yes** | - | - |

---

