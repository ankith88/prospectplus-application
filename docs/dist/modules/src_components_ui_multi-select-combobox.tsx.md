# Module: `src/components/ui/multi-select-combobox.tsx`

- **Language:** TypeScript
- **Total Lines:** 135
- **Direct Dependencies:** 7 modules imported

## Exported Symbols & API

### `INTERFACE` `Option`

- **Line:** 22

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `value` | `string` | No | - |
| `label` | `string` | No | - |

---

### `INTERFACE` `MultiSelectComboboxProps`

- **Line:** 27

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `options` | `Option[]` | No | - |
| `selected` | `string[]` | No | - |
| `onSelectedChange` | `(selected: string[]) => void` | No | - |
| `className` | `string` | Yes | - |
| `placeholder` | `string` | Yes | - |

---

### `FUNCTION` `MultiSelectCombobox`

- **Line:** 35
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  options,
  selected,
  onSelectedChange,
  className,
  placeholder = 'Select options...',
}` | `MultiSelectComboboxProps` | **Yes** | - | - |

---

### `FUNCTION` `handleSelect`

- **Line:** 44

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | **Yes** | - | - |

---

### `VARIABLE` `newSelected`

- **Line:** 45

---

### `VARIABLE` `option`

- **Line:** 63

---

