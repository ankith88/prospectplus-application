# Module: `src/components/standing-order-form.tsx`

- **Language:** TypeScript
- **Total Lines:** 725
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `INTERFACE` `SofDialogProps`

- **Line:** 16

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `onLeadUpdated` | `(updatedLead: Partial<Lead>, oldLead: Lead) => void` | No | - |

---

### `FUNCTION` `SofDialog`

- **Line:** 23
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, isOpen, onOpenChange, onLeadUpdated }` | `SofDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `canvasRef`

- **Line:** 25

---

### `VARIABLE` `printAreaRef`

- **Line:** 26

---

### `FUNCTION` `resolvePostOffice`

- **Line:** 42
- **Async:** Yes

---

### `VARIABLE` `directName`

- **Line:** 43

---

### `VARIABLE` `partnerId`

- **Line:** 51

---

### `VARIABLE` `docRef`

- **Line:** 56

---

### `VARIABLE` `docSnap`

- **Line:** 57

---

### `VARIABLE` `data`

- **Line:** 59

---

### `VARIABLE` `name`

- **Line:** 60

---

### `VARIABLE` `zip`

- **Line:** 71

---

### `VARIABLE` `suburb`

- **Line:** 72

---

### `VARIABLE` `promises`

- **Line:** 75

---

### `VARIABLE` `snaps`

- **Line:** 90

---

### `VARIABLE` `data`

- **Line:** 93

---

### `VARIABLE` `name`

- **Line:** 94

---

### `VARIABLE` `canvas`

- **Line:** 113

---

### `VARIABLE` `ctx`

- **Line:** 114

---

### `FUNCTION` `startDrawing`

- **Line:** 123

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 125

---

### `VARIABLE` `ctx`

- **Line:** 127

---

### `VARIABLE` `rect`

- **Line:** 130

---

### `VARIABLE` `x`

- **Line:** 131

---

### `VARIABLE` `y`

- **Line:** 131

---

### `FUNCTION` `draw`

- **Line:** 145

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>` | **Yes** | - | - |

---

### `VARIABLE` `canvas`

- **Line:** 148

---

### `VARIABLE` `ctx`

- **Line:** 150

---

### `VARIABLE` `rect`

- **Line:** 153

---

### `VARIABLE` `x`

- **Line:** 154

---

### `VARIABLE` `y`

- **Line:** 154

---

### `FUNCTION` `stopDrawing`

- **Line:** 167

---

### `FUNCTION` `clearSignature`

- **Line:** 171

---

### `VARIABLE` `canvas`

- **Line:** 172

---

### `VARIABLE` `ctx`

- **Line:** 174

---

### `FUNCTION` `saveSignatureDetails`

- **Line:** 181
- **Async:** Yes

---

### `VARIABLE` `currentSignature`

- **Line:** 182

---

### `VARIABLE` `canvas`

- **Line:** 185

---

### `VARIABLE` `blank`

- **Line:** 189

---

### `VARIABLE` `sofDetails`

- **Line:** 215

---

### `FUNCTION` `downloadPdf`

- **Line:** 243
- **Async:** Yes

---

### `VARIABLE` `html2canvas`

- **Line:** 256

---

### `VARIABLE` `element`

- **Line:** 258

---

### `VARIABLE` `canvas`

- **Line:** 262

---

### `VARIABLE` `imgData`

- **Line:** 270

---

### `VARIABLE` `pdf`

- **Line:** 273

---

### `VARIABLE` `imgWidth`

- **Line:** 280

---

### `VARIABLE` `pageHeight`

- **Line:** 281

---

### `VARIABLE` `imgHeight`

- **Line:** 282

---

### `VARIABLE` `heightLeft`

- **Line:** 283

---

### `VARIABLE` `positionY`

- **Line:** 285

---

### `FUNCTION` `clean`

- **Line:** 316
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `str`

- **Line:** 318

---

### `VARIABLE` `unitSite`

- **Line:** 323

---

### `VARIABLE` `streetSite`

- **Line:** 324

---

### `VARIABLE` `citySite`

- **Line:** 325

---

### `VARIABLE` `stateSite`

- **Line:** 326

---

### `VARIABLE` `postcodeSite`

- **Line:** 327

---

### `VARIABLE` `streetPart`

- **Line:** 329

---

### `VARIABLE` `siteAddressParts`

- **Line:** 338

---

### `VARIABLE` `formattedSiteAddress`

- **Line:** 339

---

### `VARIABLE` `postalBoxText`

- **Line:** 341

---

### `VARIABLE` `addr1`

- **Line:** 343

---

### `VARIABLE` `street`

- **Line:** 344

---

### `VARIABLE` `match1`

- **Line:** 346

---

### `VARIABLE` `foundPrefix`

- **Line:** 348

---

### `VARIABLE` `prefix`

- **Line:** 349

---

### `VARIABLE` `match2`

- **Line:** 357

---

### `VARIABLE` `foundPrefix`

- **Line:** 359

---

### `VARIABLE` `prefix`

- **Line:** 360

---

### `VARIABLE` `rawBox`

- **Line:** 369

---

