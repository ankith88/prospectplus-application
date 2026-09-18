# Module: `src/app/api/search/route.ts`

- **Language:** TypeScript
- **Total Lines:** 353
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 6

---

### `FUNCTION` `GET`

- **Line:** 8
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `q`

- **Line:** 11

---

### `VARIABLE` `db`

- **Line:** 17

---

### `VARIABLE` `authHeader`

- **Line:** 20

---

### `VARIABLE` `activeRoleHeader`

- **Line:** 21

---

### `VARIABLE` `isFranchisee`

- **Line:** 22

---

### `VARIABLE` `userFranchiseeNames`

- **Line:** 23

---

### `VARIABLE` `userFranchiseeIds`

- **Line:** 24

---

### `VARIABLE` `userIdentities`

- **Line:** 25

---

### `VARIABLE` `idToken`

- **Line:** 28

---

### `VARIABLE` `decodedToken`

- **Line:** 30

---

### `VARIABLE` `uid`

- **Line:** 31

---

### `VARIABLE` `userDoc`

- **Line:** 32

---

### `VARIABLE` `userProfile`

- **Line:** 34

---

### `VARIABLE` `role`

- **Line:** 35

---

### `VARIABLE` `fullName`

- **Line:** 74

---

### `FUNCTION` `matchesUserFranchisee`

- **Line:** 82

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `any` | **Yes** | - | - |

---

### `VARIABLE` `franName`

- **Line:** 86

---

### `VARIABLE` `franId`

- **Line:** 87

---

### `VARIABLE` `hasLinkedMatch`

- **Line:** 93

---

### `VARIABLE` `norm`

- **Line:** 95

---

### `VARIABLE` `nameNorm`

- **Line:** 98

---

### `VARIABLE` `idNorm`

- **Line:** 99

---

### `FUNCTION` `isAssigned`

- **Line:** 108

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `searchStrings`

- **Line:** 128

---

### `VARIABLE` `leadPromises`

- **Line:** 141
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `companyPromises`

- **Line:** 142
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `contactPromises`

- **Line:** 143
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `queryWords`

- **Line:** 146

---

### `VARIABLE` `arrayQueryWords`

- **Line:** 147

---

### `VARIABLE` `resultsMap`

- **Line:** 250

---

### `VARIABLE` `data`

- **Line:** 256

---

### `VARIABLE` `entityId`

- **Line:** 258

---

### `VARIABLE` `prospectPlusId`

- **Line:** 259

---

### `VARIABLE` `data`

- **Line:** 273

---

### `VARIABLE` `entityId`

- **Line:** 275

---

### `VARIABLE` `prospectPlusId`

- **Line:** 276

---

### `VARIABLE` `parentFetchPromises`

- **Line:** 288
- **Signature:** `Promise<any>[]`

---

### `VARIABLE` `contactMatches`

- **Line:** 289
- **Signature:** `{ parentPath: string; parentId: string; type: 'lead' | 'company'; email: string; name: string }[]`

---

### `VARIABLE` `contactData`

- **Line:** 293

---

### `VARIABLE` `parentRef`

- **Line:** 294

---

### `VARIABLE` `parentId`

- **Line:** 296

---

### `VARIABLE` `parentPath`

- **Line:** 297

---

### `VARIABLE` `type`

- **Line:** 298

---

### `VARIABLE` `key`

- **Line:** 300

---

### `VARIABLE` `existing`

- **Line:** 303

---

### `VARIABLE` `parentSnaps`

- **Line:** 324

---

### `VARIABLE` `match`

- **Line:** 327

---

### `VARIABLE` `data`

- **Line:** 328

---

### `VARIABLE` `entityId`

- **Line:** 330

---

### `VARIABLE` `key`

- **Line:** 331

---

### `VARIABLE` `results`

- **Line:** 345

---

