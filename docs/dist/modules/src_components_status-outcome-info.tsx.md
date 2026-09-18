# Module: `src/components/status-outcome-info.tsx`

- **Language:** TypeScript
- **Total Lines:** 121
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `INTERFACE` `StatusOutcomeInfoProps`

- **Line:** 9

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | No | - |
| `className` | `string` | Yes | - |
| `iconOnly` | `boolean` | Yes | - |
| `align` | `'start' | 'center' | 'end'` | Yes | - |

---

### `FUNCTION` `StatusOutcomeInfo`

- **Line:** 16
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ status, className = '', iconOnly = true, align = 'start' }` | `StatusOutcomeInfoProps` | **Yes** | - | - |

---

### `VARIABLE` `outcomes`

- **Line:** 17

---

### `VARIABLE` `explanation`

- **Line:** 18

---

### `INTERFACE` `StatusChartTooltipProps`

- **Line:** 74

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `active` | `boolean` | Yes | - |
| `payload` | `any[]` | Yes | - |
| `unit` | `string` | Yes | - |
| `labelFormatter` | `(val: any) => string` | Yes | - |

---

### `FUNCTION` `StatusChartTooltipContent`

- **Line:** 81
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ active, payload, unit = 'leads', labelFormatter }` | `StatusChartTooltipProps` | **Yes** | - | - |

---

### `VARIABLE` `data`

- **Line:** 84

---

### `VARIABLE` `rawStatus`

- **Line:** 85

---

### `VARIABLE` `statusName`

- **Line:** 88

---

### `VARIABLE` `val`

- **Line:** 89

---

### `VARIABLE` `displayVal`

- **Line:** 90

---

### `VARIABLE` `outcomes`

- **Line:** 91

---

### `VARIABLE` `explanation`

- **Line:** 92

---

