# Module: `src/hooks/use-toast.ts`

- **Language:** TypeScript
- **Total Lines:** 195
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `TOAST_LIMIT`

- **Line:** 11

---

### `VARIABLE` `TOAST_REMOVE_DELAY`

- **Line:** 12

---

### `TYPE` `ToasterToast`

- **Line:** 14
- **Signature:** `ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}`

---

### `VARIABLE` `actionTypes`

- **Line:** 21

---

### `VARIABLE` `count`

- **Line:** 28

---

### `FUNCTION` `genId`

- **Line:** 30
- **Returns:** `void`

---

### `TYPE` `ActionType`

- **Line:** 35
- **Signature:** `typeof actionTypes`

---

### `TYPE` `Action`

- **Line:** 37
- **Signature:** `| {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }`

---

### `INTERFACE` `State`

- **Line:** 55

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `toasts` | `ToasterToast[]` | No | - |

---

### `VARIABLE` `toastTimeouts`

- **Line:** 59

---

### `FUNCTION` `addToRemoveQueue`

- **Line:** 61

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `toastId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `timeout`

- **Line:** 66

---

### `FUNCTION` `reducer`

- **Line:** 77
- **Returns:** `State`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `state` | `State` | **Yes** | - | - |
| `action` | `Action` | **Yes** | - | - |

---

### `VARIABLE` `listeners`

- **Line:** 132
- **Signature:** `Array<(state: State) => void>`

---

### `VARIABLE` `memoryState`

- **Line:** 134
- **Signature:** `State`

---

### `FUNCTION` `dispatch`

- **Line:** 136
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `action` | `Action` | **Yes** | - | - |

---

### `TYPE` `Toast`

- **Line:** 143
- **Signature:** `Omit<ToasterToast, "id">`

---

### `FUNCTION` `toast`

- **Line:** 145
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ ...props }` | `Toast` | **Yes** | - | - |

---

### `VARIABLE` `id`

- **Line:** 146

---

### `FUNCTION` `update`

- **Line:** 148

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `props` | `ToasterToast` | **Yes** | - | - |

---

### `FUNCTION` `dismiss`

- **Line:** 153

---

### `FUNCTION` `useToast`

- **Line:** 174
- **Returns:** `void`

---

### `VARIABLE` `index`

- **Line:** 180

---

