# Module: `src/app/api/lpo-opportunity/[id]/action/route.ts`

- **Language:** TypeScript
- **Total Lines:** 154
- **Direct Dependencies:** 4 modules imported

## Exported Symbols & API

### `FUNCTION` `POST`

- **Line:** 6
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `req` | `NextRequest` | **Yes** | - | - |
| `{ params }` | `{ params: Promise<{ id: string }> }` | **Yes** | - | - |

---

### `VARIABLE` `resolvedParams`

- **Line:** 11

---

### `VARIABLE` `token`

- **Line:** 12

---

### `VARIABLE` `targetId`

- **Line:** 18

---

### `VARIABLE` `docRef`

- **Line:** 21

---

### `VARIABLE` `docSnap`

- **Line:** 22

---

### `VARIABLE` `isCompany`

- **Line:** 23

---

### `VARIABLE` `q`

- **Line:** 33

---

### `VARIABLE` `qComp`

- **Line:** 39

---

### `VARIABLE` `body`

- **Line:** 52

---

### `VARIABLE` `nowISO`

- **Line:** 59

---

### `VARIABLE` `newStatus`

- **Line:** 60

---

### `VARIABLE` `updates`

- **Line:** 62
- **Signature:** `Record<string, any>`

---

### `VARIABLE` `activityNoteText`

- **Line:** 75

---

### `VARIABLE` `newActivity`

- **Line:** 79

---

### `VARIABLE` `newNoteObj`

- **Line:** 87

---

### `VARIABLE` `existingNotes`

- **Line:** 95

---

### `VARIABLE` `updatedNotes`

- **Line:** 96

---

### `VARIABLE` `leadData`

- **Line:** 114

---

### `VARIABLE` `salesRep`

- **Line:** 115

---

### `VARIABLE` `nsBaseUrl`

- **Line:** 116

---

### `VARIABLE` `nsParams`

- **Line:** 117

---

### `VARIABLE` `nsUrl`

- **Line:** 133

---

### `VARIABLE` `nsRes`

- **Line:** 134

---

