# Module: `src/components/marketing/suppression-list.tsx`

- **Language:** TypeScript
- **Total Lines:** 423
- **Direct Dependencies:** 10 modules imported

## Exported Symbols & API

### `INTERFACE` `SuppressedEmail`

- **Line:** 14

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `email` | `string` | No | - |
| `unsubscribedAt` | `string` | No | - |
| `deliveryId` | `string` | Yes | - |
| `campaignId` | `string` | Yes | - |
| `leadId` | `string` | Yes | - |
| `companyName` | `string` | Yes | - |
| `leadName` | `string` | Yes | - |

---

### `FUNCTION` `SuppressionList`

- **Line:** 25
- **Returns:** `void`

---

### `FUNCTION` `fetchSuppressionList`

- **Line:** 43
- **Async:** Yes

---

### `VARIABLE` `q`

- **Line:** 46

---

### `VARIABLE` `snap`

- **Line:** 50

---

### `VARIABLE` `list`

- **Line:** 51
- **Signature:** `SuppressedEmail[]`

---

### `VARIABLE` `data`

- **Line:** 53

---

### `FUNCTION` `handleManualAdd`

- **Line:** 78
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `emailKey`

- **Line:** 82

---

### `VARIABLE` `now`

- **Line:** 86

---

### `VARIABLE` `leadsRef`

- **Line:** 100

---

### `VARIABLE` `leadsSnap`

- **Line:** 101

---

### `VARIABLE` `foundAndUpdated`

- **Line:** 103

---

### `VARIABLE` `contactsRef`

- **Line:** 107

---

### `VARIABLE` `contactsSnap`

- **Line:** 108

---

### `VARIABLE` `activityRef`

- **Line:** 121

---

### `FUNCTION` `handleRemove`

- **Line:** 156
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `suppressed` | `SuppressedEmail` | **Yes** | - | - |

---

### `VARIABLE` `emailKey`

- **Line:** 162

---

### `VARIABLE` `leadRef`

- **Line:** 169

---

### `VARIABLE` `contactsRef`

- **Line:** 172

---

### `VARIABLE` `contactsSnap`

- **Line:** 173

---

### `VARIABLE` `activityRef`

- **Line:** 183

---

### `FUNCTION` `exportToCSV`

- **Line:** 209

---

### `VARIABLE` `headers`

- **Line:** 212

---

### `VARIABLE` `rows`

- **Line:** 213

---

### `VARIABLE` `csvContent`

- **Line:** 222

---

### `VARIABLE` `blob`

- **Line:** 227

---

### `VARIABLE` `url`

- **Line:** 228

---

### `VARIABLE` `link`

- **Line:** 229

---

### `VARIABLE` `filteredList`

- **Line:** 237

---

### `VARIABLE` `term`

- **Line:** 238

---

