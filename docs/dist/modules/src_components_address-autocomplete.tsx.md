# Module: `src/components/address-autocomplete.tsx`

- **Language:** TypeScript
- **Total Lines:** 201
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `FUNCTION` `parseAddressComponents`

- **Line:** 10
- **Returns:** `Address`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `components` | `google.maps.GeocoderAddressComponent[]` | **Yes** | - | - |

---

### `VARIABLE` `address`

- **Line:** 11
- **Signature:** `Partial<Address>`

---

### `FUNCTION` `get`

- **Line:** 12

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShortName` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 13

---

### `VARIABLE` `streetNumber`

- **Line:** 17

---

### `VARIABLE` `route`

- **Line:** 18

---

### `INTERFACE` `AddressAutocompleteProps`

- **Line:** 29

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `onAddressSelect` | `(parsed: Address) => void` | Yes | - |

---

### `FUNCTION` `AddressAutocomplete`

- **Line:** 33
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onAddressSelect }` | `AddressAutocompleteProps` | No | `{}` | - |

---

### `VARIABLE` `autocompleteService`

- **Line:** 38

---

### `VARIABLE` `placesService`

- **Line:** 39

---

### `VARIABLE` `dummyDivRef`

- **Line:** 43

---

### `VARIABLE` `handleInputChange`

- **Line:** 55

---

### `VARIABLE` `handlePredictionSelect`

- **Line:** 76

---

### `VARIABLE` `parsed`

- **Line:** 86
- **Signature:** `Address`

---

### `VARIABLE` `lat`

- **Line:** 101

---

### `VARIABLE` `lng`

- **Line:** 102

---

