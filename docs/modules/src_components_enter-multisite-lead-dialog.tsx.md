# Module: `src/components/enter-multisite-lead-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 699
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `INTERFACE` `EnterMultiSiteLeadDialogProps`

- **Line:** 27

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `parentCompany` | `MapLead | Lead | null` | No | - |
| `initialPlace` | `google.maps.places.PlaceResult | null` | Yes | - |
| `initialLocation` | `DiscoveredLocation | null` | Yes | - |
| `onSuccess` | `() => void` | Yes | - |

---

### `FUNCTION` `parsePlaceAddress`

- **Line:** 36
- **Returns:** `Address`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `place` | `any` | **Yes** | - | - |

---

### `VARIABLE` `address`

- **Line:** 37
- **Signature:** `Partial<Address>`

---

### `FUNCTION` `get`

- **Line:** 40

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |
| `useShort` | `any` | No | `false` | - |

---

### `VARIABLE` `comp`

- **Line:** 41

---

### `VARIABLE` `streetNumber`

- **Line:** 45

---

### `VARIABLE` `route`

- **Line:** 46

---

### `VARIABLE` `streetPart`

- **Line:** 47

---

### `FUNCTION` `EnterMultiSiteLeadDialog`

- **Line:** 76
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  isOpen,
  onOpenChange,
  parentCompany,
  initialPlace,
  initialLocation,
  onSuccess,
}` | `EnterMultiSiteLeadDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `loadFrs`

- **Line:** 114
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `frs`

- **Line:** 116

---

### `VARIABLE` `cityUpper`

- **Line:** 129

---

### `VARIABLE` `stateUpper`

- **Line:** 130

---

### `VARIABLE` `zipStr`

- **Line:** 131

---

### `VARIABLE` `matches`

- **Line:** 142

---

### `VARIABLE` `matchedName`

- **Line:** 156

---

### `VARIABLE` `matchedId`

- **Line:** 157

---

### `VARIABLE` `rawStreet`

- **Line:** 177

---

### `VARIABLE` `parts`

- **Line:** 179

---

### `VARIABLE` `parsed`

- **Line:** 214

---

### `VARIABLE` `availableContacts`

- **Line:** 240
- **Signature:** `Array<{ name: string; title: string; email: string; phone: string; source: string }>`

---

### `VARIABLE` `parentContacts`

- **Line:** 252

---

### `FUNCTION` `handleSelectContactOption`

- **Line:** 265

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contactObj` | `{ name: string; title: string; email: string; phone: string }` | **Yes** | - | - |
| `index` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleGoogleAddressSelect`

- **Line:** 273

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `addr` | `Address` | **Yes** | - | - |

---

### `FUNCTION` `handleSubmit`

- **Line:** 286
- **Async:** Yes

---

### `VARIABLE` `finalAddress`

- **Line:** 298
- **Signature:** `Address`

---

### `VARIABLE` `localManager`

- **Line:** 307

---

### `VARIABLE` `customFranchisee`

- **Line:** 315

---

### `VARIABLE` `copiedContacts`

- **Line:** 320

---

### `VARIABLE` `childLeadId`

- **Line:** 323

---

### `VARIABLE` `found`

- **Line:** 547

---

