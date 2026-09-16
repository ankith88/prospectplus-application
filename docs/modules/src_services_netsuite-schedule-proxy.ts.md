# Module: `src/services/netsuite-schedule-proxy.ts`

- **Language:** TypeScript
- **Total Lines:** 65

## Exported Symbols & API

### `INTERFACE` `SchedulePayload`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | No | - |
| `userName` | `string` | No | - |
| `workingDays` | `string[]` | No | - |
| `startTime` | `string` | No | - |
| `endTime` | `string` | No | - |
| `weekStarting` | `string` | No | - |
| `notes` | `string` | Yes | - |

---

### `FUNCTION` `sendScheduleToNetSuite`

> Synchronizes a Field Sales representative's schedule with NetSuite.

- **Line:** 22
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message?: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `SchedulePayload` | **Yes** | - | - |

---

### `VARIABLE` `baseUrl`

- **Line:** 29

---

### `VARIABLE` `params`

- **Line:** 30

---

### `VARIABLE` `url`

- **Line:** 44

---

### `VARIABLE` `response`

- **Line:** 49

---

### `VARIABLE` `errorBody`

- **Line:** 52

---

