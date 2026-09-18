# Module: `src/app/api/franchisees/presales/route.ts`

- **Language:** TypeScript
- **Total Lines:** 628
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `FUNCTION` `formatToYYYYMMDD`

- **Line:** 6
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `s`

- **Line:** 17

---

### `VARIABLE` `parts`

- **Line:** 24

---

### `VARIABLE` `day`

- **Line:** 25

---

### `VARIABLE` `month`

- **Line:** 26

---

### `VARIABLE` `year`

- **Line:** 27

---

### `VARIABLE` `d`

- **Line:** 32

---

### `FUNCTION` `calculateFiveYearExpiry`

- **Line:** 41
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `formatted`

- **Line:** 42

---

### `VARIABLE` `parts`

- **Line:** 44

---

### `VARIABLE` `year`

- **Line:** 46

---

### `FUNCTION` `parseAustralianAddress`

- **Line:** 52
- **Returns:** `{
  streetNumberAndName: string;
  suburb: string;
  state: string;
  postcode: string;
  formattedAddress: string;
}`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rawAddress` | `any` | **Yes** | - | - |

---

### `VARIABLE` `street`

- **Line:** 64

---

### `VARIABLE` `suburb`

- **Line:** 65

---

### `VARIABLE` `state`

- **Line:** 66

---

### `VARIABLE` `postcode`

- **Line:** 67

---

### `VARIABLE` `formattedAddress`

- **Line:** 68

---

### `VARIABLE` `str`

- **Line:** 72

---

### `VARIABLE` `parts`

- **Line:** 78

---

### `VARIABLE` `streetNumberAndName`

- **Line:** 79

---

### `VARIABLE` `suburb`

- **Line:** 80

---

### `VARIABLE` `state`

- **Line:** 81

---

### `VARIABLE` `postcode`

- **Line:** 82

---

### `VARIABLE` `lastPart`

- **Line:** 92

---

### `VARIABLE` `pcMatch`

- **Line:** 93

---

### `VARIABLE` `stMatch`

- **Line:** 95

---

### `VARIABLE` `lastPart`

- **Line:** 99

---

### `VARIABLE` `pcMatch`

- **Line:** 100

---

### `VARIABLE` `stMatch`

- **Line:** 102

---

### `VARIABLE` `postcode`

- **Line:** 116

---

### `VARIABLE` `remaining`

- **Line:** 117

---

### `VARIABLE` `pcMatch`

- **Line:** 118

---

### `VARIABLE` `state`

- **Line:** 124

---

### `VARIABLE` `stateMatch`

- **Line:** 125

---

### `VARIABLE` `stateIndex`

- **Line:** 128

---

### `VARIABLE` `beforeState`

- **Line:** 129

---

### `VARIABLE` `words`

- **Line:** 130

---

### `VARIABLE` `suburb`

- **Line:** 132

---

### `VARIABLE` `streetNumberAndName`

- **Line:** 133

---

### `FUNCTION` `findFranchiseeDoc`

- **Line:** 147
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `db` | `any` | **Yes** | - | - |
| `franchiseeId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `cleanId`

- **Line:** 148

---

### `VARIABLE` `numId`

- **Line:** 149

---

### `VARIABLE` `docRef`

- **Line:** 153

---

### `VARIABLE` `snap`

- **Line:** 159

---

### `VARIABLE` `snap`

- **Line:** 169

---

### `VARIABLE` `snap`

- **Line:** 179

---

### `FUNCTION` `findUserDocForFranchisee`

- **Line:** 190
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `db` | `any` | **Yes** | - | - |
| `franchiseeId` | `string` | **Yes** | - | - |
| `email` | `string` | No | - | - |
| `franData` | `any` | No | - | - |

---

### `VARIABLE` `cleanId`

- **Line:** 191

---

### `VARIABLE` `numId`

- **Line:** 192

---

### `VARIABLE` `snap`

- **Line:** 195

---

### `VARIABLE` `targetEmail`

- **Line:** 223

---

### `FUNCTION` `resolveFranchiseeName`

- **Line:** 232
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `db` | `any` | **Yes** | - | - |
| `franchiseeId` | `string` | **Yes** | - | - |
| `email` | `string` | No | - | - |
| `franData` | `any` | No | - | - |
| `uData` | `any` | No | - | - |

---

### `VARIABLE` `cleanId`

- **Line:** 233

---

### `VARIABLE` `numId`

- **Line:** 234

---

### `VARIABLE` `name`

- **Line:** 236

---

### `VARIABLE` `lSnap`

- **Line:** 241

