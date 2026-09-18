# Module: `src/app/prospecting-areas/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 1340
- **Direct Dependencies:** 22 modules imported

## Exported Symbols & API

### `VARIABLE` `containerStyle`

- **Line:** 44

---

### `VARIABLE` `defaultCenter`

- **Line:** 50

---

### `FUNCTION` `formatAddressDisplay`

- **Line:** 55

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address` | No | - | - |

---

### `FUNCTION` `escapeCsvCell`

- **Line:** 60

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cellData` | `any` | **Yes** | - | - |

---

### `VARIABLE` `stringData`

- **Line:** 62

---

### `FUNCTION` `ProspectingAreasPage`

- **Line:** 69
- **Returns:** `void`

---

### `VARIABLE` `watchIdRef`

- **Line:** 92

---

### `VARIABLE` `router`

- **Line:** 94

---

### `VARIABLE` `hasAccess`

- **Line:** 100

---

### `VARIABLE` `isAdmin`

- **Line:** 101

---

### `VARIABLE` `fetchProspectingAreas`

- **Line:** 103

---

### `VARIABLE` `areas`

- **Line:** 114

---

### `VARIABLE` `deduplicatedMap`

- **Line:** 116

---

### `VARIABLE` `existing`

- **Line:** 121

---

### `VARIABLE` `mapCenter`

- **Line:** 145

---

### `VARIABLE` `bounds`

- **Line:** 147

---

### `VARIABLE` `hasPoints`

- **Line:** 148

---

### `VARIABLE` `lat`

- **Line:** 151

---

### `VARIABLE` `lng`

- **Line:** 152

---

### `VARIABLE` `lat`

- **Line:** 160

---

### `VARIABLE` `lng`

- **Line:** 161

---

### `VARIABLE` `bounds`

- **Line:** 182

---

### `VARIABLE` `hasBounds`

- **Line:** 183

---

### `VARIABLE` `lat`

- **Line:** 187

---

### `VARIABLE` `lng`

- **Line:** 188

---

### `VARIABLE` `rectBounds`

- **Line:** 195

---

### `VARIABLE` `lat`

- **Line:** 202

---

### `VARIABLE` `lng`

- **Line:** 203

---

### `VARIABLE` `lat`

- **Line:** 213

---

### `VARIABLE` `lng`

- **Line:** 214

---

### `VARIABLE` `areaCenter`

- **Line:** 222
- **Signature:** `google.maps.LatLng | null`

---

### `VARIABLE` `lat`

- **Line:** 228

---

### `VARIABLE` `lng`

- **Line:** 229

---

### `VARIABLE` `center`

- **Line:** 231

---

### `VARIABLE` `lat`

- **Line:** 237

---

### `VARIABLE` `lng`

- **Line:** 238

---

### `VARIABLE` `center`

- **Line:** 240

---

### `VARIABLE` `centerRef`

- **Line:** 248

---

### `VARIABLE` `radiusInMeters`

- **Line:** 249

---

### `VARIABLE` `nearbyWithDistance`

- **Line:** 251

---

### `VARIABLE` `lat`

- **Line:** 253

---

### `VARIABLE` `lng`

- **Line:** 254

---

### `VARIABLE` `itemLatLng`

- **Line:** 256

---

### `VARIABLE` `distance`

- **Line:** 257

---

### `VARIABLE` `notesNearby`

- **Line:** 268

---

### `VARIABLE` `lat`

- **Line:** 270

---

### `VARIABLE` `lng`

- **Line:** 271

---

### `VARIABLE` `noteLatLng`

- **Line:** 273

---

### `VARIABLE` `distance`

- **Line:** 274

---

### `VARIABLE` `filteredNearbyItems`

- **Line:** 291

---

### `VARIABLE` `items`

- **Line:** 292

---

### `VARIABLE` `visitedItemsInArea`

- **Line:** 301

---

### `VARIABLE` `items`

- **Line:** 302

---

### `VARIABLE` `lead`

- **Line:** 310

---

### `VARIABLE` `timelineItems`

- **Line:** 321

---

### `VARIABLE` `timelineGroups`

- **Line:** 325

---

### `VARIABLE` `groups`

- **Line:** 326
- **Signature:** `Record<string, typeof timelineItems>`

---

### `VARIABLE` `dateKey`

- **Line:** 328

---

### `VARIABLE` `timelinePath`

- **Line:** 335

---

### `VARIABLE` `signedCustomersInArea`

- **Line:** 339

---

### `VARIABLE` `groupedPins`

- **Line:** 343

---

### `VARIABLE` `groups`

- **Line:** 344

---

### `VARIABLE` `key`

- **Line:** 348

---

### `VARIABLE` `key`

- **Line:** 356

---

### `VARIABLE` `heatmapData`

- **Line:** 364

---

### `FUNCTION` `handleDeleteArea`

- **Line:** 373
- **Async:** Yes

---

### `FUNCTION` `handleMarkAsComplete`

- **Line:** 391
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `area` | `SavedRoute` | **Yes** | - | - |

---

### `FUNCTION` `handleApproveArea`

- **Line:** 408
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `area` | `SavedRoute` | **Yes** | - | - |

---

### `FUNCTION` `handleFinalizeReview`

- **Line:** 422
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `area` | `SavedRoute` | **Yes** | - | - |

---

### `FUNCTION` `handleCreateFollowup`

- **Line:** 437
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `area` | `SavedRoute` | **Yes** | - | - |

---

### `VARIABLE` `newArea`

- **Line:** 441
- **Signature:** `Omit<SavedRoute, 'directions' | 'userName'>`

---

### `VARIABLE` `handleLoadArea`

- **Line:** 464

---

### `VARIABLE` `toggleLocation`

- **Line:** 471

---

### `VARIABLE` `id`

- **Line:** 479

---

### `VARIABLE` `newPos`

- **Line:** 481

---

### `VARIABLE` `centerOnMe`

- **Line:** 507

---

### `FUNCTION` `handleExportPathAudit`

- **Line:** 522

---

### `VARIABLE` `headers`

- **Line:** 527

---

### `VARIABLE` `rows`

- **Line:** 528

---

### `VARIABLE` `d`

- **Line:** 529

---

### `VARIABLE` `csvContent`

- **Line:** 542

---

### `VARIABLE` `blob`

- **Line:** 543

---

### `VARIABLE` `link`

- **Line:** 544

---

### `VARIABLE` `pending`

- **Line:** 553

---

### `VARIABLE` `completed`

- **Line:** 554

---

### `VARIABLE` `active`

- **Line:** 555

---

### `VARIABLE` `myPendingAreas`

- **Line:** 563

---

### `VARIABLE` `nextValue`

- **Line:** 614

---

### `VARIABLE` `nextValue`

- **Line:** 627

---

### `VARIABLE` `lat`

- **Line:** 754

---

### `VARIABLE` `lng`

- **Line:** 755

---

### `VARIABLE` `first`

- **Line:** 769

---

### `VARIABLE` `lat`

- **Line:** 770

---

### `VARIABLE` `lng`

- **Line:** 771

---

### `VARIABLE` `iconUrl`

- **Line:** 774

---

### `VARIABLE` `globalIndex`

- **Line:** 880

---

