# Module: `src/app/api/admin/transfer-franchisee-ownership/route.ts`

- **Language:** TypeScript
- **Total Lines:** 129
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `FUNCTION` `POST`

- **Line:** 5
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 7

---

### `VARIABLE` `db`

- **Line:** 14

---

### `VARIABLE` `auth`

- **Line:** 15

---

### `VARIABLE` `franRef`

- **Line:** 17

---

### `VARIABLE` `franDoc`

- **Line:** 18

---

### `VARIABLE` `franData`

- **Line:** 24

---

### `VARIABLE` `franchiseeName`

- **Line:** 25

---

### `VARIABLE` `nowStr`

- **Line:** 26

---

### `VARIABLE` `currentOwnerUid`

- **Line:** 28

---

### `VARIABLE` `currentOwnerDoc`

- **Line:** 29
- **Signature:** `admin.firestore.DocumentSnapshot | null`

---

### `VARIABLE` `userQuery`

- **Line:** 35

---

### `VARIABLE` `oldUserData`

- **Line:** 44

---

### `VARIABLE` `existingHistory`

- **Line:** 52

---

### `VARIABLE` `updatedHistory`

- **Line:** 53

---

### `VARIABLE` `newOwnerUid`

- **Line:** 65

---

### `VARIABLE` `existingAuthUser`

- **Line:** 67

---

### `VARIABLE` `newAuthUser`

- **Line:** 70

---

### `VARIABLE` `newOwnerUserRef`

- **Line:** 78

---

### `VARIABLE` `currentHistory`

- **Line:** 95

---

### `VARIABLE` `newHistoryRecord`

- **Line:** 96

---

### `VARIABLE` `existingLinked`

- **Line:** 105
- **Signature:** `string[]`

---

### `VARIABLE` `updatedLinked`

- **Line:** 106

---

