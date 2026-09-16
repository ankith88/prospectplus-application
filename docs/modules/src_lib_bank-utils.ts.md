# Module: `src/lib/bank-utils.ts`

- **Language:** TypeScript
- **Total Lines:** 272
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `FUNCTION` `isBankingService`

> Checks if a service is a banking service (EB, EB2, EB3, CB2, CB3, CB 3, CB, or code/name containing EB/CB)

- **Line:** 8
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `service` | `any` | **Yes** | - | - |

---

### `VARIABLE` `rawStr`

- **Line:** 10

---

### `VARIABLE` `lower`

- **Line:** 13

---

### `VARIABLE` `explicitCodes`

- **Line:** 16

---

### `FUNCTION` `isBankingServiceSelected`

> Checks if any service in an array of selected services is a banking service

- **Line:** 26
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `selectedServices` | `any[]` | **Yes** | - | - |

---

### `FUNCTION` `isH2hService`

> Checks if a service is an H2H service (service code/name contains H2H)

- **Line:** 34
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `service` | `any` | **Yes** | - | - |

---

### `VARIABLE` `rawStr`

- **Line:** 36

---

### `FUNCTION` `isH2hServiceSelected`

> Checks if any service in an array of selected services is an H2H service

- **Line:** 44
- **Returns:** `boolean`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `selectedServices` | `any[]` | **Yes** | - | - |

---

### `FUNCTION` `calculateDistanceInKm`

> Haversine formula for distance in kilometers

- **Line:** 52
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

- **Line:** 53

---

### `VARIABLE` `dLat`

- **Line:** 54

---

### `VARIABLE` `dLon`

- **Line:** 55

---

### `VARIABLE` `a`

- **Line:** 56

---

### `VARIABLE` `c`

- **Line:** 62

---

### `INTERFACE` `BankLocationOption`

- **Line:** 66

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `address1` | `string` | Yes | - |
| `address2` | `string` | Yes | - |
| `suburb` | `string` | Yes | - |
| `city` | `string` | Yes | - |
| `state` | `string` | Yes | - |
| `postCode` | `string` | Yes | - |
| `postcode` | `string` | Yes | - |
| `phone` | `string` | Yes | - |
| `lat` | `number` | Yes | - |
| `latitude` | `number` | Yes | - |
| `lng` | `number` | Yes | - |
| `longitude` | `number` | Yes | - |
| `distanceKm` | `number | null` | No | - |
| `displayLabel` | `string` | No | - |
| `raw` | `any` | No | - |

---

### `FUNCTION` `normalizeState`

> Normalizes state names and abbreviations to standard uppercase shorthand (e.g., 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT')

- **Line:** 89
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `stateStr` | `string | null` | No | - | - |

---

### `VARIABLE` `s`

- **Line:** 91

---

### `FUNCTION` `getNearbyBanks`

> Retrieves and sorts partner locations of locationType "Bank" in the same state as the lead/company

- **Line:** 107
- **Returns:** `BankLocationOption[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `any` | **Yes** | - | - |
| `partnerLocations` | `any[]` | **Yes** | - | - |

---

### `VARIABLE` `leadLatNum`

- **Line:** 109

---

### `VARIABLE` `leadLngNum`

- **Line:** 110

---

### `VARIABLE` `leadZip`

- **Line:** 112

---

### `VARIABLE` `leadCity`

- **Line:** 113

---

### `VARIABLE` `rawLeadState`

- **Line:** 116

---

### `VARIABLE` `leadState`

- **Line:** 117

---

### `VARIABLE` `savedLocId`

- **Line:** 120

---

### `VARIABLE` `savedLocName`

- **Line:** 121

---

### `VARIABLE` `bankLocs`

- **Line:** 123
- **Signature:** `BankLocationOption[]`

---

### `VARIABLE` `addedIds`

- **Line:** 124

---

### `VARIABLE` `locDocId`

- **Line:** 127

---

### `VARIABLE` `locInternalId`

- **Line:** 128

---

### `VARIABLE` `locName`

- **Line:** 129

---

### `VARIABLE` `locType`

- **Line:** 130

---

### `VARIABLE` `isSavedLocation`

- **Line:** 133

---

### `VARIABLE` `isBankOrAusPost`

- **Line:** 139

---

### `VARIABLE` `locState`

- **Line:** 142

---

### `VARIABLE` `locLat`

- **Line:** 151

---

### `VARIABLE` `locLng`

- **Line:** 152

---

### `VARIABLE` `hasCoords`

- **Line:** 153

---

### `VARIABLE` `distanceKm`

- **Line:** 154

---

### `VARIABLE` `locPostcode`

- **Line:** 156

---

### `VARIABLE` `locSuburb`

- **Line:** 157

---

### `VARIABLE` `label`

- **Line:** 159

---

### `VARIABLE` `addrStr`

- **Line:** 160

---

### `VARIABLE` `optionId`

- **Line:** 171

---

### `VARIABLE` `aDocId`

- **Line:** 199

---

### `VARIABLE` `aIntId`

- **Line:** 200

---

### `VARIABLE` `aName`

- **Line:** 201

---

### `VARIABLE` `bDocId`

- **Line:** 202

---

### `VARIABLE` `bIntId`

- **Line:** 203

---

### `VARIABLE` `bName`

- **Line:** 204

---

### `VARIABLE` `isASaved`

- **Line:** 206

---

### `VARIABLE` `isBSaved`

- **Line:** 207

---

### `VARIABLE` `postcodeA`

- **Line:** 217

---

### `VARIABLE` `postcodeB`

- **Line:** 218

---

### `VARIABLE` `suburbA`

- **Line:** 222

---

### `VARIABLE` `suburbB`

- **Line:** 223

---

### `FUNCTION` `saveOrUpdateTaggedAddress`

> Saves or updates a tagged address (e.g. 'EB/CB Bank' or 'H2H Address') for a lead in subcollection `leads/{leadId}/addresses`

- **Line:** 236
- **Async:** Yes
- **Returns:** `Promise<string>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `addressData` | `Partial<Address> & { tag: 'EB/CB Bank' | 'H2H Address'; [key: string]: any }` | **Yes** | - | - |

---

### `VARIABLE` `addressesRef`

- **Line:** 241

---

### `VARIABLE` `q`

- **Line:** 242

---

### `VARIABLE` `existingSnap`

- **Line:** 243

---

### `VARIABLE` `payload`

- **Line:** 245

---

### `VARIABLE` `existingDocRef`

- **Line:** 261

---

### `VARIABLE` `newDoc`

- **Line:** 265

---

