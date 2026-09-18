# Module: `src/hooks/use-performance.tsx`

- **Language:** TypeScript
- **Total Lines:** 44
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `PerformanceContextType`

- **Line:** 6

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `loadTime` | `number | null` | No | - |
| `setLoadTime` | `(time: number | null) => void` | No | - |
| `pageName` | `string` | No | - |
| `setPageName` | `(name: string) => void` | No | - |
| `isCustom` | `boolean` | No | - |
| `setIsCustom` | `(isCustom: boolean) => void` | No | - |

---

### `VARIABLE` `PerformanceContext`

- **Line:** 15

---

### `FUNCTION` `PerformanceProvider`

- **Line:** 17
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ children }` | `{ children: React.ReactNode }` | **Yes** | - | - |

---

### `VARIABLE` `pathname`

- **Line:** 21

---

### `FUNCTION` `usePerformance`

- **Line:** 37
- **Returns:** `void`

---

### `VARIABLE` `context`

- **Line:** 38

---

