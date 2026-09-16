# Module: `src/services/mass-link-service.ts`

- **Language:** TypeScript
- **Total Lines:** 325
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `INTERFACE` `BulkLinkResult`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `linkedCount` | `number` | No | - |
| `parentName` | `string` | Yes | - |
| `error` | `string` | Yes | - |

---

### `INTERFACE` `CsvRowValidation`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `rowNumber` | `number` | No | - |
| `childInput` | `string` | No | - |
| `parentInput` | `string` | No | - |
| `status` | `'valid' | 'conflict' | 'error'` | No | - |
| `childLead` | `Lead` | Yes | - |
| `parentLead` | `Lead` | Yes | - |
| `message` | `string` | No | - |

---

### `FUNCTION` `bulkLinkLeadsToParent`

> Bulk links a set of child accounts (leads or companies) to a designated Parent Customer account.

- **Line:** 28
- **Async:** Yes
- **Returns:** `Promise<BulkLinkResult>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `parentLeadId` | `string` | **Yes** | - | - |
| `childIds` | `string[]` | **Yes** | - | - |
| `userEmail` | `string` | No | - | - |

---

### `VARIABLE` `parentLeadRef`

- **Line:** 42

---

### `VARIABLE` `parentLeadSnap`

- **Line:** 43

---

### `VARIABLE` `parentData`

- **Line:** 45
- **Signature:** `any`

---

### `VARIABLE` `parentCompRef`

- **Line:** 49

---

### `VARIABLE` `parentCompSnap`

- **Line:** 50

---

### `VARIABLE` `parentName`

- **Line:** 60

---

### `VARIABLE` `nowIso`

- **Line:** 61

---

### `VARIABLE` `parentCompanyRef`

- **Line:** 64

---

### `VARIABLE` `validChildIds`

- **Line:** 94

---

### `VARIABLE` `processedCount`

- **Line:** 95

---

### `VARIABLE` `BATCH_SIZE`

- **Line:** 97

---

### `VARIABLE` `chunk`

- **Line:** 99

---

### `VARIABLE` `batch`

- **Line:** 100

---

### `VARIABLE` `childCompRef`

- **Line:** 103

---

### `VARIABLE` `childCompSnap`

- **Line:** 104

---

### `VARIABLE` `childLeadRef`

- **Line:** 117

---

### `VARIABLE` `childLeadSnap`

- **Line:** 118

---

### `FUNCTION` `bulkUnlinkLeads`

> Bulk unlinks child accounts from any parent customer.

- **Line:** 168
- **Async:** Yes
- **Returns:** `Promise<BulkLinkResult>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `childIds` | `string[]` | **Yes** | - | - |
| `userEmail` | `string` | No | - | - |

---

### `VARIABLE` `uniqueIds`

- **Line:** 177

---

### `VARIABLE` `nowIso`

- **Line:** 178

---

### `VARIABLE` `BATCH_SIZE`

- **Line:** 180

---

### `VARIABLE` `unlinkedCount`

- **Line:** 181

---

### `VARIABLE` `chunk`

- **Line:** 184

---

### `VARIABLE` `batch`

- **Line:** 185

---

### `VARIABLE` `childCompRef`

- **Line:** 188

---

### `VARIABLE` `childCompSnap`

- **Line:** 189

---

### `VARIABLE` `childLeadRef`

- **Line:** 199

---

### `VARIABLE` `childLeadSnap`

- **Line:** 200

---

### `FUNCTION` `validateCsvRows`

> Validates parsed CSV rows against all available leads in system.

- **Line:** 239
- **Returns:** `CsvRowValidation[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rows` | `Array<{ childIdentifier: string; parentIdentifier: string }>` | **Yes** | - | - |
| `allLeads` | `Lead[]` | **Yes** | - | - |

---

### `VARIABLE` `leadLookupMap`

- **Line:** 243

---

### `VARIABLE` `rowNumber`

- **Line:** 253

---

### `VARIABLE` `childInput`

- **Line:** 254

---

### `VARIABLE` `parentInput`

- **Line:** 255

---

### `VARIABLE` `childLead`

- **Line:** 267

---

### `VARIABLE` `parentLead`

- **Line:** 268

---

