# Module: `src/components/ui/chart.tsx`

- **Language:** TypeScript
- **Total Lines:** 366
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `THEMES`

- **Line:** 9

---

### `TYPE` `ChartConfig`

- **Line:** 11
- **Signature:** `{
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}`

---

### `TYPE` `ChartContextProps`

- **Line:** 21
- **Signature:** `{
  config: ChartConfig
}`

---

### `VARIABLE` `ChartContext`

- **Line:** 25

---

### `FUNCTION` `useChart`

- **Line:** 27
- **Returns:** `void`

---

### `VARIABLE` `context`

- **Line:** 28

---

### `VARIABLE` `ChartContainer`

- **Line:** 37

---

### `VARIABLE` `uniqueId`

- **Line:** 46

---

### `VARIABLE` `chartId`

- **Line:** 47

---

### `FUNCTION` `ChartStyle`

- **Line:** 70

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ id, config }` | `{ id: string; config: ChartConfig }` | **Yes** | - | - |

---

### `VARIABLE` `colorConfig`

- **Line:** 71

---

### `VARIABLE` `color`

- **Line:** 88

---

### `VARIABLE` `ChartTooltip`

- **Line:** 103

---

### `VARIABLE` `ChartTooltipContent`

- **Line:** 105

---

### `VARIABLE` `tooltipLabel`

- **Line:** 136

---

### `VARIABLE` `key`

- **Line:** 142

---

### `VARIABLE` `itemConfig`

- **Line:** 143

---

### `VARIABLE` `value`

- **Line:** 144

---

### `VARIABLE` `nestLabel`

- **Line:** 176

---

### `VARIABLE` `key`

- **Line:** 189

---

### `VARIABLE` `itemConfig`

- **Line:** 190

---

### `VARIABLE` `indicatorColor`

- **Line:** 191

---

### `VARIABLE` `ChartLegend`

- **Line:** 259

---

### `VARIABLE` `ChartLegendContent`

- **Line:** 261

---

### `VARIABLE` `key`

- **Line:** 289

---

### `VARIABLE` `itemConfig`

- **Line:** 290

---

### `FUNCTION` `getPayloadConfigFromPayload`

- **Line:** 320
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `config` | `ChartConfig` | **Yes** | - | - |
| `payload` | `unknown` | **Yes** | - | - |
| `key` | `string` | **Yes** | - | - |

---

### `VARIABLE` `payloadPayload`

- **Line:** 329

---

### `VARIABLE` `configLabelKey`

- **Line:** 336
- **Signature:** `string`

---

