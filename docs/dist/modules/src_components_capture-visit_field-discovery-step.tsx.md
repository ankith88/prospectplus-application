# Module: `src/components/capture-visit/field-discovery-step.tsx`

- **Language:** TypeScript
- **Total Lines:** 251
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `FUNCTION` `DiscoveryNoteInput`

- **Line:** 23

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ 
  label, 
  value, 
  onChange, 
  placeholder = "Capture notes here..." 
}` | `{ 
  label: string; 
  value: string; 
  onChange: (val: string) => void;
  placeholder?: string;
}` | **Yes** | - | - |

---

### `VARIABLE` `recognitionRef`

- **Line:** 35

---

### `FUNCTION` `toggleListening`

- **Line:** 38

---

### `VARIABLE` `SpeechRecognition`

- **Line:** 53

---

### `VARIABLE` `recognition`

- **Line:** 54

---

### `VARIABLE` `finalTranscript`

- **Line:** 67

---

### `FUNCTION` `FieldDiscoveryStep`

- **Line:** 109
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ onNext, onBack }` | `{ onNext: () => void; onBack: () => void }` | **Yes** | - | - |

---

### `VARIABLE` `selectedPathway`

- **Line:** 112

---

### `VARIABLE` `pathwayNotes`

- **Line:** 113

---

### `VARIABLE` `lostPropertyProcess`

- **Line:** 114

---

### `VARIABLE` `isDashbackOnly`

- **Line:** 116

---

### `VARIABLE` `isAdminOrFranchisee`

- **Line:** 117

---

### `VARIABLE` `isRoleEligibleForLostProperty`

- **Line:** 118

---

### `FUNCTION` `handlePathwaySelect`

- **Line:** 120

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `pathwayId` | `string` | **Yes** | - | - |

---

### `FUNCTION` `handleNoteChange`

- **Line:** 129

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `questionId` | `string` | **Yes** | - | - |
| `value` | `string` | **Yes** | - | - |

---

### `VARIABLE` `activePathway`

- **Line:** 136

---

