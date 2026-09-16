# Module: `src/components/ask/ask-training-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 379
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `INTERFACE` `AskTrainingDialogProps`

- **Line:** 15

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `onConfigSaved` | `(config: UserAiTrainingConfig) => void` | Yes | - |

---

### `FUNCTION` `AskTrainingDialog`

- **Line:** 21
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onClose, onConfigSaved }` | `AskTrainingDialogProps` | **Yes** | - | - |

---

### `FUNCTION` `loadConfig`

- **Line:** 44
- **Async:** Yes

---

### `VARIABLE` `idToken`

- **Line:** 48

---

### `VARIABLE` `res`

- **Line:** 49

---

### `VARIABLE` `data`

- **Line:** 53
- **Signature:** `UserAiTrainingConfig`

---

### `FUNCTION` `handleAddVocabulary`

- **Line:** 67

---

### `FUNCTION` `handleDeleteVocabulary`

- **Line:** 77

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `index` | `number` | **Yes** | - | - |

---

### `FUNCTION` `handleAddBookmark`

- **Line:** 81

---

### `FUNCTION` `handleDeleteBookmark`

- **Line:** 99

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleDeleteCorrection`

- **Line:** 103

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleSave`

- **Line:** 107
- **Async:** Yes

---

### `VARIABLE` `idToken`

- **Line:** 111

---

### `VARIABLE` `payload`

- **Line:** 112
- **Signature:** `UserAiTrainingConfig`

---

### `VARIABLE` `res`

- **Line:** 120

---

