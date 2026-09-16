# Module: `src/services/rekey-lead.ts`

- **Language:** TypeScript
- **Total Lines:** 315
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 8

---

### `INTERFACE` `RekeyResult`

- **Line:** 10

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `newDocId` | `string` | Yes | - |
| `error` | `string` | Yes | - |
| `message` | `string` | Yes | - |

---

### `FUNCTION` `rekeyLeadToNetSuite`

> Syncs a lead with NetSuite and re-keys its Firestore document ID from alphanumeric to the numeric NetSuite Internal ID.
If NetSuite fails, the temporary alphanumeric document is retained and updated with failure tracking metadata.

- **Line:** 21
- **Async:** Yes
- **Returns:** `Promise<RekeyResult>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `colName`

- **Line:** 27
- **Signature:** `'leads' | 'companies'`

---

### `VARIABLE` `sourceRef`

- **Line:** 28

---

### `VARIABLE` `docSnap`

- **Line:** 29

---

### `VARIABLE` `data`

- **Line:** 41

---

### `VARIABLE` `isAlreadyNumeric`

- **Line:** 44

---

### `VARIABLE` `contactsSnap`

- **Line:** 54

---

### `VARIABLE` `primaryContact`

- **Line:** 55
- **Signature:** `any`

---

### `VARIABLE` `contactsList`

- **Line:** 56
- **Signature:** `any[]`

---

### `VARIABLE` `cData`

- **Line:** 59
- **Signature:** `any`

---

### `VARIABLE` `rawName`

- **Line:** 66

---

### `VARIABLE` `nameParts`

- **Line:** 67

---

### `VARIABLE` `contactInfo`

- **Line:** 69

---

### `VARIABLE` `parentNetSuiteId`

- **Line:** 78
- **Signature:** `string | undefined`

---

### `VARIABLE` `pSnapLeads`

- **Line:** 84

---

### `VARIABLE` `pData`

- **Line:** 86

---

### `VARIABLE` `pSnapCompanies`

- **Line:** 89

---

### `VARIABLE` `pData`

- **Line:** 91

---

### `VARIABLE` `resolvedLpoLeadId`

- **Line:** 102
- **Signature:** `string | undefined`

---

### `VARIABLE` `pSnapLeads`

- **Line:** 105

---

### `VARIABLE` `pData`

- **Line:** 107

---

### `VARIABLE` `targetParentId`

- **Line:** 114

---

### `VARIABLE` `lpoSnap1`

- **Line:** 115

---

### `VARIABLE` `lpoSnap2`

- **Line:** 119

---

### `VARIABLE` `address`

- **Line:** 128
- **Signature:** `Address`

---

### `VARIABLE` `netSuitePayload`

- **Line:** 136

---

### `VARIABLE` `nsResult`

- **Line:** 165

---

### `VARIABLE` `errorMsg`

- **Line:** 168

---

### `VARIABLE` `newNumericId`

- **Line:** 185

---

### `VARIABLE` `newRef`

- **Line:** 188

---

### `VARIABLE` `updatedData`

- **Line:** 190

---

### `VARIABLE` `batch`

- **Line:** 203

---

### `VARIABLE` `subcollections`

- **Line:** 207

---

### `VARIABLE` `subSnap`

- **Line:** 209

---

### `VARIABLE` `destDocRef`

- **Line:** 211

---

### `VARIABLE` `rekeyActivityRef`

- **Line:** 217

---

### `VARIABLE` `deleteBatch`

- **Line:** 231

---

### `VARIABLE` `subSnap`

- **Line:** 233

---

### `VARIABLE` `lpoDocsMap`

- **Line:** 246

---

### `VARIABLE` `lpoSnap1`

- **Line:** 249

---

### `VARIABLE` `lpoSnap2`

- **Line:** 253

---

### `VARIABLE` `lpoSnap3`

- **Line:** 257

---

### `VARIABLE` `lpoSnap`

- **Line:** 266

---

### `VARIABLE` `lpoData`

- **Line:** 268

---

### `VARIABLE` `updates`

- **Line:** 269
- **Signature:** `any`

---

### `VARIABLE` `updatedChildIds`

- **Line:** 277

---

### `VARIABLE` `errorMsg`

- **Line:** 298

---

