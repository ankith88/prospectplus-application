# Module: `src/services/localmile-deactivation.ts`

- **Language:** TypeScript
- **Total Lines:** 129
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `FUNCTION` `deactivateLocalMileAccessForLead`

> Deactivates LocalMile access for a lead.
Checks for contacts with explicit LocalMile access ('accessToLocalMile === yes'),
LocalMile credentials (localMilePlusAuthLink or securityCode),
or any associated contact/lead email, and calls the LocalMile deactivation API
(proxied via /api/localmile/deactivate-account to prevent CORS issues).

- **Line:** 12
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; emailsRevoked: string[] }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `providedContacts` | `Contact[]` | No | - | - |
| `targetCollection` | `'companies' | 'leads'` | No | `'companies'` | - |

---

### `VARIABLE` `candidateEmails`

- **Line:** 18

---

### `FUNCTION` `addEmail`

- **Line:** 21

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string` | No | - | - |

---

### `VARIABLE` `allContacts`

- **Line:** 28
- **Signature:** `Array<any>`

---

### `VARIABLE` `primaryCol`

- **Line:** 30

---

### `VARIABLE` `secondaryCol`

- **Line:** 31

---

### `VARIABLE` `contactsRef`

- **Line:** 34

---

### `VARIABLE` `snap`

- **Line:** 35

---

### `VARIABLE` `explicitContacts`

- **Line:** 48

---

### `VARIABLE` `leadSnap`

- **Line:** 64

---

### `VARIABLE` `leadData`

- **Line:** 69

---

### `VARIABLE` `emailsToRevoke`

- **Line:** 84

---

### `VARIABLE` `revokedEmails`

- **Line:** 87
- **Signature:** `string[]`

---

### `VARIABLE` `isClient`

- **Line:** 88

---

### `VARIABLE` `targetUrl`

- **Line:** 89

---

### `VARIABLE` `headers`

- **Line:** 96
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `response`

- **Line:** 101

---

### `VARIABLE` `errText`

- **Line:** 112

---

