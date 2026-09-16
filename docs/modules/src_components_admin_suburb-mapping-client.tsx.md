# Module: `src/components/admin/suburb-mapping-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 888
- **Direct Dependencies:** 20 modules imported

## Exported Symbols & API

### `INTERFACE` `SuburbItem`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `suburbs` | `string` | No | - |
| `post_code` | `string` | No | - |
| `state` | `string` | No | - |
| `primary_op` | `string[]` | No | - |
| `secondary_op` | `string` | Yes | - |
| `next_day` | `boolean | null` | No | - |
| `parent_lpo_id` | `string` | Yes | - |
| `lat` | `number` | Yes | - |
| `lng` | `number` | Yes | - |

---

### `FUNCTION` `SuburbMappingClient`

- **Line:** 37
- **Returns:** `void`

---

### `FUNCTION` `init`

- **Line:** 75
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `franchiseesData`

- **Line:** 77

---

### `VARIABLE` `depotsSnap`

- **Line:** 82

---

### `VARIABLE` `depotsList`

- **Line:** 83

---

### `VARIABLE` `franchisee`

- **Line:** 105

---

### `FUNCTION` `clearMappingStates`

- **Line:** 141

---

### `FUNCTION` `sanitizeSuburbItem`

- **Line:** 151
- **Returns:** `SuburbItem`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `any` | **Yes** | - | - |

---

### `VARIABLE` `primary_op`

- **Line:** 163
- **Signature:** `string[]`

---

### `VARIABLE` `secondary_op`

- **Line:** 169

---

### `FUNCTION` `parseSuburbList`

- **Line:** 191
- **Returns:** `SuburbItem[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `raw` | `any` | **Yes** | - | - |

---

### `VARIABLE` `parsed`

- **Line:** 193
- **Signature:** `any`

---

### `VARIABLE` `arrayData`

- **Line:** 202
- **Signature:** `any[]`

---

### `VARIABLE` `values`

- **Line:** 209

---

### `FUNCTION` `parseLodgementPoints`

- **Line:** 219
- **Returns:** `LodgementPoint[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pts` | `any` | **Yes** | - | - |
| `depotsList` | `any[]` | No | `[]` | - |
| `opsList` | `any[]` | No | `[]` | - |

---

### `FUNCTION` `handleCloneMainToTGE`

- **Line:** 224

---

### `FUNCTION` `onAutocompleteLoad`

- **Line:** 230

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `autocompleteInstance` | `google.maps.places.Autocomplete` | **Yes** | - | - |

---

### `FUNCTION` `onPlaceChanged`

- **Line:** 234

---

### `VARIABLE` `place`

- **Line:** 236

---

### `VARIABLE` `suburb`

- **Line:** 239

---

### `VARIABLE` `state`

- **Line:** 240

---

### `VARIABLE` `postcode`

- **Line:** 241

---

### `VARIABLE` `street`

- **Line:** 242

---

### `VARIABLE` `streetNumber`

- **Line:** 245

---

### `VARIABLE` `route`

- **Line:** 246

---

### `VARIABLE` `name`

- **Line:** 271

---

### `VARIABLE` `lat`

- **Line:** 272

---

### `VARIABLE` `lng`

- **Line:** 273

---

### `VARIABLE` `newItem`

- **Line:** 280
- **Signature:** `SuburbItem`

---

### `FUNCTION` `handleRemoveSuburb`

- **Line:** 313

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `type` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleUpdateSuburbOperators`

- **Line:** 327

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `type` | `string` | **Yes** | - | - |
| `operatorIds` | `string[]` | **Yes** | - | - |

---

### `FUNCTION` `updater`

- **Line:** 328

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `list` | `SuburbItem[]` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 329

---

### `FUNCTION` `handleUpdateLPOParent`

- **Line:** 340

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `type` | `string` | **Yes** | - | - |
| `parentId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `updater`

- **Line:** 341

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `list` | `SuburbItem[]` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 342

---

### `FUNCTION` `handleUpdateNextDay`

- **Line:** 353

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `type` | `string` | **Yes** | - | - |
| `nextDay` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `updater`

- **Line:** 354

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `list` | `SuburbItem[]` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 355

---

### `FUNCTION` `handleAddDepot`

- **Line:** 367

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `isExpress` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `depotInfo`

- **Line:** 369

---

### `VARIABLE` `newItem`

- **Line:** 372
- **Signature:** `LodgementPoint`

---

### `FUNCTION` `handleRemoveDepot`

- **Line:** 392

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `isExpress` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleUpdateDepotOperators`

- **Line:** 400

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |
| `isExpress` | `boolean` | **Yes** | - | - |
| `operatorIds` | `string[]` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 402

---

### `VARIABLE` `updated`

- **Line:** 406

---

### `FUNCTION` `handleSave`

- **Line:** 413
- **Async:** Yes

---

### `VARIABLE` `targetDocId`

- **Line:** 417

---

### `VARIABLE` `docRef`

- **Line:** 418

---

### `VARIABLE` `docSnap`

- **Line:** 422

---

### `VARIABLE` `altRef`

- **Line:** 425

---

### `VARIABLE` `altSnap`

- **Line:** 426

---

### `VARIABLE` `qI`

- **Line:** 430

---

### `VARIABLE` `qISnap`

- **Line:** 431

---

### `VARIABLE` `qN`

- **Line:** 435

---

### `VARIABLE` `qNSnap`

- **Line:** 436

---

### `VARIABLE` `payload`

- **Line:** 448
- **Signature:** `any`

---

### `FUNCTION` `renderSuburbTable`

- **Line:** 653
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `list` | `SuburbItem[]` | **Yes** | - | - |
| `type` | `string` | **Yes** | - | - |

---

### `FUNCTION` `renderOperatorPopover`

- **Line:** 736
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `selectedIds` | `string[]` | **Yes** | - | - |
| `onChange` | `(ids: string[]) => void` | **Yes** | - | - |

---

### `VARIABLE` `selectedOps`

- **Line:** 737

---

### `VARIABLE` `isAllSelected`

- **Line:** 738

---

### `FUNCTION` `handleToggleAll`

- **Line:** 740

---

### `VARIABLE` `isSelected`

- **Line:** 797

---

### `VARIABLE` `newIds`

- **Line:** 803

---

### `FUNCTION` `renderDepotSelector`

- **Line:** 824
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `isExpress` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `renderDepotTable`

- **Line:** 847
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `list` | `LodgementPoint[]` | **Yes** | - | - |
| `isExpress` | `boolean` | **Yes** | - | - |

---

