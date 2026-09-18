# Module: `src/components/operations/franchise-prospects-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 2281
- **Direct Dependencies:** 20 modules imported

## Exported Symbols & API

### `VARIABLE` `TERRITORY_OPTIONS`

- **Line:** 24

---

### `FUNCTION` `FranchiseProspectsClient`

- **Line:** 32
- **Returns:** `void`

---

### `VARIABLE` `activeRole`

- **Line:** 36

---

### `VARIABLE` `isAllowed`

- **Line:** 37

---

### `VARIABLE` `DEFAULT_BROCHURE_EMAIL_COPY`

- **Line:** 60

---

### `FUNCTION` `fetchProspects`

- **Line:** 123
- **Async:** Yes

---

### `VARIABLE` `q`

- **Line:** 126

---

### `VARIABLE` `snap`

- **Line:** 127

---

### `VARIABLE` `list`

- **Line:** 128
- **Signature:** `FranchiseProspect[]`

---

### `VARIABLE` `updated`

- **Line:** 136

---

### `FUNCTION` `fetchPresales`

- **Line:** 151
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 153

---

### `VARIABLE` `json`

- **Line:** 154

---

### `VARIABLE` `list`

- **Line:** 157
- **Signature:** `Array<{ name: string; state?: string; id?: string }>`

---

### `VARIABLE` `tName`

- **Line:** 159

---

### `VARIABLE` `tState`

- **Line:** 160

---

### `VARIABLE` `filteredProspects`

- **Line:** 180

---

### `VARIABLE` `q`

- **Line:** 182

---

### `VARIABLE` `matchesSearch`

- **Line:** 183

---

### `VARIABLE` `matchesStatus`

- **Line:** 190

---

### `VARIABLE` `matchesState`

- **Line:** 191

---

### `VARIABLE` `metrics`

- **Line:** 197

---

### `VARIABLE` `total`

- **Line:** 198

---

### `VARIABLE` `newCount`

- **Line:** 199

---

### `VARIABLE` `underReview`

- **Line:** 200

---

### `VARIABLE` `converted`

- **Line:** 201

---

### `FUNCTION` `handleCreateProspect`

- **Line:** 206
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `finalTerritory`

- **Line:** 219

---

### `VARIABLE` `payload`

- **Line:** 226

---

### `VARIABLE` `res`

- **Line:** 243

---

### `VARIABLE` `json`

- **Line:** 249

---

### `FUNCTION` `handleOpenSendEmail`

- **Line:** 288

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prospect` | `FranchiseProspect` | **Yes** | - | - |
| `isStep1Brochure` | `boolean` | No | `false` | - |

---

### `VARIABLE` `territoryText`

- **Line:** 295

---

### `FUNCTION` `handleFileUpload`

- **Line:** 311

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 312

---

### `VARIABLE` `reader`

- **Line:** 316

---

### `VARIABLE` `dataUrl`

- **Line:** 318

---

### `FUNCTION` `handleRemoveFile`

- **Line:** 335

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleSendEmail`

- **Line:** 340
- **Async:** Yes

---

### `VARIABLE` `payload`

- **Line:** 349

---

### `VARIABLE` `res`

- **Line:** 362

---

### `VARIABLE` `json`

- **Line:** 368

---

### `FUNCTION` `handleUpdateStatus`

- **Line:** 390
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prospectId` | `string` | **Yes** | - | - |
| `newStatus` | `FranchiseProspect['status']` | **Yes** | - | - |

---

### `VARIABLE` `ref`

- **Line:** 393

---

### `FUNCTION` `handleAddNote`

- **Line:** 410
- **Async:** Yes

---

### `VARIABLE` `newNote`

- **Line:** 414

---

### `VARIABLE` `updatedNotes`

- **Line:** 421

---

### `VARIABLE` `ref`

- **Line:** 422

---

### `FUNCTION` `handleOpenFactSheetModal`

- **Line:** 440

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prospect` | `FranchiseProspect` | **Yes** | - | - |

---

### `FUNCTION` `handleSaveFactSheet`

- **Line:** 453
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `payload`

- **Line:** 458

---

### `VARIABLE` `res`

- **Line:** 470

---

### `VARIABLE` `json`

- **Line:** 476

---

### `FUNCTION` `handleOpenDepositModal`

- **Line:** 497

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prospect` | `FranchiseProspect` | **Yes** | - | - |

---

### `FUNCTION` `handleSaveDeposit`

- **Line:** 511
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `payload`

- **Line:** 516

---

### `VARIABLE` `res`

- **Line:** 529

---

### `VARIABLE` `json`

- **Line:** 535

---

### `FUNCTION` `handleCopyLink`

- **Line:** 555

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | - | - |
| `label` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleStartConvert`

- **Line:** 560

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prospect` | `FranchiseProspect` | **Yes** | - | - |

---

### `VARIABLE` `eoi`

- **Line:** 561
- **Signature:** `any`

---

### `FUNCTION` `getStatusBadge`

- **Line:** 575

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `FranchiseProspect['status']` | **Yes** | - | - |

---

### `VARIABLE` `kfsDone`

- **Line:** 760

---

### `VARIABLE` `deedDone`

- **Line:** 761

---

### `VARIABLE` `eoiDone`

- **Line:** 762

---

### `VARIABLE` `depositDone`

- **Line:** 763

---

### `VARIABLE` `origin`

- **Line:** 811

---

### `VARIABLE` `token`

- **Line:** 812

---

### `VARIABLE` `origin`

- **Line:** 848

---

### `VARIABLE` `token`

- **Line:** 849

---

### `VARIABLE` `kfsDone`

- **Line:** 998

---

### `VARIABLE` `deedDone`

- **Line:** 999

---

### `VARIABLE` `eoiDone`

- **Line:** 1000

---

### `VARIABLE` `depositDone`

- **Line:** 1001

---

### `VARIABLE` `completedCount`

- **Line:** 1002

---

### `VARIABLE` `origin`

- **Line:** 1039

---

### `VARIABLE` `token`

- **Line:** 1040

---

### `VARIABLE` `origin`

- **Line:** 1094

---

### `VARIABLE` `token`

- **Line:** 1095

---

### `VARIABLE` `p`

- **Line:** 1150

---

### `VARIABLE` `p`

- **Line:** 1354

---

