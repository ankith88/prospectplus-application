# Module: `src/app/customer-request/[companyId]/customer-request-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 899
- **Direct Dependencies:** 18 modules imported

## Exported Symbols & API

### `INTERFACE` `PublicCompany`

- **Line:** 45

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `prospectPlusId` | `string` | Yes | - |
| `companyName` | `string` | No | - |
| `netsuiteId` | `string` | No | - |
| `contactName` | `string` | No | - |
| `contactEmail` | `string` | No | - |
| `contactPhone` | `string` | No | - |
| `services` | `ServiceSelection[]` | No | - |

---

### `INTERFACE` `RequestAttachment`

- **Line:** 56

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | - |
| `url` | `string` | No | - |
| `size` | `number` | Yes | - |
| `type` | `string` | Yes | - |
| `uploadedAt` | `string` | No | - |

---

### `VARIABLE` `CANCELLATION_REASONS`

- **Line:** 64

---

### `FUNCTION` `CustomerRequestClient`

- **Line:** 73
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ companyId }` | `{ companyId: string }` | **Yes** | - | - |

---

### `VARIABLE` `staffName`

- **Line:** 116

---

### `FUNCTION` `fetchHierarchy`

- **Line:** 123
- **Async:** Yes

---

### `VARIABLE` `snap`

- **Line:** 125

---

### `FUNCTION` `loadCompany`

- **Line:** 135
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `res`

- **Line:** 139

---

### `VARIABLE` `errData`

- **Line:** 141

---

### `VARIABLE` `data`

- **Line:** 144

---

### `VARIABLE` `defaultDate`

- **Line:** 152

---

### `VARIABLE` `isoDate`

- **Line:** 154

---

### `FUNCTION` `toggleCategory`

- **Line:** 166

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cat` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleUpdateServiceRate`

- **Line:** 174

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `newRateStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `val`

- **Line:** 175

---

### `VARIABLE` `updated`

- **Line:** 176

---

### `FUNCTION` `handleUpdateServiceFrequency`

- **Line:** 181

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `newFreq` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 182

---

### `FUNCTION` `handleRemoveServiceItem`

- **Line:** 187

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleAddNewService`

- **Line:** 191

---

### `VARIABLE` `rateVal`

- **Line:** 196

---

### `VARIABLE` `newSrv`

- **Line:** 197
- **Signature:** `ServiceSelection`

---

### `FUNCTION` `handleFileUpload`

- **Line:** 209
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 210

---

### `VARIABLE` `uploadedList`

- **Line:** 215
- **Signature:** `RequestAttachment[]`

---

### `VARIABLE` `file`

- **Line:** 217

---

### `VARIABLE` `storageRef`

- **Line:** 218

---

### `VARIABLE` `downloadUrl`

- **Line:** 220

---

### `FUNCTION` `handleRemoveAttachment`

- **Line:** 238

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleSubmit`

- **Line:** 242
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `selectedThemeObj`

- **Line:** 253

---

### `VARIABLE` `selectedWhyObj`

- **Line:** 254

---

### `VARIABLE` `selectedReasonObj`

- **Line:** 255

---

### `VARIABLE` `themeName`

- **Line:** 257

---

### `VARIABLE` `whyName`

- **Line:** 258

---

### `VARIABLE` `reasonName`

- **Line:** 259

---

### `VARIABLE` `payload`

- **Line:** 261

---

### `VARIABLE` `res`

- **Line:** 290

---

### `VARIABLE` `data`

- **Line:** 296

---

### `VARIABLE` `isSelected`

- **Line:** 520

---

