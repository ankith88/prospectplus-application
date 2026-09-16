# Module: `src/lib/contact-utils.ts`

- **Language:** TypeScript
- **Total Lines:** 98
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `FUNCTION` `isValidRealEmail`

> Validates if an email is "real" and not a placeholder like N/A, test@test.com, etc.
This version uses exact domain label matching to avoid false positives.

- **Line:** 7
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string | undefined` | **Yes** | - | - |

---

### `VARIABLE` `lowerEmail`

- **Line:** 9

---

### `VARIABLE` `forbidden`

- **Line:** 14

---

### `VARIABLE` `parts`

- **Line:** 17

---

### `VARIABLE` `localPart`

- **Line:** 20

---

### `VARIABLE` `domainParts`

- **Line:** 24

---

### `FUNCTION` `extractContactsFromDiscoveryData`

> Extracts unique contacts from discovery data.
Checks for "Person Spoken With" and "Decision Maker".

- **Line:** 34
- **Returns:** `Omit<Contact, 'id'>[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `Partial<DiscoveryData>` | **Yes** | - | - |

---

### `VARIABLE` `contacts`

- **Line:** 35
- **Signature:** `Omit<Contact, 'id'>[]`

---

### `VARIABLE` `seenNames`

- **Line:** 36

---

### `FUNCTION` `addIfValid`

- **Line:** 39

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | No | - | - |
| `title` | `string` | No | - | - |
| `email` | `string` | No | - | - |
| `phone` | `string` | No | - | - |

---

### `VARIABLE` `normalizedName`

- **Line:** 43

---

### `VARIABLE` `cleanEmail`

- **Line:** 47

---

### `VARIABLE` `cleanPhone`

- **Line:** 48

---

### `VARIABLE` `cleanTitle`

- **Line:** 49

---

### `FUNCTION` `isContactEmpty`

> Checks if a contact object is empty (i.e. lacks a valid name, email, and phone, or has only empty/whitespace strings).

- **Line:** 83
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `Partial<Contact> | null | undefined` | **Yes** | - | - |

---

### `VARIABLE` `hasName`

- **Line:** 85

---

### `VARIABLE` `hasEmail`

- **Line:** 86

---

### `VARIABLE` `hasPhone`

- **Line:** 87

---

### `FUNCTION` `isNonEmptyContact`

> Checks if a contact object is valid/non-empty.

- **Line:** 94
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contact` | `Partial<Contact> | null | undefined` | **Yes** | - | - |

---

