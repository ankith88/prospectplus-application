# Module: `src/services/netsuite-localmile-proxy.ts`

- **Language:** TypeScript
- **Total Lines:** 1024
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `INTERFACE` `InitiateLocalMileTrialPayload`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leadId` | `string` | No | - |
| `serviceType` | `string` | Yes | - |
| `rate` | `string | number` | Yes | - |
| `contactFirstName` | `string` | Yes | - |
| `contactLastName` | `string` | Yes | - |
| `contactEmail` | `string` | Yes | - |
| `contactPhone` | `string` | Yes | - |
| `userEmail` | `string` | Yes | - |
| `userName` | `string` | Yes | - |
| `accountManagerName` | `string` | Yes | - |

---

### `INTERFACE` `NetSuiteResponse`

- **Line:** 28

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `leadID` | `string` | Yes | - |
| `message` | `string` | No | - |
| `result` | `string` | Yes | - |
| `securityCode` | `string` | Yes | - |
| `localMilePlusAuthLink` | `string` | Yes | - |

---

### `FUNCTION` `initiateMPProductsTrial`

- **Line:** 37
- **Async:** Yes
- **Returns:** `Promise<NetSuiteResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `InitiateLocalMileTrialPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 41

---

### `VARIABLE` `baseUrl`

- **Line:** 46

---

### `VARIABLE` `params`

- **Line:** 47

---

### `VARIABLE` `url`

- **Line:** 59

---

### `VARIABLE` `response`

- **Line:** 65

---

### `VARIABLE` `errorBody`

- **Line:** 68

---

### `VARIABLE` `responseBody`

- **Line:** 73

---

### `VARIABLE` `lead`

- **Line:** 79

---

### `VARIABLE` `franchiseeEmail`

- **Line:** 81

---

### `VARIABLE` `franchiseeHtml`

- **Line:** 83

---

### `VARIABLE` `subject`

- **Line:** 84

---

### `VARIABLE` `SYSTEM_PLACEHOLDERS`

- **Line:** 116

---

### `FUNCTION` `isPlaceholderName`

- **Line:** 118
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | No | - | - |

---

### `FUNCTION` `resolveAccountManagerDetails`

- **Line:** 123
- **Async:** Yes
- **Returns:** `Promise<{ outboundCallerName: string; aircallNumber: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `accountManagerName` | `string` | No | - | - |
| `userName` | `string` | No | - | - |
| `userEmail` | `string` | No | - | - |
| `leadId` | `string` | No | - | - |

---

### `VARIABLE` `outboundCallerName`

- **Line:** 129

---

### `VARIABLE` `aircallNumber`

- **Line:** 130

---

### `VARIABLE` `targetAmName`

- **Line:** 132

---

### `VARIABLE` `lead`

- **Line:** 137

---

### `VARIABLE` `leadAm`

- **Line:** 139

---

### `VARIABLE` `db`

- **Line:** 157

---

### `VARIABLE` `amNameTrimmed`

- **Line:** 160

---

### `VARIABLE` `docById`

- **Line:** 164

---

### `VARIABLE` `userData`

- **Line:** 166

---

### `VARIABLE` `usersSnap`

- **Line:** 173

---

### `VARIABLE` `normalizedTarget`

- **Line:** 174

---

### `VARIABLE` `matchedUserDoc`

- **Line:** 175

---

### `VARIABLE` `data`

- **Line:** 176

---

### `VARIABLE` `fullName`

- **Line:** 177

---

### `VARIABLE` `displayName`

- **Line:** 178

---

### `VARIABLE` `name`

- **Line:** 179

---

### `VARIABLE` `email`

- **Line:** 180

---

### `VARIABLE` `userData`

- **Line:** 185

---

### `VARIABLE` `usersSnap`

- **Line:** 194

---

### `VARIABLE` `userData`

- **Line:** 196

---

### `FUNCTION` `initiateLocalMileTrial`

- **Line:** 210
- **Async:** Yes
- **Returns:** `Promise<NetSuiteResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `InitiateLocalMileTrialPayload` | **Yes** | - | - |

---

### `VARIABLE` `errorMsg`

- **Line:** 214

---

### `VARIABLE` `baseUrl`

- **Line:** 219

---

### `VARIABLE` `payloadParams`

- **Line:** 220
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `params`

- **Line:** 235

---

### `VARIABLE` `url`

- **Line:** 237

---

### `VARIABLE` `response`

- **Line:** 243

---

### `VARIABLE` `errorBody`

- **Line:** 250

---

### `VARIABLE` `responseBody`

- **Line:** 255

---

### `VARIABLE` `html`

- **Line:** 269

---

### `VARIABLE` `smsText`

- **Line:** 292

---

### `VARIABLE` `lead`

- **Line:** 297

---

### `VARIABLE` `franchiseeEmail`

- **Line:** 299

---

### `VARIABLE` `franchiseeHtml`

- **Line:** 301

---

### `VARIABLE` `subject`

- **Line:** 302

---

### `VARIABLE` `pmpoInfo`

- **Line:** 324

---

### `VARIABLE` `frequencyArray`

- **Line:** 326

---

### `VARIABLE` `localMileApiKey`

- **Line:** 332

---

### `VARIABLE` `schedPayload`

- **Line:** 334

---

### `VARIABLE` `companyExists`

- **Line:** 371

---

### `VARIABLE` `schedRes`

- **Line:** 376

---

### `FUNCTION` `resendLocalMileEmail`

- **Line:** 412
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message?: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `{
	contactEmail: string;
	contactFirstName: string;
	securityCode: string;
	localMilePlusAuthLink: string;
	userEmail?: string;
	leadId?: string;
	contactPhone?: string;
	userName?: string;
	accountManagerName?: string;
}` | **Yes** | - | - |

---

### `VARIABLE` `html`

- **Line:** 437

---

### `VARIABLE` `smsText`

- **Line:** 464

---

### `FUNCTION` `recreateLocalMileCode`

- **Line:** 475
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; securityCode?: string; message?: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `{ email: string }` | **Yes** | - | - |

---

### `VARIABLE` `url`

- **Line:** 481

---

### `VARIABLE` `response`

- **Line:** 484

---

### `VARIABLE` `errorBody`

- **Line:** 494

---

### `VARIABLE` `data`

- **Line:** 499

---

### `FUNCTION` `generateLocalMileEmailHtml`

- **Line:** 511
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contactFirstName` | `string` | **Yes** | - | - |
| `securityCode` | `string` | **Yes** | - | - |
| `localMilePlusAuthLink` | `string` | **Yes** | - | - |
| `outboundCallerName` | `string` | No | `'MailPlus Outbound Team'` | - |
| `aircallNumber` | `string` | No | `'1300 65 65 95'` | - |

---

### `VARIABLE` `contactName`

- **Line:** 518

---

### `FUNCTION` `generateFranchiseeNotificationHtml`

- **Line:** 740
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyName` | `string` | **Yes** | - | - |
| `serviceType` | `string` | No | - | - |
| `rate` | `string | number` | No | - | - |
| `lead` | `any` | No | - | - |

---

### `VARIABLE` `frequency`

- **Line:** 741

---

### `VARIABLE` `formattedRate`

- **Line:** 742

---

### `VARIABLE` `addressParts`

- **Line:** 743

---

### `VARIABLE` `addressHtml`

- **Line:** 744

---

### `FUNCTION` `generateShipMateFranchiseeNotificationHtml`

- **Line:** 883
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `companyName` | `string` | **Yes** | - | - |
| `lead` | `any` | No | - | - |

---

### `VARIABLE` `addressParts`

- **Line:** 884

---

### `VARIABLE` `addressHtml`

- **Line:** 885

---

