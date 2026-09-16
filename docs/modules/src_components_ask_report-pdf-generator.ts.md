# Module: `src/components/ask/report-pdf-generator.ts`

- **Language:** TypeScript
- **Total Lines:** 207
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `ReportPdfOptions`

- **Line:** 4

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | No | - |
| `humanSummary` | `string` | No | - |
| `insights` | `string` | Yes | - |
| `spec` | `any` | Yes | - |
| `elementIdToCapture` | `string` | Yes | - |
| `rows` | `any[]` | Yes | - |
| `columns` | `string[]` | Yes | - |
| `userName` | `string` | Yes | - |

---

### `FUNCTION` `generateExecutiveReportPdf`

- **Line:** 15
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  title,
  humanSummary,
  insights,
  spec,
  elementIdToCapture,
  rows = [],
  columns = [],
  userName = "Prospect+ User",
}` | `ReportPdfOptions` | **Yes** | - | - |

---

### `VARIABLE` `doc`

- **Line:** 26

---

### `VARIABLE` `pageWidth`

- **Line:** 32

---

### `VARIABLE` `pageHeight`

- **Line:** 33

---

### `VARIABLE` `margin`

- **Line:** 34

---

### `VARIABLE` `contentWidth`

- **Line:** 35

---

### `VARIABLE` `dateStr`

- **Line:** 49

---

### `VARIABLE` `currentY`

- **Line:** 59

---

### `VARIABLE` `splitSummary`

- **Line:** 74

---

### `VARIABLE` `splitInsights`

- **Line:** 93

---

### `VARIABLE` `el`

- **Line:** 101

---

### `VARIABLE` `canvas`

- **Line:** 104

---

### `VARIABLE` `imgData`

- **Line:** 109

---

### `VARIABLE` `imgHeight`

- **Line:** 110

---

### `VARIABLE` `clampedHeight`

- **Line:** 111

---

### `VARIABLE` `colsToPrint`

- **Line:** 139

---

### `VARIABLE` `colWidth`

- **Line:** 140

---

### `VARIABLE` `rowsToPrint`

- **Line:** 159

---

### `VARIABLE` `cellVal`

- **Line:** 171

---

### `VARIABLE` `totalPages`

- **Line:** 187

---

