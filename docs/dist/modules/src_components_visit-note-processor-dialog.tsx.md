# Module: `src/components/visit-note-processor-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 433
- **Direct Dependencies:** 22 modules imported

## Exported Symbols & API

### `INTERFACE` `VisitNoteProcessorDialogProps`

- **Line:** 43

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onOpenChange` | `(open: boolean) => void` | No | - |
| `note` | `VisitNote` | No | - |
| `onProcessed` | `(noteId: string, status: 'Converted' | 'Rejected', leadId?: string) => void` | No | - |

---

### `FUNCTION` `formatAddressDisplay`

- **Line:** 50

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `address` | `Address | undefined` | **Yes** | - | - |

---

### `FUNCTION` `VisitNoteProcessorDialog`

- **Line:** 55
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onOpenChange, note, onProcessed }` | `VisitNoteProcessorDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `router`

- **Line:** 64

---

### `FUNCTION` `handleSearch`

- **Line:** 76
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `query` | `string` | **Yes** | - | - |

---

### `VARIABLE` `normalizedQuery`

- **Line:** 88

---

### `VARIABLE` `filteredLeads`

- **Line:** 90

---

### `VARIABLE` `filteredCompanies`

- **Line:** 94

---

### `VARIABLE` `timer`

- **Line:** 107

---

### `FUNCTION` `handleCreateLead`

- **Line:** 116

---

### `VARIABLE` `params`

- **Line:** 119

---

### `FUNCTION` `handleReject`

- **Line:** 125
- **Async:** Yes

---

### `FUNCTION` `handleLinkToItem`

- **Line:** 139
- **Async:** Yes

---

### `VARIABLE` `collectionName`

- **Line:** 144

---

### `VARIABLE` `docRef`

- **Line:** 148

---

### `VARIABLE` `userRef`

- **Line:** 152

---

### `VARIABLE` `userSnap`

- **Line:** 153

---

### `VARIABLE` `capturer`

- **Line:** 154

---

### `VARIABLE` `updateData`

- **Line:** 156
- **Signature:** `any`

---

### `VARIABLE` `extractedContacts`

- **Line:** 188

---

### `VARIABLE` `addedCount`

- **Line:** 192

---

### `VARIABLE` `destination`

- **Line:** 217

---

### `VARIABLE` `formattedKey`

- **Line:** 314

---

### `VARIABLE` `formattedValue`

- **Line:** 315

---

