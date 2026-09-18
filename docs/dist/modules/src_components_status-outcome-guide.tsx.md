# Module: `src/components/status-outcome-guide.tsx`

- **Language:** TypeScript
- **Total Lines:** 308
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `INTERFACE` `StatusOutcomeGuideModalProps`

- **Line:** 37

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |

---

### `INTERFACE` `StatusGuideItem`

- **Line:** 42

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | No | - |
| `category` | `'Automated Call Outcome' | 'Sales Pipeline Workflow' | 'Disqualified & Lost'` | No | - |
| `description` | `string` | No | - |
| `outcomes` | `OutcomeInfo[]` | No | - |

---

### `FUNCTION` `StatusOutcomeGuideModal`

- **Line:** 49
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onClose }` | `StatusOutcomeGuideModalProps` | **Yes** | - | - |

---

### `VARIABLE` `allGuideItems`

- **Line:** 53
- **Signature:** `StatusGuideItem[]`

---

### `VARIABLE` `statusSet`

- **Line:** 55

---

### `VARIABLE` `items`

- **Line:** 60
- **Signature:** `StatusGuideItem[]`

---

### `VARIABLE` `outcomes`

- **Line:** 63

---

### `VARIABLE` `meta`

- **Line:** 64

---

### `VARIABLE` `category`

- **Line:** 66
- **Signature:** `StatusGuideItem['category']`

---

### `VARIABLE` `filteredItems`

- **Line:** 86

---

### `VARIABLE` `q`

- **Line:** 95

---

### `VARIABLE` `matchesStatus`

- **Line:** 96

---

### `VARIABLE` `matchesDesc`

- **Line:** 97

---

### `VARIABLE` `matchesOutcome`

- **Line:** 98

---

### `FUNCTION` `StatusOutcomeBanner`

- **Line:** 249
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ className = '' }` | `{ className?: string }` | **Yes** | - | - |

---

### `FUNCTION` `StatusOutcomeGuideButton`

- **Line:** 288
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ className = '' }` | `{ className?: string }` | **Yes** | - | - |

---

