# Module: `src/components/unassigned-call-dialog.tsx`

- **Language:** TypeScript
- **Total Lines:** 387
- **Direct Dependencies:** 9 modules imported

## Exported Symbols & API

### `INTERFACE` `UnassignedCall`

- **Line:** 30

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
| `aircallStatus` | `string` | Yes | - |
| `recordingUrl` | `string` | Yes | - |
| `recordingAssetUrl` | `string` | Yes | - |
| `matches` | `Array<{
    id: string;
    type: "leads" | "companies";
    name: string;
    status: string;
  }>` | No | - |

---

### `FUNCTION` `SuggestedMatchesDialogSection`

- **Line:** 50
- **Returns:** `void`

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `{
  matches,
  onLink,
  isLinking
}` | `{
  matches: Array<{ id: string; type: "leads" | "companies"; name: string; status: string }>;
  onLink: (targetId: string, targetType: "leads" | "companies", targetName: string) => void;
  isLinking: boolean;
}` | **Yes** | - | - |

---

### `VARIABLE` `visibleMatches`

- **Line:** 63

---

### `VARIABLE` `hiddenCount`

- **Line:** 64

---

### `FUNCTION` `UnassignedCallDialog`

- **Line:** 126
- **Returns:** `void`

---

### `VARIABLE` `q`

- **Line:** 143

---

### `VARIABLE` `unsubscribe`

- **Line:** 145

---

### `VARIABLE` `calls`

- **Line:** 146
- **Signature:** `UnassignedCall[]`

---

### `VARIABLE` `userEmailLower`

- **Line:** 147

---

### `VARIABLE` `data`

- **Line:** 150

---

### `VARIABLE` `callEmailLower`

- **Line:** 151

---

### `VARIABLE` `availableCalls`

- **Line:** 169

---

### `VARIABLE` `delayDebounce`

- **Line:** 186

---

### `VARIABLE` `res`

- **Line:** 189

---

### `VARIABLE` `data`

- **Line:** 191

---

### `VARIABLE` `results`

- **Line:** 192

---

### `FUNCTION` `handleLink`

- **Line:** 209
- **Async:** Yes

#### Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `targetId` | `string` | **Yes** | - | - |
| `targetType` | `"leads" | "companies"` | **Yes** | - | - |
| `targetName` | `string` | **Yes** | - | - |

---

### `VARIABLE` `activityRef`

- **Line:** 215

---

### `VARIABLE` `activityData`

- **Line:** 217

---

### `VARIABLE` `unassignedRef`

- **Line:** 233

---

### `FUNCTION` `handleDismiss`

- **Line:** 256
- **Async:** Yes

---

### `VARIABLE` `unassignedRef`

- **Line:** 259

---

### `FUNCTION` `handleDecideLater`

- **Line:** 270

---

### `VARIABLE` `allPendingIds`

- **Line:** 272

---

### `VARIABLE` `availableCalls`

- **Line:** 279

---

### `VARIABLE` `currentIndex`

- **Line:** 280

---

### `VARIABLE` `totalCount`

- **Line:** 281

---

