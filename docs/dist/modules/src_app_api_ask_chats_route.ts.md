# Module: `src/app/api/ask/chats/route.ts`

- **Language:** TypeScript
- **Total Lines:** 151
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `dynamic`

- **Line:** 7

---

### `VARIABLE` `db`

- **Line:** 9

---

### `FUNCTION` `authenticate`

- **Line:** 11
- **Async:** Yes
- **Returns:** `Promise<string | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `authHeader`

- **Line:** 12

---

### `VARIABLE` `idToken`

- **Line:** 14

---

### `VARIABLE` `decoded`

- **Line:** 16

---

### `FUNCTION` `GET`

- **Line:** 23
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `uid`

- **Line:** 25

---

### `VARIABLE` `chatId`

- **Line:** 31

---

### `VARIABLE` `doc`

- **Line:** 34

---

### `VARIABLE` `snap`

- **Line:** 42

---

### `VARIABLE` `chats`

- **Line:** 47

---

### `VARIABLE` `d`

- **Line:** 48

---

### `FUNCTION` `POST`

- **Line:** 66
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `uid`

- **Line:** 68

---

### `VARIABLE` `body`

- **Line:** 73

---

### `VARIABLE` `chatId`

- **Line:** 76

---

### `VARIABLE` `now`

- **Line:** 77

---

### `VARIABLE` `cleanMessages`

- **Line:** 79

---

### `VARIABLE` `lastMsg`

- **Line:** 80

---

### `VARIABLE` `lastSnippet`

- **Line:** 81

---

### `VARIABLE` `chatDoc`

- **Line:** 83
- **Signature:** `AskChatSession`

---

### `FUNCTION` `PATCH`

- **Line:** 103
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `uid`

- **Line:** 105

---

### `VARIABLE` `body`

- **Line:** 110

---

### `FUNCTION` `DELETE`

- **Line:** 129
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `uid`

- **Line:** 131

---

### `VARIABLE` `chatId`

- **Line:** 137

---

