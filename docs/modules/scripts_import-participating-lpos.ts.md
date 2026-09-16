# Module: `scripts/import-participating-lpos.ts`

- **Language:** TypeScript
- **Total Lines:** 421
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `serviceAccountPath`

- **Line:** 8

---

### `VARIABLE` `db`

- **Line:** 20

---

### `FUNCTION` `generateRandomAlphanumeric`

- **Line:** 22
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `length` | `any` | No | `6` | - |

---

### `VARIABLE` `chars`

- **Line:** 23

---

### `VARIABLE` `result`

- **Line:** 24

---

### `FUNCTION` `runCliImport`

- **Line:** 31
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `fileArgIdx`

- **Line:** 32

---

### `VARIABLE` `filePath`

- **Line:** 33

---

### `VARIABLE` `absolutePath`

- **Line:** 40

---

### `VARIABLE` `csvText`

- **Line:** 47

---

### `VARIABLE` `parsed`

- **Line:** 49

---

### `VARIABLE` `rawRows`

- **Line:** 50

---

### `FUNCTION` `parseDateOnly`

- **Line:** 59
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rawDate` | `string` | No | - | - |

---

### `VARIABLE` `datePart`

- **Line:** 61

---

### `VARIABLE` `parts`

- **Line:** 62

---

### `VARIABLE` `day`

- **Line:** 64

---

### `VARIABLE` `month`

- **Line:** 65

---

### `VARIABLE` `year`

- **Line:** 66

---

### `FUNCTION` `mapLpoStatus`

- **Line:** 72
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rawStatus` | `string` | No | - | - |

---

### `VARIABLE` `trimmed`

- **Line:** 74

---

### `VARIABLE` `lower`

- **Line:** 75

---

### `FUNCTION` `mapRowToLpo`

- **Line:** 83

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `row` | `Record<string, any>` | **Yes** | - | - |

---

### `VARIABLE` `keys`

- **Line:** 84

---

### `FUNCTION` `getVal`

- **Line:** 85

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `possibleHeaders` | `string[]` | **Yes** | - | - |
| `colIdx` | `number` | No | - | - |

---

### `VARIABLE` `found`

- **Line:** 87

---

### `VARIABLE` `linkedPartnerLocationName`

- **Line:** 114

---

### `VARIABLE` `linkedCustomerId`

- **Line:** 115

---

### `VARIABLE` `linkedFranchiseeName`

- **Line:** 116

---

### `VARIABLE` `levelUnit`

- **Line:** 118

---

### `VARIABLE` `streetName`

- **Line:** 119

---

### `VARIABLE` `address1`

- **Line:** 120

---

### `VARIABLE` `city`

- **Line:** 122

---

### `VARIABLE` `state`

- **Line:** 123

---

### `VARIABLE` `postcode`

- **Line:** 124

---

### `VARIABLE` `rawStatus`

- **Line:** 126

---

### `VARIABLE` `status`

- **Line:** 127

---

### `VARIABLE` `lpoOwnerName`

- **Line:** 129

---

### `VARIABLE` `phone`

- **Line:** 130

---

### `VARIABLE` `email`

- **Line:** 131

---

### `VARIABLE` `source`

- **Line:** 132

---

### `VARIABLE` `rawDateCreated`

- **Line:** 134

---

### `VARIABLE` `lpoCreatedDate`

- **Line:** 135

---

### `VARIABLE` `rows`

- **Line:** 176

---

### `VARIABLE` `customerIds`

- **Line:** 179

---

### `VARIABLE` `matchedCustomerMap`

- **Line:** 183

---

### `VARIABLE` `numId`

- **Line:** 186

---

### `VARIABLE` `matchedDoc`

- **Line:** 187
- **Signature:** `{ docId: string; companyName: string; collectionName: 'leads' | 'companies' } | null`

---

### `VARIABLE` `snap`

- **Line:** 189

---

### `VARIABLE` `doc`

- **Line:** 195

---

### `VARIABLE` `data`

- **Line:** 196

---

### `VARIABLE` `compSnap`

- **Line:** 203

---

### `VARIABLE` `doc`

- **Line:** 209

---

### `VARIABLE` `data`

- **Line:** 210

---

### `VARIABLE` `companyChildServicesMap`

- **Line:** 227

---

### `VARIABLE` `childSnap`

- **Line:** 231

---

### `VARIABLE` `ampoRate`

- **Line:** 239

---

### `VARIABLE` `pmpoRate`

- **Line:** 240

---

### `VARIABLE` `packageRate`

- **Line:** 241

---

### `VARIABLE` `additionalBagRate`

- **Line:** 242

---

### `VARIABLE` `servicesList`

- **Line:** 243
- **Signature:** `any[]`

---

### `VARIABLE` `cData`

- **Line:** 246

---

### `VARIABLE` `sName`

- **Line:** 250

---

### `VARIABLE` `sRate`

- **Line:** 251

---

### `VARIABLE` `existingLposSnap`

- **Line:** 270

---

### `VARIABLE` `existingByInternalId`

- **Line:** 271

---

### `VARIABLE` `existingByName`

- **Line:** 272

---

### `VARIABLE` `d`

- **Line:** 275

---

### `VARIABLE` `createdCount`

- **Line:** 280

---

### `VARIABLE` `updatedCount`

- **Line:** 281

---

### `VARIABLE` `linkedCount`

- **Line:** 282

---

### `VARIABLE` `unlinkedCount`

- **Line:** 283

---

### `VARIABLE` `batch`

- **Line:** 285

---

### `VARIABLE` `opCount`

- **Line:** 286

---

### `FUNCTION` `commitIfNeeded`

- **Line:** 288
- **Async:** Yes

---

### `VARIABLE` `lpoName`

- **Line:** 297

---

### `VARIABLE` `lpoInternalId`

- **Line:** 298

---

### `VARIABLE` `rawCustId`

- **Line:** 299

---

### `VARIABLE` `existingId`

- **Line:** 301

---

### `VARIABLE` `docRef`

- **Line:** 306
- **Signature:** `FirebaseFirestore.DocumentReference`

---

### `VARIABLE` `custMatch`

- **Line:** 315

---

### `VARIABLE` `linkStatus`

- **Line:** 316

---

### `VARIABLE` `linkedLeadId`

- **Line:** 317

---

### `VARIABLE` `linkedLeadCompanyName`

- **Line:** 318

---

### `VARIABLE` `payload`

- **Line:** 323
- **Signature:** `any`

---

### `VARIABLE` `childRates`

- **Line:** 370

---

