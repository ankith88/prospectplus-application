# Module: `src/services/netsuite-field-sales-proxy.ts`

- **Language:** TypeScript
- **Total Lines:** 98

## Exported Symbols & API

### `INTERFACE` `FieldSalesOutcomePayload`

- **Line:** 7

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `outcome` | `string` | No | - |
| `linkedSalesRep` | `string` | No | - |
| `processedBy` | `string` | Yes | - |
| `cancellationTheme` | `string` | Yes | - |
| `cancellationWhy` | `string` | Yes | - |
| `cancellationReason` | `string` | Yes | - |
| `cancellationDate` | `string` | Yes | - |
| `cancellationNotes` | `string` | Yes | - |

---

### `INTERFACE` `NetSuiteResponse`

- **Line:** 19

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `message` | `string` | No | - |

---

### `FUNCTION` `sendFieldSalesOutcomeToNetSuite`

> Sends a processed field lead outcome to NetSuite.

- **Line:** 28
- **Async:** Yes
- **Returns:** `Promise<NetSuiteResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `FieldSalesOutcomePayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 42

---

### `VARIABLE` `baseUrl`

- **Line:** 47

---

### `VARIABLE` `params`

- **Line:** 48

---

### `VARIABLE` `url`

- **Line:** 77

---

### `VARIABLE` `response`

- **Line:** 82

---

### `VARIABLE` `errorBody`

- **Line:** 85

---

