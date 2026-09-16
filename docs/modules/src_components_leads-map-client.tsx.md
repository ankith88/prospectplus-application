# Module: `src/components/leads-map-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 1340
- **Direct Dependencies:** 32 modules imported

## Exported Symbols & API

### `VARIABLE` `containerStyle`

- **Line:** 56

---

### `VARIABLE` `defaultCenter`

- **Line:** 62

---

### `FUNCTION` `compressImage`

- **Line:** 67
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dataUrl` | `string` | **Yes** | - | - |
| `maxWidth` | `any` | No | `1024` | - |
| `quality` | `any` | No | `0.6` | - |

---

### `VARIABLE` `img`

- **Line:** 69

---

### `VARIABLE` `canvas`

- **Line:** 72

---

### `VARIABLE` `width`

- **Line:** 73

---

### `VARIABLE` `height`

- **Line:** 74

---

### `VARIABLE` `ctx`

- **Line:** 83

---

### `FUNCTION` `getPinIcon`

- **Line:** 90
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `LeadStatus` | **Yes** | - | - |
| `isSelected` | `boolean` | **Yes** | - | - |
| `isHovered` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `formatAddress`

- **Line:** 113

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address` | No | - | - |

---

### `FUNCTION` `getFranchiseeColor`

- **Line:** 119

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `internalId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `hash`

- **Line:** 120

---

### `VARIABLE` `h`

- **Line:** 124

---

### `FUNCTION` `LeadsMapClient`

- **Line:** 128
- **Returns:** `void`

---

### `VARIABLE` `videoRef`

- **Line:** 170

---

### `VARIABLE` `canvasRef`

- **Line:** 171

---

### `VARIABLE` `startPointRef`

- **Line:** 178

---

### `VARIABLE` `endPointRef`

- **Line:** 179

---

### `VARIABLE` `geoSearchInputNodeRef`

- **Line:** 180

---

### `VARIABLE` `isFranchisee`

- **Line:** 195

---

### `VARIABLE` `router`

- **Line:** 196

---

### `VARIABLE` `searchParams`

- **Line:** 197

---

### `VARIABLE` `infoWindowOptions`

- **Line:** 202

---

### `VARIABLE` `fetchData`

- **Line:** 209

---

### `VARIABLE` `routesPromise`

- **Line:** 212

---

### `VARIABLE` `combinedData`

- **Line:** 229

---

### `VARIABLE` `existingLead`

- **Line:** 237

---

### `VARIABLE` `allItems`

- **Line:** 244

---

### `VARIABLE` `mapLeads`

- **Line:** 246

---

### `FUNCTION` `handleMapFilterChange`

- **Line:** 269

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filterName` | `keyof typeof mapFilters` | **Yes** | - | - |
| `value` | `any` | **Yes** | - | - |

---

### `FUNCTION` `clearMapFilters`

- **Line:** 273

---

### `VARIABLE` `filteredMapData`

- **Line:** 286

---

### `VARIABLE` `companyNameMatch`

- **Line:** 288

---

### `VARIABLE` `franchiseeMatch`

- **Line:** 289

---

### `VARIABLE` `statusMatch`

- **Line:** 290

---

### `VARIABLE` `isLost`

- **Line:** 291

---

### `VARIABLE` `isCompanyMatch`

- **Line:** 292

---

### `VARIABLE` `dialerMatch`

- **Line:** 296

---

### `VARIABLE` `stateMatch`

- **Line:** 297

---

### `VARIABLE` `campaignMatch`

- **Line:** 298

---

### `VARIABLE` `hasVisitNoteMatch`

- **Line:** 299

---

### `VARIABLE` `groupedMapData`

- **Line:** 308

---

### `VARIABLE` `groups`

- **Line:** 309

---

### `VARIABLE` `key`

- **Line:** 311

---

### `VARIABLE` `routeId`

- **Line:** 320

---

### `VARIABLE` `area`

- **Line:** 322

---

### `VARIABLE` `bounds`

- **Line:** 338

---

### `VARIABLE` `handleLoadRoute`

- **Line:** 346

---

### `VARIABLE` `activeRouteId`

- **Line:** 369

---

### `VARIABLE` `routeToLoadId`

- **Line:** 370

---

### `VARIABLE` `targetRouteId`

- **Line:** 372

---

### `VARIABLE` `routeToLoad`

- **Line:** 375

---

### `VARIABLE` `getPlaceDetails`

- **Line:** 385

---

### `VARIABLE` `placesService`

- **Line:** 387

---

### `VARIABLE` `geoSearchInputRef`

- **Line:** 402

---

### `VARIABLE` `autocomplete`

- **Line:** 404

---

### `VARIABLE` `place`

- **Line:** 411

---

### `VARIABLE` `streetSearchInputCallbackRef`

- **Line:** 422

---

### `VARIABLE` `autocomplete`

- **Line:** 426

---

### `VARIABLE` `place`

- **Line:** 433

---

### `VARIABLE` `isBusiness`

