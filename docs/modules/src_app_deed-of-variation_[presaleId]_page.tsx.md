# Module: `src/app/deed-of-variation/[presaleId]/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 692
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `FUNCTION` `PublicDeedOfVariationPage`

- **Line:** 15
- **Returns:** `void`

---

### `VARIABLE` `params`

- **Line:** 16

---

### `VARIABLE` `presaleId`

- **Line:** 17

---

### `VARIABLE` `canvasRef`

- **Line:** 35

---

### `FUNCTION` `loadData`

- **Line:** 40
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `res`

- **Line:** 43

---

### `VARIABLE` `json`

- **Line:** 44

---

### `VARIABLE` `d`

- **Line:** 46
- **Signature:** `PresaleRecord`

---

### `VARIABLE` `mainC`

- **Line:** 49

---

### `VARIABLE` `addr`

- **Line:** 50

---

### `VARIABLE` `p1Name`

- **Line:** 51

---

### `VARIABLE` `p1Addr`

- **Line:** 52

---

### `FUNCTION` `startDrawing`

- **Line:** 81

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 83

---

### `VARIABLE` `ctx`

- **Line:** 85

---

### `VARIABLE` `rect`

- **Line:** 88

---

### `VARIABLE` `scaleX`

- **Line:** 89

---

### `VARIABLE` `scaleY`

- **Line:** 90

---

### `VARIABLE` `clientX`

- **Line:** 92

---

### `VARIABLE` `clientY`

- **Line:** 93

---

### `VARIABLE` `x`

- **Line:** 102

---

### `VARIABLE` `y`

- **Line:** 103

---

### `FUNCTION` `stopDrawing`

- **Line:** 109

---

### `FUNCTION` `draw`

- **Line:** 116

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 118

---

### `VARIABLE` `ctx`

- **Line:** 119

---

### `VARIABLE` `rect`

- **Line:** 122

---

### `VARIABLE` `scaleX`

- **Line:** 123

---

### `VARIABLE` `scaleY`

- **Line:** 124

---

### `VARIABLE` `clientX`

- **Line:** 126

---

### `VARIABLE` `clientY`

- **Line:** 127

---

### `VARIABLE` `x`

- **Line:** 136

---

### `VARIABLE` `y`

- **Line:** 137

---

### `FUNCTION` `clearCanvas`

- **Line:** 149

---

### `VARIABLE` `canvas`

- **Line:** 151

---

### `VARIABLE` `ctx`

- **Line:** 152

---

### `FUNCTION` `handleSubmitDeed`

- **Line:** 160
- **Async:** Yes

---

### `VARIABLE` `canvasUrl`

- **Line:** 166

---

### `VARIABLE` `res`

- **Line:** 174

---

### `VARIABLE` `json`

- **Line:** 190

---

### `FUNCTION` `downloadDeedPDF`

- **Line:** 203

---

### `VARIABLE` `doc`

- **Line:** 204

---

### `VARIABLE` `primaryColor`

- **Line:** 210

---

### `VARIABLE` `darkText`

- **Line:** 211

---

### `VARIABLE` `optionsText`

- **Line:** 249
- **Signature:** `Record<DeedOption, string[]>`

---

### `VARIABLE` `optionY`

- **Line:** 273

---

### `VARIABLE` `terms`

- **Line:** 286

---

### `VARIABLE` `termY`

- **Line:** 295

---

### `VARIABLE` `canvasUrl`

- **Line:** 322

---

