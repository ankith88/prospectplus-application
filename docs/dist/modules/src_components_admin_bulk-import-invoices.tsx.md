# Module: `src/components/admin/bulk-import-invoices.tsx`

- **Language:** TypeScript
- **Total Lines:** 209
- **Direct Dependencies:** 8 modules imported

## Exported Symbols & API

### `INTERFACE` `ImportSummary`

- **Line:** 12

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `totalProcessed` | `number` | No | - |
| `totalImported` | `number` | No | - |
| `totalUpdated` | `number` | No | - |
| `skippedCompanies` | `{ customerInternalId: string; reason: string; documentNumber?: string }[]` | No | - |

---

### `FUNCTION` `BulkImportInvoices`

- **Line:** 20
- **Returns:** `void`

---

### `FUNCTION` `downloadSampleCSV`

- **Line:** 25

---

### `VARIABLE` `headers`

- **Line:** 26

---

### `VARIABLE` `sampleRows`

- **Line:** 45

---

### `VARIABLE` `csvContent`

- **Line:** 49

---

### `VARIABLE` `blob`

- **Line:** 54

---

### `VARIABLE` `url`

- **Line:** 55

---

### `VARIABLE` `link`

- **Line:** 56

---

### `FUNCTION` `handleFileUpload`

- **Line:** 65

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `target`

- **Line:** 66

---

### `VARIABLE` `file`

- **Line:** 67

---

### `VARIABLE` `functions`

- **Line:** 79

---

### `VARIABLE` `importInvoices`

- **Line:** 80

---

### `VARIABLE` `response`

- **Line:** 82

---

### `VARIABLE` `data`

- **Line:** 83

---