- **Line:** 435

---

### `VARIABLE` `description`

- **Line:** 436

---

### `VARIABLE` `newStreet`

- **Line:** 439

---

### `VARIABLE` `location`

- **Line:** 454

---

### `VARIABLE` `onMapLoad`

- **Line:** 470

---

### `FUNCTION` `handleClearRoute`

- **Line:** 486

---

### `FUNCTION` `handleCalculateRoute`

- **Line:** 498
- **Async:** Yes

---

### `VARIABLE` `directionsService`

- **Line:** 506

---

### `VARIABLE` `waypoints`

- **Line:** 508

---

### `VARIABLE` `origin`

- **Line:** 512

---

### `VARIABLE` `destination`

- **Line:** 513

---

### `VARIABLE` `distance`

- **Line:** 527

---

### `VARIABLE` `duration`

- **Line:** 528

---

### `VARIABLE` `onMapClick`

- **Line:** 544

---

### `VARIABLE` `onMarkerClick`

- **Line:** 550

---

### `VARIABLE` `lead`

- **Line:** 552

---

### `VARIABLE` `isSelected`

- **Line:** 554

---

### `VARIABLE` `onInfoWindowClose`

- **Line:** 565

---

### `FUNCTION` `handleSaveRouteDialog`

- **Line:** 569

---

### `FUNCTION` `handleSaveRoute`

- **Line:** 579
- **Async:** Yes

---

### `VARIABLE` `assigneeId`

- **Line:** 587

---

### `VARIABLE` `storableRoute`

- **Line:** 589
- **Signature:** `StorableRoute`

---

### `VARIABLE` `routeId`

- **Line:** 603
- **Signature:** `string`

---

### `VARIABLE` `newRoute`

- **Line:** 614
- **Signature:** `SavedRoute`

---

### `FUNCTION` `handleSaveProspectingArea`

- **Line:** 633
- **Async:** Yes

---

### `VARIABLE` `isUnassigned`

- **Line:** 653

---

### `VARIABLE` `assigneeIds`

- **Line:** 654

---

### `VARIABLE` `status`

- **Line:** 657
- **Signature:** `StorableRoute['status']`

---

### `VARIABLE` `baseAreaData`

- **Line:** 659
- **Signature:** `Omit<StorableRoute, 'id'>`

---

### `VARIABLE` `savePromises`

- **Line:** 678

---

### `VARIABLE` `areaData`

- **Line:** 679

---

### `FUNCTION` `handleToggleCamera`

- **Line:** 704
- **Async:** Yes

---

### `VARIABLE` `stream`

- **Line:** 712

---

### `FUNCTION` `handleCaptureImage`

- **Line:** 723
- **Async:** Yes

---

### `VARIABLE` `canvas`

- **Line:** 725

---

### `VARIABLE` `context`

- **Line:** 728

---

### `VARIABLE` `dataUrl`

- **Line:** 730

---

### `VARIABLE` `compressed`

- **Line:** 731

---

### `FUNCTION` `handleImageUpload`

- **Line:** 736

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `files`

- **Line:** 738

---

### `VARIABLE` `reader`

- **Line:** 740

---

### `VARIABLE` `compressed`

- **Line:** 743

---

### `FUNCTION` `Legend`

- **Line:** 752

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 784
- **Signature:** `Option[]`

---

### `VARIABLE` `franchisees`

- **Line:** 785

---

### `VARIABLE` `uniqueDialers`

- **Line:** 789
- **Signature:** `Option[]`

---

### `VARIABLE` `dialers`

- **Line:** 790

---

### `VARIABLE` `uniqueStates`

- **Line:** 794
- **Signature:** `Option[]`

---

### `VARIABLE` `states`

- **Line:** 795

---

### `VARIABLE` `uniqueCampaigns`

- **Line:** 799
- **Signature:** `Option[]`

---

### `VARIABLE` `campaigns`

- **Line:** 800

---

### `VARIABLE` `activeFieldSalesUserOptions`

- **Line:** 804
- **Signature:** `Option[]`

---

### `VARIABLE` `allStatuses`

- **Line:** 811
- **Signature:** `LeadStatus[]`

---

### `VARIABLE` `statusOptions`

- **Line:** 812
- **Signature:** `Option[]`

---

### `VARIABLE` `hasActiveMapFilters`

- **Line:** 813

---

### `VARIABLE` `color`

- **Line:** 1040

---

### `VARIABLE` `territories`

- **Line:** 1041

---

### `VARIABLE` `firstLead`

- **Line:** 1064

---

### `VARIABLE` `lat`

- **Line:** 1065

---

### `VARIABLE` `lng`

- **Line:** 1066

---

### `VARIABLE` `displayStatus`

- **Line:** 1070
- **Signature:** `LeadStatus`

---

### `VARIABLE` `isSelected`

- **Line:** 1075

---

### `VARIABLE` `isHovered`

- **Line:** 1076

---

### `VARIABLE` `isSelected`

- **Line:** 1158

---

