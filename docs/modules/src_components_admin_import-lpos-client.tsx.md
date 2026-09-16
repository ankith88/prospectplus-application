# Module: `src/components/admin/import-lpos-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 488
- **Direct Dependencies:** 8 modules imported

## Exported Symbols & API

### `INTERFACE` `ParsedLpoRow`

- **Line:** 12

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lpoName` | `string` | No | - |
| `lpoOwnerName` | `string` | Yes | - |
| `email` | `string` | Yes | - |
| `phone` | `string` | Yes | - |
| `address1` | `string` | Yes | - |
| `address2` | `string` | Yes | - |
| `city` | `string` | Yes | - |
| `state` | `string` | Yes | - |
| `postcode` | `string` | Yes | - |
| `notes` | `string` | Yes | - |
| `status` | `string` | Yes | - |
| `lpoInternalId` | `string` | Yes | - |
| `inactive` | `any` | Yes | - |
| `secondaryInternalId` | `string` | Yes | - |
| `lpoCreatedDate` | `string` | Yes | - |
| `lpoLastModifiedDate` | `string` | Yes | - |
| `linkedNcl` | `string` | Yes | - |
| `linkedPartnerLocationName` | `string` | Yes | - |
| `rawCustomerName` | `string` | Yes | - |
| `linkedCustomerId` | `string` | Yes | - |
| `companyNameFranchise` | `string` | Yes | - |
| `linkedFranchiseeName` | `string` | Yes | - |
| `lpoTier` | `string` | Yes | - |
| `poLevelTier` | `string` | Yes | - |
| `pageURL` | `string` | Yes | - |
| `salesRep` | `string` | Yes | - |
| `validationProvided` | `string` | Yes | - |
| `leadGenerator` | `string` | Yes | - |
| `faceToFace` | `string` | Yes | - |
| `confAndCall` | `string` | Yes | - |
| `acceptedTerms` | `string` | Yes | - |
| `dynamicScf` | `string` | Yes | - |
| `adhocBooking` | `string` | Yes | - |
| `defaultPassword` | `string` | Yes | - |

---

### `FUNCTION` `ImportLposClient`

- **Line:** 50
- **Returns:** `void`

---

### `FUNCTION` `parseDateOnly`

- **Line:** 60
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rawDate` | `string` | No | - | - |

---

### `VARIABLE` `datePart`

- **Line:** 62

---

### `VARIABLE` `parts`

- **Line:** 63

---

### `VARIABLE` `day`

- **Line:** 65

---

### `VARIABLE` `month`

- **Line:** 66

---

### `VARIABLE` `year`

- **Line:** 67

---

### `FUNCTION` `mapLpoStatus`

- **Line:** 73
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rawStatus` | `string` | No | - | - |

---

### `VARIABLE` `trimmed`

- **Line:** 75

---

### `VARIABLE` `lower`

- **Line:** 76

---

### `FUNCTION` `mapRowToLpo`

- **Line:** 85
- **Returns:** `ParsedLpoRow`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `row` | `Record<string, any>` | **Yes** | - | - |
| `rowArray` | `any[]` | No | - | - |

---

### `VARIABLE` `keys`

- **Line:** 86

---

### `FUNCTION` `getVal`

- **Line:** 88

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `possibleHeaders` | `string[]` | **Yes** | - | - |
| `colIdx` | `number` | No | - | - |

---

### `VARIABLE` `foundKey`

- **Line:** 90

---

### `VARIABLE` `linkedPartnerLocationName`

- **Line:** 120

---

### `VARIABLE` `linkedCustomerId`

- **Line:** 121

---

### `VARIABLE` `linkedFranchiseeName`

- **Line:** 122

---

### `VARIABLE` `levelUnit`

- **Line:** 124

---

### `VARIABLE` `streetName`

- **Line:** 125

---

### `VARIABLE` `address1`

- **Line:** 126

---

### `VARIABLE` `city`

- **Line:** 128

---

### `VARIABLE` `state`

- **Line:** 129

---

### `VARIABLE` `postcode`

- **Line:** 130

---

### `VARIABLE` `rawStatus`

- **Line:** 132

---

### `VARIABLE` `status`

- **Line:** 133

---

### `VARIABLE` `lpoOwnerName`

- **Line:** 135

---

### `VARIABLE` `phone`

- **Line:** 136

---

### `VARIABLE` `email`

- **Line:** 137

---

### `VARIABLE` `source`

- **Line:** 138

---

### `VARIABLE` `rawDateCreated`

- **Line:** 140

---

### `VARIABLE` `lpoCreatedDate`

- **Line:** 141

---

### `FUNCTION` `handleFileUpload`

- **Line:** 182

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `selectedFile`

- **Line:** 183

---

### `VARIABLE` `rawHeaders`

- **Line:** 204

---

### `VARIABLE` `mapped`

- **Line:** 207

---

### `FUNCTION` `handleExecuteImport`

- **Line:** 227
- **Async:** Yes

---

### `VARIABLE` `response`

- **Line:** 232

---

### `VARIABLE` `data`

- **Line:** 238

---

