# Module: `src/app/api/territory/boundary/route.ts`

- **Language:** TypeScript
- **Total Lines:** 253
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `LatLngLiteral`

- **Line:** 3

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lat` | `number` | No | - |
| `lng` | `number` | No | - |

---

### `INTERFACE` `BoundaryResult`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `paths` | `LatLngLiteral[][]` | No | - |
| `center` | `LatLngLiteral` | No | - |
| `isFallback` | `boolean` | No | - |

---

### `VARIABLE` `boundaryCache`

- **Line:** 15

---

### `VARIABLE` `STATE_CENTERS`

- **Line:** 17
- **Signature:** `Record<string, LatLngLiteral>`

---

### `FUNCTION` `inferStateFromPostcode`

- **Line:** 28
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `postcode` | `string | number` | No | - | - |

---

### `VARIABLE` `code`

- **Line:** 30

---

### `FUNCTION` `getApproxStateCoordinates`

- **Line:** 45
- **Returns:** `LatLngLiteral`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `state` | `string` | No | - | - |
| `postcode` | `string | number` | No | - | - |

---

### `VARIABLE` `st`

- **Line:** 46

---

### `VARIABLE` `base`

- **Line:** 51

---

### `FUNCTION` `calculateCentroid`

> Calculates center of a polygon ring array

- **Line:** 61
- **Returns:** `LatLngLiteral | null`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `paths` | `LatLngLiteral[][]` | **Yes** | - | - |

---

### `VARIABLE` `totalLat`

- **Line:** 62

---

### `VARIABLE` `totalLng`

- **Line:** 62

---

### `VARIABLE` `count`

- **Line:** 62

---

### `FUNCTION` `generateFallbackPolygon`

> Generates a smoothed multi-vertex polygon (16 vertices) around center lat/lng
when real OpenStreetMap boundary GeoJSON is unavailable for obscure localities.

- **Line:** 77
- **Returns:** `LatLngLiteral[][]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lat` | `number` | **Yes** | - | - |
| `lng` | `number` | **Yes** | - | - |
| `radiusKm` | `number` | No | `2.4` | - |

---

### `VARIABLE` `points`

- **Line:** 78
- **Signature:** `LatLngLiteral[]`

---

### `VARIABLE` `numVertices`

- **Line:** 79

---

### `VARIABLE` `latRadius`

- **Line:** 80

---

### `VARIABLE` `lngRadius`

- **Line:** 81

---

### `VARIABLE` `angle`

- **Line:** 84

---

### `VARIABLE` `factor`

- **Line:** 85

---

### `VARIABLE` `pLat`

- **Line:** 86

---

### `VARIABLE` `pLng`

- **Line:** 87

---

### `FUNCTION` `parseGeoJsonGeometry`

> Converts GeoJSON Polygon or MultiPolygon coordinates into Google Maps LatLngLiteral[][]

- **Line:** 101
- **Returns:** `LatLngLiteral[][]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `geometry` | `any` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 104
- **Signature:** `LatLngLiteral[][]`

---

### `VARIABLE` `path`

- **Line:** 108
- **Signature:** `LatLngLiteral[]`

---

### `VARIABLE` `path`

- **Line:** 119
- **Signature:** `LatLngLiteral[]`

---

### `FUNCTION` `GET`

- **Line:** 133
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `suburb`

- **Line:** 135

---

### `VARIABLE` `state`

- **Line:** 136

---

### `VARIABLE` `postcode`

- **Line:** 137

---

### `VARIABLE` `latStr`

- **Line:** 138

---

### `VARIABLE` `lngStr`

- **Line:** 139

---

### `VARIABLE` `centerLat`

- **Line:** 141

---

### `VARIABLE` `centerLng`

- **Line:** 142

---

### `VARIABLE` `isInvalidCenter`

- **Line:** 144

---

### `VARIABLE` `approx`

- **Line:** 147

---

### `VARIABLE` `cacheKey`

- **Line:** 152

---

### `VARIABLE` `qSub`

- **Line:** 162

---

### `VARIABLE` `subUpper`

- **Line:** 163

---

### `VARIABLE` `queryStr`

- **Line:** 170

---

### `VARIABLE` `url`

- **Line:** 171

---

### `VARIABLE` `res`

- **Line:** 173

---

### `VARIABLE` `data`

- **Line:** 182

---

### `VARIABLE` `features`

- **Line:** 183

---

### `VARIABLE` `boundaryFeature`

- **Line:** 186

---

### `VARIABLE` `parsedPaths`

- **Line:** 195

---

### `VARIABLE` `trueCentroid`

- **Line:** 197

---

### `VARIABLE` `val`

- **Line:** 198
- **Signature:** `BoundaryResult`

---

### `VARIABLE` `fallbackPaths`

- **Line:** 210

---

### `VARIABLE` `val`

- **Line:** 211
- **Signature:** `BoundaryResult`

---

### `FUNCTION` `POST`

- **Line:** 216
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `Request` | **Yes** | - | - |

---

### `VARIABLE` `body`

- **Line:** 218

---

### `VARIABLE` `items`

- **Line:** 219
- **Signature:** `{ suburb: string; state?: string; postcode?: string; lat?: number; lng?: number }[]`

---

### `VARIABLE` `results`

- **Line:** 225
- **Signature:** `Record<string, BoundaryResult>`

---

### `VARIABLE` `batch`

- **Line:** 226

---

### `VARIABLE` `suburb`

- **Line:** 229

---

### `VARIABLE` `state`

- **Line:** 230

---

### `VARIABLE` `postcode`

- **Line:** 231

---

### `VARIABLE` `key`

- **Line:** 232

---

### `VARIABLE` `center`

- **Line:** 239

---

### `VARIABLE` `fallback`

- **Line:** 243
- **Signature:** `BoundaryResult`

---

