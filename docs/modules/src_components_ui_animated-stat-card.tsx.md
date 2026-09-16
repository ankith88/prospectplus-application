# Module: `src/components/ui/animated-stat-card.tsx`

- **Language:** TypeScript
- **Total Lines:** 148
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `INTERFACE` `AnimatedStatCardProps`

- **Line:** 9

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | No | - |
| `value` | `number` | No | - |
| `prefix` | `string` | Yes | - |
| `suffix` | `string` | Yes | - |
| `decimals` | `number` | Yes | - |
| `icon` | `React.ReactNode` | Yes | - |
| `description` | `string` | Yes | - |
| `trend` | `{
    value: number;
    label: string;
    isPositive?: boolean;
  }` | Yes | - |
| `accentColor` | `"navy" | "emerald" | "amber" | "rose" | "purple" | "teal" | "blue"` | Yes | - |
| `badgeText` | `string` | Yes | - |
| `badgePulse` | `boolean` | Yes | - |
| `className` | `string` | Yes | - |
| `onClick` | `() => void` | Yes | - |
| `formatter` | `(val: number) => string` | Yes | - |

---

### `VARIABLE` `accentBarColors`

- **Line:** 30

---

### `VARIABLE` `iconBgColors`

- **Line:** 40

---

### `FUNCTION` `AnimatedStatCard`

- **Line:** 50
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  title,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  icon,
  description,
  trend,
  accentColor = "navy",
  badgeText,
  badgePulse = true,
  className,
  onClick,
  formatter,
}` | `AnimatedStatCardProps` | **Yes** | - | - |

---

