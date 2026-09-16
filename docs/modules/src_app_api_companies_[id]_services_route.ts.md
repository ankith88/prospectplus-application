# Module: `src/app/api/companies/[id]/services/route.ts`

- **Language:** TypeScript
- **Total Lines:** 300
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 6

---

### `VARIABLE` `db`

- **Line:** 8

---

### `FUNCTION` `validateApiKey`

- **Line:** 10
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `apiKeyHeader`

- **Line:** 11

---

### `VARIABLE` `apiKeyQuery`

- **Line:** 13

---

### `VARIABLE` `providedKey`

- **Line:** 14

---

### `VARIABLE` `validApiKeys`

- **Line:** 16

---

### `FUNCTION` `normalizeService`

- **Line:** 31
- **Returns:** `ServiceSelection`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `s` | `any` | **Yes** | - | - |

---

### `VARIABLE` `frequency`

- **Line:** 36
- **Signature:** `any`

---

### `VARIABLE` `normalized`

- **Line:** 51
- **Signature:** `ServiceSelection`

---

### `FUNCTION` `handleUpdateServices`

- **Line:** 66
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `rawCompanyId` | `string` | **Yes** | - | - |
| `defaultMode` | `'merge' | 'replace'` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 85
- **Signature:** `any`

---

### `VARIABLE` `rawServices`

- **Line:** 102

---

### `VARIABLE` `servicesArray`

- **Line:** 110

---

### `VARIABLE` `incomingServices`

- **Line:** 118
- **Signature:** `ServiceSelection[]`

---

### `VARIABLE` `mode`

- **Line:** 128

---

### `VARIABLE` `companyDocId`

- **Line:** 135

---

### `VARIABLE` `companyRef`

- **Line:** 136

---

### `VARIABLE` `companySnap`

- **Line:** 137

---

### `VARIABLE` `querySnap`

- **Line:** 140

---

### `VARIABLE` `leadRef`

- **Line:** 157

---

### `VARIABLE` `leadSnap`

- **Line:** 158

---

### `VARIABLE` `leadQuerySnap`

- **Line:** 160

---

### `VARIABLE` `existingData`

- **Line:** 196

---

### `VARIABLE` `currentServices`

- **Line:** 197
- **Signature:** `ServiceSelection[]`

---

### `VARIABLE` `finalServices`

- **Line:** 199
- **Signature:** `ServiceSelection[]`

---

### `VARIABLE` `matchIndex`

- **Line:** 208

---

### `VARIABLE` `now`

- **Line:** 226

---

### `VARIABLE` `matchingCompanyRef`

- **Line:** 236

---

### `VARIABLE` `matchingCompanySnap`

- **Line:** 237

---

### `VARIABLE` `matchingLeadRef`

- **Line:** 246

---

### `VARIABLE` `matchingLeadSnap`

- **Line:** 247

---

### `FUNCTION` `POST`

- **Line:** 277
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `resolvedParams`

- **Line:** 281

---

### `FUNCTION` `PUT`

- **Line:** 285
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `resolvedParams`

- **Line:** 289

---

### `FUNCTION` `PATCH`

- **Line:** 293
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `resolvedParams`

- **Line:** 297

---

