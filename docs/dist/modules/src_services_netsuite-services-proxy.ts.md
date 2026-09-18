# Module: `src/services/netsuite-services-proxy.ts`

- **Language:** TypeScript
- **Total Lines:** 174

## Exported Symbols & API

### `INTERFACE` `ServiceTrialPayload`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `services` | `{
    service: string;
    frequency: string[] | 'Adhoc';
    rate: number;
  }[]` | No | - |
| `trialPeriod` | `string[]` | No | - |
| `accountManagerName` | `string` | Yes | - |

---

### `INTERFACE` `NetSuiteResponse`

- **Line:** 19

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `message` | `string` | No | - |
| `commRegId` | `string` | Yes | - |
| `dynamicScfUrl` | `string` | Yes | - |
| `requestUrl` | `string` | Yes | - |
| `requestData` | `any` | Yes | - |

---

### `FUNCTION` `initiateServicesTrial`

- **Line:** 28
- **Async:** Yes
- **Returns:** `Promise<NetSuiteResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `ServiceTrialPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 32

---

### `VARIABLE` `baseUrl`

- **Line:** 37

---

### `VARIABLE` `params`

- **Line:** 38

---

### `VARIABLE` `url`

- **Line:** 58

---

### `VARIABLE` `response`

- **Line:** 64

---

### `VARIABLE` `errorBody`

- **Line:** 67

---

### `VARIABLE` `responseBody`

- **Line:** 72

---

### `VARIABLE` `AM_SALES_REP_ID_MAP`

- **Line:** 83
- **Signature:** `Record<string, string>`

---

### `INTERFACE` `QuoteServicePayload`

- **Line:** 90

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `operation` | `"quoteCustomer" | "signCustomer"` | Yes | - |
| `customerId` | `string` | No | - |
| `contactId` | `string` | No | - |
| `salesRecordId` | `string` | No | - |
| `salesRepId` | `string` | Yes | - |
| `accountManagerId` | `string` | Yes | - |
| `accountManagerName` | `string` | Yes | - |
| `commDate` | `string` | No | - |
| `createShipMateAccount` | `boolean` | Yes | - |
| `services` | `{
    id: string;
    name: string;
    price: string;
    freq: string;
  }[]` | No | - |

---

### `FUNCTION` `submitServiceQuote`

- **Line:** 108
- **Async:** Yes
- **Returns:** `Promise<NetSuiteResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `QuoteServicePayload` | **Yes** | - | - |

---

### `VARIABLE` `baseUrl`

- **Line:** 109

---

### `VARIABLE` `resolvedId`

- **Line:** 113

---

### `VARIABLE` `rawContactId`

- **Line:** 116

---

### `VARIABLE` `safeNumericContactId`

- **Line:** 117

---

### `VARIABLE` `requestParams`

- **Line:** 119

---

### `VARIABLE` `requestData`

- **Line:** 128

---

### `VARIABLE` `url`

- **Line:** 133

---

### `VARIABLE` `response`

- **Line:** 145

---

### `VARIABLE` `errorBody`

- **Line:** 148

---

### `VARIABLE` `responseBody`

- **Line:** 153

---

