# Module: `src/lib/localmile-utils.ts`

- **Language:** TypeScript
- **Total Lines:** 98
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `PmpoServiceResult`

- **Line:** 3

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `hasPmpoService` | `boolean` | No | - |
| `rate` | `number` | No | - |
| `frequency` | `string | string[]` | No | - |
| `serviceType` | `'Adhoc' | 'Recurring'` | No | - |
| `serviceName` | `string` | Yes | - |

---

### `FUNCTION` `getPmpoServiceForLead`

> Resolves the PMPO service rate and frequency for a given Lead.
Checks lead.services for a service matching PMPO / Outgoing Mail Lodgement,
or falls back to lead.pmpoRate. If no PMPO service exists, returns default flags.

- **Line:** 16
- **Returns:** `PmpoServiceResult`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead | null` | No | - | - |

---

### `VARIABLE` `services`

- **Line:** 27

---

### `VARIABLE` `pmpoService`

- **Line:** 28

---

### `VARIABLE` `nameLower`

- **Line:** 30

---

### `VARIABLE` `rawRate`

- **Line:** 35

---

### `VARIABLE` `rate`

- **Line:** 36

---

### `VARIABLE` `isRecurring`

- **Line:** 37

---

### `VARIABLE` `serviceType`

- **Line:** 38
- **Signature:** `'Adhoc' | 'Recurring'`

---

### `VARIABLE` `frequency`

- **Line:** 39

---

### `VARIABLE` `leadPmpoRate`

- **Line:** 51

---

### `VARIABLE` `parsedRate`

- **Line:** 53

---

### `VARIABLE` `fallbackType`

- **Line:** 66
- **Signature:** `'Adhoc' | 'Recurring'`

---

### `VARIABLE` `fallbackRate`

- **Line:** 67

---

### `FUNCTION` `isDialerUser`

> Determines whether a user profile strictly has the 'dialer' role.
Only returns true if the user's active role is explicitly a dialer role ('dialer', 'dialers', 'lead gen').
All management, admin, account manager, customer success, franchisee, and other non-dialer roles return false.

- **Line:** 84
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `userProfile` | `any` | No | - | - |

---

### `VARIABLE` `activeRole`

- **Line:** 87

---

### `VARIABLE` `dialerRoles`

- **Line:** 88

---

