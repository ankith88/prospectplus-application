# Module: `src/services/localmile-recredit-action.ts`

- **Language:** TypeScript
- **Total Lines:** 86
- **Direct Dependencies:** 1 modules imported

## Exported Symbols & API

### `INTERFACE` `RecreditResponse`

- **Line:** 5

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `success` | `boolean` | No | - |
| `message` | `string` | Yes | - |
| `newTrials` | `number` | Yes | - |

---

### `FUNCTION` `recreditLocalMileTrial`

- **Line:** 11
- **Async:** Yes
- **Returns:** `Promise<RecreditResponse>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `jobId` | `string` | **Yes** | - | - |

---

### `VARIABLE` `leadRef`

- **Line:** 17

---

### `VARIABLE` `leadSnap`

- **Line:** 18

---

### `VARIABLE` `jobDocRef`

- **Line:** 25

---

### `VARIABLE` `jobsSnap`

- **Line:** 32

---

### `VARIABLE` `totalJobCount`

- **Line:** 33

---

### `VARIABLE` `activeTrialJobsCount`

- **Line:** 34

---

### `VARIABLE` `st`

- **Line:** 35

---

### `VARIABLE` `newTrials`

- **Line:** 39

---

### `VARIABLE` `activityRef`

- **Line:** 49

---

### `VARIABLE` `localMileApiKey`

- **Line:** 58

---

### `VARIABLE` `syncResponse`

- **Line:** 61

---

