# Module: `src/lib/lead-lookup.ts`

- **Language:** TypeScript
- **Total Lines:** 67
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 5

---

### `FUNCTION` `findLeadByIdOrInternalId`

> Robustly searches for a Lead or Company in Firestore by doc ID or NetSuite/ProspectPlus internal IDs.
Searches across both 'companies' and 'leads' collections, handling String and Number data types.

- **Line:** 11
- **Async:** Yes
- **Returns:** `Promise<{ lead: Lead; leadId: string; collectionName: 'companies' | 'leads' } | null>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rawId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `cleanId`

- **Line:** 13

---

### `VARIABLE` `collections`

- **Line:** 16

---

### `VARIABLE` `docSnap`

- **Line:** 21

---

### `VARIABLE` `searchFields`

- **Line:** 31

---

### `VARIABLE` `isNumeric`

- **Line:** 42

---

### `VARIABLE` `numVal`

- **Line:** 43

---

### `VARIABLE` `snapString`

- **Line:** 48

---

### `VARIABLE` `doc`

- **Line:** 50

---

### `VARIABLE` `snapNum`

- **Line:** 56

---

### `VARIABLE` `doc`

- **Line:** 58

---

