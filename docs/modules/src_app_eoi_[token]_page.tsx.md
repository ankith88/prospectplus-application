# Module: `src/app/eoi/[token]/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 1429
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `EmploymentEntry`

- **Line:** 13

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `occupation` | `string` | No | - |
| `position` | `string` | No | - |
| `company` | `string` | No | - |
| `businessType` | `string` | No | - |
| `address` | `string` | No | - |
| `contactPerson` | `string` | No | - |
| `phone` | `string` | No | - |
| `periodOfEmployment` | `string` | No | - |
| `commencementDate` | `string` | No | - |
| `reasonLeft` | `string` | No | - |
| `responsibilities` | `string` | No | - |

---

### `INTERFACE` `ReferenceEntry`

- **Line:** 27

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | - |
| `phone` | `string` | No | - |
| `position` | `string` | No | - |
| `company` | `string` | No | - |
| `nature` | `string` | No | - |

---

### `FUNCTION` `PublicEOIPage`

- **Line:** 35
- **Returns:** `void`

---

### `VARIABLE` `params`

- **Line:** 36

---

### `VARIABLE` `token`

- **Line:** 37

---

### `VARIABLE` `canvasRef`

- **Line:** 188

---

### `VARIABLE` `calculatedTotalIncome`

- **Line:** 197

---

### `VARIABLE` `calculatedTotalExpenditure`

- **Line:** 198

---

### `VARIABLE` `calculatedTotalAssets`

- **Line:** 199

---

### `VARIABLE` `calculatedTotalLiabilities`

- **Line:** 200

---

### `VARIABLE` `calculatedNetWorth`

- **Line:** 201

---

### `FUNCTION` `loadEOI`

- **Line:** 204
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `res`

- **Line:** 207

---

### `VARIABLE` `json`

- **Line:** 208

---

### `VARIABLE` `p`

- **Line:** 210

---

### `VARIABLE` `d`

- **Line:** 222

---

### `FUNCTION` `startDrawing`

- **Line:** 378

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 380

---

### `VARIABLE` `ctx`

- **Line:** 382

---

### `VARIABLE` `rect`

- **Line:** 384

---

### `VARIABLE` `clientX`

- **Line:** 385

---

### `VARIABLE` `clientY`

- **Line:** 386

---

### `FUNCTION` `draw`

- **Line:** 391

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 393

---

### `VARIABLE` `ctx`

- **Line:** 395

---

### `VARIABLE` `rect`

- **Line:** 397

---

### `VARIABLE` `clientX`

- **Line:** 398

---

### `VARIABLE` `clientY`

- **Line:** 399

---

### `FUNCTION` `stopDrawing`

- **Line:** 408

---

### `FUNCTION` `clearCanvas`

- **Line:** 412

---

### `VARIABLE` `canvas`

- **Line:** 413

---

### `VARIABLE` `ctx`

- **Line:** 415

---

### `FUNCTION` `addEmploymentRow`

- **Line:** 421

---

### `FUNCTION` `updateEmploymentRow`

- **Line:** 426

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `idx` | `number` | **Yes** | - | - |
| `field` | `keyof EmploymentEntry` | **Yes** | - | - |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 427

---

### `FUNCTION` `removeEmploymentRow`

- **Line:** 432

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `idx` | `number` | **Yes** | - | - |

---

### `FUNCTION` `updateReferenceRow`

- **Line:** 437

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `idx` | `number` | **Yes** | - | - |
| `field` | `keyof ReferenceEntry` | **Yes** | - | - |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 438

---

### `FUNCTION` `handleSubmit`

- **Line:** 443
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `signatureDataUrl`

- **Line:** 450

---

### `VARIABLE` `formData`

- **Line:** 454

---

### `VARIABLE` `res`

- **Line:** 581

---

### `VARIABLE` `json`

- **Line:** 593

---

