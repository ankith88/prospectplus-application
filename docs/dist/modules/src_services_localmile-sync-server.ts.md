# Module: `src/services/localmile-sync-server.ts`

- **Language:** TypeScript
- **Total Lines:** 112
- **Direct Dependencies:** 1 modules imported

## Overview
Server-side helper to synchronize PMPO recurring service changes to LocalMile Plus scheduled_jobs collection.

## Exported Symbols & API

### `FUNCTION` `syncPmpoToLocalMileServer`

- **Line:** 8
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message?: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | **Yes** | - | - |
| `leadData` | `any` | **Yes** | - | - |
| `services` | `any[]` | **Yes** | - | - |
| `effectiveDateStr` | `string` | No | - | - |

---

### `VARIABLE` `pmpoService`

- **Line:** 19

---

### `VARIABLE` `sName`

- **Line:** 20

---

### `VARIABLE` `companyExists`

- **Line:** 30

---

### `VARIABLE` `freqRaw`

- **Line:** 36

---

### `VARIABLE` `frequencyArray`

- **Line:** 37
- **Signature:** `string[]`

---

### `VARIABLE` `startDateVal`

- **Line:** 46

---

### `VARIABLE` `localMileApiKey`

- **Line:** 47

---

### `VARIABLE` `customerObj`

- **Line:** 49

---

### `VARIABLE` `schedPayload`

- **Line:** 59

---

### `VARIABLE` `response`

- **Line:** 89

---

### `VARIABLE` `errText`

- **Line:** 99

---

### `VARIABLE` `resData`

- **Line:** 104

---

