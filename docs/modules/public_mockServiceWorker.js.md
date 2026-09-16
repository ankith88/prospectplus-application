# Module: `public/mockServiceWorker.js`

- **Language:** JavaScript
- **Total Lines:** 350

## Exported Symbols & API

### `VARIABLE` `PACKAGE_VERSION`

> Mock Service Worker.

- **Line:** 10

---

### `VARIABLE` `INTEGRITY_CHECKSUM`

- **Line:** 11

---

### `VARIABLE` `IS_MOCKED_RESPONSE`

- **Line:** 12

---

### `VARIABLE` `activeClientIds`

- **Line:** 13

---

### `VARIABLE` `clientId`

- **Line:** 24

---

### `VARIABLE` `client`

- **Line:** 30

---

### `VARIABLE` `allClients`

- **Line:** 36

---

### `VARIABLE` `remainingClients`

- **Line:** 77

---

### `VARIABLE` `requestInterceptedAt`

- **Line:** 92

---

### `VARIABLE` `requestId`

- **Line:** 115

---

### `FUNCTION` `handleRequest`

- **Line:** 124
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `any` | **Yes** | - | - |
| `requestId` | `any` | **Yes** | - | - |
| `requestInterceptedAt` | `any` | **Yes** | - | - |

---

### `VARIABLE` `client`

- **Line:** 125

---

### `VARIABLE` `requestCloneForEvents`

- **Line:** 126

---

### `VARIABLE` `response`

- **Line:** 127

---

### `VARIABLE` `serializedRequest`

- **Line:** 138

---

### `VARIABLE` `responseClone`

- **Line:** 141

---

### `FUNCTION` `resolveMainClient`

> Resolve the main client for the given event.
Client that issues a request doesn't necessarily equal the client
that registered the worker. It's with the latter the worker should
communicate with during the response resolving phase.

- **Line:** 177
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `any` | **Yes** | - | - |

---

### `VARIABLE` `client`

- **Line:** 178

---

### `VARIABLE` `allClients`

- **Line:** 188

---

### `FUNCTION` `getResponse`

- **Line:** 211
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `event` | `any` | **Yes** | - | - |
| `client` | `any` | **Yes** | - | - |
| `requestId` | `any` | **Yes** | - | - |
| `requestInterceptedAt` | `any` | **Yes** | - | - |

---

### `VARIABLE` `requestClone`

- **Line:** 214

---

### `FUNCTION` `passthrough`

- **Line:** 216
- **Returns:** `void`

---

### `VARIABLE` `headers`

- **Line:** 219

---

### `VARIABLE` `acceptHeader`

- **Line:** 224

---

### `VARIABLE` `values`

- **Line:** 226

---

### `VARIABLE` `filteredValues`

- **Line:** 227

---

### `VARIABLE` `serializedRequest`

- **Line:** 255

---

### `VARIABLE` `clientMessage`

- **Line:** 256

---

### `FUNCTION` `sendToClient`

- **Line:** 288
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `client` | `any` | **Yes** | - | - |
| `message` | `any` | **Yes** | - | - |
| `transferrables` | `any` | No | `[]` | - |

---

### `VARIABLE` `channel`

- **Line:** 290

---

### `FUNCTION` `respondWithMock`

- **Line:** 311
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `response` | `any` | **Yes** | - | - |

---

### `VARIABLE` `mockedResponse`

- **Line:** 320

---

### `FUNCTION` `serializeRequest`

- **Line:** 333
- **Async:** Yes
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `request` | `any` | **Yes** | - | - |

---

