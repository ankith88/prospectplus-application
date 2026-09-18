# Module: `src/services/netsuite-deployment-proxy.ts`

- **Language:** TypeScript
- **Total Lines:** 65

## Exported Symbols & API

### `INTERFACE` `DeploymentPayload`

- **Line:** 8

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | No | - |
| `userName` | `string` | No | - |
| `displayName` | `string` | No | - |
| `email` | `string` | No | - |
| `area` | `string` | No | - |
| `startTime` | `string` | No | - |
| `date` | `string` | No | - |

---

### `FUNCTION` `sendDeploymentToNetSuite`

> Synchronizes a Field Sales representative's daily deployment with NetSuite.

- **Line:** 22
- **Async:** Yes
- **Returns:** `Promise<{ success: boolean; message?: string }>`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `payload` | `DeploymentPayload` | **Yes** | - | - |

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

