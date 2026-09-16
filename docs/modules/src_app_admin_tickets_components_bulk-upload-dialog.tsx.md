# Module: `src/app/admin/tickets/components/bulk-upload-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 509
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `BulkUploadDialogProps`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `onImportComplete` | `() => void` | No | - |
| `csUsers` | `any[]` | No | - |

---

### `VARIABLE` `mandatoryColumns`

- **Line:** 22

---

### `FUNCTION` `BulkUploadDialog`

- **Line:** 37
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ open, onOpenChange, onImportComplete, csUsers }` | `BulkUploadDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `handleDownloadSample`

- **Line:** 46

---

### `VARIABLE` `headers`

- **Line:** 47

---

### `VARIABLE` `sampleRow`

- **Line:** 67

---

### `VARIABLE` `csvContent`

- **Line:** 87

---

### `VARIABLE` `blob`

- **Line:** 88

---

### `VARIABLE` `url`

- **Line:** 89

---

### `VARIABLE` `link`

- **Line:** 90

---

### `FUNCTION` `handleCsvUpload`

- **Line:** 100

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 101

---

### `VARIABLE` `headers`

- **Line:** 115

---

### `VARIABLE` `requiredHeaders`

- **Line:** 116

---

### `VARIABLE` `missingHeaders`

- **Line:** 117

---

### `VARIABLE` `validated`

- **Line:** 125

---

### `VARIABLE` `barcode`

- **Line:** 126

---

### `VARIABLE` `enquiryType`

- **Line:** 127

---

### `VARIABLE` `priority`

- **Line:** 128

---

### `VARIABLE` `raisedBy`

- **Line:** 129

---

### `VARIABLE` `assignedUser`

- **Line:** 130

---

### `VARIABLE` `enquirerName`

- **Line:** 131

---

### `VARIABLE` `enquirerEmail`

- **Line:** 132

---

### `VARIABLE` `enquirerPhone`

- **Line:** 133

---

### `VARIABLE` `source`

- **Line:** 134

---

### `VARIABLE` `customerContactName`

- **Line:** 135

---

### `VARIABLE` `customerCompany`

- **Line:** 136

---

### `VARIABLE` `customerAccountNumber`

- **Line:** 137

---

### `VARIABLE` `customerEmail`

- **Line:** 138

---

### `VARIABLE` `customerPhone`

- **Line:** 139

---

### `VARIABLE` `receiverName`

- **Line:** 140

---

### `VARIABLE` `receiverAddress`

- **Line:** 141

---

### `VARIABLE` `description`

- **Line:** 142

---

### `VARIABLE` `payload`

- **Line:** 145

---

### `VARIABLE` `parseResult`

- **Line:** 177

---

### `FUNCTION` `executeImport`

- **Line:** 202
- **Async:** Yes

---

### `VARIABLE` `validRows`

- **Line:** 203

---

### `VARIABLE` `total`

- **Line:** 213

---

### `VARIABLE` `chunkSize`

- **Line:** 214

---

### `VARIABLE` `imported`

- **Line:** 215

---

### `VARIABLE` `masterDocRef`

- **Line:** 219

---

### `VARIABLE` `masterCaseId`

- **Line:** 220

---

### `VARIABLE` `firstRowPayload`

- **Line:** 223

---

### `VARIABLE` `masterCasePayload`

- **Line:** 225

---

### `VARIABLE` `isMasterWritten`

- **Line:** 238

---

### `VARIABLE` `chunk`

- **Line:** 241

---

### `VARIABLE` `batch`

- **Line:** 242

---

### `VARIABLE` `docRef`

- **Line:** 250

---

### `FUNCTION` `resetState`

- **Line:** 277

---

