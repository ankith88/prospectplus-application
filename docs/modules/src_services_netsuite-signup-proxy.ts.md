# Module: `src/services/netsuite-signup-proxy.ts`

- **Language:** TypeScript
- **Total Lines:** 89

## Exported Symbols & API

### `INTERFACE` `ServiceSelection`

- **Line:** 9

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `service` | `'Outgoing Mail Lodgement' | 'Express Banking'` | No | - |
| `frequency` | `string[] | 'Adhoc'` | No | - |
| `rate` | `number` | No | - |

---

### `INTERFACE` `InitiateSignupPayload`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `services` | `ServiceSelection[]` | No | - |
| `startDate` | `string` | No | - |
| `shipmateAccess` | `boolean` | Yes | - |
| `localmileAccess` | `boolean` | Yes | - |
| `accountManagerName` | `string` | Yes | - |

---

### `INTERFACE` `NetSuiteResponse`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `message` | `string` | No | - |

---

### `FUNCTION` `initiateSignup`

- **Line:** 29
- **Async:** Yes
- **Returns:** `Promise<NetSuiteResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `InitiateSignupPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 33

---

### `VARIABLE` `baseUrl`

- **Line:** 38

---

### `VARIABLE` `params`

- **Line:** 39

---

### `VARIABLE` `url`

- **Line:** 65

---

### `VARIABLE` `response`

- **Line:** 71

---

### `VARIABLE` `errorBody`

- **Line:** 74

---

### `VARIABLE` `responseBody`

- **Line:** 79

---

