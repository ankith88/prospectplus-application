# Module: `src/ai/flows/analyze-checkin-flow.ts`

- **Language:** TypeScript
- **Total Lines:** 110
- **Direct Dependencies:** 5 modules imported

## Exported Symbols & API

### `VARIABLE` `CheckinAnalysisInputSchema`

- **Line:** 13

---

### `TYPE` `CheckinAnalysisInput`

- **Line:** 18
- **Signature:** `z.infer<typeof CheckinAnalysisInputSchema>`

---

### `VARIABLE` `DiscoveryDataSchema`

- **Line:** 20

---

### `VARIABLE` `CheckinAnalysisSchema`

- **Line:** 27

---

### `TYPE` `CheckinAnalysis`

- **Line:** 37
- **Signature:** `z.infer<typeof CheckinAnalysisSchema>`

---

### `VARIABLE` `discoverySignals`

- **Line:** 40

---

### `VARIABLE` `analyzeCheckinPrompt`

- **Line:** 51

---

### `VARIABLE` `analyzeCheckinFlow`

- **Line:** 78

---

### `VARIABLE` `discoveryDataWithScore`

- **Line:** 91

---

### `FUNCTION` `analyzeCheckin`

- **Line:** 107
- **Async:** Yes
- **Returns:** `Promise<CheckinAnalysis>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `CheckinAnalysisInput` | **Yes** | - | - |

---

