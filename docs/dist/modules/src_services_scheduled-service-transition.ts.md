# Module: `src/services/scheduled-service-transition.ts`

- **Language:** TypeScript
- **Total Lines:** 106
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `FUNCTION` `processScheduledServiceChanges`

> Scans companies and leads collections for due scheduledServiceChange entries
(effectiveDate <= today), promotes them into active services, and syncs PMPO to LocalMile.

- **Line:** 8
- **Async:** Yes
- **Returns:** `Promise<{
  processedCount: number;
  results: Array<{ id: string; collection: string; success: boolean; message?: string }>;
}>`

---

### `VARIABLE` `results`

- **Line:** 12
- **Signature:** `Array<{ id: string; collection: string; success: boolean; message?: string }>`

---

### `VARIABLE` `todayStr`

- **Line:** 13

---

### `VARIABLE` `nowStr`

- **Line:** 14

---

### `VARIABLE` `collections`

- **Line:** 16

---

### `VARIABLE` `snap`

- **Line:** 20

---

### `VARIABLE` `data`

- **Line:** 23

---

### `VARIABLE` `sched`

- **Line:** 24

---

### `VARIABLE` `effectiveDateStr`

- **Line:** 30

---

### `VARIABLE` `currentServices`

- **Line:** 38

---

### `VARIABLE` `currentHistory`

- **Line:** 39

---

### `VARIABLE` `updates`

- **Line:** 40
- **Signature:** `any`

---

### `VARIABLE` `historyRecord`

- **Line:** 47

---

### `VARIABLE` `syncRes`

- **Line:** 65

---

