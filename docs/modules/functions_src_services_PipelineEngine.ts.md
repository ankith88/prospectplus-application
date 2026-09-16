# Module: `functions/src/services/PipelineEngine.ts`

- **Language:** TypeScript
- **Total Lines:** 69
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `VARIABLE` `db`

- **Line:** 7

---

### `CLASS` `PipelineEngine`

- **Line:** 9

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `STAGE_THRESHOLDS` | `Record<string, { nextStage: string; minScore?: number; requiredEvent?: string }>` | No | - |

#### Methods

##### `evaluateThresholds()`
> Evaluate thresholds based on an incoming event and progress the lead if conditions are met.

- **Returns:** `void`

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `event` | `{ type: string; name?: string; duration?: number }` | **Yes** | - | - |

---

### `VARIABLE` `leadRef`

- **Line:** 22

---

### `VARIABLE` `leadSnap`

- **Line:** 23

---

### `VARIABLE` `lead`

- **Line:** 30

---

### `VARIABLE` `newVelocityScore`

- **Line:** 33

---

### `VARIABLE` `currentState`

- **Line:** 42

---

### `VARIABLE` `rule`

- **Line:** 43

---

### `VARIABLE` `shouldProgress`

- **Line:** 45

---

### `VARIABLE` `updates`

- **Line:** 56
- **Signature:** `any`

---

