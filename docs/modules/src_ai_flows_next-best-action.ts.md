# Module: `src/ai/flows/next-best-action.ts`

- **Language:** TypeScript
- **Total Lines:** 73
- **Direct Dependencies:** 2 modules imported

## Exported Symbols & API

### `VARIABLE` `NextBestActionInputSchema`

- **Line:** 6

---

### `TYPE` `NextBestActionInput`

- **Line:** 14
- **Signature:** `z.infer<typeof NextBestActionInputSchema>`

---

### `VARIABLE` `NextBestActionOutputSchema`

- **Line:** 16

---

### `TYPE` `NextBestActionOutput`

- **Line:** 19
- **Signature:** `z.infer<typeof NextBestActionOutputSchema>`

---

### `VARIABLE` `prompt`

- **Line:** 21

---

### `VARIABLE` `nextBestActionFlow`

- **Line:** 52

---

### `FUNCTION` `generateNextBestAction`

- **Line:** 68
- **Async:** Yes
- **Returns:** `Promise<NextBestActionOutput>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `input` | `NextBestActionInput` | **Yes** | - | - |

---

