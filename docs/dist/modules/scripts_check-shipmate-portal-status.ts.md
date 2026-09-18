# Module: `scripts/check-shipmate-portal-status.ts`

- **Language:** TypeScript
- **Total Lines:** 149
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 8

---

### `FUNCTION` `isValidEmail`

- **Line:** 10
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string | undefined` | **Yes** | - | - |

---

### `VARIABLE` `lower`

- **Line:** 12

---

### `VARIABLE` `forbidden`

- **Line:** 14

---

### `VARIABLE` `parts`

- **Line:** 15

---

### `FUNCTION` `checkPortalStatusOfContactEmail`

- **Line:** 21
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | - | - |

---

### `VARIABLE` `mainURL`

- **Line:** 22

---

### `VARIABLE` `headers`

- **Line:** 23

---

### `VARIABLE` `res`

- **Line:** 30

---

### `VARIABLE` `emailSubjects`

- **Line:** 35

---

### `VARIABLE` `createPasswordEmailSent`

- **Line:** 37

---

### `VARIABLE` `accountActivated`

- **Line:** 46

---

### `VARIABLE` `accessToShipMate`

- **Line:** 52
- **Signature:** `'yes' | 'no'`

---

### `VARIABLE` `shipmateStatus`

- **Line:** 53
- **Signature:** `'Activated' | 'Password Sent' | 'No Access'`

---

### `FUNCTION` `main`

- **Line:** 73
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `companiesSnap`

- **Line:** 76

---

### `VARIABLE` `totalContactsChecked`

- **Line:** 79

---

### `VARIABLE` `activatedCount`

- **Line:** 80

---

### `VARIABLE` `passwordSentCount`

- **Line:** 81

---

### `VARIABLE` `noAccessCount`

- **Line:** 82

---

### `VARIABLE` `skippedCount`

- **Line:** 83

---

### `VARIABLE` `errorCount`

- **Line:** 84

---

### `VARIABLE` `companyDoc`

- **Line:** 87

---

### `VARIABLE` `companyId`

- **Line:** 88

---

### `VARIABLE` `companyName`

- **Line:** 89

---

### `VARIABLE` `contactsSnap`

- **Line:** 91

---

### `VARIABLE` `contactData`

- **Line:** 98

---

### `VARIABLE` `email`

- **Line:** 99

---

### `VARIABLE` `result`

- **Line:** 107

---

