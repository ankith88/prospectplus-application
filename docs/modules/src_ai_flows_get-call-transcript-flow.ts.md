# Module: `src/ai/flows/get-call-transcript-flow.ts`

- **Language:** TypeScript
- **Total Lines:** 145
- **Direct Dependencies:** 3 modules imported

## Exported Symbols & API

### `VARIABLE` `GetTranscriptByCallIdInputSchema`

- **Line:** 13

---

### `TYPE` `GetTranscriptByCallIdInput`

- **Line:** 18
- **Signature:** `z.infer<typeof GetTranscriptByCallIdInputSchema>`

---

### `VARIABLE` `GetTranscriptByCallIdOutputSchema`

- **Line:** 20

---

### `TYPE` `GetTranscriptByCallIdOutput`

- **Line:** 24
- **Signature:** `z.infer<typeof GetTranscriptByCallIdOutputSchema>`

---

### `FUNCTION` `sleep`

- **Line:** 26

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ms` | `number` | **Yes** | - | - |

---

### `VARIABLE` `getCallTranscriptByCallIdFlow`

- **Line:** 28

---

### `VARIABLE` `apiId`

- **Line:** 35

---

### `VARIABLE` `apiToken`

- **Line:** 36

---

### `VARIABLE` `url`

- **Line:** 42

---

### `VARIABLE` `callUrl`

- **Line:** 43

---

### `VARIABLE` `credentials`

- **Line:** 44

---

### `VARIABLE` `headers`

- **Line:** 45

---

### `VARIABLE` `response`

- **Line:** 49

---

### `VARIABLE` `fallbackResp`

- **Line:** 58

---

### `VARIABLE` `fallbackData`

- **Line:** 60

---

### `VARIABLE` `fallbackUtterances`

- **Line:** 61

---

### `VARIABLE` `errText`

- **Line:** 78

---

### `VARIABLE` `data`

- **Line:** 103

---

### `VARIABLE` `utterances`

- **Line:** 104

---

### `FUNCTION` `getCallTranscriptByCallId`

- **Line:** 127
- **Async:** Yes
- **Returns:** `Promise<GetTranscriptByCallIdOutput>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `GetTranscriptByCallIdInput` | **Yes** | - | - |

---

### `VARIABLE` `cleanInput`

- **Line:** 129

---

### `VARIABLE` `result`

- **Line:** 134

---

