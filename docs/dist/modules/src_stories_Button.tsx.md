# Module: `src/stories/Button.tsx`

- **Language:** TypeScript
- **Total Lines:** 40
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `ButtonProps`

- **Line:** 3

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `primary` | `boolean` | Yes | Is this the principal call to action on the page? |
| `backgroundColor` | `string` | Yes | What background color to use |
| `size` | `'small' | 'medium' | 'large'` | Yes | How large should the button be? |
| `label` | `string` | No | Button contents |
| `onClick` | `() => void` | Yes | Optional click handler |

---

### `FUNCTION` `Button`

> Primary UI component for user interaction

- **Line:** 17

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  primary = false,
  size = 'medium',
  backgroundColor,
  label,
  ...props
}` | `ButtonProps` | **Yes** | - | - |

---

### `VARIABLE` `mode`

- **Line:** 24

---

