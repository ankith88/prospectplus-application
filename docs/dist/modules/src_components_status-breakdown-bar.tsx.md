# Module: `src/components/status-breakdown-bar.tsx`

- **Language:** TypeScript
- **Total Lines:** 87
- **Direct Dependencies:** 6 modules imported

## Exported Symbols & API

### `INTERFACE` `StatusBreakdownBarProps`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `items` | `T[]` | No | - |
| `selectedStatus` | `string | null` | No | - |
| `onSelectStatus` | `(status: string | null) => void` | No | - |
| `getStatus` | `(item: T) => string` | Yes | - |
| `className` | `string` | Yes | - |
| `title` | `string` | Yes | - |
| `unitLabel` | `string` | Yes | - |

---

### `FUNCTION` `StatusBreakdownBar`

- **Line:** 18
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  items,
  selectedStatus,
  onSelectStatus,
  getStatus = (item: any) => item.customerStatus || item.status || item.leadStatus || 'New',
  className,
  title = "Status Breakdown",
  unitLabel = "lead",
}` | `StatusBreakdownBarProps<T>` | **Yes** | - | - |

---

### `VARIABLE` `statusBreakdown`

- **Line:** 27

---

### `VARIABLE` `counts`

- **Line:** 29
- **Signature:** `Record<string, number>`

---

### `VARIABLE` `rawStatus`

- **Line:** 31

---

### `VARIABLE` `s`

- **Line:** 32

---

### `VARIABLE` `isSelected`

- **Line:** 62

---

### `VARIABLE` `percentage`

- **Line:** 63

---

