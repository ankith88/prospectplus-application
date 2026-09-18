# Module: `src/app/api/packages/lookup/route.ts`

- **Language:** TypeScript
- **Total Lines:** 451
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `FUNCTION` `formatToDDMMYYYY`

- **Line:** 6
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `string | number | Date` | **Yes** | - | - |

---

### `VARIABLE` `date`

- **Line:** 9

---

### `VARIABLE` `day`

- **Line:** 11

---

### `VARIABLE` `month`

- **Line:** 12

---

### `VARIABLE` `year`

- **Line:** 13

---

### `VARIABLE` `hours`

- **Line:** 15

---

### `VARIABLE` `minutes`

- **Line:** 16

---

### `VARIABLE` `seconds`

- **Line:** 17

---

### `VARIABLE` `ampm`

- **Line:** 18

---

### `FUNCTION` `GET`

- **Line:** 28
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `identifier`

- **Line:** 30

---

### `VARIABLE` `db`

- **Line:** 37

---

### `VARIABLE` `authHeader`

- **Line:** 40

---

### `VARIABLE` `activeRoleHeader`

- **Line:** 41

---

### `VARIABLE` `isFranchisee`

- **Line:** 42

---

### `VARIABLE` `userFranchiseeNames`

- **Line:** 43

---

### `VARIABLE` `userFranchiseeIds`

- **Line:** 44

---

### `VARIABLE` `idToken`

- **Line:** 47

---

### `VARIABLE` `decodedToken`

- **Line:** 49

---

### `VARIABLE` `uid`

- **Line:** 50

---

### `VARIABLE` `userDoc`

- **Line:** 51

---

### `VARIABLE` `userProfile`

- **Line:** 53

---

### `VARIABLE` `role`

- **Line:** 54

---

### `VARIABLE` `packagesRef`

- **Line:** 88

---

### `VARIABLE` `byCode`

- **Line:** 91

---

### `VARIABLE` `byOrder`

- **Line:** 92

---

### `VARIABLE` `byConnote`

- **Line:** 93

---

### `VARIABLE` `pkgDoc`

- **Line:** 95

---

### `VARIABLE` `pkg`

- **Line:** 107

---

### `VARIABLE` `pFranName`

- **Line:** 110

---

### `VARIABLE` `pFranId`

- **Line:** 111

---

### `VARIABLE` `isMatch`

- **Line:** 112

---

### `VARIABLE` `barcode`

- **Line:** 118

---

### `VARIABLE` `realTimeStatus`

- **Line:** 121

---

### `VARIABLE` `protechlyUrl`

- **Line:** 136

---

### `VARIABLE` `protechlyRes`

- **Line:** 137

---

### `VARIABLE` `resData`

- **Line:** 146

---

### `VARIABLE` `event`

- **Line:** 148

---

### `VARIABLE` `partnerLocationsSnap`

- **Line:** 163

---

### `VARIABLE` `partnerLocationMap`

- **Line:** 164
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `data`

- **Line:** 166

---

### `VARIABLE` `operatorsSnap`

- **Line:** 170

---

### `VARIABLE` `operatorMap`

- **Line:** 171
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `op`

- **Line:** 173

---

### `VARIABLE` `name`

- **Line:** 174

---

### `VARIABLE` `enrichedScans`

- **Line:** 179

---

### `VARIABLE` `opName`

- **Line:** 180

---

### `VARIABLE` `locName`

- **Line:** 181

---

### `VARIABLE` `partnerDoc`

- **Line:** 183

---

### `VARIABLE` `locAddress`

- **Line:** 184

---

### `VARIABLE` `latestScan`

- **Line:** 202

---

### `VARIABLE` `customerNsId`

- **Line:** 210

---

### `VARIABLE` `scanWithNsId`

- **Line:** 212

---

### `VARIABLE` `customerName`

- **Line:** 216

---

### `VARIABLE` `franchisee`

- **Line:** 217

---

### `VARIABLE` `customerContactName`

- **Line:** 218

---

### `VARIABLE` `customerEmail`

- **Line:** 219

---

### `VARIABLE` `customerPhone`

- **Line:** 220

---

### `VARIABLE` `customerAccountNumber`

- **Line:** 221

---

### `VARIABLE` `customerTier`

- **Line:** 222

---

### `VARIABLE` `franchiseeMobile`

- **Line:** 223

---

### `VARIABLE` `franchiseeMainContact`

- **Line:** 224

---

### `VARIABLE` `companyId`

- **Line:** 225

---

### `VARIABLE` `companyContacts`

- **Line:** 227
- **Signature:** `any[]`

---

### `VARIABLE` `companyDoc`

- **Line:** 230

---

### `VARIABLE` `companySnap`

- **Line:** 231

---

### `VARIABLE` `companySnapInt`

- **Line:** 235

---

### `VARIABLE` `compData`

- **Line:** 243

---

### `VARIABLE` `contactsSnap`

- **Line:** 250

---

### `VARIABLE` `data`

- **Line:** 253

---

### `VARIABLE` `contact`

- **Line:** 264

---

### `VARIABLE` `franchiseeSnap`

- **Line:** 279

---

### `VARIABLE` `fData`

- **Line:** 281

---

### `VARIABLE` `operatorNsId`

- **Line:** 288

---

### `VARIABLE` `scanWithOpNsId`

- **Line:** 290

---

### `VARIABLE` `operatorDetails`

- **Line:** 294

---

### `VARIABLE` `operatorDoc`

- **Line:** 296

---

### `VARIABLE` `op`

- **Line:** 298

---

### `VARIABLE` `scanDetailsText`

- **Line:** 305

---

### `VARIABLE` `receiverAddress`

- **Line:** 309

---

### `VARIABLE` `openTickets`

- **Line:** 316
- **Signature:** `any[]`

---

### `VARIABLE` `ticketsRef`

- **Line:** 318

---

### `VARIABLE` `openTicketsSnap`

- **Line:** 319

---

### `VARIABLE` `td`

- **Line:** 325

---

### `VARIABLE` `activeStatuses`

- **Line:** 337

---

### `VARIABLE` `activeTicket`

- **Line:** 338

---

### `VARIABLE` `activeByBarcodeSnap`

- **Line:** 340

---

### `VARIABLE` `tDoc`

- **Line:** 347

---

### `VARIABLE` `td`

- **Line:** 348

---

### `VARIABLE` `connoteNum`

- **Line:** 354

---

### `VARIABLE` `activeByConnoteSnap`

- **Line:** 356

---

### `VARIABLE` `tDoc`

- **Line:** 362

---

### `VARIABLE` `td`

- **Line:** 363

---

