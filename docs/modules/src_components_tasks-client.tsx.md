# Module: `src/components/tasks-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 275
- **Direct Dependencies:** 17 modules imported

## Exported Symbols & API

### `TYPE` `UserTask`

- **Line:** 34
- **Signature:** `Task & { leadId: string; leadName: string }`

---

### `INTERFACE` `TasksClientPageProps`

- **Line:** 36

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `initialTasks` | `UserTask[]` | No | - |

---

### `FUNCTION` `TasksClientPage`

- **Line:** 40
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ initialTasks }` | `TasksClientPageProps` | **Yes** | - | - |

---

### `VARIABLE` `router`

- **Line:** 46

---

### `VARIABLE` `overdue`

- **Line:** 61
- **Signature:** `UserTask[]`

---

### `VARIABLE` `upcoming`

- **Line:** 62
- **Signature:** `UserTask[]`

---

### `VARIABLE` `completed`

- **Line:** 63
- **Signature:** `UserTask[]`

---

### `FUNCTION` `handleToggleTask`

- **Line:** 84
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `task` | `UserTask` | **Yes** | - | - |
| `isCompleted` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleDeleteTask`

- **Line:** 95
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `task` | `UserTask` | **Yes** | - | - |

---

### `VARIABLE` `userEmail`

- **Line:** 100

---

### `VARIABLE` `userId`

- **Line:** 101

---

### `FUNCTION` `handleTaskUpdatedInPage`

- **Line:** 123

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `updatedTask` | `Task` | **Yes** | - | - |

---

### `FUNCTION` `renderTaskRow`

- **Line:** 127

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `task` | `UserTask` | **Yes** | - | - |

---

### `FUNCTION` `TaskTable`

- **Line:** 175

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ tasks }` | `{ tasks: UserTask[] }` | **Yes** | - | - |

---

