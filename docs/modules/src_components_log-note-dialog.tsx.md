# Module: `src/components/log-note-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 281
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `VARIABLE` `formSchema`

- **Line:** 32

---

### `INTERFACE` `LogNoteDialogProps`

- **Line:** 36

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `onNoteLogged` | `(newNote: Note) => void` | No | - |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `collectionName` | `'leads' | 'companies'` | Yes | - |

---

### `TYPE` `SubmissionStatus`

- **Line:** 44
- **Signature:** `'idle' | 'saving_firebase' | 'complete' | 'error'`

---

### `FUNCTION` `LogNoteDialog`

- **Line:** 47
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ lead, onNoteLogged, isOpen, onOpenChange, collectionName }` | `LogNoteDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `recognitionRef`

- **Line:** 51

---

### `VARIABLE` `form`

- **Line:** 56

---

### `FUNCTION` `resetAndClose`

- **Line:** 63

---

### `VARIABLE` `SpeechRecognition`

- **Line:** 80

---

### `VARIABLE` `recognition`

- **Line:** 87

---

### `VARIABLE` `finalTranscript`

- **Line:** 93

---

### `VARIABLE` `currentNotes`

- **Line:** 100

---

### `VARIABLE` `errorMessage`

- **Line:** 106

---

### `FUNCTION` `handleToggleListening`

- **Line:** 136

---

### `FUNCTION` `onSubmit`

- **Line:** 155
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `z.infer<typeof formSchema>` | **Yes** | - | - |

---

### `VARIABLE` `startTime`

- **Line:** 165

---

### `VARIABLE` `submissionDate`

- **Line:** 170

---

### `VARIABLE` `newNote`

- **Line:** 171

---

### `VARIABLE` `targetCollection`

- **Line:** 178

---

### `VARIABLE` `endTime`

- **Line:** 182

---

