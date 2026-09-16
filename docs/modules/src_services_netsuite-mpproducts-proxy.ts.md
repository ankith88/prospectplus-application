# Module: `src/services/netsuite-mpproducts-proxy.ts`

- **Language:** TypeScript
- **Total Lines:** 59

## Exported Symbols & API

### `INTERFACE` `InitiateMPProductsTrialPayload`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |

---

### `INTERFACE` `NetSuiteResponse`

- **Line:** 12

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `message` | `string` | No | - |

---

### `FUNCTION` `initiateMPProductsTrial`

- **Line:** 17
- **Async:** Yes
- **Returns:** `Promise<NetSuiteResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `InitiateMPProductsTrialPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 21

---

### `VARIABLE` `baseUrl`

- **Line:** 26

---

### `VARIABLE` `params`

- **Line:** 27

---

### `VARIABLE` `url`

- **Line:** 35

---

### `VARIABLE` `response`

- **Line:** 41

---

### `VARIABLE` `errorBody`

- **Line:** 44

---

### `VARIABLE` `responseBody`

- **Line:** 49

---

