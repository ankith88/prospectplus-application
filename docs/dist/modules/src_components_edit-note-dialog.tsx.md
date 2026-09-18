# Module: `src/components/edit-note-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 293
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `VARIABLE` `formSchema`

- **Line:** 32

---

### `INTERFACE` `EditNoteDialogProps`

- **Line:** 36

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `note` | `Note | null` | No | - |
| `onNoteUpdated` | `(updatedNote: Note) => void` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `collectionName` | `'leads' | 'companies'` | Yes | - |

---

### `TYPE` `SubmissionStatus`

- **Line:** 45
- **Signature:** `'idle' | 'saving_firebase' | 'complete' | 'error'`

---

### `FUNCTION` `EditNoteDialog`

- **Line:** 47
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, note, onNoteUpdated, isOpen, onOpenChange, collectionName }` | `EditNoteDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `recognitionRef`

- **Line:** 51

---

### `VARIABLE` `form`

- **Line:** 56

---

### `FUNCTION` `resetAndClose`

- **Line:** 70

---

### `VARIABLE` `SpeechRecognition`

- **Line:** 86

---

### `VARIABLE` `recognition`

- **Line:** 93

---

### `VARIABLE` `finalTranscript`

- **Line:** 99

---

### `VARIABLE` `currentNotes`

- **Line:** 106

---

### `VARIABLE` `errorMessage`

- **Line:** 112

---

### `FUNCTION` `handleToggleListening`

- **Line:** 142

---

### `FUNCTION` `onSubmit`

- **Line:** 160
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `startTime`

- **Line:** 180

---

### `VARIABLE` `targetCollection`

- **Line:** 185

---

### `VARIABLE` `updatedNote`

- **Line:** 188
- **Signature:** `Note`

---

### `VARIABLE` `endTime`

- **Line:** 194

---

