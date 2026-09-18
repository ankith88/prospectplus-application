# Module: `src/components/marketing/asset-library.tsx`

- **Language:** TypeScript
- **Total Lines:** 289
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `Asset`

- **Line:** 13

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `name` | `string` | No | - |
| `url` | `string` | No | - |
| `path` | `string` | No | - |
| `size` | `number` | No | - |
| `type` | `string` | No | - |
| `createdAt` | `string` | No | - |

---

### `FUNCTION` `AssetLibrary`

- **Line:** 23
- **Returns:** `void`

---

### `VARIABLE` `fileInputRef`

- **Line:** 28

---

### `FUNCTION` `fetchAssets`

- **Line:** 35
- **Async:** Yes

---

### `VARIABLE` `q`

- **Line:** 38

---

### `VARIABLE` `snap`

- **Line:** 39

---

### `VARIABLE` `list`

- **Line:** 40

---

### `FUNCTION` `handleFileChange`

- **Line:** 57
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 58

---

### `FUNCTION` `uploadAsset`

- **Line:** 85

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `file` | `File` | **Yes** | - | - |

---

### `VARIABLE` `safeName`

- **Line:** 89

---

### `VARIABLE` `storagePath`

- **Line:** 90

---

### `VARIABLE` `storageRef`

- **Line:** 91

---

### `VARIABLE` `uploadTask`

- **Line:** 93

---

### `VARIABLE` `progress`

- **Line:** 98

---

### `VARIABLE` `downloadURL`

- **Line:** 112

---

### `VARIABLE` `assetData`

- **Line:** 114

---

### `VARIABLE` `docRef`

- **Line:** 123

---

### `FUNCTION` `copyToClipboard`

- **Line:** 145

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleDelete`

- **Line:** 153
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `asset` | `Asset` | **Yes** | - | - |

---

### `VARIABLE` `storageRef`

- **Line:** 160

---

### `FUNCTION` `formatBytes`

- **Line:** 183

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `bytes` | `number` | **Yes** | - | - |

---

### `VARIABLE` `k`

- **Line:** 185

---

### `VARIABLE` `sizes`

- **Line:** 186

---

### `VARIABLE` `i`

- **Line:** 187

---

