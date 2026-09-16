# Module: `src/lib/checkin-scoring.ts`

- **Language:** TypeScript
- **Total Lines:** 72
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `FUNCTION` `calculateCheckinScore`

- **Line:** 4
- **Returns:** `{ score: number; routingTag: string; scoringReason: string }`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `questions` | `CheckinQuestion[]` | **Yes** | - | - |

---

### `VARIABLE` `score`

- **Line:** 5

---

### `VARIABLE` `reasonParts`

- **Line:** 6
- **Signature:** `string[]`

---

### `FUNCTION` `getAnswer`

- **Line:** 8
- **Returns:** `string | string[] | undefined`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `questionText` | `string` | **Yes** | - | - |

---

### `VARIABLE` `hasAuspostRelationship`

- **Line:** 12

---

### `VARIABLE` `usesDropOff`

- **Line:** 13

---

### `VARIABLE` `usesBanking`

- **Line:** 14

---

### `VARIABLE` `usesOtherCouriers`

- **Line:** 15

---

### `VARIABLE` `isService`

- **Line:** 17

---

### `VARIABLE` `isProduct`

- **Line:** 18

---

### `VARIABLE` `usage`

- **Line:** 43

---

### `VARIABLE` `routingTag`

- **Line:** 61

---

### `VARIABLE` `scoringReason`

- **Line:** 68

---

