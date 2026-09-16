# Module: `src/components/outlook-settings.tsx`

- **Language:** TypeScript
- **Total Lines:** 398
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

- **Line:** 55
- **Async:** Yes

---

### `VARIABLE` `docSnap`

- **Line:** 58

---

### `VARIABLE` `data`

- **Line:** 60

---

### `FUNCTION` `handleTestConnection`

- **Line:** 82
- **Async:** Yes

---

### `VARIABLE` `payload`

- **Line:** 86
- **Signature:** `any`

---

### `VARIABLE` `res`

- **Line:** 99

---

### `VARIABLE` `data`

- **Line:** 104

---

### `FUNCTION` `handleSaveConfig`

- **Line:** 134
- **Async:** Yes

---

### `VARIABLE` `data`

- **Line:** 137
- **Signature:** `IntegrationConfig`

---

