# Module: `src/app/api/ask/route.ts`

- **Language:** TypeScript
- **Total Lines:** 458
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 8

---

### `VARIABLE` `db`

- **Line:** 10

---

### `FUNCTION` `parseDateString`

- **Line:** 12
- **Returns:** `Date | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateVal` | `any` | **Yes** | - | - |

---

### `VARIABLE` `d`

- **Line:** 15

---

### `VARIABLE` `d`

- **Line:** 21

---

### `VARIABLE` `d`

- **Line:** 26

---

### `VARIABLE` `cleaned`

- **Line:** 31

---

### `VARIABLE` `dateTimeParts`

- **Line:** 33

---

### `VARIABLE` `datePart`

- **Line:** 34

---

### `VARIABLE` `dateParts`

- **Line:** 35

---

### `VARIABLE` `fullYear`

- **Line:** 39

---

### `VARIABLE` `date`

- **Line:** 43

---

### `FUNCTION` `resolveUserFranchisee`

> Helper to resolve franchisee name(s) for a user profile from all possible fields or Firestore lookup

- **Line:** 52
- **Async:** Yes
- **Returns:** `Promise<string | string[] | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userProfile` | `any` | **Yes** | - | - |
| `db` | `FirebaseFirestore.Firestore` | **Yes** | - | - |

---

### `VARIABLE` `names`

- **Line:** 60

---

### `VARIABLE` `possibleIds`

- **Line:** 67
- **Signature:** `string[]`

---

### `VARIABLE` `uniqueIds`

- **Line:** 76

---

### `VARIABLE` `names`

- **Line:** 77
- **Signature:** `string[]`

---

### `VARIABLE` `franDoc`

- **Line:** 81

---

### `VARIABLE` `name`

- **Line:** 83

---

### `VARIABLE` `qSnap`

- **Line:** 90

---

### `VARIABLE` `name`

- **Line:** 92

---

### `VARIABLE` `userEmail`

- **Line:** 106

---

### `VARIABLE` `emailSnap`

- **Line:** 109

---

### `VARIABLE` `name`

- **Line:** 111

---

### `FUNCTION` `POST`

- **Line:** 124
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `authHeader`

- **Line:** 127

---

### `VARIABLE` `idToken`

- **Line:** 132

---

### `VARIABLE` `decodedToken`

- **Line:** 133

---

### `VARIABLE` `uid`

- **Line:** 141

---

### `VARIABLE` `userProfile`

- **Line:** 152

---

### `VARIABLE` `trainingConfig`

- **Line:** 153
- **Signature:** `UserAiTrainingConfig`

---

### `VARIABLE` `role`

- **Line:** 155

---

### `VARIABLE` `userAssignedRoles`

- **Line:** 163
- **Signature:** `string[]`

---

### `VARIABLE` `privilegedRoles`

- **Line:** 167

---

### `VARIABLE` `isPrivileged`

- **Line:** 171

---

### `VARIABLE` `resolvedFranchisee`

- **Line:** 174

---

### `VARIABLE` `primaryFranName`

- **Line:** 177

---

### `VARIABLE` `franchiseeStr`

- **Line:** 183

---

### `VARIABLE` `body`

- **Line:** 188

---

### `VARIABLE` `spec`

- **Line:** 194
- **Signature:** `QuerySpec`

---

### `VARIABLE` `isFranchisee`

- **Line:** 250

---

### `VARIABLE` `isArrayFran`

- **Line:** 264

---

### `VARIABLE` `franOp`

- **Line:** 265

---

### `VARIABLE` `franValue`

- **Line:** 266

---

### `VARIABLE` `query`

- **Line:** 291
- **Signature:** `any`

---

### `VARIABLE` `defaultChart`

- **Line:** 304

---

### `VARIABLE` `snap`

- **Line:** 313

---

### `VARIABLE` `rows`

- **Line:** 314

---

### `VARIABLE` `boundaries`

- **Line:** 316

---

### `VARIABLE` `fromDate`

- **Line:** 317

---

### `VARIABLE` `toDate`

- **Line:** 318

---

### `VARIABLE` `dateVal`

- **Line:** 321

---

### `VARIABLE` `parsedDate`

- **Line:** 322

---

### `VARIABLE` `valA`

- **Line:** 332

---

### `VARIABLE` `valB`

- **Line:** 333

---

### `VARIABLE` `count`

- **Line:** 343

---

### `VARIABLE` `counts`

- **Line:** 357
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `val`

- **Line:** 359
- **Signature:** `any`

---

### `VARIABLE` `key`

- **Line:** 360

---

### `VARIABLE` `aggRows`

- **Line:** 363

---

### `VARIABLE` `limitVal`

- **Line:** 376

---

### `VARIABLE` `sliced`

- **Line:** 377

---

### `VARIABLE` `columns`

- **Line:** 378

---

### `VARIABLE` `countSnap`

- **Line:** 396

---

### `VARIABLE` `count`

- **Line:** 397

---

### `VARIABLE` `limitVal`

- **Line:** 411

---

### `VARIABLE` `snap`

- **Line:** 417

---

### `VARIABLE` `rows`

- **Line:** 418

---

### `VARIABLE` `counts`

- **Line:** 421
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `val`

- **Line:** 423
- **Signature:** `any`

---

### `VARIABLE` `key`

- **Line:** 424

---

### `VARIABLE` `aggRows`

- **Line:** 427

---

### `VARIABLE` `columns`

- **Line:** 440

---

