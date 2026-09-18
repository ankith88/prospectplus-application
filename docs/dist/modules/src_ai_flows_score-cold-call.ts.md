# Module: `src/ai/flows/score-cold-call.ts`

- **Language:** TypeScript
- **Total Lines:** 109
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `ScorecardPillarScoreSchema`

- **Line:** 12

---

### `VARIABLE` `ScorecardAnalysisSchema`

- **Line:** 18

---

### `TYPE` `ScorecardAnalysis`

- **Line:** 23
- **Signature:** `z.infer<typeof ScorecardAnalysisSchema>`

---

### `VARIABLE` `ScoreColdCallInputSchema`

- **Line:** 25

---

### `TYPE` `ScoreColdCallInput`

- **Line:** 41
- **Signature:** `z.infer<typeof ScoreColdCallInputSchema>`

---

### `FUNCTION` `scoreColdCall`

- **Line:** 44
- **Async:** Yes
- **Returns:** `Promise<ScorecardAnalysis>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `ScoreColdCallInput` | **Yes** | - | - |

---

### `VARIABLE` `analysis`

- **Line:** 45

---

### `VARIABLE` `scoreColdCallPrompt`

- **Line:** 53

---

### `VARIABLE` `scoreColdCallFlow`

- **Line:** 95

---

