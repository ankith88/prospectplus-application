# Module: `src/lib/territory-export.ts`

- **Language:** TypeScript
- **Total Lines:** 172
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `FlattenedSuburbRecord`

- **Line:** 3

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `franchiseeId` | `string` | No | - |
| `franchiseeName` | `string` | No | - |
| `mainContact` | `string` | No | - |
| `email` | `string` | No | - |
| `mobile` | `string` | No | - |
| `category` | `string` | No | - |
| `suburb` | `string` | No | - |
| `postcode` | `string` | No | - |
| `state` | `string` | No | - |
| `primaryOps` | `string` | No | - |
| `secondaryOp` | `string` | No | - |
| `nextDay` | `string` | No | - |
| `parentLpoId` | `string` | No | - |
| `lat` | `string` | No | - |
| `lng` | `string` | No | - |

---

### `TYPE` `MappingCategoryKey`

- **Line:** 21
- **Signature:** `'all' | 'territoryJson' | 'starTrackSuburbsJson' | 'tgeSuburbsJSON' | 'ironMountainSuburbsJson' | 'ausPostSuburbsJson'`

---

### `VARIABLE` `CATEGORY_LABELS`

- **Line:** 23
- **Signature:** `Record<string, string>`

---

### `FUNCTION` `extractSuburbRecords`

> Extract all suburb mapping items from franchisee objects based on selected category filter

- **Line:** 34
- **Returns:** `FlattenedSuburbRecord[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchisees` | `Franchisee[]` | **Yes** | - | - |
| `categoryFilter` | `string` | No | `'all'` | - |
| `franchiseeFilter` | `string` | No | `'all'` | - |

---

### `VARIABLE` `records`

- **Line:** 39
- **Signature:** `FlattenedSuburbRecord[]`

---

### `VARIABLE` `categoriesToExtract`

- **Line:** 41
- **Signature:** `{ key: keyof Franchisee; label: string }[]`

---

### `VARIABLE` `targetFranchisees`

- **Line:** 49

---

### `VARIABLE` `suburbList`

- **Line:** 59

---

### `VARIABLE` `primaryOpsStr`

- **Line:** 62

---

### `VARIABLE` `secondaryOpStr`

- **Line:** 66

---

### `VARIABLE` `secObj`

- **Line:** 77

---

### `FUNCTION` `exportSuburbMappingsToCSV`

> Formats flattened records to a CSV string and triggers a browser download

- **Line:** 108
- **Returns:** `{ count: number; filename: string }`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `franchisees` | `Franchisee[]` | **Yes** | - | - |
| `categoryFilter` | `string` | No | `'all'` | - |
| `franchiseeFilter` | `string` | No | `'all'` | - |

---

### `VARIABLE` `records`

- **Line:** 113

---

### `VARIABLE` `headers`

- **Line:** 115

---

### `FUNCTION` `escapeCSV`

- **Line:** 133

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `string` | **Yes** | - | - |

---

### `VARIABLE` `rows`

- **Line:** 135

---

### `VARIABLE` `csvContent`

- **Line:** 153

---

### `VARIABLE` `blob`

- **Line:** 154

---

### `VARIABLE` `url`

- **Line:** 155

---

### `VARIABLE` `today`

- **Line:** 157

---

### `VARIABLE` `catLabel`

- **Line:** 158

---

### `VARIABLE` `franLabel`

- **Line:** 159

---

### `VARIABLE` `filename`

- **Line:** 160

---

### `VARIABLE` `link`

- **Line:** 162

---

