# Module: `src/components/ui/copy-button.tsx`

- **Language:** TypeScript
- **Total Lines:** 109
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `INTERFACE` `CopyButtonProps`

- **Line:** 7

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `textToCopy` | `string` | No | - |
| `className` | `string` | Yes | - |
| `label` | `string` | Yes | - |
| `variant` | `"ghost" | "outline" | "default" | "secondary"` | Yes | - |
| `size` | `"default" | "sm" | "xs" | "icon"` | Yes | - |
| `onCopy` | `() => void` | Yes | - |
| `iconClassName` | `string` | Yes | - |
| `toastTitle` | `string` | Yes | - |
| `toastDescription` | `string` | Yes | - |

---

### `FUNCTION` `CopyButton`

- **Line:** 19
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  textToCopy,
  className = "",
  label,
  variant = "ghost",
  size = "icon",
  onCopy,
  iconClassName = "h-3.5 w-3.5",
}` | `CopyButtonProps` | **Yes** | - | - |

---

### `FUNCTION` `handleCopy`

- **Line:** 30
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent` | **Yes** | - | - |

---

### `VARIABLE` `textarea`

- **Line:** 48

---

