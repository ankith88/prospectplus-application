# Module: `src/components/admin/partner-locations-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 947
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `INTERFACE` `PartnerLocationRecord`

- **Line:** 23

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `internalId` | `string` | No | - |
| `name` | `string` | No | - |
| `address1` | `string` | Yes | - |
| `address2` | `string` | Yes | - |
| `state` | `string` | No | - |
| `suburb` | `string` | No | - |
| `postCode` | `string` | No | - |
| `phone` | `string` | Yes | - |
| `siteAccessCode` | `string` | Yes | - |
| `locationType` | `string` | No | - |
| `updatedAt` | `string` | Yes | - |
| `createdAt` | `string` | Yes | - |

---

### `VARIABLE` `AUSTRALIAN_STATES`

- **Line:** 39

---

### `VARIABLE` `COMMON_LOCATION_TYPES`

- **Line:** 41

---

### `FUNCTION` `PartnerLocationsClient`

- **Line:** 51
- **Returns:** `void`

---

### `VARIABLE` `fetchLocations`

- **Line:** 89

---

### `VARIABLE` `snap`

- **Line:** 92

---

### `VARIABLE` `locs`

- **Line:** 93
- **Signature:** `PartnerLocationRecord[]`

---

### `VARIABLE` `data`

- **Line:** 96

---

### `VARIABLE` `docId`

- **Line:** 97

---

### `VARIABLE` `availableLocationTypes`

- **Line:** 140

---

### `VARIABLE` `typesSet`

- **Line:** 141

---

### `VARIABLE` `filteredLocations`

- **Line:** 150

---

### `VARIABLE` `q`

- **Line:** 162

---

### `VARIABLE` `matchInternalId`

- **Line:** 163

---

### `VARIABLE` `matchName`

- **Line:** 164

---

### `VARIABLE` `matchSuburb`

- **Line:** 165

---

### `VARIABLE` `matchPostcode`

- **Line:** 166

---

### `VARIABLE` `matchPhone`

- **Line:** 167

---

### `VARIABLE` `matchAddress`

- **Line:** 168

---

### `VARIABLE` `matchAccessCode`

- **Line:** 169

---

### `VARIABLE` `stats`

- **Line:** 180

---

### `VARIABLE` `total`

- **Line:** 181

---

### `VARIABLE` `ausPostCount`

- **Line:** 182

---

### `VARIABLE` `bankCount`

- **Line:** 183

---

### `VARIABLE` `otherCount`

- **Line:** 184

---

### `VARIABLE` `typeLower`

- **Line:** 187

---

### `FUNCTION` `handleOpenCreate`

- **Line:** 201

---

### `FUNCTION` `handleOpenEdit`

- **Line:** 220

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `loc` | `PartnerLocationRecord` | **Yes** | - | - |

---

### `VARIABLE` `isStandardType`

- **Line:** 222

---

### `FUNCTION` `handleSaveLocation`

- **Line:** 240
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `finalLocationType`

- **Line:** 260

---

### `VARIABLE` `nowStr`

- **Line:** 265

---

### `VARIABLE` `docId`

- **Line:** 266

---

### `VARIABLE` `payload`

- **Line:** 268

---

### `VARIABLE` `locRef`

- **Line:** 284

---

### `FUNCTION` `handleDeleteLocation`

- **Line:** 307
- **Async:** Yes

---

### `FUNCTION` `handleExportCsv`

- **Line:** 332

---

### `VARIABLE` `headers`

- **Line:** 338

---

### `VARIABLE` `rows`

- **Line:** 339

---

### `VARIABLE` `csvContent`

- **Line:** 353

---

### `VARIABLE` `blob`

- **Line:** 358

---

### `VARIABLE` `url`

- **Line:** 359

---

### `VARIABLE` `link`

- **Line:** 360

---

### `FUNCTION` `getTypeBadge`

- **Line:** 372

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `typeStr` | `string` | **Yes** | - | - |

---

### `VARIABLE` `t`

- **Line:** 373

---

