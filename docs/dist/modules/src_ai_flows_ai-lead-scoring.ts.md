# Module: `src/ai/flows/ai-lead-scoring.ts`

- **Language:** TypeScript
- **Total Lines:** 169
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `LeadToScoreSchema`

- **Line:** 18

---

### `VARIABLE` `AiLeadScoringInputSchema`

- **Line:** 33

---

### `TYPE` `AiLeadScoringInput`

- **Line:** 34
- **Signature:** `z.infer<typeof AiLeadScoringInputSchema>`

---

### `VARIABLE` `ScoredLeadSchema`

- **Line:** 37

---

### `VARIABLE` `AiLeadScoringOutputSchema`

- **Line:** 50

---

### `TYPE` `AiLeadScoringOutput`

- **Line:** 53
- **Signature:** `z.infer<typeof AiLeadScoringOutputSchema>`

---

### `FUNCTION` `aiLeadScoring`

- **Line:** 55
- **Async:** Yes
- **Returns:** `Promise<AiLeadScoringOutput>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `AiLeadScoringInput` | **Yes** | - | - |

---

### `VARIABLE` `result`

- **Line:** 61

---

### `VARIABLE` `aiSingleLeadScoringPrompt`

- **Line:** 67

---

### `VARIABLE` `aiSingleLeadScoringFlow`

- **Line:** 91

---

### `VARIABLE` `response`

- **Line:** 98

---

### `VARIABLE` `output`

- **Line:** 99

---

### `VARIABLE` `BatchScoringSchema`

- **Line:** 113

---

### `VARIABLE` `aiLeadScoringPrompt`

- **Line:** 117

---

### `VARIABLE` `aiLeadScoringFlow`

- **Line:** 147

---

### `VARIABLE` `response`

- **Line:** 154

---

### `VARIABLE` `output`

- **Line:** 156

---

