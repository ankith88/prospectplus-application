# Module: `src/components/notification-center.tsx`

- **Language:** TypeScript
- **Total Lines:** 167
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `INTERFACE` `Notification`

- **Line:** 22

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `title` | `string` | No | - |
| `message` | `string` | No | - |
| `type` | `string` | No | - |
| `createdAt` | `string` | No | - |
| `isRead` | `boolean` | No | - |
| `callId` | `string` | Yes | - |
| `ticketId` | `string` | Yes | - |
| `link` | `string` | Yes | - |

---

### `FUNCTION` `NotificationCenter`

- **Line:** 34
- **Returns:** `void`

---

### `VARIABLE` `router`

- **Line:** 38

---

### `VARIABLE` `notificationsRef`

- **Line:** 43

---

### `VARIABLE` `q`

- **Line:** 44

---

### `VARIABLE` `unsubscribe`

- **Line:** 50

---

### `VARIABLE` `fetched`

- **Line:** 51

---

### `VARIABLE` `unreadCount`

- **Line:** 61

---

### `FUNCTION` `handleMarkAsRead`

- **Line:** 65
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleMarkAllAsRead`

- **Line:** 70
- **Async:** Yes

---

### `FUNCTION` `getTypeIcon`

- **Line:** 75

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

