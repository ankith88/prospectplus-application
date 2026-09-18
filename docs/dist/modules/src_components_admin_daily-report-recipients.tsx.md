# Module: `src/components/admin/daily-report-recipients.tsx`

- **Language:** TypeScript
- **Total Lines:** 566
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `ReportConfig`

- **Line:** 13

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `title` | `string` | No | - |
| `description` | `string` | No | - |
| `docId` | `string` | No | - |
| `defaultRecipients` | `string[]` | No | - |
| `testEndpoint` | `string` | No | - |

---

### `VARIABLE` `REPORTS`

- **Line:** 22
- **Signature:** `ReportConfig[]`

---

### `VARIABLE` `FREQUENCY_OPTIONS`

- **Line:** 97

---

### `FUNCTION` `DailyReportRecipients`

- **Line:** 107
- **Returns:** `void`

---

### `VARIABLE` `yesterday`

- **Line:** 123

---

### `VARIABLE` `yyyy`

- **Line:** 125

---

### `VARIABLE` `mm`

- **Line:** 126

---

### `VARIABLE` `dd`

- **Line:** 127

---

### `VARIABLE` `yesterdayStr`

- **Line:** 128

---

### `FUNCTION` `fetchAllConfigs`

- **Line:** 130
- **Async:** Yes

---

### `VARIABLE` `recData`

- **Line:** 132
- **Signature:** `Record<string, string[]>`

---

### `VARIABLE` `freqData`

- **Line:** 133
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `dateData`

- **Line:** 134
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `fromData`

- **Line:** 135
- **Signature:** `Record<string, string>`

---

### `VARIABLE` `docRef`

- **Line:** 139

---

### `VARIABLE` `snap`

- **Line:** 140

---

### `VARIABLE` `defaultFrom`

- **Line:** 142

---

### `VARIABLE` `data`

- **Line:** 144

---

### `VARIABLE` `activeReport`

- **Line:** 183

---

### `VARIABLE` `activeRecipients`

- **Line:** 184

---

### `VARIABLE` `activeFrequency`

- **Line:** 185

---

### `VARIABLE` `activeSelectedDate`

- **Line:** 186

---

### `FUNCTION` `handleAdd`

- **Line:** 188
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `email`

- **Line:** 190

---

### `VARIABLE` `emailRegex`

- **Line:** 194

---

### `VARIABLE` `updated`

- **Line:** 213

---

### `VARIABLE` `docRef`

- **Line:** 216

---

### `FUNCTION` `handleRemove`

- **Line:** 240
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `emailToRemove` | `string` | **Yes** | - | - |

---

### `VARIABLE` `updated`

- **Line:** 241

---

### `VARIABLE` `docRef`

- **Line:** 244

---

### `FUNCTION` `handleFrequencyChange`

- **Line:** 267
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLSelectElement>` | **Yes** | - | - |

---

### `VARIABLE` `newFreq`

- **Line:** 268

---

### `VARIABLE` `docRef`

- **Line:** 271

---

### `FUNCTION` `handleSaveFromAddress`

- **Line:** 294
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `fromAddress`

- **Line:** 296

---

### `VARIABLE` `emailRegex`

- **Line:** 300

---

### `VARIABLE` `docRef`

- **Line:** 312

---

### `FUNCTION` `handleDateChange`

- **Line:** 335

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.ChangeEvent<HTMLInputElement>` | **Yes** | - | - |

---

### `VARIABLE` `newDate`

- **Line:** 336

---

### `FUNCTION` `handleSendTestEmail`

- **Line:** 343
- **Async:** Yes

---

### `VARIABLE` `response`

- **Line:** 355

---

### `VARIABLE` `result`

- **Line:** 366

---

