# Module: `src/app/saved-routes/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 658
- **Direct Dependencies:** 24 modules imported

## Exported Symbols & API

### `VARIABLE` `containerStyle`

- **Line:** 47

---

### `VARIABLE` `center`

- **Line:** 53

---

### `FUNCTION` `formatAddress`

- **Line:** 58

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address` | No | - | - |

---

### `FUNCTION` `SavedRoutesPage`

- **Line:** 63
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 91

---

### `VARIABLE` `hasAccess`

- **Line:** 94

---

### `VARIABLE` `canSeeAllRoutes`

- **Line:** 95

---

### `VARIABLE` `loadingData`

- **Line:** 103

---

### `FUNCTION` `handleCopy`

- **Line:** 105

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string | null | undefined` | **Yes** | - | - |
| `fieldName` | `string` | **Yes** | - | - |

---

### `FUNCTION` `getLat`

- **Line:** 114

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `loc` | `any` | **Yes** | - | - |

---

### `FUNCTION` `getLng`

- **Line:** 115

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `loc` | `any` | **Yes** | - | - |

---

### `VARIABLE` `handleLoadRoute`

- **Line:** 117

---

### `FUNCTION` `fetchData`

- **Line:** 134
- **Async:** Yes

---

### `VARIABLE` `promises`

- **Line:** 138
- **Signature:** `[Promise<SavedRoute[]>, Promise<UserProfile[]>, Promise<Lead[]>]`

---

### `VARIABLE` `activeRouteId`

- **Line:** 163

---

### `VARIABLE` `routeToLoad`

- **Line:** 165

---

### `VARIABLE` `sortedRouteLegs`

- **Line:** 173

---

### `VARIABLE` `waypointOrder`

- **Line:** 176

---

### `VARIABLE` `orderedLeads`

- **Line:** 177

---

### `VARIABLE` `lead`

- **Line:** 180

---

### `VARIABLE` `groupedMapStops`

- **Line:** 185

---

### `VARIABLE` `groups`

- **Line:** 187

---

### `VARIABLE` `key`

- **Line:** 189

---

### `VARIABLE` `filteredSortedRouteLegs`

- **Line:** 196

---

### `VARIABLE` `nameMatch`

- **Line:** 200

---

### `VARIABLE` `addressMatch`

- **Line:** 201

---

### `FUNCTION` `handleStartRoute`

- **Line:** 206

---

### `VARIABLE` `origin`

- **Line:** 212

---

### `VARIABLE` `destination`

- **Line:** 213

---

### `VARIABLE` `waypoints`

- **Line:** 214

---

### `VARIABLE` `mapsUrl`

- **Line:** 219

---

### `FUNCTION` `handleStartRouteFromList`

- **Line:** 225

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `route` | `SavedRoute` | **Yes** | - | - |

---

### `VARIABLE` `directionsData`

- **Line:** 231

---

### `VARIABLE` `origin`

- **Line:** 233

---

### `VARIABLE` `destination`

- **Line:** 234

---

### `VARIABLE` `waypoints`

- **Line:** 235

---

### `VARIABLE` `mapsUrl`

- **Line:** 240

---

### `FUNCTION` `handleStopRoute`

- **Line:** 245

---

### `VARIABLE` `handleFindNearbyCompanies`

- **Line:** 255

---

### `VARIABLE` `leadLatLng`

- **Line:** 264

---

### `VARIABLE` `nearby`

- **Line:** 266

---

### `VARIABLE` `itemLatLng`

- **Line:** 270

---

### `VARIABLE` `distance`

- **Line:** 271

---

### `VARIABLE` `userOptionsForFilter`

- **Line:** 289

---

### `VARIABLE` `usersWithRoutes`

- **Line:** 293

---

### `VARIABLE` `filteredAllRoutes`

- **Line:** 297

---

### `VARIABLE` `nameMatch`

- **Line:** 299

---

### `VARIABLE` `dateMatch`

- **Line:** 301

---

### `VARIABLE` `routeDate`

- **Line:** 306

---

### `VARIABLE` `filterDate`

- **Line:** 307

---

### `VARIABLE` `userMatch`

- **Line:** 314

---

### `VARIABLE` `firstStop`

- **Line:** 547

---

