# Module: `src/components/ai-email-copilot.tsx`

- **Language:** TypeScript
- **Total Lines:** 745
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `INTERFACE` `AIEmailCopilotProps`

- **Line:** 32

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `allLeads` | `Lead[]` | Yes | - |
| `selectedLeadIds` | `string[]` | Yes | - |

---

### `VARIABLE` `EMPTY_ARRAY`

- **Line:** 37
- **Signature:** `any[]`

---

### `FUNCTION` `AIEmailCopilot`

- **Line:** 39
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ allLeads = EMPTY_ARRAY, selectedLeadIds = EMPTY_ARRAY }` | `AIEmailCopilotProps` | **Yes** | - | - |

---

### `VARIABLE` `lead`

- **Line:** 112

---

### `VARIABLE` `contact`

- **Line:** 113

---

### `FUNCTION` `cleanEmail`

- **Line:** 115

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string | undefined | null` | **Yes** | - | - |

---

### `VARIABLE` `trimmed`

- **Line:** 117

---

### `VARIABLE` `lower`

- **Line:** 118

---

### `VARIABLE` `emailToSet`

- **Line:** 125

---

### `FUNCTION` `fetchSummary`

- **Line:** 134
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 137

---

### `VARIABLE` `data`

- **Line:** 142

---

### `FUNCTION` `handleGenerateDraft`

- **Line:** 155
- **Async:** Yes

---

### `VARIABLE` `res`

- **Line:** 159

---

### `VARIABLE` `data`

- **Line:** 164

---

### `FUNCTION` `handleCopyDraft`

- **Line:** 190

---

### `VARIABLE` `fullText`

- **Line:** 191

---

### `FUNCTION` `handleSimulateWebhook`

- **Line:** 201
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `e` | `React.FormEvent` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 214

---

### `VARIABLE` `data`

- **Line:** 224

---

### `FUNCTION` `fetchLogs`

- **Line:** 251
- **Async:** Yes

---

### `VARIABLE` `q`

- **Line:** 254

---

### `VARIABLE` `snap`

- **Line:** 259

---

### `VARIABLE` `items`

- **Line:** 260

---

### `VARIABLE` `activeLead`

- **Line:** 275

---