---

### `VARIABLE` `cSnap`

- **Line:** 256

---

### `FUNCTION` `GET`

- **Line:** 269
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `rawId`

- **Line:** 272

---

### `VARIABLE` `franchiseeId`

- **Line:** 273

---

### `VARIABLE` `db`

- **Line:** 274

---

### `VARIABLE` `presaleDoc`

- **Line:** 277

---

### `VARIABLE` `franData`

- **Line:** 278

---

### `VARIABLE` `data`

- **Line:** 281

---

### `VARIABLE` `mainDetails`

- **Line:** 282

---

### `VARIABLE` `dateBizStarted`

- **Line:** 283

---

### `VARIABLE` `uData`

- **Line:** 285

---

### `VARIABLE` `rawBizDate`

- **Line:** 287

---

### `VARIABLE` `expDate`

- **Line:** 291

---

### `VARIABLE` `rawAddr`

- **Line:** 293

---

### `VARIABLE` `parsedAddr`

- **Line:** 294

---

### `VARIABLE` `resolvedFranName`

- **Line:** 296

---

### `VARIABLE` `finalFranName`

- **Line:** 297

---

### `VARIABLE` `uData`

- **Line:** 322

---

### `VARIABLE` `franchiseeName`

- **Line:** 323

---

### `VARIABLE` `rawBizDate`

- **Line:** 325

---

### `VARIABLE` `dateBusinessStarted`

- **Line:** 326

---

### `VARIABLE` `expiryDate`

- **Line:** 327

---

### `VARIABLE` `ultimateExpiryDate`

- **Line:** 328

---

### `VARIABLE` `unlimitedTermOffer`

- **Line:** 329

---

### `VARIABLE` `rawAddr`

- **Line:** 331

---

### `VARIABLE` `parsedAddr`

- **Line:** 332

---

### `VARIABLE` `mainDetails`

- **Line:** 334

---

### `VARIABLE` `defaultRecord`

- **Line:** 353
- **Signature:** `Partial<PresaleRecord>`

---

### `VARIABLE` `presaleRef`

- **Line:** 400

---

### `VARIABLE` `targetFranDoc`

- **Line:** 403

---

### `VARIABLE` `franUpdate`

- **Line:** 404

---

### `VARIABLE` `snapshot`

- **Line:** 425

---

### `VARIABLE` `presales`

- **Line:** 432
- **Signature:** `PresaleRecord[]`

---

### `VARIABLE` `dData`

- **Line:** 434

---

### `FUNCTION` `POST`

- **Line:** 448
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 450

---

### `VARIABLE` `db`

- **Line:** 457

---

### `VARIABLE` `presaleRef`

- **Line:** 458

---

### `VARIABLE` `existingDoc`

- **Line:** 459

---

### `VARIABLE` `existingData`

- **Line:** 460

---

### `VARIABLE` `nowStr`

- **Line:** 461

---

### `VARIABLE` `step1Status`

- **Line:** 463
- **Signature:** `PresaleRecord['step1Status']`

---

### `VARIABLE` `step2Status`

- **Line:** 464
- **Signature:** `PresaleRecord['step2Status']`

---

### `VARIABLE` `step3Status`

- **Line:** 465
- **Signature:** `PresaleRecord['step3Status']`

---

### `VARIABLE` `step4Status`

- **Line:** 466
- **Signature:** `PresaleRecord['step4Status']`

---

### `VARIABLE` `overallStatus`

- **Line:** 479
- **Signature:** `PresaleRecord['status']`

---

### `VARIABLE` `isAdminOrOps`

- **Line:** 496

---

### `VARIABLE` `finalPresalesDetails`

- **Line:** 497

---

### `VARIABLE` `rawBiz`

- **Line:** 502

---

### `VARIABLE` `bizStarted`

- **Line:** 503

---

### `VARIABLE` `computedExpiryDate`

- **Line:** 504

---

### `VARIABLE` `fullAddress`

- **Line:** 506

---

### `VARIABLE` `resolvedFranName`

- **Line:** 513

---

### `VARIABLE` `updatedMainDetails`

- **Line:** 521

---

### `VARIABLE` `payload`

- **Line:** 530
- **Signature:** `Partial<PresaleRecord>`

---

### `VARIABLE` `franDocUpdate`

- **Line:** 575
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `targetFranDoc`

- **Line:** 592

---

### `VARIABLE` `userDocsSnap`

- **Line:** 600

---

### `VARIABLE` `profileUpdates`

- **Line:** 601
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `userPromises`

- **Line:** 615

---

