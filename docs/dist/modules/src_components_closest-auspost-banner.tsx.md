# Module: `src/components/closest-auspost-banner.tsx`

- **Language:** TypeScript
- **Total Lines:** 429
- **Direct Dependencies:** 8 modules imported

## Exported Symbols & API

### `FUNCTION` `calculateDistanceInKm`

- **Line:** 12
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

- **Line:** 13

---

### `VARIABLE` `dLat`

- **Line:** 14

---

### `VARIABLE` `dLon`

- **Line:** 15

---

### `VARIABLE` `a`

- **Line:** 16

---

### `VARIABLE` `c`

- **Line:** 22

---

### `INTERFACE` `LocationItem`

- **Line:** 26

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `address1` | `string` | Yes | - |
| `address2` | `string` | Yes | - |
| `suburb` | `string` | Yes | - |
| `state` | `string` | Yes | - |
| `postCode` | `string` | Yes | - |
| `phone` | `string` | Yes | - |
| `siteAccessCode` | `string` | Yes | - |
| `distanceKm` | `number | null` | No | - |
| `isPostcodeMatch` | `boolean` | No | - |
| `isSuburbMatch` | `boolean` | No | - |

---

### `INTERFACE` `ClosestAusPostBannerProps`

- **Line:** 41

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `any` | No | - |
| `ausPostParentLpoId` | `string | null` | Yes | - |
| `ausPostLpoName` | `string | null` | Yes | - |
| `ausPostLpoCompany` | `any` | Yes | - |
| `lpoConnectActive` | `boolean` | Yes | - |

---

### `FUNCTION` `ClosestAusPostBanner`

- **Line:** 49
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  lead,
  ausPostParentLpoId,
  ausPostLpoName,
  ausPostLpoCompany,
  lpoConnectActive,
}` | `ClosestAusPostBannerProps` | **Yes** | - | - |

---

### `VARIABLE` `leadLatStr`

- **Line:** 64

---

### `VARIABLE` `leadLngStr`

- **Line:** 65

---

### `VARIABLE` `leadLat`

- **Line:** 66

---

### `VARIABLE` `leadLng`

- **Line:** 67

---

### `VARIABLE` `leadZip`

- **Line:** 69

---

### `VARIABLE` `leadCity`

- **Line:** 70

---

### `VARIABLE` `leadState`

- **Line:** 71

---

### `FUNCTION` `fetchLpoDetails`

- **Line:** 75
- **Async:** Yes

---

### `VARIABLE` `compRef`

- **Line:** 81

---

### `VARIABLE` `compSnap`

- **Line:** 82

---

### `VARIABLE` `leadRef`

- **Line:** 87

---

### `VARIABLE` `leadSnap`

- **Line:** 88

---

### `VARIABLE` `locRef`

- **Line:** 93

---

### `VARIABLE` `locSnap`

- **Line:** 94

---

### `VARIABLE` `fetchClosestLocations`

- **Line:** 106

---

### `VARIABLE` `locationsSnap`

- **Line:** 109

---

### `VARIABLE` `ausPostLocs`

- **Line:** 110
- **Signature:** `any[]`

---

### `VARIABLE` `data`

- **Line:** 113

---

### `VARIABLE` `locType`

- **Line:** 114

---

### `VARIABLE` `scored`

- **Line:** 126
- **Signature:** `LocationItem[]`

---

### `VARIABLE` `locLat`

- **Line:** 127

---

### `VARIABLE` `locLng`

- **Line:** 128

---

### `VARIABLE` `hasCoords`

- **Line:** 129

---

### `VARIABLE` `distanceKm`

- **Line:** 130

---

### `VARIABLE` `locPostcode`

- **Line:** 132

---

### `VARIABLE` `locSuburb`

- **Line:** 133

---

### `VARIABLE` `isPostcodeMatch`

- **Line:** 135

---

### `VARIABLE` `isSuburbMatch`

- **Line:** 136

---

### `VARIABLE` `hasAnyAddressData`

- **Line:** 186

---

### `VARIABLE` `currentLoc`

- **Line:** 215

---

### `VARIABLE` `formattedAddress`

- **Line:** 217

---

### `FUNCTION` `getDistanceBadgeText`

- **Line:** 227

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `loc` | `LocationItem` | **Yes** | - | - |

---

### `FUNCTION` `handleCopyAddress`

- **Line:** 243

---

### `VARIABLE` `textToCopy`

- **Line:** 244

---

### `VARIABLE` `mapsUrl`

- **Line:** 254

---

### `VARIABLE` `hasLinkedLpo`

- **Line:** 256

---

### `FUNCTION` `getLinkedLpoAddress`

- **Line:** 259

---

### `VARIABLE` `comp`

- **Line:** 260

---

### `VARIABLE` `addr`

- **Line:** 262

---

### `VARIABLE` `parts`

- **Line:** 263

---

### `VARIABLE` `linkedLpoAddress`

- **Line:** 273

---

### `VARIABLE` `isSelected`

- **Line:** 343

---

### `VARIABLE` `distLabel`

- **Line:** 344

---

