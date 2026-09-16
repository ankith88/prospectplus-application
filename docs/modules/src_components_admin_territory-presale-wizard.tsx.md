# Module: `src/components/admin/territory-presale-wizard.tsx`

- **Language:** TypeScript
- **Total Lines:** 1137
- **Direct Dependencies:** 15 modules imported

## Exported Symbols & API

### `INTERFACE` `TerritoryPresaleWizardProps`

- **Line:** 36

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `franchiseeId` | `string` | No | - |
| `franchiseeName` | `string` | Yes | - |
| `onSuccess` | `() => void` | Yes | - |

---

### `FUNCTION` `TerritoryPresaleWizard`

- **Line:** 44
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  open,
  onOpenChange,
  franchiseeId,
  franchiseeName = '',
  onSuccess,
}` | `TerritoryPresaleWizardProps` | **Yes** | - | - |

---

### `VARIABLE` `isAdminOrOps`

- **Line:** 101

---

### `VARIABLE` `isDeedSigned`

- **Line:** 107

---

### `FUNCTION` `handleStepClick`

- **Line:** 111

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetStep` | `1 | 2 | 3 | 4` | **Yes** | - | - |

---

### `FUNCTION` `loadPresale`

- **Line:** 126
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `res`

- **Line:** 129

---

### `VARIABLE` `json`

- **Line:** 130

---

### `VARIABLE` `d`

- **Line:** 132
- **Signature:** `PresaleRecord`

---

### `VARIABLE` `isDeedSigned`

- **Line:** 140

---

### `VARIABLE` `isMainDetailsComplete`

- **Line:** 143

---

### `VARIABLE` `initialStep`

- **Line:** 148
- **Signature:** `1 | 2 | 3 | 4`

---

### `FUNCTION` `handleSave`

- **Line:** 167
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `customDeed` | `PresaleDeedOfVariation` | No | - | - |

---

### `VARIABLE` `finalDeed`

- **Line:** 170

---

### `VARIABLE` `res`

- **Line:** 171

---

### `VARIABLE` `json`

- **Line:** 186

---

### `FUNCTION` `handleDeedSaved`

- **Line:** 211

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updatedDeed` | `PresaleDeedOfVariation` | **Yes** | - | - |

---

### `FUNCTION` `handleSendImEmail`

- **Line:** 220
- **Async:** Yes

---

### `VARIABLE` `targetEmail`

- **Line:** 221

---

### `VARIABLE` `res`

- **Line:** 242

---

### `VARIABLE` `json`

- **Line:** 256

---

### `FUNCTION` `handleMapImageUpload`

- **Line:** 289

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `file`

- **Line:** 290

---

### `VARIABLE` `reader`

- **Line:** 302

---

### `VARIABLE` `dataUrl`

- **Line:** 304

---

### `VARIABLE` `defaultTo`

- **Line:** 733

---

