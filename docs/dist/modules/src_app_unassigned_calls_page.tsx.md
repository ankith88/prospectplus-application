# Module: `src/app/unassigned_calls/page.tsx`

- **Language:** TypeScript
- **Total Lines:** 419
- **Direct Dependencies:** 11 modules imported

## Exported Symbols & API

### `INTERFACE` `UnassignedCall`

- **Line:** 25

#### Properties

| Property | Type | Optional | Description |
| :--- | :--- | :--- | :--- |
| `callId` | `string` | No | - |
| `phoneNumber` | `string` | No | - |
| `direction` | `string` | No | - |
| `duration` | `string` | No | - |
| `notes` | `string` | No | - |
| `author` | `string` | No | - |
| `email` | `string | null` | No | - |
| `date` | `string` | No | - |
| `matches` | `Array<{
    id: string;
    type: "leads" | "companies";
    name: string;
    status: string;
  }>` | No | - |

---

### `FUNCTION` `SuggestedMatchesCell`

- **Line:** 42
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  matches,
  onLink,
  linkingCallId,
  callId
}` | `{
  matches: Array<{ id: string; type: "leads" | "companies"; name: string; status: string }>;
  onLink: (targetId: string, targetType: "leads" | "companies", targetName: string) => void;
  linkingCallId: string | null;
  callId: string;
}` | **Yes** | - | - |

---

### `VARIABLE` `visibleMatches`

- **Line:** 59

---

### `VARIABLE` `hiddenCount`

- **Line:** 60

---

### `FUNCTION` `UnassignedCallsPage`

- **Line:** 120
- **Returns:** `void`

---

### `VARIABLE` `hasAccess`

- **Line:** 126

---

### `VARIABLE` `q`

- **Line:** 157

---

### `VARIABLE` `unsubscribe`

- **Line:** 159

---

### `VARIABLE` `calls`

- **Line:** 160
- **Signature:** `UnassignedCall[]`

---

### `VARIABLE` `userEmailLower`

- **Line:** 179

---

### `VARIABLE` `displayedCalls`

- **Line:** 180

---

### `FUNCTION` `handleSearch`

- **Line:** 189
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `callId` | `string` | **Yes** | - | - |
| `queryText` | `string` | **Yes** | - | - |

---

### `VARIABLE` `res`

- **Line:** 199

---

### `VARIABLE` `data`

- **Line:** 201

---

### `VARIABLE` `results`

- **Line:** 202

---

### `FUNCTION` `handleLink`

- **Line:** 216
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `call` | `UnassignedCall` | **Yes** | - | - |
| `targetId` | `string` | **Yes** | - | - |
| `targetType` | `"leads" | "companies"` | **Yes** | - | - |
| `targetName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `activityRef`

- **Line:** 220

---

### `FUNCTION` `handleDelete`

- **Line:** 253
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `callId` | `string` | **Yes** | - | - |

---

