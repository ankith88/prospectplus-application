# Module: `src/components/ask/ask-chart-view.tsx`

- **Language:** TypeScript
- **Total Lines:** 222
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `INTERFACE` `AskChartViewProps`

- **Line:** 22

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `data` | `{ group: string; count: number }[]` | No | - |
| `title` | `string` | Yes | - |
| `defaultChartType` | `"bar" | "pie" | "line" | "table"` | Yes | - |
| `onCategoryClick` | `(category: string) => void` | Yes | - |

---

### `VARIABLE` `COLORS`

- **Line:** 29

---

### `FUNCTION` `AskChartView`

- **Line:** 42
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  data,
  title,
  defaultChartType = "bar",
  onCategoryClick,
}` | `AskChartViewProps` | **Yes** | - | - |

---

### `VARIABLE` `chartData`

- **Line:** 54

---

### `FUNCTION` `handleBarClick`

- **Line:** 59

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `entry` | `any` | **Yes** | - | - |

---

