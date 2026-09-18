# Module: `src/services/netsuite-upsell-proxy.ts`

- **Language:** TypeScript
- **Total Lines:** 60

## Exported Symbols & API

### `INTERFACE` `UpsellPayload`

- **Line:** 7

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |

---

### `INTERFACE` `NetSuiteResponse`

- **Line:** 11

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `message` | `string` | No | - |

---

### `FUNCTION` `sendUpsellToNetSuite`

> Calls the NetSuite Upsell scriptlet with the provided leadId.

- **Line:** 21
- **Async:** Yes
- **Returns:** `Promise<NetSuiteResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `UpsellPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 25

---

### `VARIABLE` `baseUrl`

- **Line:** 30

---

### `VARIABLE` `params`

- **Line:** 31

---

### `VARIABLE` `url`

- **Line:** 39

---

### `VARIABLE` `response`

- **Line:** 44

---

### `VARIABLE` `errorBody`

- **Line:** 47

---

