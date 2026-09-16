# Module: `src/components/ask/ask-sidebar.tsx`

- **Language:** TypeScript
- **Total Lines:** 297
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `INTERFACE` `AskSidebarProps`

- **Line:** 12

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `chats` | `AskChatSession[]` | No | - |
| `activeChatId` | `string | null` | No | - |
| `onSelectChat` | `(chatId: string) => void` | No | - |
| `onNewChat` | `() => void` | No | - |
| `onDeleteChat` | `(chatId: string) => void` | No | - |
| `onRenameChat` | `(chatId: string, newTitle: string) => void` | No | - |
| `onOpenTraining` | `() => void` | No | - |
| `bookmarks` | `{ id: string; label: string; queryText: string; icon?: string }[]` | No | - |
| `onSelectBookmark` | `(query: string) => void` | No | - |
| `isCollapsed` | `boolean` | No | - |
| `onToggleCollapse` | `() => void` | No | - |

---

### `FUNCTION` `AskSidebar`

- **Line:** 26
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onOpenTraining,
  bookmarks,
  onSelectBookmark,
  isCollapsed,
  onToggleCollapse,
}` | `AskSidebarProps` | **Yes** | - | - |

---

### `VARIABLE` `filteredChats`

- **Line:** 43

---

### `VARIABLE` `now`

- **Line:** 48

---

### `VARIABLE` `todayStart`

- **Line:** 49

---

### `VARIABLE` `yesterdayStart`

- **Line:** 50

---

### `VARIABLE` `last7DaysStart`

- **Line:** 51

---

### `VARIABLE` `groups`

- **Line:** 53
- **Signature:** `{ label: string; items: AskChatSession[] }[]`

---

### `VARIABLE` `time`

- **Line:** 61

---

### `FUNCTION` `startRename`

- **Line:** 73

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `chat` | `AskChatSession` | **Yes** | - | - |
| `e` | `React.MouseEvent` | **Yes** | - | - |

---

### `FUNCTION` `confirmRename`

- **Line:** 79

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `chatId` | `string` | **Yes** | - | - |
| `e` | `React.MouseEvent` | No | - | - |

---

### `FUNCTION` `cancelRename`

- **Line:** 87

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.MouseEvent` | **Yes** | - | - |

---

### `VARIABLE` `isActive`

- **Line:** 191

---

### `VARIABLE` `isEditing`

- **Line:** 192

---

