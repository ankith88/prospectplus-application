# Module: `scripts/transfer-franchisee-ownership.ts`

- **Language:** TypeScript
- **Total Lines:** 138
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `TransferOptions`

- **Line:** 4

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `franchiseeId` | `string` | No | - |
| `oldOwnerPersonalEmail` | `string` | No | - |
| `newOwnerName` | `string` | No | - |
| `newOwnerEmail` | `string` | No | - |

---

### `FUNCTION` `transferFranchiseeOwnership`

> Utility to execute a Franchisee Ownership Transfer when a franchise is sold.

1. Preserves old franchisee's account & historic activity by migrating their Auth/Firestore email 
   to their personal address (e.g., tanvi.hegde@mailplus.com.au) and recording the franchise ID in `historicalFranchiseeIds`.
2. Re-assigns the shared mailbox (e.g., alexandria@mailplus.com.au) to the new owner's user account linked to the franchise.
3. Updates the franchisee document's `currentOwnerUserId`, `linkedUserIds`, and `ownershipHistory`.

- **Line:** 19
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `options` | `TransferOptions` | **Yes** | - | - |

---

### `VARIABLE` `db`

- **Line:** 20

---

### `VARIABLE` `auth`

- **Line:** 21

---

### `VARIABLE` `franRef`

- **Line:** 27

---

### `VARIABLE` `franDoc`

- **Line:** 28

---

### `VARIABLE` `franData`

- **Line:** 32

---

### `VARIABLE` `franchiseeName`

- **Line:** 33

---

### `VARIABLE` `currentOwnerUid`

- **Line:** 36

---

### `VARIABLE` `currentOwnerDoc`

- **Line:** 37
- **Signature:** `admin.firestore.DocumentSnapshot | null`

---

### `VARIABLE` `userQuery`

- **Line:** 43

---

### `VARIABLE` `nowStr`

- **Line:** 50

---

### `VARIABLE` `oldUserData`

- **Line:** 54

---

### `VARIABLE` `existingHistory`

- **Line:** 66

---

### `VARIABLE` `updatedHistory`

- **Line:** 67

---

### `VARIABLE` `newOwnerUid`

- **Line:** 81
- **Signature:** `string`

---

### `VARIABLE` `existingAuthUser`

- **Line:** 83

---

### `VARIABLE` `newAuthUser`

- **Line:** 89

---

### `VARIABLE` `newOwnerUserRef`

- **Line:** 97

---

### `VARIABLE` `currentHistory`

- **Line:** 115

---

### `VARIABLE` `newHistoryRecord`

- **Line:** 116

---

