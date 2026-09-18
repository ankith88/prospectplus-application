# Module: `src/components/quick-add-lead-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 566
- **Direct Dependencies:** 20 modules imported

## Exported Symbols & API

### `INTERFACE` `QuickAddLeadDialogProps`

- **Line:** 47

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |

---

### `FUNCTION` `parseAddressComponents`

- **Line:** 52
- **Returns:** `Address`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `components` | `google.maps.GeocoderAddressComponent[]` | **Yes** | - | - |

---

### `VARIABLE` `address`

- **Line:** 53
- **Signature:** `Partial<Address>`

---

### `FUNCTION` `get`

- **Line:** 54

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShortName` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 55

---

### `VARIABLE` `streetNumber`

- **Line:** 59

---

### `VARIABLE` `route`

- **Line:** 60

---

### `FUNCTION` `QuickAddLeadDialog`

- **Line:** 72
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange }` | `QuickAddLeadDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `autocompleteService`

- **Line:** 80

---

### `VARIABLE` `placesService`

- **Line:** 81

---

### `VARIABLE` `router`

- **Line:** 85

---

### `VARIABLE` `videoRef`

- **Line:** 93

---

### `VARIABLE` `canvasRef`

- **Line:** 94

---

### `FUNCTION` `resetCameraState`

- **Line:** 96

---

### `FUNCTION` `getCameraPermission`

- **Line:** 131
- **Async:** Yes

---

### `VARIABLE` `stream`

- **Line:** 133

---

### `VARIABLE` `fetchPredictions`

- **Line:** 161

---

### `FUNCTION` `handleInputChange`

- **Line:** 178

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `value`

- **Line:** 179

---

### `FUNCTION` `handleCapture`

- **Line:** 186

---

### `VARIABLE` `canvas`

- **Line:** 188

---

### `VARIABLE` `context`

- **Line:** 194

---

### `FUNCTION` `handleCaptureFront`

- **Line:** 200

---

### `VARIABLE` `image`

- **Line:** 201

---

### `FUNCTION` `handleAnalyze`

- **Line:** 207

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `front` | `string | null` | **Yes** | - | - |
| `back` | `string | null` | **Yes** | - | - |

---

### `VARIABLE` `fullSearchQuery`

- **Line:** 213

---

### `FUNCTION` `handleCaptureBackAndAnalyze`

- **Line:** 237

---

### `VARIABLE` `image`

- **Line:** 238

---

### `FUNCTION` `handleSkipAndAnalyze`

- **Line:** 244

---

### `FUNCTION` `handlePredictionSelect`

- **Line:** 248

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prediction` | `google.maps.places.AutocompletePrediction` | **Yes** | - | - |

---

### `FUNCTION` `handleSubmit`

- **Line:** 265
- **Async:** Yes

---

### `VARIABLE` `place`

- **Line:** 277

---

### `VARIABLE` `companyName`

- **Line:** 278

---

### `VARIABLE` `websiteUrl`

- **Line:** 279

---

### `VARIABLE` `customerPhone`

- **Line:** 280

---

### `VARIABLE` `address`

- **Line:** 281

---

### `VARIABLE` `websiteDomain`

- **Line:** 282

---

### `VARIABLE` `customerServiceEmail`

- **Line:** 283

---

### `VARIABLE` `duplicateId`

- **Line:** 285

---

### `VARIABLE` `franchiseeInternalId`

- **Line:** 292
- **Signature:** `string | undefined`

---

### `VARIABLE` `franchiseeName`

- **Line:** 293
- **Signature:** `string | undefined`

---

### `VARIABLE` `isFranchiseeRole`

- **Line:** 295

---

### `VARIABLE` `allFrs`

- **Line:** 302

---

### `VARIABLE` `myFranchisee`

- **Line:** 303

---

### `VARIABLE` `city`

- **Line:** 309

---

### `VARIABLE` `state`

- **Line:** 310

---

### `VARIABLE` `zip`

- **Line:** 311

---

### `VARIABLE` `canService`

- **Line:** 313

---

### `VARIABLE` `isOutsideTerritory`

- **Line:** 329

---

### `VARIABLE` `defaultCampaign`

- **Line:** 354

---

### `VARIABLE` `isMultisite`

- **Line:** 355

---

### `VARIABLE` `targetAmName`

- **Line:** 357
- **Signature:** `string | undefined`

---

### `VARIABLE` `amSnap`

- **Line:** 360

---

### `VARIABLE` `amData`

- **Line:** 362

---

### `VARIABLE` `targetBucket`

- **Line:** 372

---

### `VARIABLE` `isOutboundFranchisee`

- **Line:** 373

---

### `VARIABLE` `result`

- **Line:** 375

---

