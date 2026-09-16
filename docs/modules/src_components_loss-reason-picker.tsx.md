# Module: `src/components/loss-reason-picker.tsx`

- **Language:** TypeScript
- **Total Lines:** 665
- **Direct Dependencies:** 8 modules imported

## Exported Symbols & API

### `INTERFACE` `LossReasonPickerProps`

- **Line:** 12

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `cancellationThemes` | `any[]` | Yes | - |
| `selectedThemeId` | `string` | No | - |
| `selectedWhyId` | `string` | No | - |
| `selectedReasonId` | `string` | No | - |
| `onSelect` | `(themeId: string, whyId: string, reasonId: string) => void` | No | - |
| `disabled` | `boolean` | Yes | - |

---

### `INTERFACE` `FlattenedReason`

- **Line:** 21

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `themeId` | `string` | No | - |
| `themeName` | `string` | No | - |
| `whyId` | `string` | No | - |
| `whyName` | `string` | No | - |
| `reasonId` | `string` | No | - |
| `reasonName` | `string` | No | - |

---

### `VARIABLE` `DEFAULT_CANCELLATION_HIERARCHY`

- **Line:** 31

---

### `VARIABLE` `QUICK_PILLS`

- **Line:** 315

---

### `FUNCTION` `LossReasonPicker`

- **Line:** 354
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  cancellationThemes = [],
  selectedThemeId,
  selectedWhyId,
  selectedReasonId,
  onSelect,
  disabled = false
}` | `LossReasonPickerProps` | **Yes** | - | - |

---

### `VARIABLE` `activeThemes`

- **Line:** 366

---

### `VARIABLE` `allReasons`

- **Line:** 370
- **Signature:** `FlattenedReason[]`

---

### `VARIABLE` `list`

- **Line:** 371
- **Signature:** `FlattenedReason[]`

---

### `FUNCTION` `findPillMatch`

- **Line:** 394

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pill` | `typeof QUICK_PILLS[number]` | **Yes** | - | - |
| `reasonsList` | `FlattenedReason[]` | **Yes** | - | - |

---

### `VARIABLE` `found`

- **Line:** 398

---

### `VARIABLE` `normPill`

- **Line:** 406

---

### `VARIABLE` `activeSelection`

- **Line:** 426

---

### `VARIABLE` `filteredReasons`

- **Line:** 432

---

### `VARIABLE` `q`

- **Line:** 434

---

### `FUNCTION` `handleQuickPillClick`

- **Line:** 443

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pill` | `typeof QUICK_PILLS[number]` | **Yes** | - | - |

---

### `VARIABLE` `found`

- **Line:** 444

---

### `FUNCTION` `handleSelectReason`

- **Line:** 451

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `item` | `FlattenedReason` | **Yes** | - | - |

---

### `FUNCTION` `handleClearSelection`

- **Line:** 456

---

### `VARIABLE` `matchedObj`

- **Line:** 485

---

### `VARIABLE` `isSelected`

- **Line:** 486

---

### `VARIABLE` `isSelected`

- **Line:** 540

---

