# Module: `src/components/marketing/allocate-bucket-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 247
- **Direct Dependencies:** 15 modules imported

## Exported Symbols & API

### `INTERFACE` `AllocateBucketDialogProps`

- **Line:** 19

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(isOpen: boolean) => void` | No | - |
| `onLeadsMoved` | `() => void` | No | - |

---

### `FUNCTION` `AllocateBucketDialog`

- **Line:** 26
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ leads, isOpen, onOpenChange, onLeadsMoved }` | `AllocateBucketDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `fetchUsers`

- **Line:** 37
- **Async:** Yes

---

### `VARIABLE` `usersList`

- **Line:** 41

---

### `VARIABLE` `filteredUsers`

- **Line:** 58

---

### `VARIABLE` `roles`

- **Line:** 60

---

### `VARIABLE` `roleStr`

- **Line:** 61

---

### `VARIABLE` `isAm`

- **Line:** 66

---

### `FUNCTION` `handleToggleUser`

- **Line:** 72

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checked` | `boolean` | **Yes** | - | - |
| `userName` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleAllocate`

- **Line:** 80
- **Async:** Yes

---

### `VARIABLE` `batch`

- **Line:** 92

---

### `VARIABLE` `author`

- **Line:** 93

---

### `VARIABLE` `shuffledUsers`

- **Line:** 96

---

### `VARIABLE` `assignedUser`

- **Line:** 99

---

### `VARIABLE` `leadRef`

- **Line:** 100

---

### `VARIABLE` `oldBucket`

- **Line:** 102

---

### `VARIABLE` `newBucket`

- **Line:** 103

---

### `VARIABLE` `activityRef`

- **Line:** 120

---

### `VARIABLE` `historyRef`

- **Line:** 131

---

### `VARIABLE` `name`

- **Line:** 201

---

