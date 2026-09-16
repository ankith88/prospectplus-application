# Module: `src/components/scans/contact-report-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 446
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `INTERFACE` `CustomerStats`

- **Line:** 17

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `companyId` | `string` | Yes | - |
| `type` | `'companies' | 'leads'` | Yes | - |
| `name` | `string` | No | - |
| `franchisee` | `string` | No | - |
| `allTimeBarcodes` | `number` | No | - |
| `currentWeekScans` | `number` | No | - |
| `currentMonthScans` | `number` | No | - |
| `weeklyAverage` | `number` | No | - |
| `monthlyAverage` | `number` | No | - |
| `deliverySpeeds` | `Record<string, number>` | No | - |
| `lastScanDate` | `string | Date | null` | No | - |
| `lastContact` | `{
    date: string | null;
    type: string | null;
    author: string | null;
    notes: string | null;
  } | null` | Yes | - |

---

### `FUNCTION` `getFormattedDateDDMMYYYY`

- **Line:** 38

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date | null` | **Yes** | - | - |

---

### `VARIABLE` `dd`

- **Line:** 40

---

### `VARIABLE` `mm`

- **Line:** 41

---

### `VARIABLE` `yyyy`

- **Line:** 42

---

### `FUNCTION` `ContactReportClient`

- **Line:** 46
- **Returns:** `void`

---

### `FUNCTION` `fetchData`

- **Line:** 58
- **Async:** Yes

---

### `VARIABLE` `startStr`

- **Line:** 61

---

### `VARIABLE` `endStr`

- **Line:** 62

---

### `VARIABLE` `today`

- **Line:** 64

---

### `VARIABLE` `startDate`

- **Line:** 67

---

### `VARIABLE` `endDate`

- **Line:** 68

---

### `VARIABLE` `range`

- **Line:** 71

---

### `VARIABLE` `url`

- **Line:** 90

---

### `VARIABLE` `res`

- **Line:** 91

---

### `VARIABLE` `data`

- **Line:** 93

---

### `VARIABLE` `uniqueFranchisees`

- **Line:** 107

---

### `VARIABLE` `franchisees`

- **Line:** 108

---

### `VARIABLE` `uniqueContactAuthors`

- **Line:** 112

---

### `VARIABLE` `authors`

- **Line:** 113

---

### `VARIABLE` `contactedStats`

- **Line:** 117

---

### `VARIABLE` `contacted`

- **Line:** 118

---

### `VARIABLE` `notContacted`

- **Line:** 119

---

### `VARIABLE` `contactRate`

- **Line:** 120

---

### `VARIABLE` `filteredStats`

- **Line:** 124

---

### `FUNCTION` `handleExportCSV`

- **Line:** 155

---

### `VARIABLE` `headers`

- **Line:** 156

---

### `VARIABLE` `rows`

- **Line:** 161

---

### `VARIABLE` `contactDate`

- **Line:** 162

---

### `VARIABLE` `contactAuthor`

- **Line:** 163

---

### `VARIABLE` `contactNotes`

- **Line:** 164

---

### `VARIABLE` `csvContent`

- **Line:** 179

---

### `VARIABLE` `blob`

- **Line:** 180

---

### `VARIABLE` `url`

- **Line:** 181

---

### `VARIABLE` `link`

- **Line:** 182

---

### `VARIABLE` `contactDate`

- **Line:** 368

---

### `VARIABLE` `contactAuthor`

- **Line:** 369

---

### `VARIABLE` `contactNotes`

- **Line:** 370

---

