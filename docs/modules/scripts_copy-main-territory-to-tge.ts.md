# Module: `scripts/copy-main-territory-to-tge.ts`

- **Language:** TypeScript
- **Total Lines:** 115
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `FUNCTION` `main`

> One-off script to copy main territory (`territoryJson`) to TGE territory (`tgeSuburbsJSON`)
for all documents in the `franchisees` collection.

Usage:
  Dry run (default):  npx tsx scripts/copy-main-territory-to-tge.ts
  Execute mode:       npx tsx scripts/copy-main-territory-to-tge.ts --execute
  Force overwrite:    npx tsx scripts/copy-main-territory-to-tge.ts --execute --overwrite

- **Line:** 13
- **Async:** Yes
- **Returns:** `void`

---

### `VARIABLE` `isExecute`

- **Line:** 14

---

### `VARIABLE` `forceOverwrite`

- **Line:** 15

---

### `VARIABLE` `dryRun`

- **Line:** 16

---

### `VARIABLE` `db`

- **Line:** 25

---

### `VARIABLE` `snapshot`

- **Line:** 26

---

### `VARIABLE` `totalDocs`

- **Line:** 33

---

### `VARIABLE` `updatedDocsCount`

- **Line:** 34

---

### `VARIABLE` `skippedDocsCount`

- **Line:** 35

---

### `VARIABLE` `totalSuburbsCopied`

- **Line:** 36

---

### `VARIABLE` `batchSize`

- **Line:** 38

---

### `VARIABLE` `currentBatch`

- **Line:** 39

---

### `VARIABLE` `currentBatchOpCount`

- **Line:** 40

---

### `VARIABLE` `franchiseeId`

- **Line:** 43

---

### `VARIABLE` `data`

- **Line:** 44

---

### `VARIABLE` `franchiseeName`

- **Line:** 45

---

### `VARIABLE` `mainTerritory`

- **Line:** 47

---

### `VARIABLE` `tgeTerritory`

- **Line:** 48

---

### `VARIABLE` `copiedTgeTerritory`

- **Line:** 65

---

### `VARIABLE` `docRef`

- **Line:** 70

---

