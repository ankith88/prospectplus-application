# Module: `src/components/edit-postal-address-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 736
- **Direct Dependencies:** 17 modules imported

## Exported Symbols & API

### `VARIABLE` `boxTypes`

- **Line:** 39

---

### `FUNCTION` `normalizeState`

- **Line:** 41
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `stateStr` | `string` | No | - | - |

---

### `VARIABLE` `s`

- **Line:** 43

---

### `FUNCTION` `calculateDistanceInKm`

- **Line:** 55
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lat1` | `number` | **Yes** | - | - |
| `lon1` | `number` | **Yes** | - | - |
| `lat2` | `number` | **Yes** | - | - |
| `lon2` | `number` | **Yes** | - | - |

---

### `VARIABLE` `R`

- **Line:** 56

---

### `VARIABLE` `dLat`

- **Line:** 57

---

### `VARIABLE` `dLon`

- **Line:** 58

---

### `VARIABLE` `a`

- **Line:** 59

---

### `VARIABLE` `c`

- **Line:** 63

---

### `VARIABLE` `formSchema`

- **Line:** 67

---

### `INTERFACE` `EditPostalAddressDialogProps`

- **Line:** 82

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `onLeadUpdated` | `(updatedLead: Partial<Lead>, oldLead: Lead) => void` | No | - |

---

### `FUNCTION` `parseAddressComponents`

- **Line:** 89
- **Returns:** `Address`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `components` | `google.maps.GeocoderAddressComponent[]` | **Yes** | - | - |

---

### `VARIABLE` `address`

- **Line:** 90
- **Signature:** `Partial<Address>`

---

### `FUNCTION` `get`

- **Line:** 91

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShortName` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 92

---

### `VARIABLE` `streetNumber`

- **Line:** 96

---

### `VARIABLE` `route`

- **Line:** 97

---

### `FUNCTION` `parseExistingPostal`

- **Line:** 109

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `postalAddress` | `any` | **Yes** | - | - |

---

### `VARIABLE` `addr1`

- **Line:** 114

---

### `VARIABLE` `street`

- **Line:** 115

---

### `VARIABLE` `partnerLocationId`

- **Line:** 116

---

### `VARIABLE` `match1`

- **Line:** 119

---

### `VARIABLE` `foundPrefix`

- **Line:** 121

---

### `VARIABLE` `boxType`

- **Line:** 122

---

### `VARIABLE` `match2`

- **Line:** 132

---

### `VARIABLE` `foundPrefix`

- **Line:** 134

---

### `VARIABLE` `boxType`

- **Line:** 135

---

### `FUNCTION` `EditPostalAddressDialog`

- **Line:** 153
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  lead,
  isOpen,
  onOpenChange,
  onLeadUpdated,
}` | `EditPostalAddressDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `autocompleteService`

- **Line:** 166

---

### `VARIABLE` `placesService`

- **Line:** 167

---

### `VARIABLE` `dummyDivRef`

- **Line:** 171

---

### `VARIABLE` `parsed`

- **Line:** 183

---

### `VARIABLE` `form`

- **Line:** 185

---

### `VARIABLE` `formState`

- **Line:** 204

---

### `VARIABLE` `customerState`

- **Line:** 205

---

### `VARIABLE` `rawState`

- **Line:** 206

---

### `VARIABLE` `leadLat`

- **Line:** 211

---

### `VARIABLE` `leadLng`

- **Line:** 212

---

### `FUNCTION` `loadStatePartnerLocations`

- **Line:** 218
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `locationsSnap`

- **Line:** 221

---

### `VARIABLE` `locs`

- **Line:** 222
- **Signature:** `any[]`

---

### `VARIABLE` `data`

- **Line:** 225

---

### `VARIABLE` `locType`

- **Line:** 226

---

### `VARIABLE` `isAusPost`

- **Line:** 227

---

### `VARIABLE` `locState`

- **Line:** 230

---

### `VARIABLE` `locLat`

- **Line:** 232

---

### `VARIABLE` `locLng`

- **Line:** 233

---

### `VARIABLE` `hasCoords`

- **Line:** 234

---

### `VARIABLE` `distanceKm`

- **Line:** 235

---

### `VARIABLE` `subA`

- **Line:** 253

---

### `VARIABLE` `subB`

- **Line:** 254

---

### `VARIABLE` `parsedValues`

- **Line:** 272

---

### `VARIABLE` `cityValue`

- **Line:** 292

---

### `VARIABLE` `filteredLocations`

- **Line:** 294

---

### `VARIABLE` `searchTerm`

- **Line:** 295

---

### `VARIABLE` `suburb`

- **Line:** 299

---

### `VARIABLE` `postcode`

- **Line:** 300

---

### `VARIABLE` `name`

- **Line:** 301

---

### `VARIABLE` `street`

- **Line:** 302

---

### `VARIABLE` `handleSelectPartnerLocation`

- **Line:** 314

---

### `VARIABLE` `streetAddr`

- **Line:** 320

---

### `VARIABLE` `suburb`

- **Line:** 321

---

### `VARIABLE` `state`

- **Line:** 322

---

### `VARIABLE` `zip`

- **Line:** 323

---

### `VARIABLE` `lat`

- **Line:** 324

---

### `VARIABLE` `lng`

- **Line:** 325

---

### `VARIABLE` `handleInputChange`

- **Line:** 344

---

### `VARIABLE` `handlePredictionSelect`

- **Line:** 364

---

### `VARIABLE` `parsedData`

- **Line:** 375

---

### `VARIABLE` `street`

- **Line:** 377

---

### `VARIABLE` `parts`

- **Line:** 379

---

### `FUNCTION` `onSubmit`

- **Line:** 408
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `selectedPartnerLoc`

- **Line:** 410

---

### `VARIABLE` `partnerLocName`

- **Line:** 411

---

### `VARIABLE` `updatedPostalAddress`

- **Line:** 413

---

### `VARIABLE` `updateData`

- **Line:** 426
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `mergedSiteAddress`

- **Line:** 443

---

### `VARIABLE` `match`

- **Line:** 569

---

### `VARIABLE` `locId`

- **Line:** 588

---

### `VARIABLE` `name`

- **Line:** 589

---

### `VARIABLE` `suburb`

- **Line:** 590

---

### `VARIABLE` `postcode`

- **Line:** 591

---

### `VARIABLE` `addr`

- **Line:** 592

---

### `VARIABLE` `dist`

- **Line:** 593

---

