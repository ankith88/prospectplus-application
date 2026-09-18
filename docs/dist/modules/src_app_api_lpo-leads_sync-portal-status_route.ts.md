# Module: `src/app/api/lpo-leads/sync-portal-status/route.ts`

- **Language:** TypeScript
- **Total Lines:** 174
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `FUNCTION` `POST`

- **Line:** 6
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 8

---

### `VARIABLE` `targetLeadId`

- **Line:** 9

---

### `VARIABLE` `prospectDb`

- **Line:** 11

---

### `VARIABLE` `lpoConnectDb`

- **Line:** 14

---

### `VARIABLE` `lpoLeadsQuery`

- **Line:** 17
- **Signature:** `FirebaseFirestore.Query`

---

### `VARIABLE` `lpoLeadsSnap`

- **Line:** 21

---

### `VARIABLE` `lpoDocsSnap`

- **Line:** 34

---

### `VARIABLE` `customersSnap`

- **Line:** 35

---

### `VARIABLE` `usersSnap`

- **Line:** 36

---

### `VARIABLE` `custByLpoAndEntity`

- **Line:** 39

---

### `VARIABLE` `custByEntityId`

- **Line:** 40

---

### `VARIABLE` `custByCompanyId`

- **Line:** 41

---

### `VARIABLE` `custByEmail`

- **Line:** 42

---

### `VARIABLE` `d`

- **Line:** 45

---

### `VARIABLE` `entityId`

- **Line:** 46

---

### `VARIABLE` `companyId`

- **Line:** 47

---

### `VARIABLE` `parentLpoId`

- **Line:** 48

---

### `VARIABLE` `email`

- **Line:** 49

---

### `VARIABLE` `usersByLpoId`

- **Line:** 58

---

### `VARIABLE` `usersByEmail`

- **Line:** 59

---

### `VARIABLE` `d`

- **Line:** 62

---

### `VARIABLE` `lpoId`

- **Line:** 63

---

### `VARIABLE` `email`

- **Line:** 64

---

### `VARIABLE` `arr`

- **Line:** 67

---

### `VARIABLE` `updatedCount`

- **Line:** 74

---

### `VARIABLE` `loggedInCount`

- **Line:** 75

---

### `VARIABLE` `accessSentCount`

- **Line:** 76

---

### `VARIABLE` `updatesLog`

- **Line:** 77
- **Signature:** `Array<{ id: string; name: string; oldStatus: string; newStatus: string; reason: string }>`

---

### `VARIABLE` `batch`

- **Line:** 79

---

### `VARIABLE` `lead`

- **Line:** 82

---

### `VARIABLE` `leadId`

- **Line:** 83

---

### `VARIABLE` `lpoName`

- **Line:** 84

---

### `VARIABLE` `currentStatus`

- **Line:** 85

---

### `VARIABLE` `linkedCustId`

- **Line:** 87

---

### `VARIABLE` `linkedLeadId`

- **Line:** 88

---

### `VARIABLE` `lpoInternalId`

- **Line:** 89

---

### `VARIABLE` `email`

- **Line:** 90

---

### `VARIABLE` `matchedCust`

- **Line:** 93

---

### `VARIABLE` `targetLpoId`

- **Line:** 94

---

### `VARIABLE` `lpoUsers`

- **Line:** 95

---

### `VARIABLE` `matchedUser`

- **Line:** 96

---

### `VARIABLE` `calculatedStatus`

- **Line:** 98
- **Signature:** `string | null`

---

### `VARIABLE` `reason`

- **Line:** 99

---

### `VARIABLE` `isCustomerLoggedIn`

- **Line:** 102

---

### `VARIABLE` `userHasLoggedIn`

- **Line:** 111

---

### `VARIABLE` `userHasLoggedIn`

- **Line:** 120

---

