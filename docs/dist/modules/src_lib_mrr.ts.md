# Module: `src/lib/mrr.ts`

- **Language:** TypeScript
- **Total Lines:** 131
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `FUNCTION` `calculateMonthlyValue`

> Calculates monthly recurring revenue (MRR) for a lead or company object based on its configured services, rates, and frequencies.

- **Line:** 6
- **Returns:** `number`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lead` | `Lead | any` | **Yes** | - | - |
| `ignoreStatusCheck` | `boolean` | No | `false` | - |

---

### `VARIABLE` `currentStatus`

- **Line:** 9

---

### `VARIABLE` `inactiveStatuses`

- **Line:** 13

---

### `VARIABLE` `applicableStatuses`

- **Line:** 19

---

### `VARIABLE` `totalMonthlyValue`

- **Line:** 32

---

### `VARIABLE` `rate`

- **Line:** 39

---

### `VARIABLE` `cleanedRate`

- **Line:** 43

---

### `VARIABLE` `freq`

- **Line:** 48

---

### `FUNCTION` `isAdhocVal`

- **Line:** 50

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `val` | `any` | **Yes** | - | - |

---

### `VARIABLE` `daysCount`

- **Line:** 64

---

### `VARIABLE` `lower`

- **Line:** 83

---

### `VARIABLE` `days`

- **Line:** 93

---

### `VARIABLE` `fallbackVal`

- **Line:** 116

---

### `VARIABLE` `parsedFallback`

- **Line:** 125

---

