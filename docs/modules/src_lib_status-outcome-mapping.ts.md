# Module: `src/lib/status-outcome-mapping.ts`

- **Language:** TypeScript
- **Total Lines:** 243
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `OutcomeInfo`

- **Line:** 3

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `outcome` | `string` | No | - |
| `reason` | `string` | Yes | - |
| `notes` | `string` | Yes | - |

---

### `INTERFACE` `StatusDetailInfo`

- **Line:** 9

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `category` | `'Automated Call Outcome' | 'Sales Pipeline Workflow' | 'Disqualified & Lost'` | No | - |
| `description` | `string` | No | - |
| `outcomes` | `OutcomeInfo[]` | No | - |

---

### `VARIABLE` `STATUS_TO_OUTCOMES_MAP`

- **Line:** 15
- **Signature:** `Record<string, OutcomeInfo[]>`

---

### `VARIABLE` `WORKFLOW_STATUS_EXPLANATIONS`

- **Line:** 71
- **Signature:** `Record<string, { category: StatusDetailInfo['category']; description: string }>`

---

### `VARIABLE` `REVERSE_OUTCOME_TO_STATUS_MAP`

- **Line:** 166
- **Signature:** `Record<string, { status: LeadStatus; reason?: string }>`

---

### `FUNCTION` `getOutcomesForStatus`

> Deduplicates and returns the list of call outcomes that trigger a transition to the specified lead status.

- **Line:** 198
- **Returns:** `OutcomeInfo[]`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `normalized`

- **Line:** 200

---

### `VARIABLE` `rawList`

- **Line:** 201

---

### `VARIABLE` `seen`

- **Line:** 206

---

### `VARIABLE` `uniqueOutcomes`

- **Line:** 207
- **Signature:** `OutcomeInfo[]`

---

### `VARIABLE` `key`

- **Line:** 210

---

### `FUNCTION` `getStatusOutcomeExplanation`

- **Line:** 220
- **Returns:** `string`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | - | - |

---

### `VARIABLE` `normalized`

- **Line:** 221

---

### `VARIABLE` `outcomes`

- **Line:** 230

---

### `VARIABLE` `list`

- **Line:** 239

---

