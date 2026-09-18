# Module: `src/components/move-lead-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 133
- **Direct Dependencies:** 10 modules imported

## Exported Symbols & API

### `INTERFACE` `MoveLeadDialogProps`

- **Line:** 14

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `leads` | `Lead[]` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(isOpen: boolean) => void` | No | - |
| `onLeadsMoved` | `() => void` | No | - |
| `targetBucket` | `'field' | 'outbound' | 'account_manager' | 'customer_success' | string` | No | - |
| `currentBucket` | `string` | Yes | - |

---

### `FUNCTION` `MoveLeadDialog`

- **Line:** 23
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ leads, isOpen, onOpenChange, onLeadsMoved, targetBucket, currentBucket }` | `MoveLeadDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `fetchUsers`

- **Line:** 31
- **Async:** Yes

---

### `VARIABLE` `allUsers`

- **Line:** 35

---

### `VARIABLE` `filteredUsers`

- **Line:** 36

---

### `FUNCTION` `handleMoveLeads`

- **Line:** 65
- **Async:** Yes

---

### `VARIABLE` `displayBucketName`

- **Line:** 96

---

### `VARIABLE` `repType`

- **Line:** 97

---

