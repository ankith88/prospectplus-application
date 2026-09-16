# Module: `src/app/admin/franchisees/presales/[franchiseeId]/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 2082
- **Direct Dependencies:** 18 modules imported

## Exported Symbols & API

### `FUNCTION` `parseClientAddress`

- **Line:** 49
- **Returns:** `{
  streetNumberAndName: string;
  suburb: string;
  state: string;
  postcode: string;
}`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rawAddress` | `any` | **Yes** | - | - |

---

### `VARIABLE` `str`

- **Line:** 64

---

### `VARIABLE` `parts`

- **Line:** 68

---

### `VARIABLE` `pcMatch`

- **Line:** 73

---

### `VARIABLE` `stMatch`

- **Line:** 74

---

### `VARIABLE` `pcMatch`

- **Line:** 83

---

### `VARIABLE` `stMatch`

- **Line:** 84

---

### `VARIABLE` `sub`

- **Line:** 85

---

### `VARIABLE` `postcode`

- **Line:** 95

---

### `VARIABLE` `remaining`

- **Line:** 96

---

### `VARIABLE` `pcMatch`

- **Line:** 97

---

### `VARIABLE` `state`

- **Line:** 103

---

### `VARIABLE` `stateMatch`

- **Line:** 104

---

### `VARIABLE` `stateIndex`

- **Line:** 107

---

### `VARIABLE` `beforeState`

- **Line:** 108

---

### `VARIABLE` `words`

- **Line:** 109

---

### `VARIABLE` `suburb`

- **Line:** 111

---

### `VARIABLE` `streetNumberAndName`

- **Line:** 112

---

### `FUNCTION` `DedicatedTerritoryPresalePage`

- **Line:** 120
- **Returns:** `void`

---

### `VARIABLE` `params`

- **Line:** 121

---

### `VARIABLE` `router`

- **Line:** 122

---

### `VARIABLE` `franchiseeId`

- **Line:** 123

---

### `FUNCTION` `handleVerifyABN`

- **Line:** 175
- **Async:** Yes

---

### `VARIABLE` `abnToVerify`

- **Line:** 176

---

### `VARIABLE` `res`

- **Line:** 188

---

### `VARIABLE` `json`

- **Line:** 189

---

### `VARIABLE` `autocompleteService`

- **Line:** 253

---

### `VARIABLE` `placesService`

- **Line:** 254

---

### `VARIABLE` `dummyDivRef`

- **Line:** 256

---

### `VARIABLE` `isAdminOrOps`

- **Line:** 268

---

### `VARIABLE` `isDeedSigned`

- **Line:** 274

---

### `FUNCTION` `loadPresale`

- **Line:** 283
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `res`

- **Line:** 286

---

### `VARIABLE` `json`

- **Line:** 287

---

### `VARIABLE` `d`

- **Line:** 289
- **Signature:** `PresaleRecord`

---

### `VARIABLE` `rawAddr`

- **Line:** 304

---

### `VARIABLE` `parsed`

- **Line:** 305

---

### `VARIABLE` `street`

- **Line:** 307

---

### `VARIABLE` `suburb`

- **Line:** 308

---

### `VARIABLE` `state`

- **Line:** 309

---

### `VARIABLE` `postcode`

- **Line:** 310

---

### `VARIABLE` `bizStarted`

- **Line:** 312

---

### `VARIABLE` `expDate`

- **Line:** 313

---

### `VARIABLE` `franName`

- **Line:** 315

---

### `VARIABLE` `isDeedSigned`

- **Line:** 333

---

### `VARIABLE` `isMainDetailsComplete`

- **Line:** 336

---

### `VARIABLE` `initialStep`

- **Line:** 341
- **Signature:** `1 | 2 | 3 | 4`

---

### `FUNCTION` `handleStreetInputChange`

- **Line:** 361

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `fullAddr`

- **Line:** 362

---

### `FUNCTION` `handleSelectPrediction`

- **Line:** 384

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prediction` | `google.maps.places.AutocompletePrediction` | **Yes** | - | - |

---

### `VARIABLE` `comps`

- **Line:** 390

---

### `FUNCTION` `getComp`

- **Line:** 391

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShort` | `any` | No | `false` | - |

---

### `VARIABLE` `c`

- **Line:** 392

---

### `VARIABLE` `streetNo`

- **Line:** 396

---

### `VARIABLE` `route`

- **Line:** 397

---

### `VARIABLE` `street`

- **Line:** 398

---

### `VARIABLE` `suburb`

- **Line:** 399

---

### `VARIABLE` `state`

- **Line:** 400

---

### `VARIABLE` `postcode`

- **Line:** 401

---

### `VARIABLE` `fullAddr`

- **Line:** 402

---

### `FUNCTION` `handleDateBusinessStartedChange`

- **Line:** 420

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `startedStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `expDate`

- **Line:** 421

---

### `VARIABLE` `parts`

- **Line:** 423

---

### `VARIABLE` `year`

- **Line:** 425

---

### `FUNCTION` `handleSave`

- **Line:** 442
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `customDeed` | `PresaleDeedOfVariation` | No | - | - |

---

### `VARIABLE` `finalDeed`

- **Line:** 445

---

### `VARIABLE` `fullAddr`

- **Line:** 446

---

### `VARIABLE` `updatedMain`

- **Line:** 453

---

### `VARIABLE` `res`

- **Line:** 458

---

### `VARIABLE` `json`

- **Line:** 479

---

### `FUNCTION` `handleCancelPresale`

- **Line:** 510
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 513

---

### `VARIABLE` `json`

- **Line:** 527

---

### `FUNCTION` `handleReactivatePresale`

- **Line:** 559
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 562

---

### `VARIABLE` `json`

- **Line:** 574

---

### `FUNCTION` `handleSendDeedEmail`

- **Line:** 603
- **Async:** Yes

---

### `VARIABLE` `targetEmail`

- **Line:** 604

---

### `VARIABLE` `res`

- **Line:** 616

---

### `VARIABLE` `json`

- **Line:** 625

---

### `FUNCTION` `handleSendImEmail`

- **Line:** 664
- **Async:** Yes

---

### `VARIABLE` `targetEmail`

- **Line:** 665

---

### `VARIABLE` `res`

- **Line:** 686

---

### `VARIABLE` `json`

- **Line:** 700

---

### `FUNCTION` `handleMapImageUpload`

- **Line:** 733

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 734

---

### `VARIABLE` `reader`

- **Line:** 746

---

### `VARIABLE` `dataUrl`

- **Line:** 748

---

### `FUNCTION` `handleStepClick`

- **Line:** 757

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetStep` | `1 | 2 | 3 | 4` | **Yes** | - | - |

---

### `FUNCTION` `handleDeedSaved`

- **Line:** 769

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updatedDeed` | `PresaleDeedOfVariation` | **Yes** | - | - |

---

### `FUNCTION` `copyPublicLink`

- **Line:** 774

---

### `VARIABLE` `token`

- **Line:** 775

---

### `VARIABLE` `url`

- **Line:** 776

---

### `FUNCTION` `getStatusBadge`

- **Line:** 784

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `s` | `StepStatus` | **Yes** | - | - |

---

### `VARIABLE` `defaultTo`

- **Line:** 1318

---

### `VARIABLE` `defaultTo`

- **Line:** 1505

---

### `VARIABLE` `next`

- **Line:** 1761

---

