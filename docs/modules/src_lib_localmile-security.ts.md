# Module: `src/lib/localmile-security.ts`

- **Language:** TypeScript
- **Total Lines:** 71
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `VARIABLE` `SECRET`

- **Line:** 4

---

### `VARIABLE` `ENCRYPTION_KEY`

- **Line:** 5

---

### `VARIABLE` `IV_LENGTH`

- **Line:** 8

---

### `FUNCTION` `encryptLeadId`

> Encrypts a lead/company ID into a secure token.

- **Line:** 13
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `iv`

- **Line:** 16

---

### `VARIABLE` `cipher`

- **Line:** 17

---

### `VARIABLE` `encrypted`

- **Line:** 18

---

### `VARIABLE` `token`

- **Line:** 22

---

### `FUNCTION` `decryptLeadId`

> Decrypts a secure token back into the original lead/company ID.

- **Line:** 37
- **Returns:** `string | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `token` | `string` | **Yes** | - | - |

---

### `VARIABLE` `base64`

- **Line:** 41

---

### `VARIABLE` `rawToken`

- **Line:** 45

---

### `VARIABLE` `parts`

- **Line:** 47

---

### `VARIABLE` `iv`

- **Line:** 50

---

### `VARIABLE` `encryptedText`

- **Line:** 51

---

### `VARIABLE` `decipher`

- **Line:** 54

---

### `VARIABLE` `decrypted`

- **Line:** 55

---

### `VARIABLE` `fallbackKey`

- **Line:** 60

---

### `VARIABLE` `decipher`

- **Line:** 61

---

### `VARIABLE` `decrypted`

- **Line:** 62

---

