# Module: `src/ai/flows/analyze-business-card.ts`

- **Language:** TypeScript
- **Total Lines:** 76
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `BusinessCardAnalysisInputSchema`

- **Line:** 9

---

### `TYPE` `BusinessCardAnalysisInput`

- **Line:** 13
- **Signature:** `z.infer<typeof BusinessCardAnalysisInputSchema>`

---

### `VARIABLE` `BusinessCardAnalysisOutputSchema`

- **Line:** 15

---

### `TYPE` `BusinessCardAnalysisOutput`

- **Line:** 24
- **Signature:** `z.infer<typeof BusinessCardAnalysisOutputSchema>`

---

### `VARIABLE` `analyzeBusinessCardPrompt`

- **Line:** 26

---

### `VARIABLE` `analyzeBusinessCardFlow`

- **Line:** 55

---

### `FUNCTION` `analyzeBusinessCard`

- **Line:** 73
- **Async:** Yes
- **Returns:** `Promise<BusinessCardAnalysisOutput>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `BusinessCardAnalysisInput` | **Yes** | - | - |

---

