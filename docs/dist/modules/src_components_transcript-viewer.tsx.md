# Module: `src/components/transcript-viewer.tsx`

- **Language:** TypeScript
- **Total Lines:** 244
- **Direct Dependencies:** 13 modules imported

## Exported Symbols & API

### `INTERFACE` `TranscriptViewerProps`

- **Line:** 18

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `transcript` | `Transcript` | No | - |
| `leadId` | `string` | No | - |
| `leadName` | `string` | No | - |
| `onAnalysisComplete` | `(analysis: TranscriptAnalysis) => void` | No | - |

---

### `INTERFACE` `Utterance`

- **Line:** 25

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `speaker` | `string` | No | - |
| `text` | `string` | No | - |
| `participant_type` | `'internal' | 'external'` | No | - |
| `user_id` | `string` | Yes | - |

---

### `INTERFACE` `GroupedUtterance`

- **Line:** 32

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `speakerName` | `string` | No | - |
| `isInternal` | `boolean` | No | - |
| `initials` | `string` | No | - |
| `texts` | `string[]` | No | - |

---

### `FUNCTION` `getInitials`

- **Line:** 39
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | - | - |

---

### `VARIABLE` `words`

- **Line:** 41

---

### `FUNCTION` `TranscriptViewer`

- **Line:** 48
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ transcript, leadId, leadName, onAnalysisComplete }` | `TranscriptViewerProps` | **Yes** | - | - |

---

### `FUNCTION` `fetchUsers`

- **Line:** 56
- **Async:** Yes

---

### `VARIABLE` `users`

- **Line:** 57

---

### `VARIABLE` `map`

- **Line:** 58

---

### `VARIABLE` `displayName`

- **Line:** 60

---

### `VARIABLE` `formattedTranscriptForAnalysis`

- **Line:** 71

---

### `VARIABLE` `utterances`

- **Line:** 78
- **Signature:** `Utterance[]`

---

### `VARIABLE` `parsedContent`

- **Line:** 80

---

### `VARIABLE` `groups`

- **Line:** 97
- **Signature:** `GroupedUtterance[]`

---

### `VARIABLE` `currentGroup`

- **Line:** 98
- **Signature:** `GroupedUtterance | null`

---

### `VARIABLE` `isInternal`

- **Line:** 101

---

### `VARIABLE` `speakerName`

- **Line:** 102

---

### `FUNCTION` `handleAnalyzeTranscript`

- **Line:** 132
- **Async:** Yes

---

### `VARIABLE` `result`

- **Line:** 135

---

### `VARIABLE` `sentimentIcon`

- **Line:** 159

---

