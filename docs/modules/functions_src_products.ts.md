# Module: `functions/src/products.ts`

- **Language:** TypeScript
- **Total Lines:** 149
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 8

---

### `INTERFACE` `ProductImportData`

- **Line:** 10

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | Yes | - |
| `deliverySpeed` | `string` | Yes | - |
| `pricePlan` | `string` | Yes | - |
| `carrier` | `string` | Yes | - |
| `productWeight` | `string` | Yes | - |
| `productType` | `string` | Yes | - |
| `salesPriceIncGst` | `string | number` | Yes | - |
| `salesPriceExcGst` | `string | number` | Yes | - |
| `purchasePriceExcGst` | `string | number` | Yes | - |
| `partnerCommissionRate` | `string | number` | Yes | - |

---

### `VARIABLE` `bulkImportProducts`

- **Line:** 24

---

### `VARIABLE` `products`

- **Line:** 33

---

### `VARIABLE` `errors`

- **Line:** 38
- **Signature:** `string[]`

---

### `VARIABLE` `incomingIds`

- **Line:** 39

---

### `VARIABLE` `CHUNK_SIZE`

- **Line:** 42

---

### `VARIABLE` `processedCount`

- **Line:** 43

---

### `VARIABLE` `validProducts`

- **Line:** 45

---

### `VARIABLE` `p`

- **Line:** 49

---

### `VARIABLE` `id`

- **Line:** 55

---

### `FUNCTION` `parseNum`

- **Line:** 58

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parsed`

- **Line:** 60

---

### `VARIABLE` `salesPriceInc`

- **Line:** 64

---

### `VARIABLE` `salesPriceExc`

- **Line:** 65

---

### `VARIABLE` `purchasePriceExc`

- **Line:** 66

---

### `VARIABLE` `commissionRate`

- **Line:** 67

---

### `VARIABLE` `chunk`

- **Line:** 88

---

### `VARIABLE` `batch`

- **Line:** 89

---

### `VARIABLE` `docRef`

- **Line:** 92

---

### `VARIABLE` `existingProductsSnap`

- **Line:** 108

---

### `VARIABLE` `deleteBatch`

- **Line:** 109

---

### `VARIABLE` `deleteCount`

- **Line:** 110

---

### `VARIABLE` `batchOpCount`

- **Line:** 111

---

