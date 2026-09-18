# Module: `src/components/marketing/outlook-settings.tsx`

- **Language:** TypeScript
- **Total Lines:** 428
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `IntegrationConfig`

- **Line:** 13

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `type` | `'graph' | 'smtp'` | No | - |
| `senderEmail` | `string` | No | - |
| `clientId` | `string` | Yes | - |
| `tenantId` | `string` | Yes | - |
| `clientSecret` | `string` | Yes | - |
| `host` | `string` | Yes | - |
| `port` | `string` | Yes | - |
| `secure` | `'ssl' | 'tls' | 'none'` | Yes | - |
| `username` | `string` | Yes | - |
| `password` | `string` | Yes | - |

---

### `FUNCTION` `OutlookSettings`

- **Line:** 28
- **Returns:** `void`

---

### `FUNCTION` `fetchActiveConfig`

- **Line:** 58
- **Async:** Yes

---

### `VARIABLE` `docSnap`

- **Line:** 61

---

### `VARIABLE` `data`

- **Line:** 63

---

### `VARIABLE` `brandSnap`

- **Line:** 79

---

### `VARIABLE` `brandData`

- **Line:** 81

---

### `FUNCTION` `handleTestConnection`

- **Line:** 91
- **Async:** Yes

---

### `VARIABLE` `payload`

- **Line:** 95
- **Signature:** `any`

---

### `VARIABLE` `res`

- **Line:** 108

---

### `VARIABLE` `data`

- **Line:** 113

---

### `FUNCTION` `handleSaveConfig`

- **Line:** 143
- **Async:** Yes

---

### `VARIABLE` `data`

- **Line:** 146
- **Signature:** `IntegrationConfig`

---

