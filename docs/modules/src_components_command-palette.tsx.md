# Module: `src/components/command-palette.tsx`

- **Language:** TypeScript
- **Total Lines:** 391
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `INTERFACE` `SearchResultItem`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `type` | `'lead' | 'company' | 'ticket' | 'package'` | No | - |
| `title` | `string` | No | - |
| `subtitle` | `string` | No | - |
| `badge` | `string` | Yes | - |
| `badgeColor` | `string` | Yes | - |
| `url` | `string` | No | - |

---

### `FUNCTION` `CommandPalette`

- **Line:** 18
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 19

---

### `VARIABLE` `inputRef`

- **Line:** 29

---

### `VARIABLE` `saved`

- **Line:** 34

---

### `FUNCTION` `handleKeyDown`

- **Line:** 45

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `KeyboardEvent` | **Yes** | - | - |

---

### `VARIABLE` `handler`

- **Line:** 72

---

### `VARIABLE` `trimmed`

- **Line:** 80

---

### `VARIABLE` `controller`

- **Line:** 88

---

### `FUNCTION` `fetchSearch`

- **Line:** 90
- **Async:** Yes

---

### `VARIABLE` `headers`

- **Line:** 92
- **Signature:** `HeadersInit`

---

### `VARIABLE` `idToken`

- **Line:** 94

---

### `VARIABLE` `res`

- **Line:** 101

---

### `VARIABLE` `data`

- **Line:** 108

---

### `VARIABLE` `items`

- **Line:** 109
- **Signature:** `SearchResultItem[]`

---

### `VARIABLE` `seenIds`

- **Line:** 111

---

### `VARIABLE` `companyIdsSet`

- **Line:** 112

---

### `VARIABLE` `combinedAccounts`

- **Line:** 113
- **Signature:** `any[]`

---

### `VARIABLE` `key`

- **Line:** 118

---

### `VARIABLE` `key`

- **Line:** 131

---

### `VARIABLE` `leadId`

- **Line:** 150

---

### `VARIABLE` `prospectPlusId`

- **Line:** 151

---

### `VARIABLE` `entityId`

- **Line:** 152

---

### `VARIABLE` `isCompany`

- **Line:** 165

---

### `VARIABLE` `groupTag`

- **Line:** 166

---

### `FUNCTION` `handleSelect`

- **Line:** 208

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `SearchResultItem` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 210

---

### `VARIABLE` `activeList`

- **Line:** 223

---

### `FUNCTION` `handleKeyDown`

- **Line:** 225

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.KeyboardEvent` | **Yes** | - | - |

---

### `VARIABLE` `isPending`

- **Line:** 242

---

### `VARIABLE` `isSelected`

- **Line:** 291

---

### `VARIABLE` `isSelected`

- **Line:** 336

---

