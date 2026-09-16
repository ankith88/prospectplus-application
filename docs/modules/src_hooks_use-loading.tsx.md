# Module: `src/hooks/use-loading.tsx`

- **Language:** TypeScript
- **Total Lines:** 48
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `INTERFACE` `LoadingContextType`

- **Line:** 7

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isLoading` | `boolean` | No | - |
| `loadingMessage` | `string` | No | - |
| `setGlobalLoading` | `(loading: boolean, message?: string) => void` | No | - |

---

### `VARIABLE` `LoadingContext`

- **Line:** 13

---

### `FUNCTION` `LoadingProvider`

- **Line:** 15
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ children }` | `{ children: ReactNode }` | **Yes** | - | - |

---

### `VARIABLE` `setGlobalLoading`

- **Line:** 19

---

### `FUNCTION` `useLoading`

- **Line:** 31
- **Returns:** `void`

---

### `VARIABLE` `context`

- **Line:** 32

---

### `FUNCTION` `GlobalLoader`

- **Line:** 39
- **Returns:** `void`

---

