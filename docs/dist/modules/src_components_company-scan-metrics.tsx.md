# Module: `src/components/company-scan-metrics.tsx`

- **Language:** TypeScript
- **Total Lines:** 196
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `INTERFACE` `CompanyScanMetricsProps`

- **Line:** 10

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `companyId` | `string` | No | - |

---

### `VARIABLE` `COLORS`

- **Line:** 14

---

### `FUNCTION` `CompanyScanMetrics`

- **Line:** 16
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ companyId }` | `CompanyScanMetricsProps` | **Yes** | - | - |

---

### `FUNCTION` `fetchPackages`

- **Line:** 22
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 25

---

### `VARIABLE` `data`

- **Line:** 26

---

### `VARIABLE` `metrics`

- **Line:** 41

---

### `VARIABLE` `totalBarcodes`

- **Line:** 46

---

### `VARIABLE` `timelineCount`

- **Line:** 47
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `productTypeCount`

- **Line:** 48
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `speedCount`

- **Line:** 49
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `mainDate`

- **Line:** 52

---

### `VARIABLE` `d`

- **Line:** 58

---

### `VARIABLE` `key`

- **Line:** 60

---

### `FUNCTION` `getWeek`

- **Line:** 62

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `Date` | **Yes** | - | - |

---

### `VARIABLE` `start`

- **Line:** 63

---

### `VARIABLE` `days`

- **Line:** 64

---

### `VARIABLE` `seenProd`

- **Line:** 76

---

### `VARIABLE` `seenSpeed`

- **Line:** 77

---

### `FUNCTION` `toChartData`

- **Line:** 90

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `obj` | `Record<string, number>` | **Yes** | - | - |

---

