# Module: `src/services/microsoft-graph.ts`

- **Language:** TypeScript
- **Total Lines:** 130
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `CLIENT_ID`

- **Line:** 7

---

### `VARIABLE` `CLIENT_SECRET`

- **Line:** 8

---

### `FUNCTION` `getAuthUrl`

- **Line:** 11

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `amId` | `string` | **Yes** | - | - |
| `redirectUri` | `string` | **Yes** | - | - |

---

### `VARIABLE` `scopes`

- **Line:** 12

---

### `VARIABLE` `params`

- **Line:** 13

---

### `FUNCTION` `exchangeCodeForTokens`

- **Line:** 25
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `code` | `string` | **Yes** | - | - |
| `redirectUri` | `string` | **Yes** | - | - |

---

### `VARIABLE` `params`

- **Line:** 26

---

### `VARIABLE` `response`

- **Line:** 35

---

### `VARIABLE` `errorData`

- **Line:** 44

---

### `FUNCTION` `refreshAccessToken`

- **Line:** 56
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `refreshToken` | `string` | **Yes** | - | - |
| `redirectUri` | `string` | **Yes** | - | - |

---

### `VARIABLE` `params`

- **Line:** 57

---

### `VARIABLE` `response`

- **Line:** 65

---

### `VARIABLE` `errorData`

- **Line:** 74

---

### `FUNCTION` `getValidAccessToken`

- **Line:** 86
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `amId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `db`

- **Line:** 87

---

### `VARIABLE` `userRef`

- **Line:** 88

---

### `VARIABLE` `userSnap`

- **Line:** 89

---

### `VARIABLE` `userData`

- **Line:** 95

---

### `VARIABLE` `now`

- **Line:** 100

---

### `VARIABLE` `redirectUri`

- **Line:** 108

---

### `VARIABLE` `tokens`

- **Line:** 111

---

### `FUNCTION` `getGraphClient`

- **Line:** 122
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `amId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `accessToken`

- **Line:** 123

---

