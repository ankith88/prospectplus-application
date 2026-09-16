# Module: `src/app/api/admin/services/bulk-import/route.ts`

- **Language:** TypeScript
- **Total Lines:** 201
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `FUNCTION` `categorizeService`

- **Line:** 6
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `code` | `string` | **Yes** | - | - |
| `name` | `string` | **Yes** | - | - |

---

### `VARIABLE` `c`

- **Line:** 7

---

### `VARIABLE` `n`

- **Line:** 8

---

### `FUNCTION` `POST`

- **Line:** 48
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 50

---

### `VARIABLE` `db`

- **Line:** 60

---

### `VARIABLE` `isAuthorized`

- **Line:** 63

---

### `VARIABLE` `userDoc`

- **Line:** 69

---

### `VARIABLE` `uData`

- **Line:** 71

---

### `VARIABLE` `role`

- **Line:** 72

---

### `VARIABLE` `assignedRoles`

- **Line:** 73

---

### `VARIABLE` `allowedRoles`

- **Line:** 77

---

### `VARIABLE` `batchSize`

- **Line:** 97

---

### `VARIABLE` `batches`

- **Line:** 98
- **Signature:** `FirebaseFirestore.WriteBatch[]`

---

### `VARIABLE` `currentBatch`

- **Line:** 99

---

### `VARIABLE` `currentBatchCount`

- **Line:** 100

---

### `VARIABLE` `errors`

- **Line:** 101
- **Signature:** `any[]`

---

### `VARIABLE` `importedIds`

- **Line:** 102

---

### `VARIABLE` `idStr`

- **Line:** 110

---

### `VARIABLE` `docRef`

- **Line:** 113

---

### `VARIABLE` `category`

- **Line:** 114

---

### `VARIABLE` `partnerCommissionAccount`

- **Line:** 116

---

### `VARIABLE` `partnerCommissionModel`

- **Line:** 117

---

### `VARIABLE` `partnerCommissionRate`

- **Line:** 118

---

### `VARIABLE` `basePrice`

- **Line:** 119

---

### `VARIABLE` `gstApplicable`

- **Line:** 120

---

### `VARIABLE` `existingServicesSnapshot`

- **Line:** 156

---

### `VARIABLE` `deleteBatch`

- **Line:** 157

---

### `VARIABLE` `deleteBatchCount`

- **Line:** 158

---

### `VARIABLE` `deleteBatches`

- **Line:** 159
- **Signature:** `FirebaseFirestore.WriteBatch[]`

---

