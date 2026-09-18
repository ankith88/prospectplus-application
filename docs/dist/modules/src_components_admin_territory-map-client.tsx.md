# Module: `src/components/admin/territory-map-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 812
- **Direct Dependencies:** 15 modules imported

## Exported Symbols & API

### `VARIABLE` `containerStyle`

- **Line:** 19

---

### `VARIABLE` `defaultCenter`

- **Line:** 24

---

### `INTERFACE` `TerritoryOverlay`

- **Line:** 29

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `franchisee` | `Franchisee` | No | - |
| `suburb` | `string` | No | - |
| `postcode` | `string` | No | - |
| `state` | `string` | No | - |
| `categoryKey` | `string` | No | - |
| `categoryLabel` | `string` | No | - |
| `center` | `google.maps.LatLngLiteral` | No | - |

---

### `FUNCTION` `getAddressComponents`

- **Line:** 41

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `place` | `google.maps.places.PlaceResult` | **Yes** | - | - |

---

### `VARIABLE` `suburb`

- **Line:** 42

---

### `VARIABLE` `state`

- **Line:** 43

---

### `VARIABLE` `postcode`

- **Line:** 44

---

### `VARIABLE` `STATE_CENTERS`

- **Line:** 63
- **Signature:** `Record<string, google.maps.LatLngLiteral>`

---

### `FUNCTION` `inferStateFromPostcode`

- **Line:** 74
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `postcode` | `string | number` | No | - | - |

---

### `VARIABLE` `code`

- **Line:** 76

---

### `FUNCTION` `getApproxStateCoordinates`

- **Line:** 91
- **Returns:** `google.maps.LatLngLiteral`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `state` | `string` | No | - | - |
| `postcode` | `string | number` | No | - | - |

---

### `VARIABLE` `st`

- **Line:** 92

---

### `VARIABLE` `base`

- **Line:** 97

---

### `FUNCTION` `getFranchiseeColor`

- **Line:** 105

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `internalId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `hash`

- **Line:** 106

---

### `VARIABLE` `h`

- **Line:** 110

---

### `FUNCTION` `generatePolygonFallback`

- **Line:** 115
- **Returns:** `google.maps.LatLngLiteral[][]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lat` | `number` | **Yes** | - | - |
| `lng` | `number` | **Yes** | - | - |
| `radiusKm` | `number` | No | `2.4` | - |

---

### `VARIABLE` `points`

- **Line:** 116
- **Signature:** `google.maps.LatLngLiteral[]`

---

### `VARIABLE` `numVertices`

- **Line:** 117

---

### `VARIABLE` `latRadius`

- **Line:** 118

---

### `VARIABLE` `lngRadius`

- **Line:** 119

---

### `VARIABLE` `angle`

- **Line:** 122

---

### `VARIABLE` `factor`

- **Line:** 123

---

### `VARIABLE` `pLat`

- **Line:** 124

---

### `VARIABLE` `pLng`

- **Line:** 125

---

### `FUNCTION` `TerritoryMapClient`

- **Line:** 136
- **Returns:** `void`

---

### `VARIABLE` `selectedFranchiseeLabel`

- **Line:** 148

---

### `VARIABLE` `found`

- **Line:** 150

---

### `FUNCTION` `loadData`

- **Line:** 169
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `data`

- **Line:** 171

---

### `VARIABLE` `nameA`

- **Line:** 173

---

### `VARIABLE` `nameB`

- **Line:** 174

---

### `VARIABLE` `categoriesToExtract`

- **Line:** 192
- **Signature:** `{ key: keyof Franchisee; label: string }[]`

---

### `VARIABLE` `newOverlays`

- **Line:** 200
- **Signature:** `TerritoryOverlay[]`

---

### `VARIABLE` `suburbList`

- **Line:** 208

---

### `VARIABLE` `t`

- **Line:** 211

---

### `VARIABLE` `isCentralDesert`

- **Line:** 215

---

### `VARIABLE` `center`

- **Line:** 216

---

### `VARIABLE` `selectedAddressInfo`

- **Line:** 238

---

### `VARIABLE` `formattedAddress`

- **Line:** 242

---

### `VARIABLE` `servicingFranchisees`

- **Line:** 254

---

### `VARIABLE` `subLower`

- **Line:** 260

---

### `VARIABLE` `postLower`

- **Line:** 261

---

### `VARIABLE` `matched`

- **Line:** 263

---

### `VARIABLE` `categoriesToCheck`

- **Line:** 266
- **Signature:** `(keyof Franchisee)[]`

---

### `VARIABLE` `matchingSuburbs`

- **Line:** 270
- **Signature:** `string[]`

---

### `VARIABLE` `territories`

- **Line:** 273

---

### `VARIABLE` `tSub`

- **Line:** 275

---

### `VARIABLE` `tPost`

- **Line:** 276

---

### `VARIABLE` `isSubMatch`

- **Line:** 278

---

### `VARIABLE` `isPostMatch`

- **Line:** 279

---

### `VARIABLE` `filteredOverlays`

- **Line:** 296

---

### `VARIABLE` `unmappedItems`

- **Line:** 318

---

### `VARIABLE` `isMounted`

- **Line:** 321

---

### `FUNCTION` `fetchRealBoundaries`

- **Line:** 323
- **Async:** Yes

---

### `VARIABLE` `chunkSize`

- **Line:** 324

---

### `VARIABLE` `chunk`

- **Line:** 327

---

### `VARIABLE` `updates`

- **Line:** 328
- **Signature:** `Record<string, google.maps.LatLngLiteral[][]>`

---

### `VARIABLE` `url`

- **Line:** 332

---

### `VARIABLE` `res`

- **Line:** 333

---

### `VARIABLE` `data`

- **Line:** 335

---

### `FUNCTION` `onPlaceChanged`

- **Line:** 363

---

### `VARIABLE` `place`

- **Line:** 365

---

### `FUNCTION` `handleClearLocation`

- **Line:** 378

---

### `FUNCTION` `handleExportCSV`

- **Line:** 385

---

### `VARIABLE` `bounds`

- **Line:** 397

---

### `VARIABLE` `hasValidBounds`

- **Line:** 398

---

### `VARIABLE` `isSelected`

- **Line:** 481

---

### `VARIABLE` `displayName`

- **Line:** 482

---

### `VARIABLE` `searchValue`

- **Line:** 483

---

### `VARIABLE` `color`

- **Line:** 679

---

### `VARIABLE` `isHovered`

- **Line:** 680

---

### `VARIABLE` `isActive`

- **Line:** 681

---

### `VARIABLE` `paths`

- **Line:** 683

---

