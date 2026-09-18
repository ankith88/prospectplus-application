# Module: `src/components/admin/send-notification-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 128
- **Direct Dependencies:** 10 modules imported

## Exported Symbols & API

### `INTERFACE` `SendNotificationDialogProps`

- **Line:** 22

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `users` | `{ uid: string; displayName: string }[]` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `onSuccess` | `() => void` | Yes | - |

---

### `FUNCTION` `SendNotificationDialog`

- **Line:** 29
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  users,
  isOpen,
  onOpenChange,
  onSuccess,
}` | `SendNotificationDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `handleSend`

- **Line:** 40
- **Async:** Yes

---

### `FUNCTION` `setDeploymentReminder`

- **Line:** 73

---

