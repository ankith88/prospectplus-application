# Module: `src/components/account-manager/lead-notes-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 360
- **Direct Dependencies:** 14 modules imported

## Exported Symbols & API

### `INTERFACE` `LeadNotesDialogProps`

- **Line:** 24

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | - |
| `onClose` | `() => void` | No | - |
| `lead` | `Lead | null` | No | - |
| `onNoteAdded` | `(leadId: string, timestamp: string) => void` | Yes | - |
| `collectionName` | `'leads' | 'companies'` | Yes | - |

---

### `INTERFACE` `ActivityItem`

- **Line:** 32

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | - |
| `type` | `string` | No | - |
| `date` | `string` | No | - |
| `author` | `string` | No | - |
| `notes` | `string` | No | - |
| `outcome` | `string` | Yes | - |

---

### `FUNCTION` `LeadNotesDialog`

- **Line:** 41
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{ isOpen, onClose, lead, onNoteAdded, collectionName }` | `LeadNotesDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `authorName`

- **Line:** 48

---

### `VARIABLE` `fetchNotesAndActivities`

- **Line:** 52

---

### `VARIABLE` `items`

- **Line:** 55
- **Signature:** `ActivityItem[]`

---

### `VARIABLE` `actSnap`

- **Line:** 59

---

### `VARIABLE` `data`

- **Line:** 61

---

### `VARIABLE` `notesSnap`

- **Line:** 77

---

### `VARIABLE` `data`

- **Line:** 79

---

### `VARIABLE` `csSnap`

- **Line:** 94

---

### `VARIABLE` `data`

- **Line:** 96

---

### `VARIABLE` `notesText`

- **Line:** 97

---

### `VARIABLE` `uniqueItems`

- **Line:** 177
- **Signature:** `ActivityItem[]`

---

### `VARIABLE` `seenKeys`

- **Line:** 178

---

### `VARIABLE` `key`

- **Line:** 182

---

### `VARIABLE` `dateA`

- **Line:** 191

---

### `VARIABLE` `dateB`

- **Line:** 192

---

### `VARIABLE` `resolveCollection`

- **Line:** 204

---

### `VARIABLE` `colType`

- **Line:** 212

---

### `FUNCTION` `handleAddNote`

- **Line:** 220
- **Async:** Yes

---

### `VARIABLE` `nowStr`

- **Line:** 223

---

### `VARIABLE` `colType`

- **Line:** 224

---

### `VARIABLE` `addedItem`

- **Line:** 232
- **Signature:** `ActivityItem`

---

### `FUNCTION` `formatDateStr`

- **Line:** 250

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dateStr` | `string` | No | - | - |

---

### `VARIABLE` `d`

- **Line:** 253

---

### `FUNCTION` `getTypeBadgeColor`

- **Line:** 261

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | - | - |

---

