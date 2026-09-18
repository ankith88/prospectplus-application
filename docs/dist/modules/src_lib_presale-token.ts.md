# Module: `src/lib/presale-token.ts`

- **Language:** TypeScript
- **Total Lines:** 113

## Overview
Utility functions to securely encode and decode presale/franchisee IDs for public Deed of Variation URLs. Ensures the raw numeric ID (e.g. 425904) is obfuscated and protected against URL tampering.

## Exported Symbols & API

### `VARIABLE` `SECRET_PREFIX`

> Utility functions to securely encode and decode presale/franchisee IDs for public Deed of Variation URLs.
Ensures the raw numeric ID (e.g. 425904) is obfuscated and protected against URL tampering.

- **Line:** 6

---

### `FUNCTION` `encodePresaleId`

- **Line:** 8
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string | number` | **Yes** | - | - |

---

### `VARIABLE` `cleanId`

- **Line:** 9

---

### `VARIABLE` `payload`

- **Line:** 15

---

### `VARIABLE` `b64`

- **Line:** 19

---

### `VARIABLE` `b64`

- **Line:** 26

---

### `FUNCTION` `decodePresaleId`

- **Line:** 34
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `tokenOrId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `clean`

- **Line:** 36

---

### `VARIABLE` `rawToken`

- **Line:** 40

---

### `VARIABLE` `decoded`

- **Line:** 41

---

### `VARIABLE` `b64`

- **Line:** 43

---

### `VARIABLE` `padLength`

- **Line:** 44

---

### `VARIABLE` `paddedB64`

- **Line:** 45

---

### `FUNCTION` `encodeProspectToken`

- **Line:** 63
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prefix` | `'kfs' | 'cd' | 'eoi' | 'rfd' | 'disc' | 'fa'` | **Yes** | - | - |
| `prospectId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `cleanId`

- **Line:** 64

---

### `VARIABLE` `payload`

- **Line:** 66

---

### `VARIABLE` `b64`

- **Line:** 69

---

### `VARIABLE` `b64`

- **Line:** 76

---

### `FUNCTION` `decodeProspectToken`

- **Line:** 84
- **Returns:** `{ prefix?: string; prospectId: string }`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `token` | `string` | **Yes** | - | - |

---

### `VARIABLE` `clean`

- **Line:** 86

---

### `VARIABLE` `match`

- **Line:** 88

---

### `VARIABLE` `decoded`

- **Line:** 92

---

### `VARIABLE` `b64`

- **Line:** 94

---

### `VARIABLE` `padLength`

- **Line:** 95

---

### `VARIABLE` `paddedB64`

- **Line:** 96

---

### `VARIABLE` `expectedPrefix`

- **Line:** 102

---

