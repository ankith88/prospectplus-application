# Module: `src/components/cold-call-scorecard.tsx`

- **Language:** TypeScript
- **Total Lines:** 301
- **Direct Dependencies:** 18 modules imported

## Exported Symbols & API

### `VARIABLE` `formSchema`

- **Line:** 57

---

### `TYPE` `ScorecardFormValues`

- **Line:** 72
- **Signature:** `z.infer<typeof formSchema>`

---

### `INTERFACE` `ColdCallScorecardDialogProps`

- **Line:** 74

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `lead` | `Lead` | No | - |
| `dialerName` | `string` | No | - |
| `onScorecardSubmit` | `() => void` | No | - |

---

### `FUNCTION` `ColdCallScorecardDialog`

- **Line:** 80
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  lead,
  dialerName,
  onScorecardSubmit,
}` | `ColdCallScorecardDialogProps` | **Yes** | - | - |

---

### `VARIABLE` `form`

- **Line:** 90

---

### `FUNCTION` `handleSubmit`

- **Line:** 108
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `values` | `ScorecardFormValues` | **Yes** | - | - |

---

### `VARIABLE` `newScorecardData`

- **Line:** 113

---

### `VARIABLE` `savedScorecard`

- **Line:** 118

---

### `VARIABLE` `analysisResult`

- **Line:** 121

---

### `FUNCTION` `resetDialog`

- **Line:** 142

---

