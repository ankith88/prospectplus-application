# Module: `src/lib/franchisee-user-service.ts`

- **Language:** TypeScript
- **Total Lines:** 252
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `TYPE` `FranchiseeUserInput`

- **Line:** 5
- **Signature:** `z.infer<typeof FranchiseeUserSchema>`

---

### `FUNCTION` `syncFranchiseeUsers`

> Creates or updates Firebase Auth users, updates Firestore `users/{uid}` documents,
and returns the list of linked user UIDs.

- **Line:** 11
- **Async:** Yes
- **Returns:** `Promise<string[]>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchiseeId` | `string` | **Yes** | - | - |
| `franchiseeName` | `string` | **Yes** | - | - |
| `users` | `FranchiseeUserInput[]` | **Yes** | - | - |

---

### `VARIABLE` `auth`

- **Line:** 18

---

### `VARIABLE` `db`

- **Line:** 19

---

### `VARIABLE` `linkedUserIds`

- **Line:** 20
- **Signature:** `string[]`

---

### `VARIABLE` `nowStr`

- **Line:** 21

---

### `VARIABLE` `email`

- **Line:** 24

---

### `VARIABLE` `uid`

- **Line:** 25

---

### `VARIABLE` `existingAuthUser`

- **Line:** 27

---

### `VARIABLE` `displayName`

- **Line:** 41

---

### `VARIABLE` `createdAuthUser`

- **Line:** 46

---

### `VARIABLE` `updateData`

- **Line:** 55
- **Signature:** `{ password?: string; displayName?: string }`

---

### `VARIABLE` `displayName`

- **Line:** 59

---

### `VARIABLE` `userDocRef`

- **Line:** 72

---

### `VARIABLE` `existingDoc`

- **Line:** 73

---

### `VARIABLE` `existingData`

- **Line:** 74

---

### `VARIABLE` `firstName`

- **Line:** 76

---

### `VARIABLE` `lastName`

- **Line:** 80

---

### `VARIABLE` `displayName`

- **Line:** 84

---

### `VARIABLE` `existingLinkedFranchisees`

- **Line:** 92
- **Signature:** `string[]`

---

### `VARIABLE` `payloadLinkedFranchisees`

- **Line:** 93
- **Signature:** `string[]`

---

### `VARIABLE` `accumulatedLinkedFranchiseeIds`

- **Line:** 94

---

### `VARIABLE` `existingLinkedObjects`

- **Line:** 99
- **Signature:** `Array<{ franchiseeId: string; franchiseeName: string; relationship: 'owner' | 'investor'; isDefault?: boolean }>`

---

### `VARIABLE` `currentRelationship`

- **Line:** 100
- **Signature:** `'owner' | 'investor'`

---

### `VARIABLE` `mergedLinkedObjects`

- **Line:** 102

---

### `VARIABLE` `existingObjIdx`

- **Line:** 103

---

### `VARIABLE` `franSnap`

- **Line:** 123

---

### `VARIABLE` `fName`

- **Line:** 124

---

### `VARIABLE` `updatedUserObj`

- **Line:** 142
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `bankAccountName`

- **Line:** 200

---

### `VARIABLE` `bsbNumber`

- **Line:** 206

---

### `VARIABLE` `bankAccountNumber`

- **Line:** 212

---

### `VARIABLE` `knownKeys`

- **Line:** 230

---

