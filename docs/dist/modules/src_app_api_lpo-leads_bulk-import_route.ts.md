# Module: `src/app/api/lpo-leads/bulk-import/route.ts`

- **Language:** TypeScript
- **Total Lines:** 310
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `FUNCTION` `POST`

- **Line:** 6
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 8

---

### `VARIABLE` `db`

- **Line:** 15

---

### `VARIABLE` `rawCustomerIds`

- **Line:** 18

---

### `VARIABLE` `matchedCustomerMap`

- **Line:** 27

---

### `VARIABLE` `numId`

- **Line:** 30

---

### `VARIABLE` `matchedDoc`

- **Line:** 31
- **Signature:** `{ docId: string; companyName: string; collectionName: 'leads' | 'companies' } | null`

---

### `VARIABLE` `snap`

- **Line:** 34

---

### `VARIABLE` `doc`

- **Line:** 42

---

### `VARIABLE` `data`

- **Line:** 43

---

### `VARIABLE` `compSnap`

- **Line:** 51

---

### `VARIABLE` `doc`

- **Line:** 59

---

### `VARIABLE` `data`

- **Line:** 60

---

### `VARIABLE` `companyChildServicesMap`

- **Line:** 75

---

### `VARIABLE` `childSnap`

- **Line:** 79

---

### `VARIABLE` `ampoRate`

- **Line:** 87

---

### `VARIABLE` `pmpoRate`

- **Line:** 88

---

### `VARIABLE` `packageRate`

- **Line:** 89

---

### `VARIABLE` `additionalBagRate`

- **Line:** 90

---

### `VARIABLE` `servicesList`

- **Line:** 91
- **Signature:** `any[]`

---

### `VARIABLE` `cData`

- **Line:** 94

---

### `VARIABLE` `sName`

- **Line:** 98

---

### `VARIABLE` `sRate`

- **Line:** 99

---

### `VARIABLE` `lpoLeadsSnap`

- **Line:** 118

---

### `VARIABLE` `existingLposByInternalId`

- **Line:** 119

---

### `VARIABLE` `existingLposByName`

- **Line:** 120

---

### `VARIABLE` `d`

- **Line:** 123

---

### `VARIABLE` `createdCount`

- **Line:** 132

---

### `VARIABLE` `updatedCount`

- **Line:** 133

---

### `VARIABLE` `linkedCount`

- **Line:** 134

---

### `VARIABLE` `unlinkedCount`

- **Line:** 135

---

### `VARIABLE` `rowResults`

- **Line:** 136
- **Signature:** `any[]`

---

### `VARIABLE` `batch`

- **Line:** 139

---

### `VARIABLE` `opCount`

- **Line:** 140

---

### `FUNCTION` `commitBatchIfNeeded`

- **Line:** 142
- **Async:** Yes

---

### `VARIABLE` `lpoName`

- **Line:** 151

---

### `VARIABLE` `lpoInternalId`

- **Line:** 152

---

### `VARIABLE` `rawCustId`

- **Line:** 153

---

### `VARIABLE` `existing`

- **Line:** 155

---

### `VARIABLE` `docRef`

- **Line:** 160
- **Signature:** `FirebaseFirestore.DocumentReference`

---

### `VARIABLE` `prospectPlusId`

- **Line:** 161
- **Signature:** `string`

---

### `VARIABLE` `customerMatch`

- **Line:** 173

---

### `VARIABLE` `linkStatus`

- **Line:** 175

---

### `VARIABLE` `linkedLeadId`

- **Line:** 176

---

### `VARIABLE` `linkedLeadCompanyName`

- **Line:** 177

---

### `VARIABLE` `linkedPartnerLocationName`

- **Line:** 190

---

### `VARIABLE` `linkedFranchiseeName`

- **Line:** 191

---

### `VARIABLE` `address1`

- **Line:** 192

---

### `VARIABLE` `address2`

- **Line:** 193

---

### `VARIABLE` `lpoOwnerName`

- **Line:** 194

---

### `VARIABLE` `email`

- **Line:** 195

---

### `VARIABLE` `phone`

- **Line:** 196

---

### `VARIABLE` `lpoDocData`

- **Line:** 198
- **Signature:** `any`

---

### `VARIABLE` `childRates`

- **Line:** 245

---

### `VARIABLE` `targetRef`

- **Line:** 263

---

