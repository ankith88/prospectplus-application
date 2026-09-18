# Module: `src/app/tasks/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 243
- **Direct Dependencies:** 16 modules imported

## Exported Symbols & API

### `TYPE` `UserTask`

- **Line:** 33
- **Signature:** `Task & { leadId: string; leadName: string }`

---

### `FUNCTION` `TasksPage`

- **Line:** 35
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 38

---

### `FUNCTION` `fetchTasks`

- **Line:** 49
- **Async:** Yes

---

### `VARIABLE` `userTasks`

- **Line:** 53

---

### `VARIABLE` `overdue`

- **Line:** 71
- **Signature:** `UserTask[]`

---

### `VARIABLE` `upcoming`

- **Line:** 72
- **Signature:** `UserTask[]`

---

### `VARIABLE` `completed`

- **Line:** 73
- **Signature:** `UserTask[]`

---

### `FUNCTION` `handleToggleTask`

- **Line:** 94
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `task` | `UserTask` | **Yes** | - | - |
| `isCompleted` | `boolean` | **Yes** | - | - |

---

### `FUNCTION` `handleDeleteTask`

- **Line:** 105
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `task` | `UserTask` | **Yes** | - | - |

---

### `FUNCTION` `renderTaskRow`

- **Line:** 116

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `task` | `UserTask` | **Yes** | - | - |

---

### `FUNCTION` `TaskTable`

- **Line:** 150

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ tasks }` | `{ tasks: UserTask[] }` | **Yes** | - | - |

---

