# Module: `scripts/copy-company-to-lead.ts`

- **Language:** TypeScript
- **Total Lines:** 93
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 8

---

### `FUNCTION` `copyDocumentWithSubcollections`

> Recursively copies a document and all of its subcollections from sourceRef to targetRef.

- **Line:** 13
- **Async:** Yes
- **Returns:** `Promise<number>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `sourceRef` | `DocumentReference` | **Yes** | - | - |
| `targetRef` | `DocumentReference` | **Yes** | - | - |
| `dryRun` | `boolean` | **Yes** | - | - |

---

### `VARIABLE` `sourceSnap`

- **Line:** 18

---

### `VARIABLE` `copiedDocsCount`

- **Line:** 24

---

### `VARIABLE` `data`

- **Line:** 25

---

### `VARIABLE` `subcollections`

- **Line:** 33

---

### `VARIABLE` `subcolSnap`

- **Line:** 35

---

### `VARIABLE` `sourceSubDocRef`

- **Line:** 39

---

### `VARIABLE` `targetSubDocRef`

- **Line:** 40

---

### `FUNCTION` `main`

- **Line:** 48
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `companyId`

- **Line:** 49

---

### `VARIABLE` `isExecute`

- **Line:** 50

---

### `VARIABLE` `dryRun`

- **Line:** 51

---

### `VARIABLE` `companyRef`

- **Line:** 59

---

### `VARIABLE` `leadRef`

- **Line:** 60

---

### `VARIABLE` `companySnap`

- **Line:** 62

---

### `VARIABLE` `leadSnap`

- **Line:** 68

---

### `VARIABLE` `totalCopied`

- **Line:** 75

---

