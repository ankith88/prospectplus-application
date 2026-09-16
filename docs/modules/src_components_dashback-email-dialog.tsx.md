# Module: `src/components/dashback-email-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 157
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `DashbackEmailDialogProps`

- **Line:** 21

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `note` | `VisitNote` | No | - |
| `onProcessed` | `(noteId: string, status: 'Converted' | 'Rejected') => void` | Yes | - |

---

### `FUNCTION` `DashbackEmailDialog`

- **Line:** 28
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange, note, onProcessed }` | `DashbackEmailDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `companyName`

- **Line:** 33

---

### `VARIABLE` `address`

- **Line:** 34

---

### `VARIABLE` `contactName`

- **Line:** 35

---

### `VARIABLE` `contactTitle`

- **Line:** 36

---

### `VARIABLE` `contactEmail`

- **Line:** 37

---

### `VARIABLE` `contactPhone`

- **Line:** 38

---

### `VARIABLE` `capturedBy`

- **Line:** 39

---

### `VARIABLE` `outcome`

- **Line:** 40

---

### `VARIABLE` `apptDate`

- **Line:** 41

---

### `VARIABLE` `apptTime`

- **Line:** 42

---

### `VARIABLE` `noteContent`

- **Line:** 43

---

### `VARIABLE` `emailBody`

- **Line:** 45

---

### `FUNCTION` `handleCopy`

- **Line:** 73

---

### `FUNCTION` `handleProcess`

- **Line:** 83
- **Async:** Yes

---

