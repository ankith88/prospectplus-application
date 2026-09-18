# Module: `src/app/api/ask/training/route.ts`

- **Language:** TypeScript
- **Total Lines:** 82
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

### `VARIABLE` `doc`

- **Line:** 30

---

### `VARIABLE` `defaultConfig`

- **Line:** 32
- **Signature:** `UserAiTrainingConfig`

---

### `FUNCTION` `POST`

- **Line:** 55
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `NextRequest` | **Yes** | - | - |

---

### `VARIABLE` `uid`

- **Line:** 57

---

### `VARIABLE` `body`

- **Line:** 62

---

### `VARIABLE` `dataToSave`

- **Line:** 65
- **Signature:** `Partial<UserAiTrainingConfig>`

---

