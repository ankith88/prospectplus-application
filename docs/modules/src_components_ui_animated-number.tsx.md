# Module: `src/components/ui/animated-number.tsx`

- **Language:** TypeScript
- **Total Lines:** 66
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `AnimatedNumberProps`

- **Line:** 5

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `value` | `number` | No | - |
| `duration` | `number` | Yes | - |
| `prefix` | `string` | Yes | - |
| `suffix` | `string` | Yes | - |
| `decimals` | `number` | Yes | - |
| `className` | `string` | Yes | - |
| `formatter` | `(val: number) => string` | Yes | - |

---

### `FUNCTION` `AnimatedNumber`

- **Line:** 15
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  formatter,
}` | `AnimatedNumberProps` | **Yes** | - | - |

---

### `VARIABLE` `startTimeRef`

- **Line:** 25

---

### `VARIABLE` `startValueRef`

- **Line:** 26

---

### `VARIABLE` `animRef`

- **Line:** 27

---

### `FUNCTION` `animate`

- **Line:** 33

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `timestamp` | `number` | **Yes** | - | - |

---

### `VARIABLE` `progress`

- **Line:** 35

---

### `VARIABLE` `easedProgress`

- **Line:** 38

---

### `VARIABLE` `current`

- **Line:** 40

---

### `VARIABLE` `formatted`

- **Line:** 57

---

