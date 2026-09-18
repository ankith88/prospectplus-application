# Module: `src/services/netsuite-visit-note-proxy.ts`

- **Language:** TypeScript
- **Total Lines:** 68

## Exported Symbols & API

### `INTERFACE` `VisitNotePayload`

- **Line:** 4

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `capturedBy` | `string` | No | - |
| `outcome` | `string` | No | - |
| `companyName` | `string` | No | - |
| `discoveryAnswers` | `string` | No | - |

---

### `INTERFACE` `NetSuiteResponse`

- **Line:** 11

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `message` | `string` | No | - |

---

### `FUNCTION` `sendVisitNoteToNetSuite`

- **Line:** 16
- **Async:** Yes
- **Returns:** `Promise<NetSuiteResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `VisitNotePayload` | **Yes** | - | - |

---

### `VARIABLE` `baseUrl`

- **Line:** 23

---

### `VARIABLE` `params`

- **Line:** 24

---

### `VARIABLE` `url`

- **Line:** 35

---

### `VARIABLE` `response`

- **Line:** 40

---

### `VARIABLE` `errorBody`

- **Line:** 43

---

### `VARIABLE` `responseText`

- **Line:** 48

---

### `VARIABLE` `responseJson`

- **Line:** 56

---

