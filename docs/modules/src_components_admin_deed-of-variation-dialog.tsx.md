# Module: `src/components/admin/deed-of-variation-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 522
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `INTERFACE` `DeedOfVariationDialogProps`

- **Line:** 22

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `mainDetails` | `PresaleMainDetails` | No | - |
| `deedOfVariation` | `PresaleDeedOfVariation` | No | - |
| `onSaveDeed` | `(deed: PresaleDeedOfVariation) => void` | No | - |

---

### `FUNCTION` `DeedOfVariationDialog`

- **Line:** 30
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  open,
  onOpenChange,
  mainDetails,
  deedOfVariation,
  onSaveDeed,
}` | `DeedOfVariationDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `canvasRef`

- **Line:** 43

---

### `VARIABLE` `fileInputRef`

- **Line:** 44

---

### `FUNCTION` `startDrawing`

- **Line:** 53

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 55

---

### `VARIABLE` `ctx`

- **Line:** 57

---

### `VARIABLE` `rect`

- **Line:** 60

---

### `VARIABLE` `scaleX`

- **Line:** 61

---

### `VARIABLE` `scaleY`

- **Line:** 62

---

### `VARIABLE` `clientX`

- **Line:** 64

---

### `VARIABLE` `clientY`

- **Line:** 65

---

### `VARIABLE` `x`

- **Line:** 74

---

### `VARIABLE` `y`

- **Line:** 75

---

### `FUNCTION` `stopDrawing`

- **Line:** 81

---

### `FUNCTION` `draw`

- **Line:** 88

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 90

---

### `VARIABLE` `ctx`

- **Line:** 91

---

### `VARIABLE` `rect`

- **Line:** 94

---

### `VARIABLE` `scaleX`

- **Line:** 95

---

### `VARIABLE` `scaleY`

- **Line:** 96

---

### `VARIABLE` `clientX`

- **Line:** 98

---

### `VARIABLE` `clientY`

- **Line:** 99

---

### `VARIABLE` `x`

- **Line:** 109

---

### `VARIABLE` `y`

- **Line:** 110

---

### `FUNCTION` `clearCanvas`

- **Line:** 122

---

### `VARIABLE` `canvas`

- **Line:** 124

---

### `VARIABLE` `ctx`

- **Line:** 125

---

### `FUNCTION` `handleSignOnline`

- **Line:** 133

---

### `VARIABLE` `canvasUrl`

- **Line:** 138

---

### `VARIABLE` `updated`

- **Line:** 140
- **Signature:** `PresaleDeedOfVariation`

---

### `FUNCTION` `handleFileUpload`

- **Line:** 153

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 154

---

### `VARIABLE` `reader`

- **Line:** 162

---

### `VARIABLE` `dataUrl`

- **Line:** 164

---

### `VARIABLE` `updated`

- **Line:** 165
- **Signature:** `PresaleDeedOfVariation`

---

### `FUNCTION` `generateAndDownloadPDF`

- **Line:** 178

---

### `VARIABLE` `doc`

- **Line:** 179

---

### `VARIABLE` `primaryColor`

- **Line:** 185

---

### `VARIABLE` `darkText`

- **Line:** 186

---

### `VARIABLE` `recitalsText`

- **Line:** 235

---

### `VARIABLE` `y`

- **Line:** 241

---

