# Module: `src/components/ask/results-view.tsx`

- **Language:** TypeScript
- **Total Lines:** 461
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `INTERFACE` `ResultsViewProps`

- **Line:** 22

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `collection` | `string` | No | - |
| `intent` | `"list" | "count" | "aggregate"` | No | - |
| `rows` | `any[]` | Yes | - |
| `columns` | `string[]` | Yes | - |
| `value` | `any` | Yes | - |
| `chartType` | `"bar" | "pie" | "line" | "table" | "none"` | Yes | - |
| `humanSummary` | `string` | No | - |
| `insights` | `string` | Yes | - |
| `spec` | `any` | Yes | - |
| `suggestedFollowUps` | `string[]` | Yes | - |
| `onFollowUpClick` | `(query: string) => void` | Yes | - |
| `onTeachAiClick` | `(question: string) => void` | Yes | - |
| `userName` | `string` | Yes | - |

---

### `FUNCTION` `ResultsView`

- **Line:** 38
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  collection,
  intent,
  rows = [],
  columns = [],
  value,
  chartType = "table",
  humanSummary,
  insights,
  spec,
  suggestedFollowUps = [],
  onFollowUpClick,
  onTeachAiClick,
  userName = "Prospect+ User",
}` | `ResultsViewProps` | **Yes** | - | - |

---

### `VARIABLE` `containerUniqueId`

- **Line:** 62

---

### `VARIABLE` `chartCaptureId`

- **Line:** 63

---

### `FUNCTION` `handleExportCSV`

- **Line:** 65

---

### `VARIABLE` `dataToExport`

- **Line:** 70

---

### `VARIABLE` `csv`

- **Line:** 71

---

### `VARIABLE` `blob`

- **Line:** 72

---

### `VARIABLE` `url`

- **Line:** 73

---

### `VARIABLE` `link`

- **Line:** 74

---

### `FUNCTION` `handleCopyExcelTsv`

- **Line:** 83

---

### `VARIABLE` `cols`

- **Line:** 85

---

### `VARIABLE` `headerRow`

- **Line:** 86

---

### `VARIABLE` `dataRows`

- **Line:** 87

---

### `VARIABLE` `tsv`

- **Line:** 88

---

### `FUNCTION` `handleCopySlackEmail`

- **Line:** 93

---

### `VARIABLE` `lines`

- **Line:** 94

---

### `FUNCTION` `handleExportPdf`

- **Line:** 114
- **Async:** Yes

---

### `FUNCTION` `openRecordPreview`

- **Line:** 135

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `row` | `any` | **Yes** | - | - |

---

### `FUNCTION` `openTaskDialog`

- **Line:** 140

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `row` | `any` | No | - | - |

---

### `VARIABLE` `target`

- **Line:** 141

---

### `FUNCTION` `renderBreakdown`

- **Line:** 150

---

### `VARIABLE` `items`

- **Line:** 152
- **Signature:** `React.ReactNode[]`

---

### `VARIABLE` `statusVal`

- **Line:** 360

---

### `VARIABLE` `isHot`

- **Line:** 361

---

### `VARIABLE` `val`

- **Line:** 370

---

### `VARIABLE` `isStatusCol`

- **Line:** 371

---

