# Module: `src/app/ask/ask-client.tsx`

- **Language:** TypeScript
- **Total Lines:** 563
- **Direct Dependencies:** 12 modules imported

## Exported Symbols & API

### `FUNCTION` `AskClient`

- **Line:** 19
- **Returns:** `void`

---

### `VARIABLE` `messagesEndRef`

- **Line:** 37

---

### `VARIABLE` `isAllowed`

- **Line:** 39

---

### `FUNCTION` `loadChats`

- **Line:** 61
- **Async:** Yes

---

### `VARIABLE` `idToken`

- **Line:** 64

---

### `VARIABLE` `res`

- **Line:** 65

---

### `VARIABLE` `data`

- **Line:** 69

---

### `VARIABLE` `chatList`

- **Line:** 70
- **Signature:** `AskChatSession[]`

---

### `FUNCTION` `loadTrainingConfig`

- **Line:** 84
- **Async:** Yes

---

### `VARIABLE` `idToken`

- **Line:** 87

---

### `VARIABLE` `res`

- **Line:** 88

---

### `VARIABLE` `data`

- **Line:** 92
- **Signature:** `UserAiTrainingConfig`

---

### `FUNCTION` `selectChat`

- **Line:** 100
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `chatId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `idToken`

- **Line:** 104

---

### `VARIABLE` `res`

- **Line:** 105

---

### `VARIABLE` `data`

- **Line:** 109
- **Signature:** `AskChatSession`

---

### `FUNCTION` `startNewChat`

- **Line:** 117

---

### `VARIABLE` `newId`

- **Line:** 118

---

### `VARIABLE` `initialMsg`

- **Line:** 119
- **Signature:** `AskChatMessage`

---

### `FUNCTION` `saveChatToFirestore`

- **Line:** 130
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `chatId` | `string` | **Yes** | - | - |
| `updatedMessages` | `AskChatMessage[]` | **Yes** | - | - |
| `title` | `string` | No | - | - |

---

### `VARIABLE` `idToken`

- **Line:** 133

---

### `FUNCTION` `handleDeleteChat`

- **Line:** 152
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `chatId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `idToken`

- **Line:** 155

---

### `VARIABLE` `remaining`

- **Line:** 161

---

### `FUNCTION` `handleRenameChat`

- **Line:** 175
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `chatId` | `string` | **Yes** | - | - |
| `newTitle` | `string` | **Yes** | - | - |

---

### `VARIABLE` `idToken`

- **Line:** 178

---

### `FUNCTION` `handleAsk`

- **Line:** 196
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `queryText` | `string` | **Yes** | - | - |

---

### `VARIABLE` `trimmed`

- **Line:** 197

---

### `VARIABLE` `currentChatId`

- **Line:** 204

---

### `VARIABLE` `userMessage`

- **Line:** 207
- **Signature:** `AskChatMessage`

---

### `VARIABLE` `lastBotMsg`

- **Line:** 215

---

### `VARIABLE` `previousSpec`

- **Line:** 216

---

### `VARIABLE` `conversationHistory`

- **Line:** 218

---

### `VARIABLE` `newMessages`

- **Line:** 224

---

### `VARIABLE` `idToken`

- **Line:** 230

---

### `VARIABLE` `res`

- **Line:** 231

---

### `VARIABLE` `data`

- **Line:** 244

---

### `VARIABLE` `botMessage`

- **Line:** 246
- **Signature:** `AskChatMessage`

---

### `VARIABLE` `finalMessages`

- **Line:** 265

---

### `VARIABLE` `chatTitle`

- **Line:** 269

---

### `VARIABLE` `errorMsg`

- **Line:** 273
- **Signature:** `AskChatMessage`

---

### `FUNCTION` `handleMorningBriefing`

- **Line:** 286

---

### `FUNCTION` `toggleMic`

- **Line:** 290

---

