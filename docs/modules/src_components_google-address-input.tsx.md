# Module: `src/components/google-address-input.tsx`

- **Language:** TypeScript
- **Total Lines:** 203
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `INTERFACE` `GoogleAddressInputProps`

- **Line:** 10

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | Yes | - |
| `placeholder` | `string` | Yes | - |
| `required` | `boolean` | Yes | - |
| `initialAddress` | `Partial<Address>` | Yes | - |
| `onAddressSelect` | `(address: Address) => void` | No | - |
| `className` | `string` | Yes | - |
| `value` | `string` | Yes | - |
| `onChange` | `(value: string) => void` | Yes | - |
| `showSelectedBadge` | `boolean` | Yes | - |

---

### `FUNCTION` `parseAddressComponents`

- **Line:** 22
- **Returns:** `Address`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `components` | `google.maps.GeocoderAddressComponent[]` | **Yes** | - | - |

---

### `VARIABLE` `address`

- **Line:** 23
- **Signature:** `Partial<Address>`

---

### `FUNCTION` `get`

- **Line:** 24

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShortName` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 25

---

### `VARIABLE` `streetNumber`

- **Line:** 29

---

### `VARIABLE` `route`

- **Line:** 30

---

### `VARIABLE` `subpremise`

- **Line:** 31

---

### `VARIABLE` `streetPart`

- **Line:** 33

---

### `FUNCTION` `GoogleAddressInput`

- **Line:** 43
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  label = 'Service Address (H2H)',
  placeholder = 'Start typing address for H2H service...',
  required = true,
  initialAddress,
  onAddressSelect,
  className = '',
  value,
  onChange,
  showSelectedBadge = true,
}` | `GoogleAddressInputProps` | **Yes** | - | - |

---

### `VARIABLE` `autocompleteService`

- **Line:** 59

---

### `VARIABLE` `placesService`

- **Line:** 60

---

### `VARIABLE` `dummyDivRef`

- **Line:** 64

---

### `VARIABLE` `parts`

- **Line:** 84

---

### `VARIABLE` `handleInputChange`

- **Line:** 96

---

### `VARIABLE` `handlePredictionSelect`

- **Line:** 121

---

### `VARIABLE` `parsed`

- **Line:** 131

---

### `VARIABLE` `displayStreet`

- **Line:** 137

---

