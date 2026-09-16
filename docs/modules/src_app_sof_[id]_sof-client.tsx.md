# Module: `src/app/sof/[id]/sof-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 442
- **Direct Dependencies:** 8 modules imported

## Exported Symbols & API

### `INTERFACE` `SofClientProps`

- **Line:** 12

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `token` | `string` | No | - |
| `lead` | `Lead` | No | - |
| `isValidSof` | `boolean` | No | - |
| `invalidReason` | `string` | No | - |

---

### `FUNCTION` `cleanField`

- **Line:** 19
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `str`

- **Line:** 21

---

### `FUNCTION` `formatPremisesAddress`

- **Line:** 26
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `addr`

- **Line:** 29
- **Signature:** `any`

---

### `VARIABLE` `addrDetails`

- **Line:** 30

---

### `VARIABLE` `unit`

- **Line:** 32

---

### `VARIABLE` `street`

- **Line:** 33

---

### `VARIABLE` `city`

- **Line:** 34

---

### `VARIABLE` `state`

- **Line:** 35

---

### `VARIABLE` `zip`

- **Line:** 36

---

### `VARIABLE` `streetPart`

- **Line:** 38

---

### `VARIABLE` `parts`

- **Line:** 47

---

### `FUNCTION` `formatPostalAddress`

- **Line:** 51
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead` | **Yes** | - | - |

---

### `VARIABLE` `p`

- **Line:** 54

---

### `VARIABLE` `boxTypeNum`

- **Line:** 55

---

### `VARIABLE` `street`

- **Line:** 61

---

### `VARIABLE` `city`

- **Line:** 62

---

### `VARIABLE` `state`

- **Line:** 63

---

### `VARIABLE` `zip`

- **Line:** 64

---

### `VARIABLE` `parts`

- **Line:** 66
- **Signature:** `string[]`

---

### `VARIABLE` `cleaned`

- **Line:** 79

---

### `FUNCTION` `SofClient`

- **Line:** 83
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ token, lead, isValidSof, invalidReason }` | `SofClientProps` | **Yes** | - | - |

---

### `VARIABLE` `canvasRef`

- **Line:** 84

---

### `VARIABLE` `canvas`

- **Line:** 97

---

### `VARIABLE` `ctx`

- **Line:** 98

---

### `FUNCTION` `startDrawing`

- **Line:** 107

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 109

---

### `VARIABLE` `ctx`

- **Line:** 111

---

### `VARIABLE` `rect`

- **Line:** 114

---

### `VARIABLE` `x`

- **Line:** 115

---

### `VARIABLE` `y`

- **Line:** 115

---

### `FUNCTION` `draw`

- **Line:** 129

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 132

---

### `VARIABLE` `ctx`

- **Line:** 134

---

### `VARIABLE` `rect`

- **Line:** 137

---

### `VARIABLE` `x`

- **Line:** 138

---

### `VARIABLE` `y`

- **Line:** 138

---

### `FUNCTION` `stopDrawing`

- **Line:** 151

---

### `FUNCTION` `clearSignature`

- **Line:** 155

---

### `VARIABLE` `canvas`

- **Line:** 156

---

### `VARIABLE` `ctx`

- **Line:** 158

---

### `FUNCTION` `handleFormSubmit`

- **Line:** 165
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `finalSigUrl`

- **Line:** 170

---

### `VARIABLE` `canvas`

- **Line:** 173

---

### `VARIABLE` `blank`

- **Line:** 180

---

### `VARIABLE` `res`

- **Line:** 198

---

### `VARIABLE` `data`

- **Line:** 211

---

### `VARIABLE` `streetAddr`

- **Line:** 228

---

### `VARIABLE` `postalAddr`

- **Line:** 229

---

